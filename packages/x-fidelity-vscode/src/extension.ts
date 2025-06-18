import * as vscode from 'vscode';
import { ExtensionManager } from './core/extensionManager';
import { VSCodeLogger } from './utils/vscodeLogger';
import { preloadDefaultPlugins } from './core/pluginPreloader';

// Create VSCode-optimized logger
const logger = new VSCodeLogger('X-Fidelity');

let extensionManager: ExtensionManager | undefined;

// Initialize the extension with enhanced logging best practices
export async function activate(context: vscode.ExtensionContext) {
  // Initialize the enhanced logger system with best practices configuration
  const isDevelopment = context.extensionMode === vscode.ExtensionMode.Development;
  const config = vscode.workspace.getConfiguration('xfidelity');
  
  logger.info('X-Fidelity extension activation started...', {
    version: context.extension.packageJSON.version,
    mode: isDevelopment ? 'development' : 'production'
  });
  
  // Pre-load all default plugins with WASM support before core initialization
  // This is critical for bundled extensions where dynamic imports don't work
  logger.info('Pre-loading default X-Fidelity plugins with WASM support...');
  await preloadDefaultPlugins(context);
  
  try {
    logger.info('Creating ExtensionManager...');
    extensionManager = new ExtensionManager(context);
    context.subscriptions.push(extensionManager);
    
    logger.info('X-Fidelity extension activated successfully');
    
    // Show activation confirmation with appropriate messaging
    if (isDevelopment) {
      await vscode.window.showInformationMessage('X-Fidelity extension activated (dev mode)');
      logger.debug('Extension running in development mode');
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
    
    // Enhanced error handling with recovery options
    await vscode.window.showErrorMessage(
      `Failed to activate X-Fidelity extension: ${errorMessage}`,
      'Show Details',
      'Retry',
      'Report Issue'
    ).then(choice => {
      if (choice === 'Show Details') {
        vscode.window.showInformationMessage(
          `X-Fidelity Extension Error:\n\n${errorMessage}\n\nStack:\n${stack}`,
          { modal: true }
        );
      } else if (choice === 'Retry') {
        logger.info('Retrying extension activation...');
        setTimeout(() => activate(context), 2000);
      } else if (choice === 'Report Issue') {
        // Open issue reporting URL
        vscode.env.openExternal(vscode.Uri.parse(
          'https://github.com/zotoio/x-fidelity/issues/new?template=bug_report.md'
        ));
      }
    });
    
    throw error; // Re-throw to maintain error semantics
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
