import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  createCLISpawner,
  CLIResult
} from '../../utils/cliSpawner';

// Global analysis results cache
let cachedAnalysisResults: any = null;
let cachedWorkspacePath: string | null = null;

// Global analysis results cache with TTL
let sharedAnalysisResults: any = null;
let sharedAnalysisTimestamp: number = 0;
const ANALYSIS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes - longer for tests

// NEW: Global test analysis manager
class GlobalTestAnalysisManager {
  private static instance: GlobalTestAnalysisManager;
  private analysisPromise: Promise<any> | null = null;
  private analysisResults: any = null;
  private isInitialized = false;

  static getInstance(): GlobalTestAnalysisManager {
    if (!GlobalTestAnalysisManager.instance) {
      GlobalTestAnalysisManager.instance = new GlobalTestAnalysisManager();
    }
    return GlobalTestAnalysisManager.instance;
  }

  async ensureAnalysisCompleted(): Promise<any> {
    // If we already have results, return them immediately
    if (this.analysisResults) {
      console.log('📋 Using cached global analysis results');
      return this.analysisResults;
    }

    // If analysis is already running, wait for it
    if (this.analysisPromise) {
      console.log('⏳ Waiting for ongoing global analysis...');
      return await this.analysisPromise;
    }

    // Start new analysis
    console.log('🚀 Running global test analysis (once for all suites)...');
    this.analysisPromise = this.runGlobalAnalysis();
    
    try {
      this.analysisResults = await this.analysisPromise;
      return this.analysisResults;
    } catch (error) {
      // Reset on failure so retry is possible
      this.analysisPromise = null;
      throw error;
    }
  }

  private async runGlobalAnalysis(): Promise<any> {
    const workspacePath = getWorkspaceRoot();
    
    try {
      // Clear any stale cache
      clearAnalysisCache();
      
      // Run analysis via extension
      const result = await executeCommandSafely('xfidelity.runAnalysis');
      if (!result.success) {
        throw new Error(`Global analysis failed: ${result.error}`);
      }

      // Wait for completion with aggressive Windows CI timeout to prevent hanging
      const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
      const isWindows = process.platform === 'win32';
      const completionTimeout = isCI && isWindows ? 30000 : isCI ? 60000 : 180000; // Windows CI: 30s, CI: 60s, local: 180s
      
      const completed = await waitForAnalysisCompletion(completionTimeout, workspacePath);
      if (!completed) {
        throw new Error('Global analysis did not complete within timeout');
      }

      // Get results and ensure tree view is updated
      const analysisResults = await getAnalysisResults(workspacePath, true);
      
      // CRITICAL: Ensure tree view is properly synchronized
      await this.ensureTreeViewSynchronized();
      
      console.log(`✅ Global analysis completed: ${analysisResults?.summary?.totalIssues || 0} issues`);
      return analysisResults;
      
    } catch (error) {
      console.error('❌ Global analysis failed:', error);
      throw error;
    }
  }

  private async ensureTreeViewSynchronized(): Promise<void> {
    console.log('🌳 Ensuring tree view synchronization...');
    
    // Wait for diagnostics first
    await waitForDiagnosticProcessing(10000);
    
    // Force tree refresh and wait for it to complete
    await executeCommandSafely('xfidelity.refreshIssuesTree');
    
    // Additional wait to ensure debouncing completes
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log('✅ Tree view synchronization completed');
  }

  // Method to force fresh analysis when needed (for specific tests)
  async runFreshAnalysis(): Promise<any> {
    console.log('🔄 Running fresh analysis (clearing global cache)...');
    this.analysisResults = null;
    this.analysisPromise = null;
    return await this.ensureAnalysisCompleted();
  }

  // Method to check if we have valid cached results
  hasValidResults(): boolean {
    return this.analysisResults !== null;
  }
}

// NEW: Simplified global analysis helper
export async function ensureGlobalAnalysisCompleted(): Promise<any> {
  const manager = GlobalTestAnalysisManager.getInstance();
  return await manager.ensureAnalysisCompleted();
}

// NEW: Force fresh analysis when specifically needed
export async function runGlobalFreshAnalysis(): Promise<any> {
  const manager = GlobalTestAnalysisManager.getInstance();
  return await manager.runFreshAnalysis();
}

// NEW: Check if we have valid cached results
export function hasGlobalAnalysisResults(): boolean {
  const manager = GlobalTestAnalysisManager.getInstance();
  return manager.hasValidResults();
}

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

  // Optimized wait time based on environment to prevent hanging
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWindows = process.platform === 'win32';
  
  // Shorter wait for Windows CI to prevent extension host unresponsiveness
  const waitTime = isCI && isWindows ? 1000 : isCI ? 1500 : 2000;
  await new Promise(resolve => setTimeout(resolve, waitTime));

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

  // Wait for completion with aggressive Windows CI timeout
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  const isWindows = process.platform === 'win32';
  const completionTimeout = isCI && isWindows ? 20000 : isCI ? 45000 : 90000; // Windows CI: 20s, CI: 45s, local: 90s
  
  const completed = await waitForAnalysisCompletion(completionTimeout, workspacePath);
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

/**
 * Get analysis results from XFI_RESULT.json
 */
export async function getAnalysisResults(
  workspacePath?: string,
  forceRefresh = false
): Promise<any> {
  const targetPath = workspacePath || getWorkspaceRoot();
  
  // Check if we have cached results for this workspace
  if (!forceRefresh && cachedAnalysisResults && cachedWorkspacePath === targetPath) {
    return cachedAnalysisResults;
  }

  const resultPath = path.join(targetPath, '.xfiResults', 'XFI_RESULT.json');
  
  if (!fs.existsSync(resultPath)) {
    throw new Error(`Analysis results not found at ${resultPath}`);
  }

  try {
    const content = fs.readFileSync(resultPath, 'utf8');
    const rawResults = JSON.parse(content);
    
    // Transform raw XFI_RESULT.json into VSCode extension format for test compatibility
    const xfiResult = rawResults.XFI_RESULT || rawResults;
    const results = {
      metadata: {
        XFI_RESULT: xfiResult
      },
      summary: {
        totalIssues: xfiResult.totalIssues || 0,
        filesAnalyzed: xfiResult.fileCount || 0,
        analysisTimeMs: (xfiResult.durationSeconds || 0) * 1000,
        issuesByLevel: {
          warning: xfiResult.warningCount || 0,
          error: xfiResult.errorCount || 0,
          fatality: xfiResult.fatalityCount || 0,
          exempt: xfiResult.exemptCount || 0
        }
      },
      // Include raw data for compatibility
      ...rawResults
    };
    
    // Cache transformed results
    cachedAnalysisResults = results;
    cachedWorkspacePath = targetPath;
    
    return results;
  } catch (error) {
    throw new Error(`Failed to read analysis results: ${error}`);
  }
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
  const workspace = getTestWorkspace();
  return workspace.uri.fsPath;
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
  const targetPath = workspacePath || getWorkspaceRoot();
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (hasAnalysisResults(targetPath)) {
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

    // ENHANCED: Wait for diagnostics and tree view to be processed
    await waitForTreeViewUpdate(10000); // Wait up to 10 seconds for complete UI updates

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
 * NEW: Wait for tree view to be updated after analysis
 * This addresses the race condition where the tree view debouncing (100ms) 
 * causes tests to see empty trees before the update completes
 */
export async function waitForTreeViewUpdate(timeoutMs: number = 5000): Promise<void> {
  console.log('🌳 Waiting for tree view update...');
  
  // Wait for diagnostics first
  await waitForDiagnosticProcessing(timeoutMs);
  
  // Additional wait for tree view debouncing to complete
  // The tree provider has a 100ms debounce, so we wait at least 200ms
  // to ensure the tree update has completed
  await new Promise(resolve => setTimeout(resolve, 200));
  
  // Optionally trigger a refresh to ensure tree is populated
  await executeCommandSafely('xfidelity.refreshIssuesTree');
  
  // Give the refresh a moment to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('✅ Tree view update completed');
}

/**
 * Clear analysis cache
 */
export function clearAnalysisCache(): void {
  cachedAnalysisResults = null;
  cachedWorkspacePath = null;
}

/**
 * Get shared analysis results with caching
 * This dramatically speeds up tests by avoiding redundant CLI analysis runs
 */
export async function getSharedAnalysisResults(): Promise<any> {
  const now = Date.now();
  
  // Check if cached results are still valid
  if (sharedAnalysisResults && 
      (now - sharedAnalysisTimestamp) < ANALYSIS_CACHE_TTL) {
    console.log('📋 Using cached analysis results (saves ~60-90 seconds)');
    return sharedAnalysisResults;
  }
  
  console.log('🔄 Running fresh analysis (caching for subsequent tests)...');
  
  const workspace = getTestWorkspace();
  
  try {
    // Run CLI analysis
    const cliResult = await runCLIAnalysis(workspace.uri.fsPath);
    
    if (cliResult.success && cliResult.XFI_RESULT) {
      sharedAnalysisResults = cliResult.XFI_RESULT;
      sharedAnalysisTimestamp = now;
      
      console.log(`📊 Fresh analysis completed with ${
        Array.isArray(sharedAnalysisResults.issues) ? 
        sharedAnalysisResults.issues.length : 'unknown'
      } issues`);
      
      return sharedAnalysisResults;
    } else {
      throw new Error(`CLI analysis failed: ${cliResult.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('❌ Failed to run shared analysis:', error);
    throw error;
  }
}

/**
 * Clear the shared analysis cache
 * Useful for tests that need fresh results
 */
export function clearSharedAnalysisCache(): void {
  sharedAnalysisResults = null;
  sharedAnalysisTimestamp = 0;
  console.log('🧹 Cleared shared analysis cache');
}

/**
 * Ensure XFI tree and problems panel are populated
 */
export async function ensureXfiTreeAndProblemsPopulated(): Promise<void> {
  // Use the new comprehensive tree view update helper
  await waitForTreeViewUpdate(15000);
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
