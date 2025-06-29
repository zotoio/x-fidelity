import * as vscode from 'vscode';
import { ExtensionManager } from './core/extensionManager';
import { VSCodeLogger } from './utils/vscodeLogger';

// Global logger for extension lifecycle
const logger = new VSCodeLogger('X-Fidelity');

let extensionManager: ExtensionManager | undefined;

/**
 * Optimized extension activation with fast startup and error recovery
 */
export async function activate(context: vscode.ExtensionContext) {
  const startTime = performance.now();
  
  logger.info('X-Fidelity extension activation started...', {
    version: context.extension.packageJSON.version,
    mode: context.extensionMode === vscode.ExtensionMode.Development ? 'development' : 'production'
  });

  try {
    // Set context immediately for UI elements
    await vscode.commands.executeCommand('setContext', 'xfidelity.extensionActive', false);

    // Fast initialization - don't block on heavy operations
    extensionManager = new ExtensionManager(context);
    context.subscriptions.push(extensionManager);

    const activationTime = performance.now() - startTime;
    logger.info('X-Fidelity extension activated successfully', { activationTime: Math.round(activationTime) });

    // Show quick activation message only in development
    if (context.extensionMode === vscode.ExtensionMode.Development) {
      vscode.window.showInformationMessage(`X-Fidelity activated in ${Math.round(activationTime)}ms`);
    }

    // Performance warning
    if (activationTime > 2000) {
      logger.warn('Slow extension activation detected', { activationTime });
    }

  } catch (error) {
    const activationTime = performance.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('X-Fidelity activation failed:', { 
      error: errorMessage,
      activationTime: Math.round(activationTime)
    });

    // Show error to user with helpful actions
    const action = await vscode.window.showErrorMessage(
      `X-Fidelity activation failed: ${errorMessage}`,
      'Show Logs',
      'Report Issue'
    );

    if (action === 'Show Logs') {
      logger.show();
    } else if (action === 'Report Issue') {
      vscode.env.openExternal(vscode.Uri.parse(
        'https://github.com/zotoio/x-fidelity/issues/new?template=bug_report.md'
      ));
    }

    // Don't re-throw - allow VSCode to continue normally
  }
}

/**
 * Clean extension deactivation
 */
export function deactivate() {
  logger.info('X-Fidelity extension deactivating...');
  
  try {
    if (extensionManager) {
      extensionManager.dispose();
      extensionManager = undefined;
    }
    
    logger.info('X-Fidelity extension deactivated successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during extension deactivation:', { error: errorMessage });
  }
}