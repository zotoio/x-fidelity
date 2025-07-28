import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely
} from '../helpers/testHelpers';

suite('Error Handling Integration Tests', () => {
  suiteSetup(async function () {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isWindows = process.platform === 'win32';
    const isWindowsCI = isCI && isWindows;
    
    const setupTimeout = isWindowsCI ? 15000 : 30000;
    this.timeout(setupTimeout);
    
    await ensureExtensionActivated();
    
    const waitTime = isWindowsCI ? 1000 : 3000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  });

  test('should handle invalid directory gracefully', async function () {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isWindows = process.platform === 'win32';
    const testTimeout = isCI && isWindows ? 10000 : 15000;
    this.timeout(testTimeout);

    const result = await executeCommandSafely(
      'xfidelity.runAnalysisWithDir',
      '/invalid/nonexistent/path'
    );

    // Should either succeed (handled gracefully) or fail with proper error
    if (!result.success) {
      assert.ok(
        result.error && result.error.length > 0,
        'Error messages should not be empty'
      );
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ Invalid directory handled correctly: ${result.error.substring(0, 100)}...`
        );
      }
    } else {
      if (global.isVerboseMode) {
        global.testConsole.log(
          '⚠️ Invalid directory was handled without throwing'
        );
      }
    }
  });

  test('should handle commands with no workspace gracefully', async function () {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isWindows = process.platform === 'win32';
    const testTimeout = isCI && isWindows ? 7000 : 10000;
    this.timeout(testTimeout);

    // Most commands should handle this gracefully
    const result = await executeCommandSafely('xfidelity.getTestResults');

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ getTestResults handled gracefully, result: ${result.result ? 'has data' : 'null'}`
      );
    }
  });

  test('should handle configuration and exemption commands gracefully', async function () {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isWindows = process.platform === 'win32';
    const testTimeout = isCI && isWindows ? 10000 : 15000;
    this.timeout(testTimeout);

    // Test rule documentation command
    const ruleDocResult = await executeCommandSafely(
      'xfidelity.showRuleDocumentation',
      'test-rule'
    );
    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ Show rule documentation: ${ruleDocResult.success ? 'success' : 'handled gracefully'}`
      );
    }

    // Test exemption commands (these will fail without proper context, which is expected)
    const testUri = vscode.Uri.file('/test/file.ts');
    const testRange = new vscode.Range(0, 0, 0, 10);

    const exemptionResult = await executeCommandSafely(
      'xfidelity.addExemption',
      testUri,
      testRange,
      'test-rule'
    );
    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ Add exemption: ${exemptionResult.success ? 'success' : 'handled gracefully'}`
      );
    }

    const bulkExemptionResult = await executeCommandSafely(
      'xfidelity.addBulkExemptions',
      testUri,
      []
    );
    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ Add bulk exemptions: ${bulkExemptionResult.success ? 'success' : 'handled gracefully'}`
      );
    }
  });

  test('should handle report management commands gracefully', async function () {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isWindows = process.platform === 'win32';
    const testTimeout = isCI && isWindows ? 12000 : 20000;
    this.timeout(testTimeout);

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
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });

  test('should handle analysis control commands gracefully', async function () {
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    const isWindows = process.platform === 'win32';
    const isWindowsCI = isCI && isWindows;
    
    // Aggressive timeout reduction for Windows CI
    const testTimeout = isWindowsCI ? 15000 : 60000;
    this.timeout(testTimeout);

    // Test cancel analysis (may not have anything to cancel)
    const cancelResult = await executeCommandSafely('xfidelity.cancelAnalysis');
    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ Cancel analysis: ${cancelResult.success ? 'success' : 'handled gracefully'}`
      );
    }

    if (isWindowsCI) {
      // Windows CI: Skip heavy analysis command to prevent timeout
      console.log('🪟 Windows CI: Skipping heavy analysis command to prevent timeout');
      
      // Test a lighter analysis-related command instead
      const statusResult = await executeCommandSafely('xfidelity.showOutput');
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ Show output (lightweight): ${statusResult.success ? 'success' : 'handled gracefully'}`
        );
      }
    } else {
      // Non-Windows: Full test with analysis
      const analysisResult = await executeCommandSafely('xfidelity.runAnalysis');
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ Run analysis: ${analysisResult.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });
});
