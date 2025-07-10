import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import type { ResultMetadata } from '@x-fidelity/types';

// Type aliases for better readability
export type CLIResult = ResultMetadata;
export type ExtensionResult = ResultMetadata;

/**
 * Helper function to run CLI analysis and return ResultMetadata
 */
export async function runCLIAnalysis(
  workspacePath: string
): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
      // For tests, use bundled CLI path - try multiple locations
      const possiblePaths = [
        // In test output directory structure
        path.resolve(__dirname, '../../cli/index.js'),
        // Alternative test structure
        path.resolve(__dirname, '../../../cli/index.js'),
        // Direct access to built CLI
        path.resolve(__dirname, '../../../dist/cli/index.js')
      ];
      
      let cliPath: string | null = null;
      for (const testPath of possiblePaths) {
        if (fs.existsSync(testPath)) {
          cliPath = testPath;
          break;
        }
      }

    if (!cliPath || !fs.existsSync(cliPath)) {
      reject(new Error(`CLI not found at any of the expected locations: ${possiblePaths.join(', ')}`));
      return;
    }

    const child = spawn(
      'node',
      [cliPath, '--dir', workspacePath, '--output-format', 'json'],
      {
        cwd: path.dirname(cliPath),
        stdio: 'pipe',
        timeout: 60000 // 60 second timeout
      }
    );

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', data => {
      stdout += data.toString();
    });

    child.stderr?.on('data', data => {
      stderr += data.toString();
    });

    child.on('close', code => {
      if (code !== 0 && code !== 1) {
        // CLI can exit with 1 for fatal issues
        reject(new Error(`CLI process exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse the JSON output from CLI
        const lines = stdout.split('\n');
        let resultLine = '';

        // Look for XFI_RESULT JSON line
        for (const line of lines) {
          if (line.includes('XFI_RESULT') && line.includes('{')) {
            // Extract JSON from log line
            const jsonStart = line.indexOf('{');
            if (jsonStart !== -1) {
              resultLine = line.substring(jsonStart);
              break;
            }
          }
        }

        if (!resultLine) {
          // Fallback: look for any valid JSON object
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('{') && trimmed.includes('XFI_RESULT')) {
              resultLine = trimmed;
              break;
            }
          }
        }

        if (!resultLine) {
          reject(
            new Error(
              `No XFI_RESULT JSON found in CLI output. STDOUT: ${stdout.substring(0, 500)}...`
            )
          );
          return;
        }

        const result = JSON.parse(resultLine) as ResultMetadata;

        if (!result.XFI_RESULT) {
          reject(new Error('Parsed result does not have XFI_RESULT property'));
          return;
        }

        resolve(result);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse CLI JSON output: ${error}. STDOUT: ${stdout.substring(0, 500)}...`
          )
        );
      }
    });

    child.on('error', error => {
      reject(new Error(`CLI process error: ${error.message}`));
    });
  });
}

/**
 * Helper function to run extension analysis and return ResultMetadata
 */
export async function runExtensionAnalysis(): Promise<ExtensionResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // Trigger extension analysis
      await vscode.commands.executeCommand('xfidelity.runAnalysis');

      // Wait for analysis to complete and get results
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds total wait time

      const checkAnalysis = async () => {
        attempts++;

        try {
          // Get analysis results from extension using the test command
          const results = (await vscode.commands.executeCommand(
            'xfidelity.getTestResults'
          )) as ResultMetadata;

          if (
            results &&
            results.XFI_RESULT &&
            typeof results.XFI_RESULT.totalIssues === 'number'
          ) {
            if (global.isVerboseMode) {
              global.testConsole.log(
                'Extension analysis results obtained successfully'
              );
            }
            resolve(results);
            return;
          }

          if (attempts >= maxAttempts) {
            reject(
              new Error(
                `Extension analysis failed to complete after ${maxAttempts} seconds`
              )
            );
            return;
          }

          // Check again in 1 second
          setTimeout(checkAnalysis, 1000);
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(
              new Error(
                `Extension analysis failed after ${maxAttempts} attempts: ${error}`
              )
            );
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

/**
 * Helper to get the test workspace
 */
export function getTestWorkspace(): vscode.WorkspaceFolder {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    throw new Error('No workspace folder available for testing');
  }
  return vscode.workspace.workspaceFolders[0];
}

/**
 * Helper to get the extension instance
 */
export function getExtension(): vscode.Extension<any> {
  const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
  if (!extension) {
    throw new Error('X-Fidelity extension not found');
  }
  return extension;
}

/**
 * Helper to ensure extension is activated
 */
export async function ensureExtensionActivated(): Promise<
  vscode.Extension<any>
> {
  const extension = getExtension();
  if (!extension.isActive) {
    await extension.activate();
  }
  return extension;
}

/**
 * Helper to wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 5000,
  intervalMs: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

/**
 * Helper to assert command exists
 */
export async function assertCommandExists(commandId: string): Promise<void> {
  const commands = await vscode.commands.getCommands(true);
  assert.ok(
    commands.includes(commandId),
    `Command ${commandId} should be registered`
  );
}

/**
 * Helper to execute command safely
 */
export async function executeCommandSafely(
  commandId: string,
  ...args: any[]
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await vscode.commands.executeCommand(commandId, ...args);
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Helper to validate workspace structure
 */
export async function validateWorkspaceStructure(
  expectedFiles: string[],
  expectedDirs: string[] = []
): Promise<void> {
  const workspace = getTestWorkspace();

  for (const file of expectedFiles) {
    try {
      const fileUri = vscode.Uri.joinPath(workspace.uri, file);
      const stat = await vscode.workspace.fs.stat(fileUri);
      assert.ok(stat.type === vscode.FileType.File, `${file} should be a file`);
    } catch {
      assert.fail(`Expected file not found: ${file}`);
    }
  }

  for (const dir of expectedDirs) {
    try {
      const dirUri = vscode.Uri.joinPath(workspace.uri, dir);
      const stat = await vscode.workspace.fs.stat(dirUri);
      assert.ok(
        stat.type === vscode.FileType.Directory,
        `${dir} should be a directory`
      );
    } catch {
      assert.fail(`Expected directory not found: ${dir}`);
    }
  }
}

/**
 * Helper to compare analysis results
 */
export function compareAnalysisResults(
  cliResult: CLIResult,
  extensionResult: ExtensionResult
): void {
  assert.strictEqual(
    cliResult.XFI_RESULT.totalIssues,
    extensionResult.XFI_RESULT.totalIssues,
    'Total issue counts must be identical'
  );

  assert.strictEqual(
    cliResult.XFI_RESULT.warningCount,
    extensionResult.XFI_RESULT.warningCount,
    'Warning counts must be identical'
  );

  assert.strictEqual(
    cliResult.XFI_RESULT.errorCount,
    extensionResult.XFI_RESULT.errorCount,
    'Error counts must be identical'
  );

  assert.strictEqual(
    cliResult.XFI_RESULT.fatalityCount,
    extensionResult.XFI_RESULT.fatalityCount,
    'Fatality counts must be identical'
  );

  assert.strictEqual(
    cliResult.XFI_RESULT.exemptCount,
    extensionResult.XFI_RESULT.exemptCount,
    'Exemption counts must be identical'
  );

  assert.strictEqual(
    cliResult.XFI_RESULT.archetype,
    extensionResult.XFI_RESULT.archetype,
    'Archetype must be identical'
  );

  assert.strictEqual(
    cliResult.XFI_RESULT.fileCount,
    extensionResult.XFI_RESULT.fileCount,
    'File count must be identical'
  );
}

/**
 * Wait for analysis completion with timeout
 */
export async function waitForAnalysisCompletion(timeoutMs: number = 60000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check if analysis is running by trying to get results
      const results = await getAnalysisResults();
      
      // If we have results, analysis is likely complete
      if (results !== null) {
        console.log('✅ Analysis completed successfully');
        return true;
      }
      
      // Check if analysis is still running by looking for progress indicators
      const isRunning = await checkAnalysisRunning();
      if (!isRunning) {
        console.log('✅ Analysis completed (no longer running)');
        return true;
      }
      
      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log('⚠️ Error checking analysis status:', error);
      // Continue checking
    }
  }
  
  console.log('⏰ Analysis completion timeout reached');
  return false;
}

/**
 * Get current analysis results
 */
export async function getAnalysisResults(): Promise<any> {
  try {
    // Try to get results via command
    const results = await executeCommandSafely('xfidelity.getTestResults');
    return results;
  } catch (error) {
    console.log('⚠️ Could not get analysis results:', error);
    return null;
  }
}

/**
 * Check if analysis is currently running
 */
async function checkAnalysisRunning(): Promise<boolean> {
  try {
    // Check if the analysis engine is in analyzing state
    // This is a simplified check - in a real implementation you might
    // check the analysis engine state more directly
    const results = await getAnalysisResults();
    
    // If we can't get results, analysis might still be running
    if (results === null) {
      return true;
    }
    
    // If we have results, analysis is likely complete
    return false;
  } catch {
    // If there's an error, assume analysis might be running
    return true;
  }
}

/**
 * Execute a command and return its result
 */
export async function executeCommandWithResult(command: string, ...args: any[]): Promise<any> {
  try {
    return await vscode.commands.executeCommand(command, ...args);
  } catch (error) {
    console.log(`⚠️ Command ${command} failed:`, error);
    return null;
  }
}

/**
 * Check if a file exists in the workspace
 */
export async function workspaceFileExists(relativePath: string): Promise<boolean> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return false;
    }
    
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);
    await vscode.workspace.fs.stat(fileUri);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get workspace folder path
 */
export function getWorkspacePath(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number = 10000,
  intervalMs: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const result = await condition();
      if (result) {
        return true;
      }
    } catch (error) {
      console.log('⚠️ Error checking condition:', error);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  return false;
}

/**
 * Verify that diagnostics are present for X-Fidelity
 */
export function verifyXfidelityDiagnostics(): boolean {
  const diagnostics = vscode.languages.getDiagnostics();
  let hasXfidelityDiagnostics = false;
  
  for (const [, diags] of diagnostics) {
    const xfidelityDiags = diags.filter(d => d.source === 'X-Fidelity');
    if (xfidelityDiags.length > 0) {
      hasXfidelityDiagnostics = true;
      break;
    }
  }
  
  return hasXfidelityDiagnostics;
}

/**
 * Get count of X-Fidelity diagnostics
 */
export function getXfidelityDiagnosticCount(): number {
  const diagnostics = vscode.languages.getDiagnostics();
  let count = 0;
  
  for (const [, diags] of diagnostics) {
    count += diags.filter(d => d.source === 'X-Fidelity').length;
  }
  
  return count;
}

/**
 * Verify that tree view is available and functional
 */
export async function verifyTreeViewAvailable(): Promise<boolean> {
  try {
    // Try to create a tree view (this will fail if the view is not registered)
    const treeView = vscode.window.createTreeView('xfidelityIssuesTreeView', {
      treeDataProvider: { 
        getChildren: () => [],
        getTreeItem: () => new vscode.TreeItem('test')
      }
    });
    
    // If we can create it, the view is available
    return treeView !== undefined;
  } catch {
    return false;
  }
}

/**
 * Check if extension is in a healthy state
 */
export async function checkExtensionHealth(): Promise<{
  isActive: boolean;
  hasCommands: boolean;
  hasTreeView: boolean;
  hasDiagnostics: boolean;
}> {
  const extension = vscode.extensions.getExtension('zotoio.x-fidelity-vscode');
  const isActive = extension?.isActive || false;
  
  // Check if core commands are available
  let hasCommands = false;
  try {
    await assertCommandExists('xfidelity.test');
    hasCommands = true;
  } catch {
    hasCommands = false;
  }
  
  // Check if tree view is available
  const hasTreeView = await verifyTreeViewAvailable();
  
  // Check if diagnostics are working
  const hasDiagnostics = verifyXfidelityDiagnostics();
  
  return {
    isActive,
    hasCommands,
    hasTreeView,
    hasDiagnostics
  };
}
