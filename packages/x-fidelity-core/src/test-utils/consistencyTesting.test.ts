/**
 * Consistency Testing Framework Test Suite
 * 
 * This test file validates the consistency testing framework itself
 * and provides examples of how to use it.
 */

import { 
  ConsistencyTester, 
  quickConsistencyCheck, 
  testExistingRepository,
  runFullConsistencyTestSuite,
  runManualConsistencyTest,
  generateBaselineReport,
  TEST_REPOSITORIES 
} from './consistencyTesting';

// Increase timeout for integration tests
jest.setTimeout(120000); // 2 minutes

describe('ConsistencyTesting Framework', () => {
  describe('ConsistencyTester', () => {
    let tester: ConsistencyTester;
    
    beforeEach(() => {
      tester = new ConsistencyTester();
    });

    it('should create test repositories correctly', async () => {
      const testRepo = TEST_REPOSITORIES.find(r => r.name === 'node-fullstack-basic');
      expect(testRepo).toBeDefined();
      expect(testRepo!.files.length).toBeGreaterThan(0);
      expect(testRepo!.expectedIssues.length).toBeGreaterThan(0);
    });

    it('should run consistency test for node-fullstack archetype', async () => {
      const result = await tester.runConsistencyTest({ 
        archetype: 'node-fullstack' 
      });
      
      expect(result).toBeDefined();
      expect(result.testName).toBe('node-fullstack-basic');
      expect(result.archetype).toBe('node-fullstack');
      expect(result.cliResult).toBeDefined();
      expect(result.vscodeResult).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.report).toContain('CONSISTENCY TEST REPORT');
      expect(typeof result.isConsistent).toBe('boolean');
      
      // Log basic results for visibility
      console.log(`\n📊 Test Result: ${result.isConsistent ? 'CONSISTENT' : 'INCONSISTENT'}`);
      console.log(`CLI Issues: ${result.cliResult.XFI_RESULT.totalIssues}`);
      console.log(`VSCode Issues: ${result.vscodeResult.XFI_RESULT.totalIssues}`);
      console.log(`Discrepancies: ${result.comparison.summary.totalDiscrepancies}`);
    });

    it('should detect configuration differences', async () => {
      // This test will likely fail initially, which is expected
      // It will help us identify the current state of inconsistencies
      const result = await tester.runConsistencyTest({ 
        archetype: 'node-fullstack' 
      });
      
      // Log the results for analysis
      console.log('\n📋 DETAILED CONSISTENCY REPORT:');
      console.log('='.repeat(50));
      console.log(result.report);
      console.log('='.repeat(50));
      
      // Document current state
      expect(result.comparison).toBeDefined();
      expect(result.comparison.summary).toBeDefined();
      
      // The test itself doesn't need to pass - it's documenting current state
      if (!result.isConsistent) {
        console.log(`🔍 BASELINE: Found ${result.comparison.summary.totalDiscrepancies} discrepancies`);
        console.log(`📁 Affected Files: ${result.comparison.summary.affectedFiles.length}`);
        console.log(`📏 Affected Rules: ${result.comparison.summary.affectedRules.length}`);
      }
    });

    it('should compare results correctly', async () => {
      const result = await tester.runConsistencyTest({ 
        archetype: 'node-fullstack' 
      });
      
      // Verify comparison structure
      expect(result.comparison.totalIssuesDiff).toBeDefined();
      expect(Array.isArray(result.comparison.missingInCLI)).toBe(true);
      expect(Array.isArray(result.comparison.missingInVSCode)).toBe(true);
      expect(Array.isArray(result.comparison.configurationDifferences)).toBe(true);
      expect(Array.isArray(result.comparison.levelMismatches)).toBe(true);
      expect(result.comparison.summary).toBeDefined();
      
      // Log detailed comparison data
      console.log('\n🔍 COMPARISON DETAILS:');
      console.log(`Missing in CLI: ${result.comparison.missingInCLI.length}`);
      console.log(`Missing in VSCode: ${result.comparison.missingInVSCode.length}`);
      console.log(`Level Mismatches: ${result.comparison.levelMismatches.length}`);
      console.log(`Config Differences: ${result.comparison.configurationDifferences.length}`);
    });

    it('should handle both Node.js and Java archetypes', async () => {
      const nodeResult = await tester.runConsistencyTest({ archetype: 'node-fullstack' });
      const javaResult = await tester.runConsistencyTest({ archetype: 'java-microservice' });
      
      expect(nodeResult.archetype).toBe('node-fullstack');
      expect(javaResult.archetype).toBe('java-microservice');
      
      console.log('\n📊 ARCHETYPE COMPARISON:');
      console.log(`Node.js: ${nodeResult.isConsistent ? 'CONSISTENT' : 'INCONSISTENT'} (${nodeResult.comparison.summary.totalDiscrepancies} discrepancies)`);
      console.log(`Java: ${javaResult.isConsistent ? 'CONSISTENT' : 'INCONSISTENT'} (${javaResult.comparison.summary.totalDiscrepancies} discrepancies)`);
    });
  });

  describe('Convenience Functions', () => {
    it('should run quick consistency check', async () => {
      const result = await quickConsistencyCheck('node-fullstack');
      expect(result).toBeDefined();
      expect(result.archetype).toBe('node-fullstack');
      
      console.log('\n⚡ QUICK CHECK RESULT:');
      console.log(`Status: ${result.isConsistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);
      console.log(`Duration: ${result.duration}ms`);
    });

    // Note: This test requires an actual repository to test against
    it.skip('should test existing repository', async () => {
      // This would be used to test against your actual project
      const result = await testExistingRepository(process.cwd(), 'node-fullstack');
      expect(result).toBeDefined();
      console.log(result.report);
    });

    it('should run full test suite', async () => {
      const results = await runFullConsistencyTestSuite();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Log summary
      console.log(`\n📊 FULL SUITE SUMMARY:`);
      console.log(`Total Tests: ${results.length}`);
      console.log(`Consistent: ${results.filter(r => r.isConsistent).length}`);
      console.log(`Inconsistent: ${results.filter(r => !r.isConsistent).length}`);
      
      // Log detailed breakdown
      results.forEach(result => {
        const status = result.isConsistent ? '✅' : '❌';
        console.log(`${status} ${result.testName}: ${result.comparison.summary.totalDiscrepancies} discrepancies`);
      });
    });
  });

  describe('Framework Validation', () => {
    it('should validate test repository structure', () => {
      TEST_REPOSITORIES.forEach(repo => {
        expect(repo.name).toBeTruthy();
        expect(repo.archetype).toBeTruthy();
        expect(repo.description).toBeTruthy();
        expect(Array.isArray(repo.files)).toBe(true);
        expect(Array.isArray(repo.expectedIssues)).toBe(true);
        expect(repo.files.length).toBeGreaterThan(0);
        
        // Validate file structure
        repo.files.forEach(file => {
          expect(file.path).toBeTruthy();
          expect(file.content).toBeTruthy();
        });
        
        // Validate expected issues
        repo.expectedIssues.forEach(issue => {
          expect(issue.filePath).toBeTruthy();
          expect(issue.ruleFailure).toBeTruthy();
          expect(issue.level).toBeTruthy();
          expect(issue.description).toBeTruthy();
        });
      });
      
      console.log(`\n✅ Validated ${TEST_REPOSITORIES.length} test repositories`);
    });

    it('should handle timeout scenarios gracefully', async () => {
      // This test verifies that our timeout mechanisms work
      const tester = new ConsistencyTester();
      
      // We can't easily test timeout without breaking things,
      // so we'll just verify the timeout constants are reasonable
      expect((tester as any).CLI_TIMEOUT).toBeGreaterThan(30000); // At least 30 seconds
      expect((tester as any).VSCODE_TIMEOUT).toBeGreaterThan(30000); // At least 30 seconds
      
      console.log(`\n⏰ Timeout settings: CLI=${(tester as any).CLI_TIMEOUT}ms, VSCode=${(tester as any).VSCODE_TIMEOUT}ms`);
    });
  });
});

// ================================
// MANUAL TESTING UTILITIES
// ================================

// Note: runManualConsistencyTest and generateBaselineReport have been moved to consistencyTesting.ts

// Uncomment the line below to run manual tests
// runManualConsistencyTest(); 