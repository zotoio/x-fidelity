import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  assertCommandExists
} from '../helpers/testHelpers';

suite('Extension Commands Tests', () => {
  suiteSetup(async function () {
    this.timeout(30000);
    await ensureExtensionActivated();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should register all extension commands', async function () {
    this.timeout(10000);

    const allCommands = [
      // Core commands
      'xfidelity.test',
      'xfidelity.getTestResults',
      'xfidelity.runAnalysis',
      'xfidelity.cancelAnalysis',
      'xfidelity.openSettings',
      'xfidelity.showOutput',

      // UI commands
      'xfidelity.showControlCenter',
      'xfidelity.showDashboard',
      'xfidelity.showAdvancedSettings',
      'xfidelity.showPerformanceMetrics',

      // Periodic analysis commands
      'xfidelity.startPeriodicAnalysis',
      'xfidelity.stopPeriodicAnalysis',
      'xfidelity.restartPeriodicAnalysis',
      'xfidelity.showPeriodicAnalysisStatus',

      // Configuration commands
      'xfidelity.detectArchetype',
      'xfidelity.resetConfiguration',

      // Report commands
      'xfidelity.showReportHistory',
      'xfidelity.exportReport',
      'xfidelity.openReports',
      'xfidelity.shareReport',
      'xfidelity.compareReports',
      'xfidelity.viewTrends',

      // Tree view commands
      'xfidelity.refreshIssuesTree',
      'xfidelity.issuesTreeGroupBySeverity',
      'xfidelity.issuesTreeGroupByRule',
      'xfidelity.issuesTreeGroupByFile',
      'xfidelity.issuesTreeGroupByCategory',
      'xfidelity.goToIssue',
      'xfidelity.addIssueExemption',
      'xfidelity.showIssueRuleInfo',

      // Test/helper commands
      'xfidelity.runAnalysisWithDir',
      'xfidelity.showRuleDocumentation',
      'xfidelity.addExemption',
      'xfidelity.addBulkExemptions'
    ];

    for (const command of allCommands) {
      await assertCommandExists(command);
    }

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ All ${allCommands.length} extension commands are registered`
      );
    }
  });

  test('should execute UI commands gracefully', async function () {
    this.timeout(15000);

    const uiCommands = [
      'xfidelity.showControlCenter',
      'xfidelity.showDashboard',
      'xfidelity.showAdvancedSettings',
      'xfidelity.showPerformanceMetrics'
    ];

    for (const command of uiCommands) {
      const result = await executeCommandSafely(command);
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });

  test('should execute periodic analysis commands gracefully', async function () {
    this.timeout(15000);

    const periodicCommands = [
      'xfidelity.startPeriodicAnalysis',
      'xfidelity.stopPeriodicAnalysis',
      'xfidelity.restartPeriodicAnalysis',
      'xfidelity.showPeriodicAnalysisStatus'
    ];

    for (const command of periodicCommands) {
      const result = await executeCommandSafely(command);
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });

  test('should execute configuration commands gracefully', async function () {
    this.timeout(15000);

    const configCommands = [
      'xfidelity.detectArchetype',
      'xfidelity.resetConfiguration'
    ];

    for (const command of configCommands) {
      const result = await executeCommandSafely(command);
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });

  test('should execute tree view commands gracefully', async function () {
    this.timeout(15000);

    const treeViewCommands = [
      'xfidelity.refreshIssuesTree',
      'xfidelity.issuesTreeGroupBySeverity',
      'xfidelity.issuesTreeGroupByRule',
      'xfidelity.issuesTreeGroupByFile',
      'xfidelity.issuesTreeGroupByCategory'
    ];

    for (const command of treeViewCommands) {
      const result = await executeCommandSafely(command);
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });

  test('should execute exemption commands gracefully', async function () {
    this.timeout(10000);

    const testUri = vscode.Uri.file('/test/file.ts');
    const testRange = new vscode.Range(0, 0, 0, 10);

    const exemptionCommands = [
      {
        command: 'xfidelity.showRuleDocumentation',
        args: ['test-rule']
      },
      {
        command: 'xfidelity.addExemption',
        args: [testUri, testRange, 'test-rule']
      },
      {
        command: 'xfidelity.addBulkExemptions',
        args: [testUri, []]
      }
    ];

    for (const { command, args } of exemptionCommands) {
      const result = await executeCommandSafely(command, ...args);
      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ ${command}: ${result.success ? 'success' : 'handled gracefully'}`
        );
      }
    }
  });

  test('should execute helper commands gracefully', async function () {
    this.timeout(15000);

    const result = await executeCommandSafely(
      'xfidelity.runAnalysisWithDir',
      '/test/path'
    );

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ runAnalysisWithDir: ${result.success ? 'success' : 'handled gracefully'}`
      );
    }
  });
});
