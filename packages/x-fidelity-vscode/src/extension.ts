import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';
import { ExtensionManager } from './core/extensionManager';
import { VSCodeLogger } from './utils/vscodeLogger';
import { preloadDefaultPlugins } from './core/pluginPreloader';
import type { ResultMetadata } from '@x-fidelity/types';

// Create VSCode-optimized logger
const logger = new VSCodeLogger('X-Fidelity');

let extensionManager: ExtensionManager | undefined;

// Helper function to run CLI analysis for fallback mode
async function runFallbackCLIAnalysis(workspacePath: string): Promise<ResultMetadata> {
  return new Promise((resolve, reject) => {
    const cliPath = path.resolve(__dirname, '../../x-fidelity-cli/dist/index.js');
    
    logger.info(`Attempting to run CLI at: ${cliPath}`);
    
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
      logger.info(`CLI process exited with code: ${code}`);
      
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

// Initialize the extension with enhanced logging best practices
export async function activate(context: vscode.ExtensionContext) {
  const startTime = performance.now();
  
  // Set context immediately - non-blocking
  vscode.commands.executeCommand('setContext', 'xfidelity.extensionActive', true);
  
  const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
  const isTest = context.extensionMode === vscode.ExtensionMode.Test;
  
  logger.info('X-Fidelity extension activation started...', {
    version: context.extension.packageJSON.version,
    mode: isDevelopment ? 'development' : isTest ? 'test' : 'production',
    activationTime: startTime
  });
  
  try {
    // CRITICAL: Use lazy initialization - don't block activation
    const initPromise = initializeExtensionAsync(context, isDevelopment, isTest);
    
    // Register essential commands immediately (non-blocking)
    registerEssentialCommands(context);
    
    // Continue initialization in background
    initPromise.catch(error => {
      logger.error('Background initialization failed:', error);
      handleInitializationError(error, isTest);
    });
    
    const activationTime = performance.now() - startTime;
    logger.info('X-Fidelity extension activation completed', { activationTime });
    
    // Track activation performance
    if (activationTime > 1000) {
      logger.warn('Slow extension activation detected', { activationTime });
    }
    
  } catch (error) {
    const activationTime = performance.now() - startTime;
    logger.error('X-Fidelity activation failed:', { 
      error: error instanceof Error ? error.message : String(error),
      activationTime
    });
    
    if (!isTest) {
      handleActivationError(error);
    }
  }
}

// Add these new functions:
async function initializeExtensionAsync(
  context: vscode.ExtensionContext, 
  isDevelopment: boolean, 
  isTest: boolean
): Promise<void> {
  const initStartTime = performance.now();
  
  try {
    // Pre-load plugins asynchronously
    await preloadDefaultPlugins(context);
    logger.info('Plugin preloading completed', { 
      duration: performance.now() - initStartTime 
    });
    
    // Create extension manager
    extensionManager = new ExtensionManager(context);
    context.subscriptions.push(extensionManager);
    
    const totalInitTime = performance.now() - initStartTime;
    logger.info('Extension initialization completed', { totalInitTime });
    
    // Show success message only in appropriate modes
    if (isDevelopment) {
      vscode.window.showInformationMessage('X-Fidelity extension activated (dev mode)');
    } else if (!isTest) {
      vscode.window.showInformationMessage('X-Fidelity extension activated successfully!');
    }
    
    // Listen for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('xfidelity')) {
        logger.info('Configuration updated');
      }
    });
    
    context.subscriptions.push(configWatcher);
    
  } catch (error) {
    logger.error('Extension initialization failed:', error);
    throw error;
  }
}

function registerEssentialCommands(context: vscode.ExtensionContext): void {
  // Register minimal commands that work even if full initialization fails
  const essentialCommands = [
    vscode.commands.registerCommand('xfidelity.test', () => {
      vscode.window.showInformationMessage('X-Fidelity extension is active!');
    }),
    vscode.commands.registerCommand('xfidelity.showOutput', () => {
      logger.show();
    }),
    vscode.commands.registerCommand('xfidelity.getTestResults', () => {
      // For testing purposes, return the stored analysis results
      logger.info('getTestResults called, returning stored results');
      return (global as any).xfidelityFallbackResults || null;
    }),
    vscode.commands.registerCommand('xfidelity.runAnalysis', async () => {
      logger.info('runAnalysis called in fallback mode - running CLI analysis');
      
      try {
        // Run CLI analysis in the background to get real results for testing
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error('No workspace folder found');
        }
        
        const analysisResults = await runFallbackCLIAnalysis(workspaceFolder.uri.fsPath);
        (global as any).xfidelityFallbackResults = analysisResults;
        
        vscode.window.showInformationMessage(
          `X-Fidelity analysis completed: Found ${analysisResults.XFI_RESULT.totalIssues} issues`
        );
        
        logger.info(`Fallback analysis completed with ${analysisResults.XFI_RESULT.totalIssues} issues`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Fallback analysis failed: ${errorMessage}`);
        vscode.window.showWarningMessage(`X-Fidelity analysis failed: ${errorMessage}`);
      }
    }),
    vscode.commands.registerCommand('xfidelity.showControlCenter', () => {
      logger.info('showControlCenter called in fallback mode');
      vscode.window.showWarningMessage('X-Fidelity Control Center is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.detectArchetype', () => {
      logger.info('detectArchetype called in fallback mode');
      vscode.window.showWarningMessage('Archetype detection is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.runAnalysisWithDir', () => {
      logger.info('runAnalysisWithDir called in fallback mode');
      vscode.window.showWarningMessage('Analysis with directory is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.openSettings', () => {
      return vscode.commands.executeCommand('workbench.action.openSettings', '@ext:zotoio.x-fidelity-vscode');
    }),
    vscode.commands.registerCommand('xfidelity.cancelAnalysis', () => {
      logger.info('cancelAnalysis called in fallback mode');
      vscode.window.showWarningMessage('Analysis cancellation is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.openReports', () => {
      logger.info('openReports called in fallback mode');
      vscode.window.showWarningMessage('Report management is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.resetConfiguration', () => {
      logger.info('resetConfiguration called in fallback mode');
      vscode.window.showWarningMessage('Configuration reset is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.addExemption', () => {
      logger.info('addExemption called in fallback mode');
      vscode.window.showWarningMessage('Adding exemptions is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.addBulkExemptions', () => {
      logger.info('addBulkExemptions called in fallback mode');
      vscode.window.showWarningMessage('Bulk exemptions are not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.showRuleDocumentation', () => {
      logger.info('showRuleDocumentation called in fallback mode');
      vscode.window.showWarningMessage('Rule documentation is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.showReportHistory', () => {
      logger.info('showReportHistory called in fallback mode');
      vscode.window.showWarningMessage('Report history is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.exportReport', () => {
      logger.info('exportReport called in fallback mode');
      vscode.window.showWarningMessage('Export report is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.shareReport', () => {
      logger.info('shareReport called in fallback mode');
      vscode.window.showWarningMessage('Share report is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.compareReports', () => {
      logger.info('compareReports called in fallback mode');
      vscode.window.showWarningMessage('Compare reports is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.viewTrends', () => {
      logger.info('viewTrends called in fallback mode');
      vscode.window.showWarningMessage('View trends is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.showAdvancedSettings', () => {
      logger.info('showAdvancedSettings called in fallback mode');
      vscode.window.showWarningMessage('Advanced settings are not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.showDashboard', () => {
      logger.info('showDashboard called in fallback mode');
      vscode.window.showWarningMessage('Dashboard is not available in fallback mode.');
    }),
    vscode.commands.registerCommand('xfidelity.showIssueExplorer', () => {
      logger.info('showIssueExplorer called in fallback mode');
      vscode.window.showWarningMessage('Issue explorer is not available in fallback mode.');
    })
  ];
  
  context.subscriptions.push(...essentialCommands);
}

function handleInitializationError(error: any, isTest: boolean): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (isTest) {
    logger.warn('Extension initialization failed in test mode, continuing with limited functionality');
  } else {
    vscode.window.showWarningMessage(
      `X-Fidelity extension started with limited functionality: ${errorMessage}`,
      'Show Output'
    ).then(choice => {
      if (choice === 'Show Output') {
        logger.show();
      }
    });
  }
}

function handleActivationError(error: any): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  
  vscode.window.showErrorMessage(
    `Failed to activate X-Fidelity extension: ${errorMessage}`,
    'Show Details',
    'Show Logs',
    'Report Issue'
  ).then(choice => {
    if (choice === 'Show Details') {
      vscode.window.showInformationMessage(
        `X-Fidelity Extension Error:\n\n${errorMessage}\n\nStack:\n${stack}`,
        { modal: true }
      );
    } else if (choice === 'Show Logs') {
      logger.show();
    } else if (choice === 'Report Issue') {
      vscode.env.openExternal(vscode.Uri.parse(
        'https://github.com/zotoio/x-fidelity/issues/new?template=bug_report.md'
      ));
    }
  });
}

// Enhanced deactivation with proper cleanup
export function deactivate() {
  logger.info('X-Fidelity extension deactivating...');
  
  try {
    // Dispose extension manager first
    if (extensionManager) {
      extensionManager.dispose();
      extensionManager = undefined;
      logger.debug('ExtensionManager disposed successfully');
    }
    
    logger.info('X-Fidelity extension deactivated successfully');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during extension deactivation:', { 
      error: errorMessage
    });
  }
}
