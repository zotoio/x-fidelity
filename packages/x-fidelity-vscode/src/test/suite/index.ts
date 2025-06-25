import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true,
		timeout: 10000,
		reporter: 'spec'
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise(async (c, e) => {
		try {
			const files = await glob('**/**.test.js', { cwd: testsRoot, absolute: false });

			// Add files to the test suite
			for (const f of files) {
				mocha.addFile(path.resolve(testsRoot, f));
			}

			// Run the mocha test
			mocha.run((failures: number) => {
				if (failures > 0) {
					e(new Error(`${failures} tests failed.`));
				} else {
					c();
				}
			});
		} catch (err) {
			console.error(err);
			e(err);
		}
	});
}

// Comprehensive tests start here
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { spawn } from 'child_process';
import type { ResultMetadata } from '@x-fidelity/types';

// Use ResultMetadata type for both CLI and Extension results
type CLIResult = ResultMetadata;
type ExtensionResult = ResultMetadata;

suite('Comprehensive VSCode Extension Test Suite', () => {
  let extension: vscode.Extension<any>;
  let testWorkspace: vscode.WorkspaceFolder;
  let cliResult: CLIResult | null = null;
  let extensionResult: ExtensionResult | null = null;

  suiteSetup(async function() {
    this.timeout(120000); // 2 minutes for setup
    
    // Ensure we have a workspace
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      throw new Error('No workspace folder available for comprehensive testing');
    }
    
    testWorkspace = vscode.workspace.workspaceFolders[0];
    
    // Ensure extension is activated
    extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode')!;
    if (!extension.isActive) {
      await extension.activate();
    }
    
    // Wait for extension to fully initialize
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  suite('CLI Analysis', () => {
    test('should run CLI analysis and capture results', async function() {
      this.timeout(60000); // 1 minute for CLI analysis
      
      try {
        cliResult = await runCLIAnalysis(testWorkspace.uri.fsPath);
        assert.ok(cliResult, 'CLI analysis should return results');
        assert.ok(typeof cliResult.XFI_RESULT.totalIssues === 'number', 'Total issues should be a number');
        assert.ok(cliResult.XFI_RESULT.totalIssues >= 0, 'Total issues should be non-negative');
        
        console.log(`CLI Analysis Results:`);
        console.log(`  Total Issues: ${cliResult.XFI_RESULT.totalIssues}`);
        console.log(`  Warnings: ${cliResult.XFI_RESULT.warningCount}`);
        console.log(`  Errors: ${cliResult.XFI_RESULT.errorCount}`);
        console.log(`  Fatalities: ${cliResult.XFI_RESULT.fatalityCount}`);
        console.log(`  Exemptions: ${cliResult.XFI_RESULT.exemptCount}`);
        
      } catch (error) {
        assert.fail(`CLI analysis failed: ${error}`);
      }
    });
  });

  suite('Extension Feature Testing', () => {
    test('should test all registered commands', async function() {
      this.timeout(30000);
      
      const commands = await vscode.commands.getCommands(true);
      const xfidelityCommands = commands.filter(cmd => cmd.startsWith('xfidelity.'));
      
      console.log(`Found ${xfidelityCommands.length} X-Fidelity commands:`, xfidelityCommands);
      
      // Essential commands that should be available
      const essentialCommands = [
        'xfidelity.runAnalysis',
        'xfidelity.showControlCenter',
        'xfidelity.refreshIssuesTree',
        'xfidelity.detectArchetype',
        'xfidelity.test',
        'xfidelity.runAnalysisWithDir',
        'xfidelity.getTestResults'
      ];
      
      for (const command of essentialCommands) {
        assert.ok(xfidelityCommands.includes(command), `Essential command ${command} should be registered`);
      }
      
      // Test that commands can be executed without throwing
      for (const command of essentialCommands) {
        try {
          await vscode.commands.executeCommand(command);
          // Commands may fail gracefully, but shouldn't throw unhandled errors
        } catch (error) {
          // Commands can fail, but should fail gracefully
          assert.ok(error instanceof Error, `Command ${command} should fail with proper Error object`);
          console.log(`Command ${command} failed as expected:`, error.message);
        }
      }
    });

    test('should test configuration management', async function() {
      this.timeout(15000);
      
      const config = vscode.workspace.getConfiguration('xfidelity');
      
      // Test all configuration properties
      const configProperties = [
        'archetype',
        'runInterval',
        'autoAnalyzeOnSave',
        'autoAnalyzeOnFileChange',
        'configServer',
        'localConfigPath',
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
        'cacheTTL'
      ];
      
      for (const prop of configProperties) {
        const value = config.get(prop);
        assert.ok(value !== undefined, `Configuration property "${prop}" should be defined`);
      }
      
      // Test archetype detection
      try {
        await vscode.commands.executeCommand('xfidelity.detectArchetype');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const detectedArchetype = config.get('archetype');
        assert.ok(detectedArchetype, 'Archetype should be detected');
        assert.ok(typeof detectedArchetype === 'string', 'Archetype should be a string');
        
        const validArchetypes = [
          'node-fullstack',
          'java-microservice',
          'python-service',
          'dotnet-service'
        ];
        
        assert.ok(
          validArchetypes.includes(detectedArchetype as string),
          `Detected archetype "${detectedArchetype}" should be one of: ${validArchetypes.join(', ')}`
        );
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        assert.fail(`Archetype detection failed: ${errorMessage}`);
      }
    });

    test('should test workspace detection and analysis', async function() {
      this.timeout(60000);
      
      assert.ok(testWorkspace, 'Should have a test workspace');
      assert.ok(testWorkspace.uri.fsPath, 'Workspace should have a valid path');
      
      const workspacePath = testWorkspace.uri.fsPath;
      assert.ok(path.isAbsolute(workspacePath), 'Workspace path should be absolute');
      
      // Test workspace structure
      const expectedFiles = ['package.json', 'packages', '.xfi-config.json', 'yarn.lock'];
      for (const file of expectedFiles) {
        try {
          const fileUri = vscode.Uri.joinPath(testWorkspace.uri, file);
          await vscode.workspace.fs.stat(fileUri);
          console.log(`Found expected file/directory: ${file}`);
        } catch {
          assert.fail(`Expected file/directory not found: ${file}`);
        }
      }
      
      // Test analysis with directory
      try {
        await vscode.commands.executeCommand('xfidelity.runAnalysisWithDir', workspacePath);
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('Analysis with directory completed');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Analysis with directory failed as expected:', errorMessage);
      }
    });

    test('should test UI components', async function() {
      this.timeout(30000);
      
      // Test Control Center
      try {
        await vscode.commands.executeCommand('xfidelity.showControlCenter');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Control Center opened successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Control Center failed as expected:', errorMessage);
      }
      
      // Test Issues Tree refresh
      try {
        await vscode.commands.executeCommand('xfidelity.refreshIssuesTree');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Issues Tree refreshed successfully');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Issues Tree refresh failed as expected:', errorMessage);
      }
      
      // Test status bar (should be available after extension activation)
      assert.ok(extension.isActive, 'Extension should be active for UI testing');
    });

    test('should test error handling and edge cases', async function() {
      this.timeout(20000);
      
      // Test with invalid directory
      try {
        await vscode.commands.executeCommand('xfidelity.runAnalysisWithDir', '/invalid/path');
        // Should handle gracefully
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw proper Error objects');
        assert.ok(error.message.length > 0, 'Error messages should not be empty');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('Invalid directory handled correctly:', errorMessage);
      }
      
      // Test with no workspace
      try {
        // This might fail in test environment, but should fail gracefully
        await vscode.commands.executeCommand('xfidelity.runAnalysis');
      } catch (error) {
        assert.ok(error instanceof Error, 'Should throw proper Error objects');
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log('No workspace handled correctly:', errorMessage);
      }
    });
  });

  suite('Extension Analysis', () => {
    test('should run extension analysis and capture results', async function() {
      this.timeout(90000); // 1.5 minutes for extension analysis
      
      try {
        extensionResult = await runExtensionAnalysis();
        assert.ok(extensionResult, 'Extension analysis should return results');
        assert.ok(typeof extensionResult.XFI_RESULT.totalIssues === 'number', 'Total issues should be a number');
        assert.ok(extensionResult.XFI_RESULT.totalIssues >= 0, 'Total issues should be non-negative');
        
        console.log(`Extension Analysis Results:`);
        console.log(`  Total Issues: ${extensionResult.XFI_RESULT.totalIssues}`);
        console.log(`  Warnings: ${extensionResult.XFI_RESULT.warningCount}`);
        console.log(`  Errors: ${extensionResult.XFI_RESULT.errorCount}`);
        console.log(`  Fatalities: ${extensionResult.XFI_RESULT.fatalityCount}`);
        console.log(`  Exemptions: ${extensionResult.XFI_RESULT.exemptCount}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        assert.fail(`Extension analysis failed: ${errorMessage}`);
      }
    });
  });

  suite('CLI-Extension Consistency', () => {
    test('should have matching issue counts by severity', async function() {
      this.timeout(10000);
      
      assert.ok(cliResult, 'CLI result should be available');
      assert.ok(extensionResult, 'Extension result should be available');
      
      console.log('\n=== CONSISTENCY COMPARISON ===');
      console.log(`CLI Total Issues: ${cliResult!.XFI_RESULT.totalIssues}`);
      console.log(`Extension Total Issues: ${extensionResult!.XFI_RESULT.totalIssues}`);
      console.log(`CLI Warnings: ${cliResult!.XFI_RESULT.warningCount}`);
      console.log(`Extension Warnings: ${extensionResult!.XFI_RESULT.warningCount}`);
      console.log(`CLI Errors: ${cliResult!.XFI_RESULT.errorCount}`);
      console.log(`Extension Errors: ${extensionResult!.XFI_RESULT.errorCount}`);
      console.log(`CLI Fatalities: ${cliResult!.XFI_RESULT.fatalityCount}`);
      console.log(`Extension Fatalities: ${extensionResult!.XFI_RESULT.fatalityCount}`);
      console.log(`CLI Exemptions: ${cliResult!.XFI_RESULT.exemptCount}`);
      console.log(`Extension Exemptions: ${extensionResult!.XFI_RESULT.exemptCount}`);
      
      // Compare issue counts by severity
      assert.strictEqual(
        cliResult!.XFI_RESULT.totalIssues,
        extensionResult!.XFI_RESULT.totalIssues,
        'Total issue counts should match between CLI and Extension'
      );
      
      assert.strictEqual(
        cliResult!.XFI_RESULT.warningCount,
        extensionResult!.XFI_RESULT.warningCount,
        'Warning counts should match between CLI and Extension'
      );
      
      assert.strictEqual(
        cliResult!.XFI_RESULT.errorCount,
        extensionResult!.XFI_RESULT.errorCount,
        'Error counts should match between CLI and Extension'
      );
      
      assert.strictEqual(
        cliResult!.XFI_RESULT.fatalityCount,
        extensionResult!.XFI_RESULT.fatalityCount,
        'Fatality counts should match between CLI and Extension'
      );
      
      assert.strictEqual(
        cliResult!.XFI_RESULT.exemptCount,
        extensionResult!.XFI_RESULT.exemptCount,
        'Exemption counts should match between CLI and Extension'
      );
      
      console.log('✅ All issue counts match between CLI and Extension!');
    });

    test('should have consistent issue details structure', async function() {
      this.timeout(10000);
      
      assert.ok(cliResult, 'CLI result should be available');
      assert.ok(extensionResult, 'Extension result should be available');
      
      // Compare structure of issue details
      assert.ok(Array.isArray(cliResult!.XFI_RESULT.issueDetails), 'CLI issue details should be an array');
      assert.ok(Array.isArray(extensionResult!.XFI_RESULT.issueDetails), 'Extension issue details should be an array');
      
      // Check that both have the same number of files with issues
      assert.strictEqual(
        cliResult!.XFI_RESULT.issueDetails.length,
        extensionResult!.XFI_RESULT.issueDetails.length,
        'Number of files with issues should match between CLI and Extension'
      );
      
      // Check structure of first issue detail (if any exist)
      if (cliResult!.XFI_RESULT.issueDetails.length > 0 && extensionResult!.XFI_RESULT.issueDetails.length > 0) {
        const cliDetail = cliResult!.XFI_RESULT.issueDetails[0];
        const extDetail = extensionResult!.XFI_RESULT.issueDetails[0];
        
        assert.ok(cliDetail.filePath, 'CLI issue detail should have filePath');
        assert.ok(extDetail.filePath, 'Extension issue detail should have filePath');
        assert.ok(Array.isArray(cliDetail.errors), 'CLI issue detail should have errors array');
        assert.ok(Array.isArray(extDetail.errors), 'Extension issue detail should have errors array');
        
        if (cliDetail.errors.length > 0 && extDetail.errors.length > 0) {
          const cliError = cliDetail.errors[0];
          const extError = extDetail.errors[0];
          
          assert.ok(cliError.ruleFailure, 'CLI error should have ruleFailure');
          assert.ok(extError.ruleFailure, 'Extension error should have ruleFailure');
          assert.ok(cliError.level, 'CLI error should have level');
          assert.ok(extError.level, 'Extension error should have level');
        }
      }
      
      console.log('✅ Issue details structure is consistent between CLI and Extension!');
    });
  });

  suiteTeardown(async function() {
    this.timeout(10000);
    
    // Clean up
    try {
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('Cleanup error (expected):', errorMessage);
    }
  });
});

// Helper function to run CLI analysis
async function runCLIAnalysis(workspacePath: string): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
    const cliPath = path.resolve(__dirname, '../../../../../packages/x-fidelity-cli/dist/index.js');
    
    if (!fs.existsSync(cliPath)) {
      reject(new Error(`CLI not found at ${cliPath}`));
      return;
    }
    
    const child = spawn('node', [cliPath, '--dir', workspacePath, '--output-format', 'json'], {
      cwd: path.dirname(cliPath),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0 && code !== 1) { // CLI can exit with 1 for fatal issues
        reject(new Error(`CLI process exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        // Parse the JSON output
        const lines = stdout.split('\n');
        let jsonStart = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('{')) {
            jsonStart = i;
            break;
          }
        }
        
        if (jsonStart === -1) {
          reject(new Error('No JSON output found in CLI response'));
          return;
        }
        
        const jsonLines = lines.slice(jsonStart);
        const jsonStr = jsonLines.join('\n');
        const result = JSON.parse(jsonStr);
        
        // Return the complete ResultMetadata object
        if (!result.XFI_RESULT) {
          reject(new Error('Parsed result does not have XFI_RESULT property'));
          return;
        }
        
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse CLI JSON output: ${error}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`CLI process error: ${error.message}`));
    });
  });
}

// Helper function to run extension analysis
async function runExtensionAnalysis(): Promise<ExtensionResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // Trigger extension analysis
      await vscode.commands.executeCommand('xfidelity.runAnalysis');
      
      // Wait for analysis to complete and get results
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds
      
      const checkAnalysis = async () => {
        attempts++;
        
        try {
          // Get analysis results from extension using the test command
          const results = await vscode.commands.executeCommand('xfidelity.getTestResults') as ResultMetadata;
          
          if (results && results.XFI_RESULT && typeof results.XFI_RESULT.totalIssues === 'number') {
            console.log('Extension analysis results obtained successfully');
            resolve(results);
            return;
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error(`Extension analysis failed to complete after ${maxAttempts} seconds`));
            return;
          }
          
          // Check again in 1 second
          setTimeout(checkAnalysis, 1000);
          
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(new Error(`Extension analysis failed after ${maxAttempts} attempts: ${error}`));
          } else {
            setTimeout(checkAnalysis, 1000);
          }
        }
      };
      
      checkAnalysis();
      
    } catch (error) {
      reject(new Error(`Failed to start extension analysis: ${error}`));
    }
  });
} 