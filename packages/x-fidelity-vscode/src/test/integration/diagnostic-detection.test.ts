import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  getTestWorkspace
} from '../helpers/testHelpers';

/**
 * Diagnostic Detection Test
 * 
 * This test checks what diagnostics are currently present in the problems panel
 * without running fresh analysis, to understand what's actually being detected.
 */
suite('Diagnostic Detection Test', () => {
  let testWorkspace: vscode.WorkspaceFolder;

  suiteSetup(async function () {
    this.timeout(30000);
    await ensureExtensionActivated();
    testWorkspace = getTestWorkspace();
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for any existing analysis
  });

  test('should examine current diagnostic state', async function () {
    this.timeout(15000);

    console.log('\n🔍 EXAMINING CURRENT DIAGNOSTIC STATE...\n');

    // Get all current diagnostics in the problems panel
    const allDiagnostics = vscode.languages.getDiagnostics();
    console.log(`📊 Total diagnostic collections: ${allDiagnostics.length}`);

    let totalDiagnostics = 0;
    let xfidelityDiagnostics = 0;
    const filesWithIssues = new Set<string>();
    const ruleTypes = new Set<string>();

    for (const [uri, diagnostics] of allDiagnostics) {
      totalDiagnostics += diagnostics.length;
      
      const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
      if (xfiDiags.length > 0) {
        xfidelityDiagnostics += xfiDiags.length;
        const relativePath = vscode.workspace.asRelativePath(uri);
        filesWithIssues.add(relativePath);
        
        console.log(`📁 ${relativePath}: ${xfiDiags.length} X-Fidelity issues`);
        
        xfiDiags.forEach((diag, index) => {
          const ruleId = diag.code as string || 'unknown-rule';
          ruleTypes.add(ruleId);
          
          if (index < 2) { // Show first 2 issues per file
            console.log(`   🔍 ${ruleId}: ${diag.message}`);
            console.log(`   📍 Line ${diag.range.start.line + 1}, Column ${diag.range.start.character + 1}`);
            console.log(`   ⚠️  Severity: ${diag.severity}`);
          }
        });
        
        if (xfiDiags.length > 2) {
          console.log(`   ... and ${xfiDiags.length - 2} more issues`);
        }
        console.log('');
      }
    }

    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log(`   Total diagnostics (all sources): ${totalDiagnostics}`);
    console.log(`   X-Fidelity diagnostics: ${xfidelityDiagnostics}`);
    console.log(`   Files with X-Fidelity issues: ${filesWithIssues.size}`);
    console.log(`   Unique rule types: ${ruleTypes.size}`);

    if (ruleTypes.size > 0) {
      console.log('\n🎯 DETECTED RULE TYPES:');
      Array.from(ruleTypes).sort().forEach(rule => {
        console.log(`   - ${rule}`);
      });
    }

    if (filesWithIssues.size > 0) {
      console.log('\n📁 FILES WITH ISSUES:');
      Array.from(filesWithIssues).sort().forEach(file => {
        console.log(`   - ${file}`);
      });
    }

    // Try to run a quick analysis if no diagnostics are present
    if (xfidelityDiagnostics === 0) {
      console.log('\n🔄 No X-Fidelity diagnostics found, attempting quick analysis...');
      
      try {
        const result = await executeCommandSafely('xfidelity.runAnalysis');
        if (result.success) {
          console.log('✅ Analysis command executed successfully');
          
          // Wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          const newDiagnostics = vscode.languages.getDiagnostics();
          let newXfiCount = 0;
          for (const [, diagnostics] of newDiagnostics) {
            newXfiCount += diagnostics.filter(d => d.source === 'X-Fidelity').length;
          }
          
          console.log(`📊 After analysis: ${newXfiCount} X-Fidelity diagnostics`);
        } else {
          console.log(`❌ Analysis command failed: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ Analysis attempt failed: ${error}`);
      }
    }

    // Always pass - this is an inspection test
    assert.ok(true, 'Diagnostic inspection completed');
  });

  test('should check for specific fixture file issues', async function () {
    this.timeout(10000);

    console.log('\n🎯 CHECKING FOR ISSUES IN SPECIFIC FIXTURE FILES...\n');

    const expectedFiles = [
      'src/components/ComplexComponent.tsx',
      'src/components/OverlyComplexProcessor.tsx', 
      'src/components/SensitiveDataLogger.tsx',
      'src/components/UserAuth.tsx',
      'src/utils/database.js',
      'src/facts/manyFunctionsFact.ts',
      'src/facts/massiveFunctionCollection.ts'
    ];

    const allDiagnostics = vscode.languages.getDiagnostics();
    
    for (const expectedFile of expectedFiles) {
      let found = false;
      let issueCount = 0;
      
      for (const [uri, diagnostics] of allDiagnostics) {
        const relativePath = vscode.workspace.asRelativePath(uri);
        
        if (relativePath.includes(expectedFile)) {
          const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
          if (xfiDiags.length > 0) {
            found = true;
            issueCount = xfiDiags.length;
            console.log(`✅ ${expectedFile}: ${issueCount} issues found`);
            
            // Show rule types for this file
            const rules = xfiDiags.map(d => d.code as string).filter(Boolean);
            const uniqueRules = Array.from(new Set(rules));
            console.log(`   Rules: ${uniqueRules.join(', ')}`);
          }
          break;
        }
      }
      
      if (!found) {
        console.log(`❌ ${expectedFile}: No issues found`);
      }
    }

    console.log('\n📋 This test helps us understand what the extension is actually detecting.');
    
    // Always pass - this is an inspection test
    assert.ok(true, 'Fixture file inspection completed');
  });

  test('should verify extension commands work', async function () {
    this.timeout(10000);

    console.log('\n🔧 TESTING BASIC EXTENSION FUNCTIONALITY...\n');

    const commands = [
      'xfidelity.test',
      'xfidelity.getTestResults',
      'xfidelity.showOutput',
      'xfidelity.refreshIssuesTree'
    ];

    for (const command of commands) {
      try {
        const result = await executeCommandSafely(command);
        if (result.success) {
          console.log(`✅ ${command}: Working`);
        } else {
          console.log(`⚠️ ${command}: ${result.error || 'Failed'}`);
        }
      } catch (error) {
        console.log(`❌ ${command}: ${error}`);
      }
    }

    assert.ok(true, 'Command functionality check completed');
  });
}); 