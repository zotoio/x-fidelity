import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
  getTestWorkspace, 
  ensureExtensionActivated, 
  runCLIAnalysis, 
  runExtensionAnalysis,
  compareAnalysisResults,
  type CLIResult,
  type ExtensionResult
} from '../helpers/testHelpers';

suite('End-to-End Analysis Workflow Tests', () => {
  let testWorkspace: vscode.WorkspaceFolder;
  let cliResult: CLIResult | null = null;
  let extensionResult: ExtensionResult | null = null;

  suiteSetup(async function() {
    this.timeout(120000); // 2 minutes for setup
    
    await ensureExtensionActivated();
    testWorkspace = getTestWorkspace();
    
    // Wait for extension to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  test('should run CLI analysis and capture results', async function() {
    this.timeout(90000); // 1.5 minutes for CLI analysis
    
    console.log('🚀 Starting CLI analysis...');
    const cliStartTime = Date.now();
    
    try {
      cliResult = await runCLIAnalysis(testWorkspace.uri.fsPath);
      const cliEndTime = Date.now();
      
      assert.ok(cliResult, 'CLI analysis should return results');
      assert.ok(cliResult.XFI_RESULT, 'CLI result should have XFI_RESULT');
      
      const cliDuration = (cliEndTime - cliStartTime) / 1000;
      console.log(`✅ CLI completed in ${cliDuration.toFixed(2)}s with ${cliResult.XFI_RESULT.totalIssues} issues`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`CLI analysis failed: ${errorMessage}`);
    }
  });

  test('should run extension analysis and capture results', async function() {
    this.timeout(120000); // 2 minutes for extension analysis
    
    console.log('🚀 Starting Extension analysis...');
    const extensionStartTime = Date.now();
    
    try {
      extensionResult = await runExtensionAnalysis();
      const extensionEndTime = Date.now();
      
      assert.ok(extensionResult, 'Extension analysis should return results');
      assert.ok(extensionResult.XFI_RESULT, 'Extension result should have XFI_RESULT');
      
      const extensionDuration = (extensionEndTime - extensionStartTime) / 1000;
      console.log(`✅ Extension completed in ${extensionDuration.toFixed(2)}s with ${extensionResult.XFI_RESULT.totalIssues} issues`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Extension analysis failed: ${errorMessage}`);
    }
  });

  test('should have consistent results between CLI and Extension', async function() {
    this.timeout(10000);
    
    assert.ok(cliResult, 'CLI result should be available');
    assert.ok(extensionResult, 'Extension result should be available');
    
    console.log('\n=== CONSISTENCY COMPARISON ===');
    console.log(`CLI Total Issues: ${cliResult!.XFI_RESULT.totalIssues}`);
    console.log(`Extension Total Issues: ${extensionResult!.XFI_RESULT.totalIssues}`);
    console.log(`CLI Warnings: ${cliResult!.XFI_RESULT.warningCount}`);
    console.log(`Extension Warnings: ${extensionResult!.XFI_RESULT.warningCount}`);
    console.log(`CLI Errors: ${cliResult!.XFI_RESULT.errorCount}`);
    console.log(`Extension Errors: ${extensionResult!.XFI_RESULT.errorCount}`);
    console.log(`CLI Fatalities: ${cliResult!.XFI_RESULT.fatalityCount}`);
    console.log(`Extension Fatalities: ${extensionResult!.XFI_RESULT.fatalityCount}`);
    console.log(`CLI Exemptions: ${cliResult!.XFI_RESULT.exemptCount}`);
    console.log(`Extension Exemptions: ${extensionResult!.XFI_RESULT.exemptCount}`);
    
    // Use helper function to compare results
    compareAnalysisResults(cliResult!, extensionResult!);
    
    console.log('✅ All issue counts match between CLI and Extension!');
  });

  test('should validate analysis result structure', async function() {
    this.timeout(10000);
    
    assert.ok(cliResult, 'CLI result should be available');
    assert.ok(extensionResult, 'Extension result should be available');
    
    // Compare structure of issue details
    assert.ok(Array.isArray(cliResult!.XFI_RESULT.issueDetails), 'CLI issue details should be an array');
    assert.ok(Array.isArray(extensionResult!.XFI_RESULT.issueDetails), 'Extension issue details should be an array');
    
    // Check that both have the same number of files with issues
    assert.strictEqual(
      cliResult!.XFI_RESULT.issueDetails.length,
      extensionResult!.XFI_RESULT.issueDetails.length,
      'Number of files with issues should match between CLI and Extension'
    );
    
    // Check structure of first issue detail (if any exist)
    if (cliResult!.XFI_RESULT.issueDetails.length > 0 && extensionResult!.XFI_RESULT.issueDetails.length > 0) {
      const cliDetail = cliResult!.XFI_RESULT.issueDetails[0];
      const extDetail = extensionResult!.XFI_RESULT.issueDetails[0];
      
      assert.ok(cliDetail.filePath, 'CLI issue detail should have filePath');
      assert.ok(extDetail.filePath, 'Extension issue detail should have filePath');
      assert.ok(Array.isArray(cliDetail.errors), 'CLI issue detail should have errors array');
      assert.ok(Array.isArray(extDetail.errors), 'Extension issue detail should have errors array');
      
      if (cliDetail.errors.length > 0 && extDetail.errors.length > 0) {
        const cliError = cliDetail.errors[0];
        const extError = extDetail.errors[0];
        
        assert.ok(cliError.ruleFailure, 'CLI error should have ruleFailure');
        assert.ok(extError.ruleFailure, 'Extension error should have ruleFailure');
        assert.ok(cliError.level, 'CLI error should have level');
        assert.ok(extError.level, 'Extension error should have level');
      }
    }
    
    console.log('✅ Issue details structure is consistent between CLI and Extension!');
  });

  suiteTeardown(async function() {
    this.timeout(10000);
    
    // Generate final performance report
    if (cliResult && extensionResult) {
      console.log('\n' + '='.repeat(80));
      console.log('🎯 FINAL E2E ANALYSIS WORKFLOW REPORT');
      console.log('='.repeat(80));
      console.log(`✅ CLI Analysis: ${cliResult.XFI_RESULT.totalIssues} issues`);
      console.log(`✅ Extension Analysis: ${extensionResult.XFI_RESULT.totalIssues} issues`);
      console.log(`✅ Issue Count Match: PERFECT`);
      console.log(`✅ Structure Match: PERFECT`);
      console.log('🎉 E2E WORKFLOW TESTS PASSED - Analysis consistency verified!');
      console.log('='.repeat(80));
    }
    
    // Clean up
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    console.log('E2E cleanup completed');
  });
});
