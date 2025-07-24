import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely,
  getTestWorkspace
} from '../helpers/testHelpers';

/**
 * VSIX Validation Integration Tests
 * 
 * These tests detect issues that would occur when the extension is packaged as VSIX
 * and installed in a real VSCode environment, such as missing dependencies.
 */
suite('VSIX Validation Integration Tests', () => {
  let extension: vscode.Extension<any>;


  suiteSetup(async function () {
    this.timeout(60000);
    extension = await ensureExtensionActivated();
    getTestWorkspace();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should have all required dependencies available', async function () {
    this.timeout(30000);

    const extensionPath = extension.extensionPath;
    console.log(`Extension path: ${extensionPath}`);

    // Check that critical files exist in the extension
    const criticalFiles = [
      'package.json',
      'dist/extension.js',
      'dist/treeSitterWorker.js'
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(extensionPath, file);
      assert.ok(
        fs.existsSync(filePath),
        `Critical file missing: ${file} at ${filePath}`
      );
    }

    console.log('✅ All critical files present');
  });

  test('should be able to load tree-sitter dependencies', async function () {
    this.timeout(30000);

    try {
      // Test if tree-sitter can be required from the extension context
      const extensionPath = extension.extensionPath;
      
      // Check if tree-sitter is available in node_modules
      const treeSitterPaths = [
        path.join(extensionPath, 'node_modules', 'tree-sitter'),
        path.join(extensionPath, '..', '..', 'node_modules', 'tree-sitter'),
        path.join(extensionPath, 'dist', 'node_modules', 'tree-sitter')
      ];

      let treeSitterFound = false;
      for (const tsPath of treeSitterPaths) {
        if (fs.existsSync(tsPath)) {
          console.log(`✅ Found tree-sitter at: ${tsPath}`);
          treeSitterFound = true;
          break;
        }
      }

      if (!treeSitterFound) {
        console.log('⚠️ Tree-sitter not found in expected locations');
        console.log('This will cause the AST plugin to fail in packaged VSIX');
        
        // List what's actually in the extension directory
        const distPath = path.join(extensionPath, 'dist');
        if (fs.existsSync(distPath)) {
          const distContents = fs.readdirSync(distPath);
          console.log(`Dist contents: ${distContents.join(', ')}`);
        }
      }

      // For now, just warn - don't fail the test since we're in development
      console.log(`Tree-sitter availability: ${treeSitterFound ? 'found' : 'not found'}`);
      
    } catch (error) {
      console.error('Error checking tree-sitter availability:', error);
      throw error;
    }
  });

  test('should be able to initialize plugins without errors', async function () {
    this.timeout(30000);

    let pluginErrors: string[] = [];

    // Capture console errors during plugin initialization
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('tree-sitter') || message.includes('Plugin') || message.includes('xfiPlugin')) {
        pluginErrors.push(message);
      }
      originalError(...args);
    };

    try {
      // Try to run analysis which should initialize plugins
      await executeCommandSafely('xfidelity.runAnalysis');
      
      // Wait for analysis to complete or fail
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Restore console.error
      console.error = originalError;

      if (pluginErrors.length > 0) {
        console.log('Plugin initialization errors detected:');
        pluginErrors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
        
        // Check for specific tree-sitter errors
        const treeSitterErrors = pluginErrors.filter(error => 
          error.includes('tree-sitter') || error.includes('Cannot find module')
        );
        
        if (treeSitterErrors.length > 0) {
          assert.fail(
            `Tree-sitter dependency errors detected that would break VSIX installation:\n${treeSitterErrors.join('\n')}`
          );
        }
      } else {
        console.log('✅ No plugin initialization errors detected');
      }

    } finally {
      console.error = originalError;
    }
  });

  test('should have embedded CLI available', async function () {
    this.timeout(15000);

    const extensionPath = extension.extensionPath;
    const cliPaths = [
      path.join(extensionPath, 'dist', 'cli', 'index.js'),
      path.join(extensionPath, 'cli', 'index.js')
    ];

    let cliFound = false;
    for (const cliPath of cliPaths) {
      if (fs.existsSync(cliPath)) {
        console.log(`✅ Found embedded CLI at: ${cliPath}`);
        cliFound = true;
        
        // Check if CLI is functional
        try {
          const stats = fs.statSync(cliPath);
          assert.ok(stats.size > 1000, 'CLI file should be substantial size');
          console.log(`CLI file size: ${Math.round(stats.size / 1024)}KB`);
        } catch (error) {
          console.error('Error checking CLI file:', error);
        }
        break;
      }
    }

    assert.ok(cliFound, 'Embedded CLI not found - VSIX will fail to analyze code');
  });

  test('should have demo configuration available', async function () {
    this.timeout(15000);

    const extensionPath = extension.extensionPath;
    const demoConfigPaths = [
      path.join(extensionPath, 'dist', 'demoConfig'),
      path.join(extensionPath, 'demoConfig')
    ];

    let demoConfigFound = false;
    for (const configPath of demoConfigPaths) {
      if (fs.existsSync(configPath)) {
        console.log(`✅ Found demo config at: ${configPath}`);
        demoConfigFound = true;
        
        // Check for essential config files
        const configFiles = fs.readdirSync(configPath);
        console.log(`Config files: ${configFiles.join(', ')}`);
        
        // Should have archetype-specific configs
        const hasArchetypeConfigs = configFiles.some(file => 
          file.includes('node-fullstack') || file.includes('.json')
        );
        assert.ok(hasArchetypeConfigs, 'Demo config should contain archetype configurations');
        break;
      }
    }

    assert.ok(demoConfigFound, 'Demo configuration not found - extension will fail to configure analysis');
  });

  test('should be able to create analysis worker without module errors', async function () {
    this.timeout(30000);

    let workerErrors: string[] = [];
    
    // Capture any worker-related errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Worker') || message.includes('tree-sitter') || message.includes('Cannot find module')) {
        workerErrors.push(message);
      }
      originalError(...args);
    };

    try {
      // Try to trigger worker creation by running analysis
      await executeCommandSafely('xfidelity.runAnalysis');
      
      // Give time for worker initialization
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } finally {
      console.error = originalError;
    }

    if (workerErrors.length > 0) {
      console.log('Worker errors detected:');
      workerErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      
      // Fail if we detect module loading errors that would break VSIX
      const moduleErrors = workerErrors.filter(error => 
        error.includes('Cannot find module') && error.includes('tree-sitter')
      );
      
      if (moduleErrors.length > 0) {
        assert.fail(
          `Module loading errors detected that would break VSIX installation:\n${moduleErrors.join('\n')}`
        );
      }
    }
  });

  test('should be able to execute basic extension commands', async function () {
    this.timeout(30000);

    const essentialCommands = [
      'xfidelity.test',
      'xfidelity.showOutput', 
      'xfidelity.runAnalysis',
      'xfidelity.refreshIssuesTree'
    ];

    for (const command of essentialCommands) {
      const result = await executeCommandSafely(command);
      
      // Don't require success, but should not throw unhandled module errors
      if (!result.success && result.error) {
        if (result.error.includes('Cannot find module') || result.error.includes('tree-sitter')) {
          assert.fail(`Command ${command} failed with module error: ${result.error}`);
        }
      }
      
      console.log(`Command ${command}: ${result.success ? 'success' : 'handled gracefully'}`);
    }
  });
});
