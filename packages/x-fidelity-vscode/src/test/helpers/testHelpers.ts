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
export async function runCLIAnalysis(workspacePath: string): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
    const cliPath = path.resolve(__dirname, '../../../../x-fidelity-cli/dist/index.js');
    
    if (!fs.existsSync(cliPath)) {
      reject(new Error(`CLI not found at ${cliPath}`));
      return;
    }
    
    const child = spawn('node', [cliPath, '--dir', workspacePath, '--output-format', 'json'], {
      cwd: path.dirname(cliPath),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000 // 60 second timeout
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
          reject(new Error(`No XFI_RESULT JSON found in CLI output. STDOUT: ${stdout.substring(0, 500)}...`));
          return;
        }
        
        const result = JSON.parse(resultLine) as ResultMetadata;
        
        if (!result.XFI_RESULT) {
          reject(new Error('Parsed result does not have XFI_RESULT property'));
          return;
        }
        
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse CLI JSON output: ${error}. STDOUT: ${stdout.substring(0, 500)}...`));
      }
    });
    
    child.on('error', (error) => {
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

/**
 * Helper to get the test workspace
 */
export function getTestWorkspace(): vscode.WorkspaceFolder {
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
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
export async function ensureExtensionActivated(): Promise<vscode.Extension<any>> {
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
      assert.ok(stat.type === vscode.FileType.Directory, `${dir} should be a directory`);
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
