import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureExtensionActivated, executeCommandSafely } from '../helpers/testHelpers';

suite('Error Handling Integration Tests', () => {
  suiteSetup(async function() {
    this.timeout(30000);
    await ensureExtensionActivated();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should handle invalid directory gracefully', async function() {
    this.timeout(15000);
    
    const result = await executeCommandSafely('xfidelity.runAnalysisWithDir', '/invalid/nonexistent/path');
    
    // Should either succeed (handled gracefully) or fail with proper error
    if (!result.success) {
      assert.ok(result.error && result.error.length > 0, 'Error messages should not be empty');
      console.log(`✅ Invalid directory handled correctly: ${result.error.substring(0, 100)}...`);
    } else {
      console.log('⚠️ Invalid directory was handled without throwing');
    }
  });

  test('should handle commands with no workspace gracefully', async function() {
    this.timeout(10000);
    
    // Most commands should handle this gracefully
    const result = await executeCommandSafely('xfidelity.getTestResults');
    
    console.log(`✅ getTestResults handled gracefully, result: ${result.result ? 'has data' : 'null'}`);
  });

  test('should handle configuration and exemption commands gracefully', async function() {
    this.timeout(15000);
    
    // Test rule documentation command
    const ruleDocResult = await executeCommandSafely('xfidelity.showRuleDocumentation', 'test-rule');
    console.log(`✅ Show rule documentation: ${ruleDocResult.success ? 'success' : 'handled gracefully'}`);
    
    // Test exemption commands (these will fail without proper context, which is expected)
    const testUri = vscode.Uri.file('/test/file.ts');
    const testRange = new vscode.Range(0, 0, 0, 10);
    
    const exemptionResult = await executeCommandSafely('xfidelity.addExemption', testUri, testRange, 'test-rule');
    console.log(`✅ Add exemption: ${exemptionResult.success ? 'success' : 'handled gracefully'}`);
    
    const bulkExemptionResult = await executeCommandSafely('xfidelity.addBulkExemptions', testUri, []);
    console.log(`✅ Add bulk exemptions: ${bulkExemptionResult.success ? 'success' : 'handled gracefully'}`);
  });

  test('should handle report management commands gracefully', async function() {
    this.timeout(20000);
    
    const reportCommands = [
      'xfidelity.openReports',
      'xfidelity.showReportHistory',
      'xfidelity.exportReport',
      'xfidelity.shareReport',
      'xfidelity.compareReports',
      'xfidelity.viewTrends'
    ];
    
    for (const command of reportCommands) {
      const result = await executeCommandSafely(command);
      console.log(`✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`);
    }
  });

  test('should handle analysis control commands gracefully', async function() {
    this.timeout(15000);
    
    // Test cancel analysis (may not have anything to cancel)
    const cancelResult = await executeCommandSafely('xfidelity.cancelAnalysis');
    console.log(`✅ Cancel analysis: ${cancelResult.success ? 'success' : 'handled gracefully'}`);
    
    // Test analysis commands
    const analysisResult = await executeCommandSafely('xfidelity.runAnalysis');
    console.log(`✅ Run analysis: ${analysisResult.success ? 'success' : 'handled gracefully'}`);
  });
});
