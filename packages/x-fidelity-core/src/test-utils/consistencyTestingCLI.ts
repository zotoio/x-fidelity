#!/usr/bin/env node
/**
 * CLI Tool for Consistency Testing
 * 
 * This provides a command-line interface for running consistency tests
 * Usage: node consistencyTestingCLI.js [command] [options]
 */

import { program } from 'commander';
import { 
  ConsistencyTester, 
  quickConsistencyCheck, 
  testExistingRepository,
  runFullConsistencyTestSuite,
  runManualConsistencyTest,
  generateBaselineReport
} from './consistencyTesting';
import * as fs from 'fs/promises';
import * as path from 'path';

program
  .name('xfi-consistency-test')
  .description('X-Fidelity CLI-VSCode consistency testing tool')
  .version('1.0.0');

program
  .command('quick <archetype>')
  .description('Run a quick consistency test for a specific archetype')
  .option('--verbose', 'Show detailed output')
  .action(async (archetype, options) => {
    console.log(`🧪 Running quick consistency test for ${archetype}...`);
    
    try {
      const result = await quickConsistencyCheck(archetype);
      
      if (options.verbose || !result.isConsistent) {
        console.log(result.report);
      } else {
        console.log(`✅ ${archetype} is consistent: ${result.cliResult.XFI_RESULT.totalIssues} issues found in both CLI and VSCode`);
      }
      
      if (!result.isConsistent) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  });

program
  .command('test-repo <repoPath> <archetype>')
  .description('Test consistency on an existing repository')
  .option('--verbose', 'Show detailed output')
  .action(async (repoPath, archetype, options) => {
    console.log(`🧪 Testing repository: ${repoPath} (${archetype})...`);
    
    try {
      const result = await testExistingRepository(repoPath, archetype);
      
      if (options.verbose || !result.isConsistent) {
        console.log(result.report);
      } else {
        console.log(`✅ Repository is consistent: ${result.cliResult.XFI_RESULT.totalIssues} issues found in both CLI and VSCode`);
      }
      
      if (!result.isConsistent) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Test failed:', error);
      process.exit(1);
    }
  });

program
  .command('suite')
  .description('Run the full consistency test suite')
  .option('--output <file>', 'Save report to file')
  .option('--archetype <archetypes...>', 'Limit to specific archetypes')
  .action(async (options) => {
    console.log('🧪 Running full consistency test suite...');
    
    try {
      const tester = new ConsistencyTester();
      const results = await tester.runConsistencyTestSuite({
        archetypes: options.archetype
      });
      
      // Generate comprehensive report
      const report = generateSuiteReport(results);
      console.log(report);
      
      // Save to file if requested
      if (options.output) {
        await fs.writeFile(options.output, report);
        console.log(`📄 Report saved to: ${options.output}`);
      }
      
      // Exit with error code if any tests failed
      const hasFailures = results.some(r => !r.isConsistent);
      if (hasFailures) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Suite failed:', error);
      process.exit(1);
    }
  });

program
  .command('baseline')
  .description('Generate a baseline consistency report for current state')
  .option('--output <file>', 'Output file for report', 'consistency-baseline.txt')
  .action(async (options) => {
    console.log('📊 Generating baseline consistency report...');
    
    try {
      const report = await generateBaselineReport();
      
      await fs.writeFile(options.output, report);
      console.log(`📄 Baseline report saved to: ${options.output}`);
      
      // Show summary on console
      const lines = report.split('\n');
      const summaryStart = lines.findIndex(line => line.includes('BASELINE METRICS:'));
      const summaryEnd = lines.findIndex((line, index) => index > summaryStart && line.trim() === '');
      
      if (summaryStart !== -1 && summaryEnd !== -1) {
        console.log('\n📊 BASELINE SUMMARY:');
        lines.slice(summaryStart, summaryEnd).forEach(line => console.log(line));
      }
      
      // Always exit 0 for baseline - we're documenting current state
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Baseline generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('manual')
  .description('Run manual consistency test with detailed output')
  .option('--output <file>', 'Save detailed results to file')
  .action(async (options) => {
    console.log('🧪 Running manual consistency test...');
    
    try {
      const results = await runManualConsistencyTest();
      
      // Generate detailed manual test report
      const report = generateManualTestReport(results);
      
      if (options.output) {
        await fs.writeFile(options.output, report);
        console.log(`📄 Detailed results saved to: ${options.output}`);
      }
      
      // Show summary
      console.log('\n🎯 MANUAL TEST COMPLETED:');
      console.log(`Java Test: ${results.javaResult.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
      console.log(`Total Discrepancies: ${results.totalDiscrepancies}`);
      console.log(`Success Rate: ${((results.consistentTests / (results.consistentTests + results.inconsistentTests)) * 100).toFixed(1)}%`);
      
      // Exit with error if any inconsistencies found
      if (results.totalDiscrepancies > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Manual test failed:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate the consistency testing framework itself')
  .action(async () => {
    console.log('🔍 Validating consistency testing framework...');
    
    try {
      // Import test utilities
      const { TEST_REPOSITORIES } = await import('./consistencyTesting');
      
      // Validate test repositories
      let validationErrors = 0;
      
      console.log(`📋 Validating ${TEST_REPOSITORIES.length} test repositories...`);
      
      TEST_REPOSITORIES.forEach((repo, index) => {
        const errors: string[] = [];
        
        if (!repo.name) errors.push('Missing name');
        if (!repo.archetype) errors.push('Missing archetype');
        if (!repo.description) errors.push('Missing description');
        if (!Array.isArray(repo.files) || repo.files.length === 0) errors.push('No files defined');
        if (!Array.isArray(repo.expectedIssues)) errors.push('expectedIssues not array');
        
        // Validate files
        repo.files.forEach((file, fileIndex) => {
          if (!file.path) errors.push(`File ${fileIndex}: Missing path`);
          if (!file.content) errors.push(`File ${fileIndex}: Missing content`);
        });
        
        // Validate expected issues
        repo.expectedIssues.forEach((issue, issueIndex) => {
          if (!issue.filePath) errors.push(`Issue ${issueIndex}: Missing filePath`);
          if (!issue.ruleFailure) errors.push(`Issue ${issueIndex}: Missing ruleFailure`);
          if (!issue.level) errors.push(`Issue ${issueIndex}: Missing level`);
          if (!issue.description) errors.push(`Issue ${issueIndex}: Missing description`);
        });
        
        if (errors.length > 0) {
          console.log(`❌ Repository ${index + 1} (${repo.name || 'unnamed'}):`);
          errors.forEach(error => console.log(`   - ${error}`));
          validationErrors += errors.length;
        } else {
          console.log(`✅ Repository ${index + 1} (${repo.name}): Valid`);
        }
      });
      
      if (validationErrors > 0) {
        console.log(`\n❌ Validation failed: ${validationErrors} errors found`);
        process.exit(1);
      } else {
        console.log('\n✅ All test repositories are valid');
        console.log(`📊 Framework ready to test ${TEST_REPOSITORIES.length} repositories across multiple archetypes`);
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      process.exit(1);
    }
  });

// Helper functions
function generateSuiteReport(results: any[]): string {
  const lines: string[] = [];
  
  lines.push('==========================================');
  lines.push('  X-FIDELITY CONSISTENCY TEST SUITE');
  lines.push('==========================================');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Total Tests: ${results.length}`);
  lines.push('');
  
  const consistent = results.filter(r => r.isConsistent);
  const inconsistent = results.filter(r => !r.isConsistent);
  
  lines.push('SUMMARY:');
  lines.push(`✅ Consistent: ${consistent.length}`);
  lines.push(`❌ Inconsistent: ${inconsistent.length}`);
  lines.push(`Success Rate: ${((consistent.length / results.length) * 100).toFixed(1)}%`);
  lines.push('');
  
  if (inconsistent.length > 0) {
    lines.push('FAILED TESTS:');
    inconsistent.forEach(result => {
      lines.push(`❌ ${result.testName} (${result.archetype}): ${result.comparison.summary.totalDiscrepancies} discrepancies`);
    });
    lines.push('');
  }
  
  // Add detailed reports for each test
  results.forEach(result => {
    lines.push('------------------------------------------');
    lines.push(result.report);
    lines.push('');
  });
  
  return lines.join('\n');
}

function generateManualTestReport(results: any): string {
  const lines: string[] = [];
  
  lines.push('==========================================');
  lines.push('  X-FIDELITY MANUAL CONSISTENCY TEST');
  lines.push('==========================================');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  
  // Individual test results
  lines.push('INDIVIDUAL TEST RESULTS:');
  lines.push(`Java Test: ${results.javaResult.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
  lines.push(`  CLI Issues: ${results.javaResult.cliResult.XFI_RESULT.totalIssues}`);
  lines.push(`  VSCode Issues: ${results.javaResult.vscodeResult.XFI_RESULT.totalIssues}`);
  lines.push(`  Discrepancies: ${results.javaResult.comparison.summary.totalDiscrepancies}`);
  lines.push('');
  
  // Suite summary
  lines.push('FULL SUITE SUMMARY:');
  lines.push(`Total Tests: ${results.suiteResults.length}`);
  lines.push(`Consistent: ${results.consistentTests}`);
  lines.push(`Inconsistent: ${results.inconsistentTests}`);
  lines.push(`Total Discrepancies: ${results.totalDiscrepancies}`);
  lines.push(`Success Rate: ${((results.consistentTests / (results.consistentTests + results.inconsistentTests)) * 100).toFixed(1)}%`);
  lines.push('');
  
  // Detailed reports
  if (!results.javaResult.isConsistent) {
    lines.push('JAVA DETAILED REPORT:');
    lines.push(results.javaResult.report);
    lines.push('');
  }
  
  return lines.join('\n');
}

// Parse command line arguments
if (require.main === module) {
  program.parse(process.argv);
} 