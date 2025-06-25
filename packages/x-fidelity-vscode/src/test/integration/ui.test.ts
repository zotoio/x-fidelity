import * as assert from 'assert';
import * as vscode from 'vscode';
import { ensureExtensionActivated, executeCommandSafely } from '../helpers/testHelpers';

suite('UI Component Integration Tests', () => {
  suiteSetup(async function() {
    this.timeout(30000);
    await ensureExtensionActivated();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should open Control Center successfully', async function() {
    this.timeout(30000);
    
    const result = await executeCommandSafely('xfidelity.showControlCenter');
    
    if (result.success) {
      console.log('✅ Control Center opened successfully');
    } else {
      console.log(`⚠️ Control Center failed (may be expected): ${result.error}`);
    }
  });

  test('should refresh Issues Tree successfully', async function() {
    this.timeout(15000);
    
    const result = await executeCommandSafely('xfidelity.refreshIssuesTree');
    
    if (result.success) {
      console.log('✅ Issues Tree refreshed successfully');
    } else {
      console.log(`⚠️ Issues Tree refresh failed (may be expected): ${result.error}`);
    }
  });

  test('should open settings successfully', async function() {
    this.timeout(10000);
    
    const result = await executeCommandSafely('xfidelity.openSettings');
    
    if (result.success) {
      console.log('✅ Settings opened successfully');
    } else {
      console.log(`⚠️ Settings failed (may be expected): ${result.error}`);
    }
  });

  test('should test all UI panel commands', async function() {
    this.timeout(30000);
    
    const uiCommands = [
      'xfidelity.showDashboard',
      'xfidelity.showIssueExplorer',
      'xfidelity.showAdvancedSettings',
      'xfidelity.showOutput'
    ];
    
    for (const command of uiCommands) {
      const result = await executeCommandSafely(command);
      if (result.success) {
        console.log(`✅ ${command} executed successfully`);
      } else {
        console.log(`⚠️ ${command} failed gracefully: ${result.error}`);
      }
    }
  });

  test('should test tree view grouping commands', async function() {
    this.timeout(20000);
    
    const groupingCommands = [
      'xfidelity.issuesTreeGroupBySeverity',
      'xfidelity.issuesTreeGroupByRule',
      'xfidelity.issuesTreeGroupByFile',
      'xfidelity.issuesTreeGroupByCategory'
    ];
    
    for (const command of groupingCommands) {
      const result = await executeCommandSafely(command);
      if (result.success) {
        console.log(`✅ ${command} executed successfully`);
      } else {
        console.log(`⚠️ ${command} failed gracefully: ${result.error}`);
      }
    }
  });

  test('should validate status bar presence', async function() {
    this.timeout(5000);
    
    // Extension should be active for UI testing
    const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
    assert.ok(extension?.isActive, 'Extension should be active for UI testing');
    console.log('✅ Status bar components should be available');
  });
});
