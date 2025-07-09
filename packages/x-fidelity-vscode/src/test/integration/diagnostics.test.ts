import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { suite, test, suiteSetup, suiteTeardown } from 'mocha';
import {
  ensureExtensionActivated,
  getTestWorkspace,
  runCLIAnalysis,
  runExtensionAnalysis,
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

  suiteTeardown(async function () {
    diagnosticCollection?.dispose();
  });

  test('should validate line number accuracy with CLI comparison', async function () {
    this.timeout(120000);

    const workspacePath = workspace.uri.fsPath;

    // Run CLI analysis to get ground truth
    const cliResult = await runCLIAnalysis(workspacePath);
    assert.ok(cliResult.XFI_RESULT, 'CLI analysis should return XFI_RESULT');

    // Run extension analysis
    const extensionResult = await runExtensionAnalysis();
    assert.ok(
      extensionResult.XFI_RESULT,
      'Extension analysis should return XFI_RESULT'
    );

    // Validate that both found the same number of issues
    assert.strictEqual(
      cliResult.XFI_RESULT.totalIssues,
      extensionResult.XFI_RESULT.totalIssues,
      'CLI and Extension should find the same number of issues'
    );

    // Extract line number information from both results
    const cliIssues = extractIssuesWithLineNumbers(cliResult);
    const extensionIssues = extractIssuesWithLineNumbers(extensionResult);

    if (global.isVerboseMode) {
      global.testConsole.log(
        `CLI found ${cliIssues.length} issues with line numbers`
      );
      global.testConsole.log(
        `Extension found ${extensionIssues.length} issues with line numbers`
      );
    }

    // Validate that line numbers match between CLI and Extension
    for (const cliIssue of cliIssues) {
      const matchingExtensionIssue = extensionIssues.find(
        ext =>
          ext.file === cliIssue.file &&
          ext.rule === cliIssue.rule &&
          ext.message === cliIssue.message
      );

      assert.ok(
        matchingExtensionIssue,
        `Extension should have matching issue for CLI issue: ${cliIssue.file}:${cliIssue.line} [${cliIssue.rule}]`
      );

      assert.strictEqual(
        matchingExtensionIssue.line,
        cliIssue.line,
        `Line numbers should match for ${cliIssue.file} [${cliIssue.rule}]: CLI=${cliIssue.line}, Extension=${matchingExtensionIssue.line}`
      );

      if (cliIssue.column && matchingExtensionIssue.column) {
        assert.strictEqual(
          matchingExtensionIssue.column,
          cliIssue.column,
          `Column numbers should match for ${cliIssue.file}:${cliIssue.line} [${cliIssue.rule}]`
        );
      }
    }

    if (global.isVerboseMode) {
      global.testConsole.log('✅ Line number accuracy validation passed');
    }
  });

  test('should validate severity mapping consistency', async function () {
    this.timeout(60000);

    const workspacePath = workspace.uri.fsPath;

    // Run CLI analysis
    const cliResult = await runCLIAnalysis(workspacePath);

    // Run extension analysis
    const extensionResult = await runExtensionAnalysis();

    // Extract severity information
    const cliSeverities = extractSeverityMapping(cliResult);
    const extensionSeverities = extractSeverityMapping(extensionResult);

    // Validate severity counts match
    assert.strictEqual(
      cliResult.XFI_RESULT.errorCount,
      extensionResult.XFI_RESULT.errorCount,
      'Error counts should match between CLI and Extension'
    );

    assert.strictEqual(
      cliResult.XFI_RESULT.warningCount,
      extensionResult.XFI_RESULT.warningCount,
      'Warning counts should match between CLI and Extension'
    );

    // Validate individual issue severities match
    for (const [key, cliSeverity] of Object.entries(cliSeverities)) {
      const extensionSeverity = extensionSeverities[key];
      assert.ok(
        extensionSeverity,
        `Extension should have severity mapping for issue: ${key}`
      );

      assert.strictEqual(
        extensionSeverity,
        cliSeverity,
        `Severity should match for issue ${key}: CLI=${cliSeverity}, Extension=${extensionSeverity}`
      );
    }

    if (global.isVerboseMode) {
      global.testConsole.log(
        '✅ Severity mapping consistency validation passed'
      );
    }
  });

  test('should populate problems panel correctly', async function () {
    this.timeout(90000);

    // Run analysis
    const result = await executeCommandSafely('xfidelity.runAnalysis');
    assert.ok(result.success, 'Analysis should complete successfully');

    // Wait for diagnostics to be populated
    await waitFor(async () => {
      const diagnostics = vscode.languages.getDiagnostics();
      return diagnostics.length > 0;
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

  test('should validate specific file line number accuracy', async function () {
    this.timeout(60000);

    // Focus on ComplexComponent.tsx which should have function complexity issues
    const complexComponentPath = path.join(
      workspace.uri.fsPath,
      'src',
      'components',
      'ComplexComponent.tsx'
    );

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');

    // Wait for diagnostics
    await waitFor(async () => {
      const diagnostics = vscode.languages.getDiagnostics();
      return diagnostics.length > 0;
    }, 30000);

    // Find diagnostics for ComplexComponent.tsx
    const complexComponentUri = vscode.Uri.file(complexComponentPath);
    const complexComponentDiagnostics =
      vscode.languages.getDiagnostics(complexComponentUri);

    if (complexComponentDiagnostics.length === 0) {
      if (global.isVerboseMode) {
        global.testConsole.log(
          '⚠️ No diagnostics found for ComplexComponent.tsx - this may be expected'
        );
      }
      return;
    }

    // Validate specific known issues
    const functionComplexityDiagnostics = complexComponentDiagnostics.filter(
      diag => diag.code && diag.code.toString().includes('functionComplexity')
    );

    if (functionComplexityDiagnostics.length > 0) {
      for (const diag of functionComplexityDiagnostics) {
        // Validate line numbers are reasonable for the complex functions
        // The processComplexDataWithManyConditions function starts around line 20
        // The validateAndTransformComplexStructure function starts around line 120
        assert.ok(
          diag.range.start.line >= 19, // 0-based, so line 20 is index 19
          `Function complexity issue should be on a reasonable line number (got ${diag.range.start.line + 1})`
        );

        assert.ok(
          diag.range.start.line < 200, // File has 199 lines
          `Function complexity issue should be within file bounds (got ${diag.range.start.line + 1})`
        );

        if (global.isVerboseMode) {
          global.testConsole.log(
            `Function complexity issue at line ${diag.range.start.line + 1}: ${diag.message}`
          );
        }
      }

      if (global.isVerboseMode) {
        global.testConsole.log(
          `✅ Found ${functionComplexityDiagnostics.length} function complexity issues with valid line numbers`
        );
      }
    }
  });

  test('should validate diagnostic navigation accuracy', async function () {
    this.timeout(60000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');

    // Wait for diagnostics
    await waitFor(async () => {
      const diagnostics = vscode.languages.getDiagnostics();
      return diagnostics.length > 0;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = allDiagnostics
      .filter(([_uri, diagnostics]) =>
        diagnostics.some(diag => diag.source === 'X-Fidelity')
      )
      .slice(0, 3); // Test first 3 files to avoid timeout

    for (const [uri, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics
        .filter(diag => diag.source === 'X-Fidelity')
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
    await waitFor(async () => {
      const diagnostics = vscode.languages.getDiagnostics();
      return diagnostics.length > 0;
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
    this.timeout(60000);

    // Run analysis
    await executeCommandSafely('xfidelity.runAnalysis');

    // Wait for diagnostics
    await waitFor(async () => {
      const diagnostics = vscode.languages.getDiagnostics();
      return diagnostics.length > 0;
    }, 30000);

    // Get all X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    const xfidelityDiagnostics = allDiagnostics.filter(([_uri, diagnostics]) =>
      diagnostics.some(diag => diag.source === 'X-Fidelity')
    );

    for (const [, diagnostics] of xfidelityDiagnostics) {
      const xfiDiags = diagnostics.filter(diag => diag.source === 'X-Fidelity');

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
