import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureExtensionActivated, assertCommandExists } from '../helpers/testHelpers';

suite('Extension Activation Tests', () => {
  let extension: vscode.Extension<any>;

  suiteSetup(async function() {
    this.timeout(30000);
    extension = await ensureExtensionActivated();
    // Wait for extension to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  test('should be present and activated', async function() {
    this.timeout(10000);
    
    assert.ok(extension, 'Extension should be found');
    assert.strictEqual(extension.isActive, true, 'Extension should be activated');
    
    const packageJson = extension.packageJSON;
    assert.ok(packageJson, 'Extension should have package.json');
    assert.strictEqual(packageJson.name, 'x-fidelity-vscode', 'Extension name should match');
    assert.ok(packageJson.version, 'Extension should have version');
    
    console.log(`✅ Extension activated: ${packageJson.displayName} v${packageJson.version}`);
  });

  test('should register all essential commands', async function() {
    this.timeout(15000);
    
    const commands = await vscode.commands.getCommands(true);
    const xfidelityCommands = commands.filter(cmd => cmd.startsWith('xfidelity.'));
    
    console.log(`Found ${xfidelityCommands.length} X-Fidelity commands:`, xfidelityCommands);
    
    // Essential commands that must be available
    const essentialCommands = [
      'xfidelity.test',
      'xfidelity.runAnalysis',
      'xfidelity.showControlCenter',
      'xfidelity.refreshIssuesTree',
      'xfidelity.detectArchetype',
      'xfidelity.runAnalysisWithDir',
      'xfidelity.getTestResults',
      'xfidelity.openSettings',
      'xfidelity.cancelAnalysis',
      'xfidelity.openReports',
      'xfidelity.resetConfiguration',
      'xfidelity.addExemption',
      'xfidelity.addBulkExemptions',
      'xfidelity.showRuleDocumentation',
      'xfidelity.showReportHistory',
      'xfidelity.exportReport',
      'xfidelity.shareReport',
      'xfidelity.compareReports',
      'xfidelity.viewTrends',
      'xfidelity.showAdvancedSettings',
      'xfidelity.showDashboard',
      'xfidelity.showIssueExplorer',
      'xfidelity.showOutput',
      'xfidelity.issuesTreeGroupBySeverity',
      'xfidelity.issuesTreeGroupByRule',
      'xfidelity.issuesTreeGroupByFile',
      'xfidelity.issuesTreeGroupByCategory'
    ];
    
    for (const command of essentialCommands) {
      await assertCommandExists(command);
    }
    
    console.log(`✅ All ${essentialCommands.length} essential commands registered`);
  });

  test('should execute test command successfully', async function() {
    this.timeout(5000);
    
    try {
      await vscode.commands.executeCommand('xfidelity.test');
      console.log('✅ Test command executed successfully');
    } catch (error) {
      assert.fail(`Test command failed: ${error}`);
    }
  });
});
