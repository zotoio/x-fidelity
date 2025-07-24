import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  createCLISpawner,
  CLIResult,
  getEmbeddedCLIPath
} from '../../utils/cliSpawner';

// Global analysis results cache
let cachedAnalysisResults: any = null;
let cachedWorkspacePath: string | null = null;

/**
 * Ensure the X-Fidelity extension is activated
 */
export async function ensureExtensionActivated(): Promise<
  vscode.Extension<any>
> {
  const extensionId = 'zotoio.x-fidelity-vscode';
  const extension = vscode.extensions.getExtension(extensionId);

  if (!extension) {
    throw new Error(`Extension ${extensionId} not found`);
  }

  if (!extension.isActive) {
    await extension.activate();
  }

  // Wait a bit for activation to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  return extension;
}

/**
 * Get the current test workspace folder
 */
export function getTestWorkspace(): vscode.WorkspaceFolder {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder found');
  }

  return workspaceFolders[0];
}

/**
 * Validate that expected files and directories exist in the workspace
 */
export async function validateWorkspaceStructure(
  expectedFiles: string[],
  expectedDirs: string[]
): Promise<void> {
  const workspace = getTestWorkspace();
  const workspacePath = workspace.uri.fsPath;

  // Check files
  for (const file of expectedFiles) {
    const filePath = path.join(workspacePath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Expected file not found: ${file} at ${filePath}`);
    }
  }

  // Check directories
  for (const dir of expectedDirs) {
    const dirPath = path.join(workspacePath, dir);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      throw new Error(`Expected directory not found: ${dir} at ${dirPath}`);
    }
  }
}

/**
 * Execute a VSCode command safely with error handling
 */
export async function executeCommandSafely(
  command: string,
  ...args: any[]
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await vscode.commands.executeCommand(command, ...args);
    return { success: true, result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Run CLI analysis for testing
 */
export async function runCLIAnalysis(
  workspacePath: string
): Promise<CLIResult> {
  const cliSpawner = createCLISpawner();
  try {
    const analysisResult = await cliSpawner.runAnalysis({ workspacePath });

    // Convert AnalysisResult to CLIResult format for test compatibility
    return {
      success: true,
      output: 'CLI analysis completed',
      XFI_RESULT: analysisResult.metadata?.XFI_RESULT || analysisResult,
      exitCode: 0
    };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error),
      exitCode: 1
    };
  }
}

/**
 * Run extension analysis for testing
 */
export async function runExtensionAnalysis(): Promise<CLIResult> {
  const workspacePath = getWorkspaceRoot();

  // Run analysis using the extension
  const result = await executeCommandSafely('xfidelity.runAnalysis');
  if (!result.success) {
    throw new Error(`Extension analysis failed: ${result.error}`);
  }

  // Wait for completion
  const completed = await waitForAnalysisCompletion(90000, workspacePath);
  if (!completed) {
    throw new Error('Extension analysis did not complete within timeout');
  }

  // Get results
  const analysisResults = await getAnalysisResults(workspacePath, false);

  // Return in CLI format for consistency with tests
  return {
    success: true,
    output: 'Extension analysis completed',
    XFI_RESULT: analysisResults,
    exitCode: 0
  };
}

// Re-export for backward compatibility
export { getEmbeddedCLIPath, CLIResult };

/**
 * Get analysis results from the cache or file
 */
export async function getAnalysisResults(
  workspacePath?: string,
  forceRefresh = false
): Promise<any> {
  const targetPath = workspacePath || getWorkspaceRoot();
  
  // Always try to read from XFI_RESULT.json first (most recent)
  const resultPath = path.join(targetPath, '.xfiResults', 'XFI_RESULT.json');

  try {
    if (fs.existsSync(resultPath)) {
      const content = fs.readFileSync(resultPath, 'utf8');
      const parsed = JSON.parse(content);

      // Cache the results for future use
      cachedAnalysisResults = parsed;
      cachedWorkspacePath = targetPath;

      return parsed;
    }
  } catch (_error) {
    // Continue to try cache if file read fails
  }

  // Fallback to cached results if file doesn't exist
  if (
    !forceRefresh &&
    cachedAnalysisResults &&
    cachedWorkspacePath === targetPath
  ) {
    return cachedAnalysisResults;
  }

  throw new Error('No analysis results found. Run analysis first.');
}

/**
 * Check if analysis results exist
 */
export function hasAnalysisResults(workspacePath?: string): boolean {
  const targetPath = workspacePath || getWorkspaceRoot();
  const resultPath = path.join(targetPath, '.xfiResults', 'XFI_RESULT.json');
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
 * Wait for analysis completion
 */
export async function waitForAnalysisCompletion(
  timeout: number = 60000,
  workspacePath?: string
): Promise<boolean> {
  const startTime = Date.now();
  const targetPath = workspacePath || getWorkspaceRoot();

  while (Date.now() - startTime < timeout) {
    if (hasAnalysisResults(targetPath)) {
      // Give it a moment to ensure the file is fully written
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Run initial analysis and cache results for reuse
 */
export async function runInitialAnalysis(
  workspacePath?: string,
  _forceRefresh: boolean = false
): Promise<any> {
  const targetPath = workspacePath || getWorkspaceRoot();
  
  // ALWAYS run fresh analysis for integration tests to ensure consistent results
  // Clear any existing results 
  clearAnalysisCache();
  // NOTE: We never delete XFI_RESULT.json - it should always exist and be overwritten
  // The core analyzer will always update it with fresh results

  // Run analysis
  const result = await executeCommandSafely('xfidelity.runAnalysis');
  if (!result.success) {
    throw new Error(`Analysis failed: ${result.error}`);
  }

  // Wait for completion
  const completed = await waitForAnalysisCompletion(90000, targetPath);
  if (!completed) {
    throw new Error('Analysis did not complete within timeout');
  }

  // Get and cache results
  const analysisResults = await getAnalysisResults(targetPath, true);
  return analysisResults;
}

/**
 * ENHANCED: Run fresh analysis specifically for tests with better error handling
 */
export async function runFreshAnalysisForTest(
  workspacePath?: string,
  timeoutMs: number = 120000
): Promise<any> {
  const targetPath = workspacePath || getWorkspaceRoot();
  
  try {
    console.log('🚀 Starting fresh analysis for test...');
    
    // Clear any cached results first
    cachedAnalysisResults = null;
    cachedWorkspacePath = null;
    
    // Trigger analysis via extension
    const result = await executeCommandSafely('xfidelity.runAnalysis');
    if (!result.success) {
      throw new Error(`Extension analysis command failed: ${result.error}`);
    }

    // Wait for analysis to complete with proper timeout
    const completed = await waitForAnalysisCompletion(timeoutMs, targetPath);
    if (!completed) {
      throw new Error(`Analysis did not complete within ${timeoutMs}ms timeout`);
    }

    // ENHANCED: Wait for diagnostics to be processed
    await waitForDiagnosticProcessing(10000); // Wait up to 10 seconds

    // Get results
    const analysisResults = await getAnalysisResults(targetPath, true);
    
    console.log(`✅ Fresh analysis completed: ${analysisResults?.summary?.totalIssues || 0} issues`);
    return analysisResults;
    
  } catch (error) {
    console.error('❌ Fresh analysis failed:', error);
    throw error;
  }
}

/**
 * NEW: Wait for diagnostic processing to complete
 */
async function waitForDiagnosticProcessing(timeoutMs: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    // Check if we have any X-Fidelity diagnostics
    const allDiagnostics = vscode.languages.getDiagnostics();
    let hasXFIDiagnostics = false;
    
    for (const [, diagnostics] of allDiagnostics) {
      if (diagnostics.some(d => d.source === 'X-Fidelity')) {
        hasXFIDiagnostics = true;
        break;
      }
    }
    
    if (hasXFIDiagnostics) {
      console.log('✅ Diagnostics processing completed');
      return;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.warn('⚠️ Timeout waiting for diagnostic processing');
}

/**
 * Clear analysis cache
 */
export function clearAnalysisCache(): void {
  cachedAnalysisResults = null;
  cachedWorkspacePath = null;
}

/**
 * Ensure XFI tree and problems panel are populated
 */
export async function ensureXfiTreeAndProblemsPopulated(): Promise<void> {
  // Wait for tree view to be populated
  await waitFor(() => {
    const diagnostics = vscode.languages.getDiagnostics();
    for (const [, diags] of diagnostics) {
      if (diags.some(d => d.source === 'X-Fidelity')) {
        return true;
      }
    }
    return false;
  }, 15000);

  // Refresh tree view to ensure it's populated
  await executeCommandSafely('xfidelity.refreshIssuesTree');
}

/**
 * Assert that a command exists
 */
export async function assertCommandExists(command: string): Promise<void> {
  const commands = await vscode.commands.getCommands();
  if (!commands.includes(command)) {
    throw new Error(`Command ${command} is not registered`);
  }
}

/**
 * Get status bar text (for testing)
 */
export function getStatusBarText(): string {
  // This is a simplified version for testing
  // In a real scenario, you'd need to access the actual status bar item
  return 'Status unknown';
}
