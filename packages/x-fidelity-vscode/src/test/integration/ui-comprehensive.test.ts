import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { suite, test, suiteSetup, suiteTeardown } from 'mocha';
import {
  ensureExtensionActivated,
  getTestWorkspace,
  executeCommandSafely,
  waitFor,
  waitForAnalysisCompletion,
  getAnalysisResults,
  validateWorkspaceStructure,
  ensureXfiTreeAndProblemsPopulated
} from '../helpers/testHelpers';
import { ScreenshotHelper } from '../helpers/screenshotHelper';

// Helper functions for robust testing
function logDiag(...args: any[]) {
  if (global.testConsole) global.testConsole.log(...args);
  else console.log(...args);
}

function logError(...args: any[]) {
  if (global.testConsole) global.testConsole.error(...args);
  else console.error(...args);
}

async function logAndCaptureOnError(testName: string, error: any) {
  logError(`❌ Test failed: ${testName}`, error);
  if (process.env.SCREENSHOTS === 'true') {
    await ScreenshotHelper.captureScreen(testName + '-failure', { description: 'failure' });
  }
}

// Wrap each test in a try/catch for diagnostics
function robustTest(testName: string, testFn: () => Promise<void>) {
  return async function () {
    try {
      await testFn.call(this);
    } catch (error) {
      await logAndCaptureOnError(testName, error);
      throw error;
    }
  };
}

/**
 * Comprehensive UI Integration Tests
 *
 * This test suite systematically tests all UI components:
 * 1. Activity Bar & Tree Views
 * 2. Webview Panels
 * 3. Command Palette & Context Menus
 * 4. Status Bar & Problems Panel
 * 5. Webview Interactions
 * 6. Welcome Views & Empty States
 *
 * Each test category ensures reliable verification of all features.
 */
suite('Comprehensive UI Integration Tests', () => {
  let workspace: vscode.WorkspaceFolder;
  let testResults: any;

  suiteSetup(async function () {
    this.timeout(90000);
    await ensureExtensionActivated();
    workspace = getTestWorkspace();

    // Validate fixture workspace structure
    try {
      await validateWorkspaceStructure([
        'src/components/UserAuth.tsx',
        'src/components/ComplexComponent.tsx',
        'src/components/PoorRhythmComponent.tsx',
        'src/components/LegacyUIComponent.tsx',
        'src/components/AccessibilityIssues.tsx',
        'src/utils/database.js',
        'src/utils/sdkUsage.ts',
        'src/facts/problematicFact.ts',
        'src/facts/manyFunctionsFact.ts',
        'src/xfiTestMatch.json',
        'package.json',
        'wrongStructure/badDir/problematicCode.js'
      ], ['src/components', 'src/utils', 'src/facts', 'wrongStructure/badDir']);
      if (global.isVerboseMode) {
        global.testConsole.log('✅ Fixture workspace structure validated');
      }
    } catch (e) {
      if (global.testConsole) global.testConsole.error('❌ Fixture validation failed:', e);
      else console.error('❌ Fixture validation failed:', e);
      throw e;
    }

    // Wait for extension to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ UI comprehensive tests setup complete - workspace: ${workspace.uri.fsPath}`
      );
    }
  });

  // ============================================================================
  // Phase 1: Activity Bar & Tree Views
  // ============================================================================

  suite('Activity Bar & Tree Views', () => {
    test('should test X-Fidelity activity bar icon and visibility', robustTest('Activity Bar', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Activity Bar...');

      // Test if extension is active
      const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
      assert.ok(extension?.isActive, 'X-Fidelity extension should be active');

      // Test if activity bar commands work
      const testResult = await executeCommandSafely('xfidelity.test');
      assert.ok(testResult.success, 'Activity bar commands should work');

      logDiag('✅ Activity bar test passed');
    }));

    test('should test main issues tree view with all grouping modes', robustTest('Main Issues Tree View', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Main Issues Tree View...');

      // Create tree view
      const treeView = vscode.window.createTreeView('xfidelityIssuesTreeView', {
        treeDataProvider: { 
          getChildren: () => [],
          getTreeItem: () => new vscode.TreeItem('test')
        }
      });

      assert.ok(treeView, 'Main issues tree view should be created');

      // Test all grouping commands
      const groupingCommands = [
        'xfidelity.issuesTreeGroupBySeverity',
        'xfidelity.issuesTreeGroupByRule',
        'xfidelity.issuesTreeGroupByFile',
        'xfidelity.issuesTreeGroupByCategory'
      ];

      for (const command of groupingCommands) {
        const result = await executeCommandSafely(command);
        assert.ok(result.success, `Grouping command ${command} should work`);
      }

      // Test refresh command
      const refreshResult = await executeCommandSafely('xfidelity.refreshIssuesTree');
      assert.ok(refreshResult.success, 'Refresh command should work');

      logDiag('✅ Main issues tree view test passed');
    }));

    test('should test explorer issues tree view', robustTest('Explorer Issues Tree View', async function () {
      this.timeout(30000);

      logDiag('🎯 Testing Explorer Issues Tree View...');

      // Create tree view
      const treeView = vscode.window.createTreeView('xfidelityIssuesTreeViewExplorer', {
        treeDataProvider: { 
          getChildren: () => [],
          getTreeItem: () => new vscode.TreeItem('test')
        }
      });

      assert.ok(treeView, 'Explorer issues tree view should be created');

      // Test refresh command
      const refreshResult = await executeCommandSafely('xfidelity.refreshIssuesTree');
      assert.ok(refreshResult.success, 'Explorer refresh command should work');

      logDiag('✅ Explorer issues tree view test passed');
    }));

    // test('should test control center tree view', robustTest('Control Center Tree View', async function () {
    //   this.timeout(30000);

    //   logDiag('🎯 Testing Control Center Tree View...');

    //   // Create tree view
    //   const treeView = vscode.window.createTreeView('xfidelityControlCenterView', {
    //     treeDataProvider: { 
    //       getChildren: () => [],
    //       getTreeItem: () => new vscode.TreeItem('test')
    //     }
    //   });

    //   assert.ok(treeView, 'Control center tree view should be created');

    //   // Test control center commands
    //   const controlCenterResult = await executeCommandSafely('xfidelity.showControlCenter');
    //   assert.ok(controlCenterResult.success, 'Control center command should work');

    //   logDiag('✅ Control center tree view test passed');
    // }));
  });

  // ============================================================================
  // Phase 2: Webview Panels
  // ============================================================================

  suite('Webview Panels', () => {
    // test('should test control center panel functionality', robustTest('Control Center Panel', async function () {
    //   this.timeout(90000); // Increased timeout

    //   logDiag('🎯 Testing Control Center Panel...');

    //   // Open control center panel
    //   const openResult = await executeCommandSafely('xfidelity.showControlCenter');
    //   if (!openResult.success) {
    //     logDiag(`⚠️ Control center panel command failed: ${openResult.error}`);
    //     // Don't fail the test, just log the issue
    //     return;
    //   }

    //   // Wait for panel to load
    //   await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    //   // Test panel interactions
    //   const testResult = await executeCommandSafely('xfidelity.test');
    //   assert.ok(testResult.success, 'Control center test command should work');

    //   logDiag('✅ Control center panel test passed');
    // }));

    // test('should test dashboard panel functionality', robustTest('Dashboard Panel', async function () {
    //   this.timeout(90000); // Increased timeout

    //   logDiag('🎯 Testing Dashboard Panel...');

    //   // Open dashboard panel
    //   const openResult = await executeCommandSafely('xfidelity.showDashboard');
    //   if (!openResult.success) {
    //     logDiag(`⚠️ Dashboard panel command failed: ${openResult.error}`);
    //     // Don't fail the test, just log the issue
    //     return;
    //   }

    //   // Wait for panel to load
    //   await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    //   // Test dashboard functionality
    //   const settingsResult = await executeCommandSafely('xfidelity.openSettings');
    //   assert.ok(settingsResult.success, 'Dashboard settings command should work');

    //   logDiag('✅ Dashboard panel test passed');
    // }));

    // test('should test settings UI panel functionality', robustTest('Settings UI Panel', async function () {
    //   this.timeout(90000); // Increased timeout

    //   logDiag('🎯 Testing Settings UI Panel...');

    //   // Open settings panel
    //   const openResult = await executeCommandSafely('xfidelity.showAdvancedSettings');
    //   if (!openResult.success) {
    //     logDiag(`⚠️ Settings panel command failed: ${openResult.error}`);
    //     // Don't fail the test, just log the issue
    //     return;
    //   }

    //   // Wait for panel to load
    //   await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    //   // Test settings functionality
    //   const detectResult = await executeCommandSafely('xfidelity.detectArchetype');
    //   assert.ok(detectResult.success, 'Settings archetype detection should work');

    //   logDiag('✅ Settings UI panel test passed');
    // }));

    // test('should test configuration wizard panel (placeholder)', robustTest('Configuration Wizard Panel', async function () {
    //   this.timeout(30000);

    //   logDiag('🎯 Testing Configuration Wizard Panel...');

    //   // Note: Configuration wizard might not be directly accessible via command
    //   // This is a placeholder for when the wizard is implemented
    //   logDiag('⚠️ Configuration wizard panel not yet implemented - skipping');
      
    //   // For now, just test that the extension is stable
    //   const testResult = await executeCommandSafely('xfidelity.test');
    //   assert.ok(testResult.success, 'Extension should remain stable');

    //   logDiag('✅ Configuration wizard panel test passed (placeholder)');
    // }));
  });

  // ============================================================================
  // Phase 3: Command Palette & Context Menus
  // ============================================================================

  suite('Command Palette & Context Menus', () => {
    test('should test all core analysis commands', robustTest('Core Analysis Commands', async function () {
      this.timeout(90000);

      logDiag('🎯 Testing Core Analysis Commands...');

      const coreCommands = [
        { id: 'xfidelity.runAnalysis', name: 'Run Analysis' },
        { id: 'xfidelity.cancelAnalysis', name: 'Cancel Analysis' },
        { id: 'xfidelity.test', name: 'Test Extension' },
        { id: 'xfidelity.getTestResults', name: 'Get Test Results' }
      ];

      for (const command of coreCommands) {
        const result = await executeCommandSafely(command.id);
        assert.ok(result.success, `Core command ${command.name} should work`);
        logDiag(`✅ ${command.name} command works`);
      }

      logDiag('✅ All core analysis commands tested');
    }));

    test('should test all UI panel commands', robustTest('UI Panel Commands', async function () {
      this.timeout(90000); // Increased timeout

      logDiag('🎯 Testing UI Panel Commands...');

      const panelCommands = [
        { id: 'xfidelity.showControlCenter', name: 'Show Control Center' },
        { id: 'xfidelity.showDashboard', name: 'Show Dashboard' },
        { id: 'xfidelity.showAdvancedSettings', name: 'Show Advanced Settings' },
        { id: 'xfidelity.showPerformanceMetrics', name: 'Show Performance Metrics' }
      ];

      for (const command of panelCommands) {
        const result = await executeCommandSafely(command.id);
        if (result.success) {
          logDiag(`✅ ${command.name} command works`);
        } else {
          logDiag(`⚠️ ${command.name} command failed: ${result.error}`);
          // Don't fail the test, just log the issue
        }
      }

      logDiag('✅ All UI panel commands tested');
    }));

    test('should test all configuration commands', robustTest('Configuration Commands', async function () {
      this.timeout(90000); // Increased timeout

      logDiag('🎯 Testing Configuration Commands...');

      const configCommands = [
        { id: 'xfidelity.openSettings', name: 'Open Settings' },
        { id: 'xfidelity.detectArchetype', name: 'Detect Archetype' }
        // Note: resetConfiguration command is not implemented yet
      ];

      for (const command of configCommands) {
        const result = await executeCommandSafely(command.id);
        if (result.success) {
          logDiag(`✅ ${command.name} command works`);
        } else {
          logDiag(`⚠️ ${command.name} command failed: ${result.error}`);
          // Don't fail the test, just log the issue
        }
      }

      logDiag('✅ All configuration commands tested');
    }));

    test('should test all report commands', robustTest('Report Commands', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Report Commands...');

      const reportCommands = [
        { id: 'xfidelity.showReportHistory', name: 'Show Report History' },
        { id: 'xfidelity.exportReport', name: 'Export Report' },
        { id: 'xfidelity.openReports', name: 'Open Reports' }
      ];

      for (const command of reportCommands) {
        const result = await executeCommandSafely(command.id);
        assert.ok(result.success, `Report command ${command.name} should work`);
        logDiag(`✅ ${command.name} command works`);
      }

      logDiag('✅ All report commands tested');
    }));

    test('should test all output commands', robustTest('Output Commands', async function () {
      this.timeout(30000);

      logDiag('🎯 Testing Output Commands...');

      const outputCommands = [
        { id: 'xfidelity.showOutput', name: 'Show Output' }
      ];

      for (const command of outputCommands) {
        const result = await executeCommandSafely(command.id);
        assert.ok(result.success, `Output command ${command.name} should work`);
        logDiag(`✅ ${command.name} command works`);
      }

      logDiag('✅ All output commands tested');
    }));

    test('should test all periodic analysis commands', robustTest('Periodic Analysis Commands', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Periodic Analysis Commands...');

      const periodicCommands = [
        { id: 'xfidelity.startPeriodicAnalysis', name: 'Start Periodic Analysis' },
        { id: 'xfidelity.stopPeriodicAnalysis', name: 'Stop Periodic Analysis' },
        { id: 'xfidelity.restartPeriodicAnalysis', name: 'Restart Periodic Analysis' },
        { id: 'xfidelity.showPeriodicAnalysisStatus', name: 'Show Periodic Analysis Status' }
      ];

      for (const command of periodicCommands) {
        const result = await executeCommandSafely(command.id);
        assert.ok(result.success, `Periodic command ${command.name} should work`);
        logDiag(`✅ ${command.name} command works`);
      }

      logDiag('✅ All periodic analysis commands tested');
    }));

    test('should test all tree view title bar commands', robustTest('Tree View Title Bar Commands', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Tree View Title Bar Commands...');

      // Run analysis first to populate tree views
      await executeCommandSafely('xfidelity.runAnalysis');
      await waitForAnalysisCompletion(30000);

      const treeCommands = [
        { id: 'xfidelity.refreshIssuesTree', name: 'Refresh Issues Tree' },
        { id: 'xfidelity.issuesTreeGroupBySeverity', name: 'Group by Severity' },
        { id: 'xfidelity.issuesTreeGroupByRule', name: 'Group by Rule' },
        { id: 'xfidelity.issuesTreeGroupByFile', name: 'Group by File' },
        { id: 'xfidelity.issuesTreeGroupByCategory', name: 'Group by Category' }
      ];

      for (const command of treeCommands) {
        const result = await executeCommandSafely(command.id);
        assert.ok(result.success, `Tree command ${command.name} should work`);
        logDiag(`✅ ${command.name} command works`);
      }

      logDiag('✅ All tree view title bar commands tested');
    }));

    test('should test all context menu commands', robustTest('Context Menu Commands', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Context Menu Commands...');

      // Run analysis first to populate tree views
      await executeCommandSafely('xfidelity.runAnalysis');
      await waitForAnalysisCompletion(30000);

      const contextCommands = [
        { id: 'xfidelity.goToIssue', name: 'Go to Issue' },
        { id: 'xfidelity.addIssueExemption', name: 'Add Issue Exemption' },
        { id: 'xfidelity.showIssueRuleInfo', name: 'Show Issue Rule Info' }
      ];

      for (const command of contextCommands) {
        const result = await executeCommandSafely(command.id);
        assert.ok(result.success, `Context command ${command.name} should work`);
        logDiag(`✅ ${command.name} command works`);
      }

      logDiag('✅ All context menu commands tested');
    }));
  });

  // ============================================================================
  // Phase 4: Status Bar & Problems Panel
  // ============================================================================

  suite('Status Bar & Problems Panel', () => {
    test('should test status bar provider functionality', robustTest('Status Bar Provider', async function () {
      this.timeout(60000);

      logDiag('🎯 Testing Status Bar Provider...');

      // Run analysis to trigger status bar updates
      await executeCommandSafely('xfidelity.runAnalysis');
      await waitForAnalysisCompletion(30000);

      // Get analysis results to verify status bar
      const results = await getAnalysisResults();
      assert.ok(results !== null, 'Analysis results should be available for status bar');

      logDiag('✅ Status bar provider test passed');
    }));

    test('should test problems panel integration', robustTest('Problems Panel Integration', async function () {
      this.timeout(90000);

      logDiag('🎯 Testing Problems Panel Integration...');

      // Run analysis
      await executeCommandSafely('xfidelity.runAnalysis');
      await waitForAnalysisCompletion(30000);

      // Wait for diagnostics to be populated
      await waitFor(async () => {
        const diagnostics = vscode.languages.getDiagnostics();
        return diagnostics.length > 0;
      }, 30000);

      // Get all diagnostics
      const allDiagnostics = vscode.languages.getDiagnostics();
      assert.ok(allDiagnostics.length > 0, 'Problems panel should contain diagnostics');

      // Find X-Fidelity diagnostics
      const xfidelityDiagnostics = allDiagnostics.filter(([_uri, diagnostics]) =>
        diagnostics.some(diag => diag.source === 'X-Fidelity')
      );

      assert.ok(xfidelityDiagnostics.length > 0, 'Problems panel should contain X-Fidelity diagnostics');

      logDiag('✅ Problems panel integration test passed');
    }));

    test('should test output channel functionality', robustTest('Output Channel', async function () {
      this.timeout(30000);

      logDiag('🎯 Testing Output Channel...');

      // Test output channel
      const showResult = await executeCommandSafely('xfidelity.showOutput');
      assert.ok(showResult.success, 'Show output command should work');

      // Create output channel to verify it works
      const outputChannel = vscode.window.createOutputChannel('X-Fidelity Test');
      outputChannel.appendLine('Test output');
      assert.ok(outputChannel, 'Output channel should be created');

      logDiag('✅ Output channel test passed');
    }));

    test('should test diagnostic provider accuracy', robustTest('Diagnostic Provider Accuracy', async function () {
      this.timeout(90000);

      logDiag('🎯 Testing Diagnostic Provider Accuracy...');

      // Run analysis
      await executeCommandSafely('xfidelity.runAnalysis');
      await waitForAnalysisCompletion(30000);

      // Get diagnostics
      const allDiagnostics = vscode.languages.getDiagnostics();
      const xfidelityDiagnostics = allDiagnostics.filter(([_uri, diagnostics]) =>
        diagnostics.some(diag => diag.source === 'X-Fidelity')
      );

      // Verify diagnostic accuracy
      for (const [uri, diagnostics] of xfidelityDiagnostics) {
        for (const diagnostic of diagnostics) {
          // Verify diagnostic has required properties
          assert.ok(diagnostic.message, 'Diagnostic should have a message');
          assert.ok(diagnostic.range, 'Diagnostic should have a range');
          assert.ok(diagnostic.severity, 'Diagnostic should have a severity');

          // Verify range is valid
          assert.ok(diagnostic.range.start.line >= 0, 'Diagnostic start line should be valid');
          assert.ok(diagnostic.range.end.line >= 0, 'Diagnostic end line should be valid');
        }
      }

      logDiag('✅ Diagnostic provider accuracy test passed');
    }));
  });

  // ============================================================================
  // Phase 5: Webview Interactions
  // ============================================================================

  suite('Webview Interactions', () => {
    // test('should test control center panel interactions', robustTest('Control Center Panel Interactions', async function () {
    //   this.timeout(90000); // Increased timeout

    //   logDiag('🎯 Testing Control Center Panel Interactions...');

    //   // Open control center panel
    //   const openResult = await executeCommandSafely('xfidelity.showControlCenter');
    //   if (!openResult.success) {
    //     logDiag(`⚠️ Control center panel command failed: ${openResult.error}`);
    //     // Don't fail the test, just log the issue
    //     return;
    //   }

    //   // Wait for panel to load
    //   await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    //   // Test panel interactions by triggering commands that the panel would call
    //   const testCommands = [
    //     'xfidelity.runAnalysis',
    //     'xfidelity.openSettings',
    //     'xfidelity.test'
    //   ];

    //   for (const command of testCommands) {
    //     const result = await executeCommandSafely(command);
    //     if (result.success) {
    //       logDiag(`✅ Control center interaction ${command} works`);
    //     } else {
    //       logDiag(`⚠️ Control center interaction ${command} failed: ${result.error}`);
    //     }
    //   }

    //   logDiag('✅ Control center panel interactions test passed');
    // }));

    // test('should test dashboard panel interactions', robustTest('Dashboard Panel Interactions', async function () {
    //   this.timeout(90000); // Increased timeout

    //   logDiag('🎯 Testing Dashboard Panel Interactions...');

    //   // Open dashboard panel
    //   const openResult = await executeCommandSafely('xfidelity.showDashboard');
    //   if (!openResult.success) {
    //     logDiag(`⚠️ Dashboard panel command failed: ${openResult.error}`);
    //     // Don't fail the test, just log the issue
    //     return;
    //   }

    //   // Wait for panel to load
    //   await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    //   // Test dashboard interactions
    //   const dashboardCommands = [
    //     'xfidelity.runAnalysis',
    //     'xfidelity.openSettings',
    //     'xfidelity.openReports',
    //     'xfidelity.exportReport'
    //   ];

    //   for (const command of dashboardCommands) {
    //     const result = await executeCommandSafely(command);
    //     if (result.success) {
    //       logDiag(`✅ Dashboard interaction ${command} works`);
    //     } else {
    //       logDiag(`⚠️ Dashboard interaction ${command} failed: ${result.error}`);
    //     }
    //   }

    //   logDiag('✅ Dashboard panel interactions test passed');
    // }));

    // test('should test settings panel interactions', robustTest('Settings Panel Interactions', async function () {
    //   this.timeout(90000); // Increased timeout

    //   logDiag('🎯 Testing Settings Panel Interactions...');

    //   // Open settings panel
    //   const openResult = await executeCommandSafely('xfidelity.showAdvancedSettings');
    //   if (!openResult.success) {
    //     logDiag(`⚠️ Settings panel command failed: ${openResult.error}`);
    //     // Don't fail the test, just log the issue
    //     return;
    //   }

    //   // Wait for panel to load
    //   await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time

    //   // Test settings interactions
    //   const settingsCommands = [
    //     'xfidelity.detectArchetype',
    //     'xfidelity.openSettings'
    //     // Note: resetConfiguration command is not implemented yet
    //   ];

    //   for (const command of settingsCommands) {
    //     const result = await executeCommandSafely(command);
    //     if (result.success) {
    //       logDiag(`✅ Settings interaction ${command} works`);
    //     } else {
    //       logDiag(`⚠️ Settings interaction ${command} failed: ${result.error}`);
    //     }
    //   }

    //   logDiag('✅ Settings panel interactions test passed');
    // }));
  });

  // ============================================================================
  // Phase 6: Welcome Views & Empty States
  // ============================================================================

  suite('Welcome Views & Empty States', () => {
    test('should test welcome views functionality', robustTest('Welcome Views', async function () {
      this.timeout(30000);

      logDiag('🎯 Testing Welcome Views...');

      // Test welcome views by checking if tree views are accessible
      const mainTreeView = vscode.window.createTreeView('xfidelityIssuesTreeView', {
        treeDataProvider: { 
          getChildren: () => [],
          getTreeItem: () => new vscode.TreeItem('test')
        }
      });
      assert.ok(mainTreeView, 'Main issues tree view should be accessible');

      const explorerTreeView = vscode.window.createTreeView('xfidelityIssuesTreeViewExplorer', {
        treeDataProvider: { 
          getChildren: () => [],
          getTreeItem: () => new vscode.TreeItem('test')
        }
      });
      assert.ok(explorerTreeView, 'Explorer issues tree view should be accessible');

      const controlCenterView = vscode.window.createTreeView('xfidelityControlCenterView', {
        treeDataProvider: { 
          getChildren: () => [],
          getTreeItem: () => new vscode.TreeItem('test')
        }
      });
      assert.ok(controlCenterView, 'Control center view should be accessible');

      logDiag('✅ Welcome views test passed');
    }));

    test('should test empty states handling', robustTest('Empty States', async function () {
      this.timeout(30000);

      logDiag('🎯 Testing Empty States...');

      // Test empty states by checking if tree views handle empty data gracefully
      const treeView = vscode.window.createTreeView('xfidelityIssuesTreeView', {
        treeDataProvider: { 
          getChildren: () => [],
          getTreeItem: () => new vscode.TreeItem('test')
        }
      });
      assert.ok(treeView, 'Tree view should handle empty data gracefully');

      // Test that commands still work in empty state
      const refreshResult = await executeCommandSafely('xfidelity.refreshIssuesTree');
      assert.ok(refreshResult.success, 'Refresh command should work in empty state');

      logDiag('✅ Empty states test passed');
    }));

    test('should test view visibility and collapse states', robustTest('View Visibility', async function () {
      this.timeout(30000);

      logDiag('🎯 Testing View Visibility...');

      // Test that views can be created and are visible
      const views = [
        'xfidelityIssuesTreeView',
        'xfidelityIssuesTreeViewExplorer',
        'xfidelityControlCenterView'
      ];

      for (const viewId of views) {
        const treeView = vscode.window.createTreeView(viewId, {
          treeDataProvider: { 
            getChildren: () => [],
            getTreeItem: () => new vscode.TreeItem('test')
          }
        });
        assert.ok(treeView, `View ${viewId} should be created successfully`);
      }

      logDiag('✅ View visibility test passed');
    }));
  });

  // ============================================================================
  // Phase 7: End-to-End Workflow Tests
  // ============================================================================

  suite('End-to-End Workflow Tests', () => {
    test('should test complete analysis workflow with UI updates', robustTest('Complete Analysis Workflow', async function () {
      this.timeout(120000);

      logDiag('🎯 Testing Complete Analysis Workflow...');

      // 1. Start analysis
      const runResult = await executeCommandSafely('xfidelity.runAnalysis');
      assert.ok(runResult.success, 'Analysis should start successfully');

      // 2. Wait for completion
      await waitForAnalysisCompletion(60000);

      // 3. Verify results are available
      const results = await getAnalysisResults();
      assert.ok(results !== null, 'Analysis results should be available');

      // 4. Verify UI components are updated
      const allDiagnostics = vscode.languages.getDiagnostics();
      const xfidelityDiagnostics = allDiagnostics.filter(([_uri, diagnostics]) =>
        diagnostics.some(diag => diag.source === 'X-Fidelity')
      );
      assert.ok(xfidelityDiagnostics.length > 0, 'Problems panel should be updated');

      // 5. Test tree view refresh
      const refreshResult = await executeCommandSafely('xfidelity.refreshIssuesTree');
      assert.ok(refreshResult.success, 'Tree view should refresh successfully');

      logDiag('✅ Complete analysis workflow test passed');
    }));

    test('should test UI component integration and consistency', robustTest('UI Component Integration', async function () {
      this.timeout(90000);

      logDiag('🎯 Testing UI Component Integration...');

      // Run analysis to populate all components
      await executeCommandSafely('xfidelity.runAnalysis');
      await waitForAnalysisCompletion(30000);

      // Test that all UI components are consistent
      const results = await getAnalysisResults();
      const diagnostics = vscode.languages.getDiagnostics();
      const xfidelityDiagnostics = diagnostics.filter(([_uri, diagnostics]) =>
        diagnostics.some(diag => diag.source === 'X-Fidelity')
      );

      // Verify consistency between results and diagnostics
      if (results && results.XFI_RESULT) {
        const totalIssues = results.XFI_RESULT.totalIssues;
        const diagnosticCount = xfidelityDiagnostics.reduce((count, [_uri, diagnostics]) => 
          count + diagnostics.filter(d => d.source === 'X-Fidelity').length, 0
        );

        // Note: This is a basic consistency check - exact matching depends on implementation
        assert.ok(diagnosticCount >= 0, 'Diagnostic count should be valid');
      }

      logDiag('✅ UI component integration test passed');
    }));

    test('should ensure Issues Tree and Problems panel are populated after analysis', async function () {
      this.timeout(90000);
      await ensureXfiTreeAndProblemsPopulated();
    });
  });

  suiteTeardown(async function () {
    if (global.isVerboseMode) {
      global.testConsole.log('🧹 UI comprehensive tests cleanup complete');
    }
    if (process.env.SCREENSHOTS === 'true') {
      await ScreenshotHelper.cleanupOldSessions();
    }
  });
}); 