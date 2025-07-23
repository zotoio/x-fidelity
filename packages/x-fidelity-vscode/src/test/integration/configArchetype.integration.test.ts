import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { suite, test, suiteSetup, suiteTeardown, teardown } from 'mocha';
import { ConfigManager } from '../../configuration/configManager';
import {
  ensureExtensionActivated,
  executeCommandSafely
} from '../helpers/testHelpers';

suite('ConfigManager Archetype Resolution Integration Tests', () => {
  let configManager: ConfigManager;
  let originalConfig: any;
  let tempDir: string;

  suiteSetup(async function () {
    this.timeout(30000);
    await ensureExtensionActivated();

    // Create a unique temp directory for this test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xfi-config-test-'));

    // Create ConfigManager instance
    const context = {
      extensionPath: path.join(__dirname, '..', '..', '..'),
      subscriptions: []
    } as unknown as vscode.ExtensionContext;

    configManager = new ConfigManager(context);
  });

  suiteTeardown(async function () {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  teardown(async function () {
    // Reset any configuration changes
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const workspaceConfig = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);
      await workspaceConfig.update('localConfigPath', '', vscode.ConfigurationTarget.Workspace);
    } catch (error) {
      // Ignore reset errors
    }
  });

  test('should use demo archetype configuration', async function () {
    this.timeout(10000);

    // Test that archetype resolution works with demo config
    const config = configManager.getConfig();
    
    assert.ok(config.archetype, 'Should have a default archetype');
    assert.strictEqual(config.archetype, 'node-fullstack', 'Should default to node-fullstack archetype');
  });

  test('should handle configuration loading', async function () {
    this.timeout(10000);

    // Test basic configuration loading
    const config = configManager.getConfig();
    
    assert.ok(config, 'Should return a configuration object');
    assert.ok(typeof config.archetype === 'string', 'Archetype should be a string');
    assert.ok(typeof config.analysisTimeout === 'number', 'Analysis timeout should be a number');
  });

  test('should handle localConfigPath updates', async function () {
    this.timeout(10000);

    const testConfigPath = path.join(tempDir, 'test-config');
    
    // Get configuration with proper workspace context
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceConfig = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);
    await workspaceConfig.update('localConfigPath', testConfigPath, vscode.ConfigurationTarget.Workspace);

    // Reload configuration
    const config = configManager.getConfig();
    
    assert.ok(config, 'Should return configuration after update');
  });

  test('should handle invalid archetype gracefully', async function () {
    this.timeout(10000);

    // Test with an invalid archetype
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceConfig = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);
    
    await workspaceConfig.update('archetype', 'invalid-archetype', vscode.ConfigurationTarget.Workspace);
    
    // Should still return a valid configuration
    const config = configManager.getConfig();
    assert.ok(config, 'Should handle invalid archetype gracefully');
    
    // Reset to valid archetype
    await workspaceConfig.update('archetype', 'node-fullstack', vscode.ConfigurationTarget.Workspace);
  });

  test('should handle configuration validation', async function () {
    this.timeout(10000);

    const config = configManager.getConfig();
    
    // Test that required configuration properties exist
    assert.ok(typeof config.analysisTimeout === 'number', 'analysisTimeout should be a number');
    assert.ok(config.analysisTimeout > 0, 'analysisTimeout should be positive');
    assert.ok(Array.isArray(config.excludePatterns), 'excludePatterns should be an array');
    assert.ok(Array.isArray(config.includePatterns), 'includePatterns should be an array');
  });

  test('should handle workspace configuration updates', async function () {
    this.timeout(10000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceConfig = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);
    
    // Test updating a configuration value
    const originalTimeout = configManager.getConfig().analysisTimeout;
    const newTimeout = originalTimeout + 5000;
    
    await configManager.updateConfig({ analysisTimeout: newTimeout });
    
    const updatedConfig = configManager.getConfig();
    assert.strictEqual(updatedConfig.analysisTimeout, newTimeout, 'Configuration should be updated');
    
    // Reset to original value
    await configManager.updateConfig({ analysisTimeout: originalTimeout });
  });
}); 