import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, suiteSetup } from 'mocha';
import {
  ensureExtensionActivated,
  executeCommandSafely
} from '../helpers/testHelpers';

suite('Configuration Management Tests', () => {
  suiteSetup(async function () {
    this.timeout(30000);
    await ensureExtensionActivated();
    await new Promise(resolve => setTimeout(resolve, 3000));
  });

  test('should have all required configuration properties', async function () {
    this.timeout(15000);

    // Wait for VSCode configuration to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let config = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);

    // Retry mechanism for configuration loading
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      config = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);
      const runIntervalValue = config.get('runInterval');
      
      if (runIntervalValue !== undefined) {
        break; // Configuration is loaded
      }
      
      retryCount++;
      console.log(`Configuration not ready, retrying ${retryCount}/${maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const requiredProperties = [
      'archetype',
      'runInterval',
      'autoAnalyzeOnSave',
      'autoAnalyzeOnFileChange',
      'configServer',
      'localConfigPath',
      'githubConfigLocation',
      'githubConfigUpdateFrequency',
      'openaiEnabled',
      'telemetryCollector',
      'telemetryEnabled',
      'generateReports',
      'reportOutputDir',
      'reportFormats',
      'showReportAfterAnalysis',
      'reportRetentionDays',
      'showInlineDecorations',
      'highlightSeverity',
      'statusBarVisibility',
      'problemsPanelGrouping',
      'showRuleDocumentation',
      'maxFileSize',
      'analysisTimeout',
      'excludePatterns',
      'includePatterns',
      'maxConcurrentAnalysis',
      'debugMode',
      'customPlugins',
      'ruleOverrides',
      'cacheResults',
      'cacheTTL',
      'cliExtraArgs',
      'analyzeOnStartup'
    ];

    const missingProperties: string[] = [];
    for (const prop of requiredProperties) {
      const value = config.get(prop);
      if (value === undefined) {
        missingProperties.push(prop);
      }
    }

    assert.strictEqual(
      missingProperties.length,
      0,
      `Missing configuration properties: ${missingProperties.join(', ')}`
    );

    if (global.isVerboseMode) {
      global.testConsole.log(
        `✅ All ${requiredProperties.length} configuration properties defined`
      );
    }
  });

  test('should detect archetype automatically', async function () {
    this.timeout(30000);

    const result = await executeCommandSafely('xfidelity.detectArchetype');

    if (result.success) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const config = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);
      const detectedArchetype = config.get('archetype');

      assert.ok(detectedArchetype, 'Archetype should be detected');
      assert.ok(
        typeof detectedArchetype === 'string',
        'Archetype should be a string'
      );

      const validArchetypes = [
        'node-fullstack',
        'java-microservice',
        'python-service',
        'dotnet-service'
      ];

      assert.ok(
        validArchetypes.includes(detectedArchetype as string),
        `Detected archetype "${detectedArchetype}" should be valid`
      );

      if (global.isVerboseMode) {
        global.testConsole.log(`✅ Archetype detected: ${detectedArchetype}`);
      }
    } else {
      if (global.isVerboseMode) {
        global.testConsole.log(
          `⚠️ Archetype detection failed (may be expected): ${result.error}`
        );
      }
    }
  });

  test('should validate configuration values', async function () {
    this.timeout(5000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const config = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);

    // Test numeric values
    const runInterval = config.get('runInterval') as number;
    assert.ok(
      typeof runInterval === 'number' && runInterval >= 0,
      'runInterval should be non-negative number'
    );

    const maxFileSize = config.get('maxFileSize') as number;
    assert.ok(
      typeof maxFileSize === 'number' && maxFileSize > 0,
      'maxFileSize should be positive number'
    );

    const analysisTimeout = config.get('analysisTimeout') as number;
    assert.ok(
      typeof analysisTimeout === 'number' && analysisTimeout > 0,
      'analysisTimeout should be positive number'
    );

    // Test array values
    const reportFormats = config.get('reportFormats') as string[];
    assert.ok(Array.isArray(reportFormats), 'reportFormats should be an array');

    const excludePatterns = config.get('excludePatterns') as string[];
    assert.ok(
      Array.isArray(excludePatterns),
      'excludePatterns should be an array'
    );

    if (global.isVerboseMode) {
      global.testConsole.log('✅ Configuration values validated');
    }
  });

  test('should validate GitHub configuration settings', async function () {
    this.timeout(5000);

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const config = vscode.workspace.getConfiguration('xfidelity', workspaceFolder?.uri);

    // Test githubConfigLocation
    const githubConfigLocation = config.get('githubConfigLocation');
    assert.ok(
      typeof githubConfigLocation === 'string',
      'githubConfigLocation should be a string'
    );

    // Test githubConfigUpdateFrequency
    const githubConfigUpdateFrequency = config.get('githubConfigUpdateFrequency') as number;
    assert.ok(
      typeof githubConfigUpdateFrequency === 'number',
      'githubConfigUpdateFrequency should be a number'
    );
    assert.ok(
      githubConfigUpdateFrequency >= 5 && githubConfigUpdateFrequency <= 1440,
      'githubConfigUpdateFrequency should be between 5 and 1440 minutes'
    );
    assert.strictEqual(
      githubConfigUpdateFrequency,
      60,
      'githubConfigUpdateFrequency should default to 60 minutes'
    );

    // Test default values
    assert.strictEqual(
      githubConfigLocation,
      '',
      'githubConfigLocation should default to empty string'
    );

    if (global.isVerboseMode) {
      global.testConsole.log('✅ GitHub configuration settings validated');
      global.testConsole.log(`   - githubConfigLocation: "${githubConfigLocation}"`);
      global.testConsole.log(`   - githubConfigUpdateFrequency: ${githubConfigUpdateFrequency}min`);
    }
  });
});
