import { pluginRegistry, ConfigManager } from '@x-fidelity/core';
import * as vscode from 'vscode';
import { initializeWasmTreeSitter, isWasmTreeSitterReady } from '../utils/wasmAstUtils';
import { logger } from '../utils/logger';

// Import the AST utils to set up WASM integration
let astUtils: any = null;
try {
  astUtils = require('@x-fidelity/plugins/src/sharedPluginUtils/astUtils');
} catch (_error) {
  logger.debug('AST utils not available for WASM integration');
}

/**
 * Pre-loads X-Fidelity plugins into the plugin registry with WASM tree-sitter support
 * and overrides dynamic imports for the bundled VSCode environment.
 * This is necessary for bundled VSCode extensions where dynamic imports don't work at runtime.
 */
export async function preloadDefaultPlugins(extensionContext: vscode.ExtensionContext): Promise<void> {
  // Skip in test environment where pluginRegistry might be mocked
  if (process.env.NODE_ENV === 'test') {
    logger.info(`[X-Fidelity VSCode] Skipping plugin preloading in test environment`);
    return;
  }
  
  if (!pluginRegistry || typeof pluginRegistry.registerPlugin !== 'function') {
    logger.warn(`[X-Fidelity VSCode] Plugin registry not available, skipping preload`);
    return;
  }

  let loadedCount = 0;
  let loadedPluginsMap: Record<string, any> = {};
  
  // First, try to initialize WASM Tree-sitter for AST support
  let wasmTreeSitterReady = false;
  try {
    logger.info(`[X-Fidelity VSCode] Attempting WASM Tree-sitter initialization...`);
    await initializeWasmTreeSitter(extensionContext);
    wasmTreeSitterReady = isWasmTreeSitterReady();
    logger.info(`[X-Fidelity VSCode] WASM Tree-sitter ready: ${wasmTreeSitterReady}`);
    
    // If WASM is ready, set up the utils for the AST plugin
    if (wasmTreeSitterReady && astUtils && astUtils.setVSCodeWasmUtils) {
      const wasmAstUtils = require('../utils/wasmAstUtils');
      astUtils.setVSCodeWasmUtils(wasmAstUtils);
      logger.info(`[X-Fidelity VSCode] WASM utils configured for AST plugin`);
    }
    
  } catch (error: unknown) {
    const errorObj = error as Error;
    logger.error(`[X-Fidelity VSCode] WASM Tree-sitter initialization failed with error: ${errorObj?.message || 'Unknown error'}`, {
      message: errorObj?.message || 'Unknown error',
      stack: errorObj?.stack || 'No stack trace available',
      name: errorObj?.name || 'Unknown error type',
      extensionPath: extensionContext?.extensionPath
    });
    logger.info(`[X-Fidelity VSCode] AST plugin will load with limited functionality (no AST analysis)`);
  }

  // Define all plugins - AST plugin with graceful degradation
  const allPluginNames = [
    'xfiPluginAst', // Always include AST plugin
    'xfiPluginDependency',
    'xfiPluginFilesystem', 
    'xfiPluginOpenAI',
    'xfiPluginPatterns',
    'xfiPluginReactPatterns',
    'xfiPluginRemoteStringValidator',
    'xfiPluginRequiredFiles',
    'xfiPluginSimpleExample'
  ];

  // Log AST plugin status
  if (wasmTreeSitterReady) {
    logger.info(`[X-Fidelity VSCode] AST plugin will be loaded with WASM support`);
  } else {
    logger.info(`[X-Fidelity VSCode] AST plugin will be loaded with limited functionality (no WASM)`);
  }
  
  // Import plugins with error handling
  try {
    const plugins = require('@x-fidelity/plugins');
    
    for (const pluginName of allPluginNames) {
      try {
        const plugin = plugins[pluginName];
        if (plugin) {
          pluginRegistry.registerPlugin(plugin);
          loadedPluginsMap[pluginName] = plugin;
          logger.info(`[X-Fidelity VSCode] Pre-loaded plugin: ${pluginName}`);
          loadedCount++;
        } else {
          logger.warn(`[X-Fidelity VSCode] Plugin ${pluginName} not found in plugins module`);
        }
      } catch (error) {
        logger.error(`[X-Fidelity VSCode] Failed to pre-load plugin ${pluginName}:`, error);
        // If AST plugin fails and we thought WASM was ready, remove it from loaded plugins
        if (pluginName === 'xfiPluginAst') {
          logger.warn(`[X-Fidelity VSCode] AST plugin failed to load despite WASM being ready`);
        }
      }
    }
  } catch (globalError) {
    logger.error(`[X-Fidelity VSCode] Failed to load plugins module:`, globalError);
    logger.info(`[X-Fidelity VSCode] Falling back to no-plugin mode`);
  }

  // Override ConfigManager's dynamicImport method to work with bundled environment
  const originalDynamicImport = ConfigManager.dynamicImport;
  ConfigManager.dynamicImport = async (modulePath: string): Promise<any> => {
    logger.debug(`[X-Fidelity VSCode] Dynamic import requested: ${modulePath}`);
    
    if (modulePath === '@x-fidelity/plugins') {
      // Return a plugins module with the loaded plugins
      const vscodePluginsModule = {
        ...loadedPluginsMap,
        getBuiltinPluginNames: () => Object.keys(loadedPluginsMap),
        // Create availablePlugins registry with loaded plugins
        availablePlugins: Object.fromEntries(
          Object.keys(loadedPluginsMap).map(name => [
            name,
            () => Promise.resolve(loadedPluginsMap[name])
          ])
        )
      };
      
      logger.debug(`[X-Fidelity VSCode] Returning preloaded plugins module with ${Object.keys(loadedPluginsMap).length} plugins`);
      return vscodePluginsModule;
    }
    
    // Handle individual plugin requests by checking if it's a known plugin
    for (const pluginName of Object.keys(loadedPluginsMap)) {
      if (modulePath.includes(pluginName)) {
        logger.debug(`[X-Fidelity VSCode] Returning preloaded plugin: ${pluginName}`);
        // Return the plugin in the expected format (ES module style)
        return { default: loadedPluginsMap[pluginName] };
      }
    }
    
    // If it's a path request for a plugin that we don't have preloaded, reject it
    if (modulePath.includes('plugins/') || modulePath.includes('xfiPlugin')) {
      const pluginName = modulePath.split('/').pop() || modulePath;
      logger.warn(`[X-Fidelity VSCode] Plugin ${pluginName} not available in preloaded plugins. Available: ${Object.keys(loadedPluginsMap).join(', ')}`);
      throw new Error(`Plugin ${pluginName} not available in bundled VSCode extension. Available plugins: ${Object.keys(loadedPluginsMap).join(', ')}`);
    }
    
    // For other modules, fall back to original behavior
    logger.debug(`[X-Fidelity VSCode] Falling back to original dynamic import for: ${modulePath}`);
    return originalDynamicImport(modulePath);
  };
  
  const astStatus = wasmTreeSitterReady ? 'with AST support (WASM available)' : 'with AST graceful degradation (WASM unavailable)';
  logger.info(`[X-Fidelity VSCode] Pre-loaded ${loadedCount} plugins ${astStatus} and overrode dynamic imports`);
}