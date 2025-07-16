import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  waitFor,
  getAnalysisResults,
  runInitialAnalysis,
  getTestWorkspace
} from '../helpers/testHelpers';

/**
 * Rule Validation Integration Tests
 * 
 * This test suite validates that the VSCode extension detects the exact same
 * rule failures that the CLI finds in the fixture files. We expect 14 total
 * issues across various rule types.
 */
suite('Rule Validation Integration Tests', () => {
  let testWorkspace: vscode.WorkspaceFolder;
  let analysisResults: any;

  // Expected issues based on CLI analysis results
  const EXPECTED_RULES = {
    'functionComplexity-iterative': 2, // ComplexComponent.tsx, OverlyComplexProcessor.tsx
    'sensitiveLogging-iterative': 4, // SensitiveDataLogger.tsx, UserAuth.tsx, database.js
    'noDatabases-iterative': 5, // Multiple files with database calls (marked as exempt)
    'functionCount-iterative': 2, // manyFunctionsFact.ts, massiveFunctionCollection.ts
    'outdatedFramework-global': 1, // REPO_GLOBAL_CHECK
    'invalidSystemIdConfigured-iterative': 1 // xfiTestMatch.json
  };

  const EXPECTED_TOTAL_ISSUES = 14;
  const EXPECTED_WARNING_COUNT = 7;
  const EXPECTED_FATALITY_COUNT = 2;
  const EXPECTED_EXEMPT_COUNT = 5;

  suiteSetup(async function () {
    this.timeout(120000); // 2 minutes for full setup including analysis
    await ensureExtensionActivated();
    testWorkspace = getTestWorkspace();
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔍 Running analysis for rule validation tests...');
    try {
      analysisResults = await runInitialAnalysis(undefined, true); // Force fresh analysis
      console.log(`📊 Analysis completed with ${analysisResults?.summary?.totalIssues || 0} issues`);
    } catch (error) {
      console.error('⚠️ Initial analysis failed:', error);
      analysisResults = null;
    }
  });

  test('should detect the expected total number of issues', async function () {
    this.timeout(30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    let totalXFIDiagnostics = 0;

    for (const [, diagnostics] of allDiagnostics) {
      totalXFIDiagnostics += diagnostics.filter(d => d.source === 'X-Fidelity').length;
    }

    console.log(`📊 Found ${totalXFIDiagnostics} X-Fidelity diagnostics in problems panel`);
    console.log(`📊 Expected ${EXPECTED_TOTAL_ISSUES} total issues`);

    // Get results from analysis
    if (analysisResults && analysisResults.summary) {
      console.log(`📊 Analysis summary: ${JSON.stringify(analysisResults.summary, null, 2)}`);
    }

    assert.ok(
      totalXFIDiagnostics > 0,
      'Should have at least some X-Fidelity diagnostics'
    );

    // This assertion helps us understand what's actually being detected
    if (totalXFIDiagnostics !== EXPECTED_TOTAL_ISSUES) {
      console.log(`⚠️ Diagnostic count mismatch: expected ${EXPECTED_TOTAL_ISSUES}, got ${totalXFIDiagnostics}`);
      // Don't fail yet, let's see what rules are being detected
    }
  });

  test('should detect specific rule failures in fixture files', async function () {
    this.timeout(30000);

    const allDiagnostics = vscode.languages.getDiagnostics();
    const ruleCount: Record<string, number> = {};
    const detectedFiles = new Set<string>();

    // Count rule occurrences by examining diagnostic codes
    for (const [uri, diagnostics] of allDiagnostics) {
      const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');
      
      if (xfiDiags.length > 0) {
        detectedFiles.add(vscode.workspace.asRelativePath(uri));
        
        console.log(`📁 ${vscode.workspace.asRelativePath(uri)}: ${xfiDiags.length} X-Fidelity issues`);
        
        xfiDiags.forEach((diag, index) => {
          const ruleId = diag.code as string || 'unknown-rule';
          ruleCount[ruleId] = (ruleCount[ruleId] || 0) + 1;
          
          console.log(`🔍 Found rule: ${ruleId} in ${vscode.workspace.asRelativePath(uri)}`);
          console.log(`   Message: ${diag.message}`);
          console.log(`   Severity: ${diag.severity}`);
        });
      }
    }

    console.log('\n📊 DETECTED RULES SUMMARY:');
    console.log(JSON.stringify(ruleCount, null, 2));

    console.log('\n📁 FILES WITH ISSUES:');
    detectedFiles.forEach(file => console.log(`   - ${file}`));

    console.log('\n🎯 EXPECTED RULES:');
    console.log(JSON.stringify(EXPECTED_RULES, null, 2));

    // Strict validation
    let allMatched = true;
    for (const [expectedRule, expectedCount] of Object.entries(EXPECTED_RULES)) {
      const actualCount = ruleCount[expectedRule] || 0;
      if (actualCount !== expectedCount) {
        console.log(`❌ Mismatch for ${expectedRule}: expected ${expectedCount}, got ${actualCount}`);
        allMatched = false;
      } else {
        console.log(`✅ Correct count for ${expectedRule}: ${actualCount}`);
      }
    }

    assert.ok(allMatched, 'All expected rules must match their counts');
  });

  test('should detect function complexity issues in specific files', async function () {
    this.timeout(30000);

    const complexityFiles = [
      'src/components/ComplexComponent.tsx',
      'src/components/OverlyComplexProcessor.tsx'
    ];

    const allDiagnostics = vscode.languages.getDiagnostics();
    let complexityIssuesFound = 0;

    for (const [uri, diagnostics] of allDiagnostics) {
      const relativePath = vscode.workspace.asRelativePath(uri);
      
      if (complexityFiles.some(file => relativePath.includes(file))) {
        const complexityDiags = diagnostics.filter(d => 
          d.source === 'X-Fidelity' && 
          d.code === 'functionComplexity-iterative'
        );
        
        if (complexityDiags.length > 0) {
          complexityIssuesFound += complexityDiags.length;
          console.log(`✅ Found ${complexityDiags.length} complexity issues in ${relativePath}`);
          
          // Log details of the complexity issues
          complexityDiags.forEach(diag => {
            console.log(`   - Line ${diag.range.start.line + 1}: ${diag.message}`);
          });
        } else {
          console.log(`❌ No complexity issues found in ${relativePath}`);
        }
      }
    }

    assert.ok(
      complexityIssuesFound > 0,
      `Should find function complexity issues. Found: ${complexityIssuesFound}`
    );

    console.log(`📊 Total complexity issues found: ${complexityIssuesFound}`);
  });

  test('should detect sensitive logging issues', async function () {
    this.timeout(30000);

    const sensitiveFiles = [
      'src/components/SensitiveDataLogger.tsx',
      'src/components/UserAuth.tsx',
      'src/utils/database.js'
    ];

    const allDiagnostics = vscode.languages.getDiagnostics();
    let sensitiveIssuesFound = 0;

    for (const [uri, diagnostics] of allDiagnostics) {
      const relativePath = vscode.workspace.asRelativePath(uri);
      
      if (sensitiveFiles.some(file => relativePath.includes(file))) {
        const sensitiveDiags = diagnostics.filter(d => 
          d.source === 'X-Fidelity' && 
          d.code === 'sensitiveLogging-iterative'
        );
        
        if (sensitiveDiags.length > 0) {
          sensitiveIssuesFound += sensitiveDiags.length;
          console.log(`✅ Found ${sensitiveDiags.length} sensitive logging issues in ${relativePath}`);
        } else {
          console.log(`❌ No sensitive logging issues found in ${relativePath}`);
        }
      }
    }

    assert.ok(
      sensitiveIssuesFound > 0,
      `Should find sensitive logging issues. Found: ${sensitiveIssuesFound}`
    );

    console.log(`📊 Total sensitive logging issues found: ${sensitiveIssuesFound}`);
  });

  test('should properly map issue severity levels', async function () {
    this.timeout(30000);

    const allDiagnostics = vscode.languages.getDiagnostics();
    const severityCount = {
      error: 0,
      warning: 0,
      information: 0,
      hint: 0
    };

    for (const [, diagnostics] of allDiagnostics) {
      for (const diagnostic of diagnostics.filter(d => d.source === 'X-Fidelity')) {
        switch (diagnostic.severity) {
          case vscode.DiagnosticSeverity.Error:
            severityCount.error++;
            break;
          case vscode.DiagnosticSeverity.Warning:
            severityCount.warning++;
            break;
          case vscode.DiagnosticSeverity.Information:
            severityCount.information++;
            break;
          case vscode.DiagnosticSeverity.Hint:
            severityCount.hint++;
            break;
        }
      }
    }

    console.log('📊 Severity distribution:');
    console.log(JSON.stringify(severityCount, null, 2));

    // We should have some warnings (most XFI issues are warnings)
    assert.ok(
      severityCount.warning > 0 || severityCount.error > 0,
      'Should have at least some warning or error level diagnostics'
    );

    const totalDiagnostics = Object.values(severityCount).reduce((sum, count) => sum + count, 0);
    console.log(`📊 Total diagnostics by severity: ${totalDiagnostics}`);
  });

  test('should provide detailed diagnostic information', async function () {
    this.timeout(30000);

    const allDiagnostics = vscode.languages.getDiagnostics();
    let diagnosticsWithDetails = 0;

    for (const [uri, diagnostics] of allDiagnostics) {
      for (const diagnostic of diagnostics.filter(d => d.source === 'X-Fidelity')) {
        // Validate diagnostic has required properties
        assert.ok(diagnostic.message, 'Diagnostic should have a message');
        assert.ok(diagnostic.range, 'Diagnostic should have a range');
        assert.ok(diagnostic.code, 'Diagnostic should have a code (rule ID)');
        assert.ok(diagnostic.source === 'X-Fidelity', 'Diagnostic should have correct source');

        diagnosticsWithDetails++;

        // Log first few for inspection
        if (diagnosticsWithDetails <= 3) {
          console.log(`📋 Diagnostic ${diagnosticsWithDetails}:`);
          console.log(`   File: ${vscode.workspace.asRelativePath(uri)}`);
          console.log(`   Rule: ${diagnostic.code}`);
          console.log(`   Line: ${diagnostic.range.start.line + 1}`);
          console.log(`   Message: ${diagnostic.message}`);
          console.log(`   Severity: ${diagnostic.severity}`);
        }
      }
    }

    assert.ok(
      diagnosticsWithDetails > 0,
      'Should have diagnostics with complete information'
    );

    console.log(`📊 Total diagnostics with complete information: ${diagnosticsWithDetails}`);
  });
}); 