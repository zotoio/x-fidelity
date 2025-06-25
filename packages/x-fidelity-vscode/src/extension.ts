import * as vscode from 'vscode';
import { ExtensionManager } from './core/extensionManager';
import { VSCodeLogger } from './utils/vscodeLogger';
import { preloadDefaultPlugins } from './core/pluginPreloader';

// Create VSCode-optimized logger
const logger = new VSCodeLogger('X-Fidelity');

let extensionManager: ExtensionManager | undefined;

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
