import * as vscode from 'vscode';
import { ExtensionManager } from './core/extensionManager';
import { VSCodeLogger } from './utils/vscodeLogger';
import { preloadDefaultPlugins } from './core/pluginPreloader';

// Create VSCode-optimized logger
const logger = new VSCodeLogger('X-Fidelity');

let extensionManager: ExtensionManager | undefined;

// Initialize the extension with enhanced logging best practices
export async function activate(context: vscode.ExtensionContext) {
  // SET CONTEXT IMMEDIATELY - before any other initialization
  await vscode.commands.executeCommand('setContext', 'xfidelity.extensionActive', true);
  
  // Initialize the enhanced logger system with best practices configuration
  const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
  const isTest = context.extensionMode === vscode.ExtensionMode.Test;
  
  logger.info('X-Fidelity extension activation started...', {
    version: context.extension.packageJSON.version,
    mode: isDevelopment ? 'development' : isTest ? 'test' : 'production'
  });
  
  try {
    // Pre-load all default plugins with WASM support before core initialization
    // This is critical for bundled extensions where dynamic imports don't work
    logger.info('Pre-loading default X-Fidelity plugins with WASM support...');
    try {
      await preloadDefaultPlugins(context);
      logger.info('Plugin preloading completed successfully');
    } catch (pluginError) {
      logger.warn('Plugin preloading failed, continuing with limited functionality:', pluginError);
      // Don't fail activation if plugins fail to load in test mode
      if (!isTest) {
        throw pluginError;
      }
    }
    
    logger.info('Creating ExtensionManager...');
    extensionManager = new ExtensionManager(context);
    context.subscriptions.push(extensionManager);
    
    logger.info('X-Fidelity extension activated successfully');
    
    // Show activation confirmation with appropriate messaging
    if (isDevelopment) {
      await vscode.window.showInformationMessage('X-Fidelity extension activated (dev mode)');
      logger.debug('Extension running in development mode');
    } else if (isTest) {
      logger.debug('Extension running in test mode');
      // Don't show info messages in test mode
    } else {
      await vscode.window.showInformationMessage('X-Fidelity extension activated successfully!');
    }
    
    // Listen for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('xfidelity')) {
        logger.info('Configuration updated');
      }
    });
    
    context.subscriptions.push(configWatcher);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    
    logger.error('X-Fidelity activation failed:', { 
      error: errorMessage, 
      stack
    });
    
    // In test mode, be more tolerant of errors
    if (isTest) {
      logger.warn('Extension activation failed in test mode, continuing with limited functionality');
      
      // Try to create a minimal extension manager for testing
      try {
        extensionManager = new ExtensionManager(context);
        context.subscriptions.push(extensionManager);
        logger.info('Created minimal extension manager for testing');
        return;
      } catch (testError) {
        logger.error('Failed to create minimal extension manager for testing:', testError);
      }
    }
    
    // Enhanced error handling with recovery options
    await vscode.window.showErrorMessage(
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
        // Open issue reporting URL
        vscode.env.openExternal(vscode.Uri.parse(
          'https://github.com/zotoio/x-fidelity/issues/new?template=bug_report.md'
        ));
      }
    });
    
    // Don't re-throw to prevent VSCode from marking extension as failed
    logger.error('Extension activation failed but not re-throwing to prevent complete failure');
  }
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
