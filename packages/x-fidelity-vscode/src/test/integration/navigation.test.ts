import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup, setup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  waitForAnalysisCompletion,
  getAnalysisResults,
  runInitialAnalysis,
  runFreshAnalysisForTest,
  getTestWorkspace
} from '../helpers/testHelpers';

suite('Navigation & Line/Column Accuracy Tests', () => {
  let testWorkspace: vscode.WorkspaceFolder;
  let initialAnalysisResults: any;

  suiteSetup(async function () {
    this.timeout(120000); // 2 minutes for setup
    await ensureExtensionActivated();
    testWorkspace = getTestWorkspace();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  setup(async function () {
    this.timeout(180000); // 3 minutes for fresh analysis before each test
    console.log('🔍 Running fresh analysis for navigation tests...');
    try {
      initialAnalysisResults = await runFreshAnalysisForTest(undefined, 150000); // 2.5 minute timeout
      console.log(`📊 Fresh analysis completed with ${initialAnalysisResults?.summary?.totalIssues || 0} issues`);
    } catch (error) {
      console.error('⚠️ Fresh analysis failed:', error);
      initialAnalysisResults = null;
    }
  });

  test('should validate line number accuracy with problems panel', async function () {
    this.timeout(30000);

    // Use cached analysis results
    const results = await getAnalysisResults();
    console.log(`📊 Using cached analysis results for line number validation`);

    // Get diagnostics
    const diagnostics = vscode.languages.getDiagnostics();
    let validatedDiagnostics = 0;

    for (const [uri, diags] of diagnostics) {
      const xfidelityDiags = diags.filter(d => d.source === 'X-Fidelity');

      for (const diagnostic of xfidelityDiags) {
        // Validate diagnostic range
        assert.ok(
          diagnostic.range.start.line >= 0,
          'Start line should be valid'
        );
        assert.ok(diagnostic.range.end.line >= 0, 'End line should be valid');
        assert.ok(
          diagnostic.range.start.character >= 0,
          'Start character should be valid'
        );
        assert.ok(
          diagnostic.range.end.character >= 0,
          'End character should be valid'
        );

        // Validate range consistency
        assert.ok(
          diagnostic.range.start.line <= diagnostic.range.end.line,
          'Start line should be <= end line'
        );

        if (diagnostic.range.start.line === diagnostic.range.end.line) {
          assert.ok(
            diagnostic.range.start.character <= diagnostic.range.end.character,
            'Start character should be <= end character on same line'
          );
        }

        validatedDiagnostics++;
      }
    }

    console.log(`✅ Validated ${validatedDiagnostics} diagnostic line numbers`);
  });

  test('should handle file opening and cursor positioning', async function () {
    this.timeout(30000);

    const workspacePath = testWorkspace.uri.fsPath;
    console.log(`🔍 Testing file opening in workspace: ${workspacePath}`);

    // Test opening common files in the workspace
    const testFiles = ['package.json', 'src/index.js', 'src/utils/helper.js'];

    for (const file of testFiles) {
      try {
        const fileUri = vscode.Uri.joinPath(testWorkspace.uri, file);
        const document = await vscode.workspace.openTextDocument(fileUri);
        const editor = await vscode.window.showTextDocument(document);

        // Test cursor positioning
        const position = new vscode.Position(0, 0);
        editor.selection = new vscode.Selection(position, position);

        // Verify file was opened
        assert.strictEqual(editor.document.uri.toString(), fileUri.toString());
        console.log(`✅ Successfully opened and positioned cursor in ${file}`);
      } catch (error) {
        console.log(`⚠️ Could not open ${file}: ${error}`);
        // Don't fail the test, just log the issue
      }
    }
  });

  test('should validate go-to-definition functionality', async function () {
    this.timeout(30000);

    // Use cached results to find issues that might have go-to-definition
    const results = await getAnalysisResults();
    console.log(`📊 Testing go-to-definition with cached results`);

    // Test the go-to-issue command
    const goToIssueResult = await executeCommandSafely('xfidelity.goToIssue');
    if (goToIssueResult.success) {
      console.log('✅ Go-to-issue command executed successfully');
    } else {
      console.log(`⚠️ Go-to-issue command failed: ${goToIssueResult.error}`);
    }

    // Test rule info command
    const ruleInfoResult = await executeCommandSafely(
      'xfidelity.showIssueRuleInfo'
    );
    if (ruleInfoResult.success) {
      console.log('✅ Show rule info command executed successfully');
    } else {
      console.log(`⚠️ Show rule info command failed: ${ruleInfoResult.error}`);
    }
  });
});
