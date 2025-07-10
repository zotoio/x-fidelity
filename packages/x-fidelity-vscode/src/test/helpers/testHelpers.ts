import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { createCLISpawner, CLIResult, getEmbeddedCLIPath } from '../../utils/cliSpawner';

/**
 * Run CLI analysis for testing
 */
export async function runCLIAnalysis(
  workspacePath: string
): Promise<CLIResult> {
  const cliSpawner = createCLISpawner('bundled');
  return await cliSpawner.runCLIForTesting({ workspacePath });
}

// Re-export for backward compatibility
export { getEmbeddedCLIPath, CLIResult };

/**
 * Get analysis results from XFI_RESULT.json
 */
export async function getAnalysisResults(
  workspacePath: string
): Promise<any> {
  const resultPath = path.join(workspacePath, '.xfiResult', 'XFI_RESULT.json');
  
  if (!fs.existsSync(resultPath)) {
    throw new Error(`XFI_RESULT.json not found at: ${resultPath}`);
  }

  const resultData = await fs.promises.readFile(resultPath, 'utf8');
  const parsed = JSON.parse(resultData);

  if (!parsed.XFI_RESULT) {
    throw new Error('XFI_RESULT.json does not contain XFI_RESULT property');
  }

  return parsed.XFI_RESULT;
}

/**
 * Check if analysis results exist
 */
export function hasAnalysisResults(workspacePath: string): boolean {
  const resultPath = path.join(workspacePath, '.xfiResult', 'XFI_RESULT.json');
  return fs.existsSync(resultPath);
}

/**
 * Get workspace root path
 */
export function getWorkspaceRoot(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found');
  }
  return workspaceFolders[0].uri.fsPath;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 10000,
  interval: number = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Get status bar text (for testing)
 */
export function getStatusBarText(): string {
  // This is a simplified version for testing
  // In a real scenario, you'd need to access the actual status bar item
  return 'Status unknown';
}
