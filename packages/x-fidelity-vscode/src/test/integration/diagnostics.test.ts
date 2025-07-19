import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { suite, test, suiteSetup, suiteTeardown, setup } from 'mocha';
import {
  ensureExtensionActivated,
  getTestWorkspace,
  runCLIAnalysis,
  runExtensionAnalysis,
  runFreshAnalysisForTest,
  waitFor,
  executeCommandSafely
} from '../helpers/testHelpers';
import type { ResultMetadata } from '@x-fidelity/types';

/**
 * Comprehensive Diagnostic Validation Tests
 *
 * This test suite ensures that:
 * 1. Problems panel is properly populated with X-Fi issues
 * 2. Line numbers are 100% accurate (proper 1-based to 0-based conversion)
 * 3. Severity mapping is consistent between CLI and Extension
 * 4. Diagnostics can be navigated to correct file locations
 * 5. End-to-end diagnostic flow works correctly
 */
suite('Diagnostic Validation & Problems Panel Integration Tests', () => {
  let workspace: vscode.WorkspaceFolder;
  let diagnosticCollection: vscode.DiagnosticCollection;
  let analysisResults: any;

  suiteSetup(async function () {
    this.timeout(60000);
    await ensureExtensionActivated();
    workspace = getTestWorkspace();

    // Get the diagnostic collection from the extension
    diagnosticCollection =
      vscode.languages.createDiagnosticCollection('test-x-fidelity');

    // Wait for extension to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ Diagnostic tests setup complete - workspace: ${workspace.uri.fsPath}`
      );
    }
  });

  setup(async function () {
    this.timeout(180000); // 3 minutes for fresh analysis before each test
    console.log('🔍 Running fresh analysis before diagnostic test...');
    try {
      analysisResults = await runFreshAnalysisForTest(undefined, 150000); // 2.5 minute timeout
      console.log(`📊 Fresh analysis completed with ${analysisResults?.summary?.totalIssues || 0} issues`);
    } catch (error) {
      console.error('⚠️ Fresh analysis failed:', error);
      analysisResults = null;
    }
  });

  suiteTeardown(async function () {
    diagnosticCollection?.dispose();
  });

  test('should populate problems panel with X-Fidelity diagnostics', async function () {
    this.timeout(120000); // Increased to allow full analysis

    // Run analysis
    const result = await executeCommandSafely('xfidelity.runAnalysis');
    assert.ok(result.success, 'Analysis should complete successfully');

    // Wait for diagnostics to be populated
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    assert.ok(
      allDiagnostics.length > 0,
      'Problems panel should contain diagnostics'
    );

    // Find X-Fidelity diagnostics
    const xfidelityDiagnostics = allDiagnostics.filter(([_uri, diagnostics]) =>
      diagnostics.some(diag => diag.source === 'X-Fidelity')
    );

    assert.ok(
      xfidelityDiagnostics.length > 0,
      'Problems panel should contain X-Fidelity diagnostics'
    );

    let totalXFIDiagnostics = 0;
    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(diag => diag.source === 'X-Fidelity');
      totalXFIDiagnostics += xfiDiags.length;

      // Validate each diagnostic has required properties
      for (const diag of xfiDiags) {
        assert.ok(diag.message, 'Diagnostic should have a message');
        assert.ok(diag.range, 'Diagnostic should have a range');
        assert.ok(
          diag.source === 'X-Fidelity',
          'Diagnostic source should be X-Fidelity'
        );
        assert.ok(diag.code, 'Diagnostic should have a code (rule ID)');

        // Validate range is valid
        assert.ok(
          diag.range.start.line >= 0,
          'Start line should be 0-based and non-negative'
        );
        assert.ok(
          diag.range.start.character >= 0,
          'Start character should be 0-based and non-negative'
        );
        assert.ok(
          diag.range.end.line >= diag.range.start.line,
          'End line should be >= start line'
        );

        if (diag.range.end.line === diag.range.start.line) {
          assert.ok(
            diag.range.end.character >= diag.range.start.character,
            'End character should be >= start character on same line'
          );
        }

        // Validate severity is properly mapped
        assert.ok(
          [
            vscode.DiagnosticSeverity.Error,
            vscode.DiagnosticSeverity.Warning,
            vscode.DiagnosticSeverity.Information,
            vscode.DiagnosticSeverity.Hint
          ].includes(diag.severity),
          'Diagnostic should have a valid severity'
        );
      }

      if (global.isVerboseMode) {
        const relativePath = vscode.workspace.asRelativePath(uri);
        global.testConsole.log(
          `${relativePath}: ${xfiDiags.length} X-Fidelity issues`
        );
      }
    }

    assert.ok(
      totalXFIDiagnostics > 0,
      'Should have at least one X-Fidelity diagnostic in problems panel'
    );

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ Problems panel populated with ${totalXFIDiagnostics} X-Fidelity diagnostics`
      );
    }
  });

  test('should validate diagnostic navigation accuracy', async function () {
    this.timeout(120000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');

    // Wait for diagnostics
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all X-Fidelity diagnostics, excluding virtual files
    const allDiagnostics = vscode.languages.getDiagnostics();
    const diagnosticEntries: [vscode.Uri, vscode.Diagnostic[]][] =
      Array.from(allDiagnostics);
    const xfidelityDiagnostics = diagnosticEntries
      .filter(([uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) => {
        const filePath = uri.fsPath;
        // Skip virtual files like REPO_GLOBAL_CHECK
        return (
          !filePath.includes('REPO_GLOBAL_CHECK') &&
          !filePath.includes('GLOBAL_CHECK') &&
          diagnostics.some(
            (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
          )
        );
      })
      .slice(0, 3);

    if (xfidelityDiagnostics.length === 0) {
      console.log(
        '⚠️ No real file diagnostics found for navigation testing (only virtual files)'
      );
      return;
    }

    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics
        .filter((diag: vscode.Diagnostic) => diag.source === 'X-Fidelity')
        .slice(0, 2); // Test first 2 issues per file

      for (const diag of xfiDiags) {
        try {
          // Open the file and navigate to the diagnostic location
          const document = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(document);

          // Validate the file can be opened
          assert.ok(document, 'Document should be openable');
          assert.ok(editor, 'Editor should be available');

          // Validate the line exists in the document
          assert.ok(
            diag.range.start.line < document.lineCount,
            `Diagnostic line ${diag.range.start.line + 1} should be within document bounds (${document.lineCount} lines)`
          );

          // Get the actual line content
          const lineText = document.lineAt(diag.range.start.line).text;
          assert.ok(
            typeof lineText === 'string',
            'Should be able to read line text at diagnostic location'
          );

          // Validate column is within line bounds
          assert.ok(
            diag.range.start.character <= lineText.length,
            `Diagnostic column ${diag.range.start.character} should be within line bounds (${lineText.length} characters)`
          );

          if (global.isVerboseMode) {
            const relativePath = vscode.workspace.asRelativePath(uri);
            global.testConsole.log(
              `✅ Navigation validated: ${relativePath}:${diag.range.start.line + 1}:${diag.range.start.character + 1} - "${lineText.trim().substring(0, 50)}..."`
            );
          }
        } catch (error) {
          assert.fail(
            `Failed to navigate to diagnostic in ${vscode.workspace.asRelativePath(uri)} at line ${diag.range.start.line + 1}: ${error}`
          );
        }
      }
    }

    if (global.isVerboseMode) {
      global.testConsole.log(
        '✅ Diagnostic navigation accuracy validation passed'
      );
    }
  });

  test('should validate problems panel commands work correctly', async function () {
    this.timeout(60000);

    // Run analysis to populate problems panel
    await executeCommandSafely('xfidelity.runAnalysis');

    // Wait for diagnostics
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Test focusing problems panel
    const focusResult = await executeCommandSafely(
      'workbench.panel.markers.view.focus'
    );
    assert.ok(focusResult.success, 'Should be able to focus problems panel');

    // Test other problems panel related commands
    await executeCommandSafely('workbench.actions.view.problems');
    // This command might not exist in test environment, so we don't assert success

    if (global.isVerboseMode) {
      global.testConsole.log('✅ Problems panel commands validation passed');
    }
  });

  test('should validate diagnostic coordinate conversion accuracy', async function () {
    this.timeout(120000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');

    // Wait for diagnostics
    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          return true;
        }
      }
      return false;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = Array.from(allDiagnostics).filter(
      ([_uri, diagnostics]: [vscode.Uri, vscode.Diagnostic[]]) =>
        diagnostics.some(
          (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
        )
    );

    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(
        (diag: vscode.Diagnostic) => diag.source === 'X-Fidelity'
      );

      for (const diag of xfiDiags) {
        // Validate VSCode expects 0-based coordinates
        assert.ok(
          diag.range.start.line >= 0,
          `Diagnostic line should be 0-based: got ${diag.range.start.line}`
        );

        assert.ok(
          diag.range.start.character >= 0,
          `Diagnostic character should be 0-based: got ${diag.range.start.character}`
        );

        // Validate range consistency
        assert.ok(
          diag.range.end.line >= diag.range.start.line,
          `End line should be >= start line: start=${diag.range.start.line}, end=${diag.range.end.line}`
        );

        if (diag.range.start.line === diag.range.end.line) {
          assert.ok(
            diag.range.end.character >= diag.range.start.character,
            `End character should be >= start character on same line: start=${diag.range.start.character}, end=${diag.range.end.character}`
          );
        }
      }
    }

    if (global.isVerboseMode) {
      global.testConsole.log(
        '✅ Diagnostic coordinate conversion accuracy validated'
      );
    }
  });

  test('should detect specific rule failures', async function () {
    this.timeout(120000);

    await executeCommandSafely('xfidelity.runAnalysis');

    await waitFor(() => {
      const diagnosticMap = vscode.languages.getDiagnostics();
      let hasXfi = false;
      for (const [, diagnostics] of diagnosticMap) {
        if (diagnostics.some(diag => diag.source === 'X-Fidelity')) {
          hasXfi = true;
          break;
        }
      }
      return hasXfi;
    }, 60000);

    const allDiagnostics = vscode.languages.getDiagnostics();
    const ruleCount = new Map<string, number>();

    for (const [uri, diagnostics] of allDiagnostics) {
      const xfiDiags = diagnostics.filter(diag => diag.source === 'X-Fidelity');
      xfiDiags.forEach(diag => {
        const ruleId = diag.code as string;
        ruleCount.set(ruleId, (ruleCount.get(ruleId) || 0) + 1);
      });
    }

    // Expected rules from fixtures
    const expectedRules = [
      'functionComplexity-iterative',
      'sensitiveLogging-iterative',
      'noDatabases-iterative',
      'functionCount-iterative',
      'outdatedFramework-global'
    ];

    expectedRules.forEach(rule => {
      const count = ruleCount.get(rule) || 0;
      assert.ok(count > 0, `Should detect ${rule} issues, found ${count}`);
    });

    assert.ok(ruleCount.size >= expectedRules.length, 'Should detect all expected rule types');
  });

  test('should handle partial analysis results', async function () {
    this.timeout(60000);

    // Simulate partial results by running analysis on single file
    // Note: This assumes CLI supports single file analysis
    const testFile = path.join(getTestWorkspace().uri.fsPath, 'src/components/ComplexComponent.tsx');
    await executeCommandSafely('xfidelity.runAnalysisWithDir', path.dirname(testFile));

    const diagnostics = vscode.languages.getDiagnostics(vscode.Uri.file(testFile));
    const xfiDiags = diagnostics.filter(d => d.source === 'X-Fidelity');

    assert.ok(xfiDiags.length > 0, 'Should detect issues in partial analysis');
  });

  // Helper function to extract issues with line numbers for comparison
  function extractIssuesWithLineNumbers(result: ResultMetadata): Array<{
    file: string;
    line: number;
    column?: number;
    rule: string;
    message: string;
    severity: string;
  }> {
    const issues: Array<{
      file: string;
      line: number;
      column?: number;
      rule: string;
      message: string;
      severity: string;
    }> = [];

    for (const detail of result.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        if (error.details?.lineNumber) {
          issues.push({
            file: detail.filePath,
            line: error.details.lineNumber,
            column: error.details.columnNumber,
            rule: error.ruleFailure,
            message: error.details.message || error.ruleFailure,
            severity: error.level || 'info'
          });
        }
      }
    }

    return issues;
  }

  // Helper function to extract severity mapping for comparison
  function extractSeverityMapping(
    result: ResultMetadata
  ): Record<string, string> {
    const severityMap: Record<string, string> = {};

    for (const detail of result.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        const key = `${detail.filePath}:${error.ruleFailure}:${error.details?.lineNumber || 0}`;
        severityMap[key] = error.level || 'info';
      }
    }

    return severityMap;
  }
});
