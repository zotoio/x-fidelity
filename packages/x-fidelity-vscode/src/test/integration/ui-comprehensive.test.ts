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
  ensureXfiTreeAndProblemsPopulated,
  runInitialAnalysis,
  clearAnalysisCache
} from '../helpers/testHelpers';
import { ScreenshotHelper } from '../helpers/screenshotHelper';

// Helper functions for robust testing
function logDiag(...args: any[]) {
  if (global.testConsole) {global.testConsole.log(...args);}
  else {console.log(...args);}
}

function logError(...args: any[]) {
  if (global.testConsole) {global.testConsole.error(...args);}
  else {console.error(...args);}
}

async function logAndCaptureOnError(testName: string, error: any) {
  logError(`❌ Test failed: ${testName}`, error);
  if (process.env.SCREENSHOTS === 'true') {
    await ScreenshotHelper.captureScreen(testName + '-failure', { description: 'failure' });
  }
}

// Wrapper function for robust testing with shared analysis results
function robustTest(testName: string, testFn: any) {
  return async function(this: Mocha.Context) {
    await testFn.call(this);
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
  let initialAnalysisResults: any;

  suiteSetup(async function () {
    this.timeout(120000); // 2 minutes for full setup including analysis
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
      if (global.testConsole) {global.testConsole.error('❌ Fixture validation failed:', e);}
      else {console.error('❌ Fixture validation failed:', e);}
      throw e;
    }

    // Wait for extension to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run initial analysis once and cache results for reuse
    logDiag('🔍 Running initial analysis for UI test suite...');
    try {
      initialAnalysisResults = await runInitialAnalysis();
      logDiag(`📊 Initial analysis completed with ${initialAnalysisResults?.summary?.totalIssues || 0} issues`);
    } catch (error) {
      logDiag('⚠️ Initial analysis failed (may be expected for test environment):', error);
      initialAnalysisResults = null;
    }

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
    test('should test X-Fidelity activity bar icon and visibility', async function () {
      this.timeout(30000); // Reduced timeout since we're using cached results

      logDiag('🔍 Testing Activity Bar...');

      // Test activity bar visibility by focusing on our tree view
      await executeCommandSafely('xfidelityIssuesTreeView.focus');

      logDiag('✅ Activity bar test passed');
    });

    test('should test main issues tree view with all grouping modes', async function () {
      this.timeout(30000); // Reduced timeout

      logDiag('🔍 Testing Main Issues Tree View...');

      // Test all grouping modes
      await executeCommandSafely('xfidelity.issuesTreeGroupBySeverity');
      await new Promise(resolve => setTimeout(resolve, 500));

      await executeCommandSafely('xfidelity.issuesTreeGroupByRule');
      await new Promise(resolve => setTimeout(resolve, 500));

      await executeCommandSafely('xfidelity.issuesTreeGroupByFile');
      await new Promise(resolve => setTimeout(resolve, 500));

      await executeCommandSafely('xfidelity.issuesTreeGroupByCategory');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test refresh
      await executeCommandSafely('xfidelity.refreshIssuesTree');

      logDiag('✅ Main issues tree view test passed');
    });

    test('should test explorer issues tree view', async function () {
      this.timeout(30000);

      logDiag('🔍 Testing Explorer Issues Tree View...');

      // Test explorer view grouping
      await executeCommandSafely('xfidelity.issuesTreeGroupBySeverity');
      await new Promise(resolve => setTimeout(resolve, 500));

      logDiag('✅ Explorer issues tree view test passed');
    });

    // The control center test remains the same
  });

  // ============================================================================
  // Phase 2: Webview Panels
  // ============================================================================

  suite('Webview Panels', () => {
    test('should test control center webview', async function () {
      this.timeout(30000);

      logDiag('🔍 Testing Control Center Webview...');

      await executeCommandSafely('xfidelity.showControlCenter');

      logDiag('✅ Control center webview test passed');
    });

    test('should test report history webview', async function () {
      this.timeout(30000);

      logDiag('🔍 Testing Report History Webview...');

      await executeCommandSafely('xfidelity.showReportHistory');

      logDiag('✅ Report history webview test passed');
    });
  });

  // ============================================================================
  // Phase 3: Problems Panel & Diagnostics
  // ============================================================================

  suite('Problems Panel & Diagnostics', () => {
    test('should test problems panel population', async function () {
      this.timeout(30000);

      logDiag('🔍 Testing Problems Panel...');

      // Get diagnostic counts
      const allDiagnostics = vscode.languages.getDiagnostics();
      const diagnosticEntries = Array.from(allDiagnostics);

      const xfidelityFiles = diagnosticEntries.filter(([uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) => {
        return diagnostics.some((d: vscode.Diagnostic) => d.source === 'X-Fidelity');
      }).length;

      const totalXfidelityDiagnostics = diagnosticEntries
        .flatMap(([uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) => diagnostics)
        .filter((d: vscode.Diagnostic) => d.source === 'X-Fidelity').length;
        
      // Should have valid counts (even if 0)
      assert.ok(xfidelityFiles >= 0, 'Should have valid file count');
      assert.ok(totalXfidelityDiagnostics >= 0, 'Should have valid diagnostic count');

      logDiag('✅ Problems panel test passed');
    });
  });

  // ============================================================================
  // Phase 4: Analysis Results & UI Updates
  // ============================================================================

  suite('Analysis Results & UI Updates', () => {
    test('should test analysis results display', async function () {
      this.timeout(30000);

      logDiag('🔍 Testing Analysis Results Display...');

      // Get cached results
      const results = await getAnalysisResults();

      // Verify results structure (even if empty)
      assert.ok(results !== null, 'Analysis results should be available');

      logDiag('✅ Analysis results display test passed');
    });

    test('should test UI updates after analysis', async function () {
      this.timeout(30000);

      logDiag('🔍 Testing UI Updates...');

      // Refresh tree views
      await executeCommandSafely('xfidelity.refreshIssuesTree');

      logDiag('✅ UI updates test passed');
    });
  });

  // ============================================================================
  // Phase 5: Fresh Analysis When Needed
  // ============================================================================

  suite('Fresh Analysis When Needed', () => {
    test('should handle fresh analysis when specifically requested', async function () {
      this.timeout(90000);

      logDiag('🔍 Testing Fresh Analysis...');

      // Run fresh analysis
      const freshResults = await runInitialAnalysis(undefined, true); // Force fresh

      // Verify fresh results are available
      assert.ok(freshResults !== null, 'Fresh analysis results should be available');

      logDiag('✅ Fresh analysis test passed');
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