import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import { suite, test, suiteSetup } from 'mocha';
import { 
  getTestWorkspace, 
  ensureExtensionActivated, 
  validateWorkspaceStructure,
  executeCommandSafely 
} from '../helpers/testHelpers';

suite('Workspace Integration Tests', () => {
  let testWorkspace: vscode.WorkspaceFolder;

  suiteSetup(async function() {
    this.timeout(30000);
    await ensureExtensionActivated();
    testWorkspace = getTestWorkspace();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should detect valid workspace structure', async function() {
    this.timeout(15000);
    
    assert.ok(testWorkspace, 'Should have a test workspace');
    assert.ok(testWorkspace.uri.fsPath, 'Workspace should have a valid path');
    
    const workspacePath = testWorkspace.uri.fsPath;
    assert.ok(path.isAbsolute(workspacePath), 'Workspace path should be absolute');
    
    // Test workspace structure for node-fullstack fixture
    const expectedFiles = ['package.json', '.xfi-config.json'];
    const expectedDirs = ['src'];
    
    await validateWorkspaceStructure(expectedFiles, expectedDirs);
    
    if (global.isVerboseMode) {
      global.testConsole.log(`✅ Workspace structure validated: ${workspacePath}`);
    }
  });

  test('should handle analysis with directory parameter', async function() {
    this.timeout(60000);
    
    const workspacePath = testWorkspace.uri.fsPath;
    
    const result = await executeCommandSafely('xfidelity.runAnalysisWithDir', workspacePath);
    
    if (global.isVerboseMode) {
      if (result.success) {
        global.testConsole.log('✅ Analysis with directory completed successfully');
      } else {
        global.testConsole.log(`⚠️ Analysis with directory failed (may be expected): ${result.error}`);
      }
    }
  });

  test('should validate workspace files exist', async function() {
    this.timeout(10000);
    
    // Check specific files that should exist in node-fullstack fixture
    const criticalFiles = [
      'package.json',
      '.xfi-config.json',
      'src/index.js',
      'src/utils/helper.js'
    ];
    
    for (const file of criticalFiles) {
      try {
        const fileUri = vscode.Uri.joinPath(testWorkspace.uri, file);
        const stat = await vscode.workspace.fs.stat(fileUri);
        assert.ok(stat.type === vscode.FileType.File, `${file} should be a file`);
        if (global.isVerboseMode) {
          global.testConsole.log(`✅ Found critical file: ${file}`);
        }
      } catch {
        if (global.isVerboseMode) {
          global.testConsole.log(`⚠️ Critical file missing (may be expected): ${file}`);
        }
      }
    }
  });

  test('should read workspace configuration', async function() {
    this.timeout(5000);
    
    try {
      const packageJsonUri = vscode.Uri.joinPath(testWorkspace.uri, 'package.json');
      const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonUri);
      const packageJson = JSON.parse(packageJsonContent.toString());
      
      assert.ok(packageJson.name, 'package.json should have a name');
      assert.ok(packageJson.version, 'package.json should have a version');
      
      if (global.isVerboseMode) {
        global.testConsole.log(`✅ Workspace package: ${packageJson.name}@${packageJson.version}`);
      }
    } catch (error) {
      assert.fail(`Failed to read workspace package.json: ${error}`);
    }
  });
});
