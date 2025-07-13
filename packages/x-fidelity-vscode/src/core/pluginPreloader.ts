import { pluginRegistry, ConfigManager } from '@x-fidelity/core';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

/**
 * Pre-loads X-Fidelity plugins into the plugin registry with WASM tree-sitter support
 * and overrides dynamic imports for the bundled VSCode environment.
 * This is necessary for bundled VSCode extensions where dynamic imports don't work at runtime.
 */
export async function preloadDefaultPlugins(
  _extensionContext: vscode.ExtensionContext
): Promise<void> {
  // Skip in test environment where pluginRegistry might be mocked
  if (process.env.NODE_ENV === 'test') {
    logger.info(
      `[X-Fidelity VSCode] Skipping plugin preloading in test environment`
    );
    return;
  }

  // Skip native modules if in safe mode (macOS fd issue mitigation)
  const isSafeMode = process.env.XFI_SAFE_MODE === 'true';
  const disableNative = process.env.XFI_DISABLE_NATIVE === 'true';

  if (isSafeMode || disableNative) {
    logger.info(
      `[X-Fidelity VSCode] Running in safe mode - skipping native module plugins`
    );
  }

  if (!pluginRegistry || typeof pluginRegistry.registerPlugin !== 'function') {
    logger.warn(
      `[X-Fidelity VSCode] Plugin registry not available, skipping preload`
    );
    return;
  }

  let loadedCount = 0;
  let loadedPluginsMap: Record<string, any> = {};

  // Define all plugins - filter out native modules if in safe mode
  let allPluginNames = [
    'xfiPluginAst', // Uses centralized Tree-sitter worker (native)
    'xfiPluginDependency',
    'xfiPluginFilesystem',
    'xfiPluginOpenAI',
    'xfiPluginPatterns',
    'xfiPluginReactPatterns',
    'xfiPluginRemoteStringValidator',
    'xfiPluginRequiredFiles',
    'xfiPluginSimpleExample'
  ];

  // Filter out native module plugins in safe mode
  if (isSafeMode || disableNative) {
    const nativePlugins = ['xfiPluginAst']; // Plugins that use native modules
    allPluginNames = allPluginNames.filter(
      name => !nativePlugins.includes(name)
    );
    logger.info(
      `[X-Fidelity VSCode] Safe mode: excluding native plugins: ${nativePlugins.join(', ')}`
    );
  }

  logger.info(
    `[X-Fidelity VSCode] Loading plugins with centralized worker support`
  );

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
          logger.warn(
            `[X-Fidelity VSCode] Plugin ${pluginName} not found in plugins module`
          );
        }
      } catch (error) {
        logger.error(
          `[X-Fidelity VSCode] Failed to pre-load plugin ${pluginName}:`,
          error
        );
        // If AST plugin fails and we thought WASM was ready, remove it from loaded plugins
        if (pluginName === 'xfiPluginAst') {
          logger.warn(
            `[X-Fidelity VSCode] AST plugin failed to load despite WASM being ready`
          );
        }
      }
    }
  } catch (globalError) {
    logger.error(
      `[X-Fidelity VSCode] Failed to load plugins module:`,
      globalError
    );
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

      logger.debug(
        `[X-Fidelity VSCode] Returning preloaded plugins module with ${Object.keys(loadedPluginsMap).length} plugins`
      );
      return vscodePluginsModule;
    }

    // Handle individual plugin requests by checking if it's a known plugin
    for (const pluginName of Object.keys(loadedPluginsMap)) {
      if (modulePath.includes(pluginName)) {
        logger.debug(
          `[X-Fidelity VSCode] Returning preloaded plugin: ${pluginName}`
        );
        // Return the plugin in the expected format (ES module style)
        return { default: loadedPluginsMap[pluginName] };
      }
    }

    // If it's a path request for a plugin that we don't have preloaded, reject it
    if (modulePath.includes('plugins/') || modulePath.includes('xfiPlugin')) {
      const pluginName = modulePath.split('/').pop() || modulePath;
      logger.warn(
        `[X-Fidelity VSCode] Plugin ${pluginName} not available in preloaded plugins. Available: ${Object.keys(loadedPluginsMap).join(', ')}`
      );
      throw new Error(
        `Plugin ${pluginName} not available in bundled VSCode extension. Available plugins: ${Object.keys(loadedPluginsMap).join(', ')}`
      );
    }

    // For other modules, fall back to original behavior
    logger.debug(
      `[X-Fidelity VSCode] Falling back to original dynamic import for: ${modulePath}`
    );
    return originalDynamicImport(modulePath);
  };

  // Wait for all plugins to complete initialization before proceeding
  if (loadedCount > 0) {
    logger.info(
      `[X-Fidelity VSCode] Waiting for ${loadedCount} plugins to complete initialization...`
    );
    try {
      await pluginRegistry.waitForAllPlugins();
      logger.info(
        `[X-Fidelity VSCode] All plugins initialization completed successfully`
      );
    } catch (error) {
      logger.error(`[X-Fidelity VSCode] Plugin initialization failed:`, error);
      // Don't throw - allow extension to continue with partially initialized plugins
    }
  }

  logger.info(
    `[X-Fidelity VSCode] Pre-loaded ${loadedCount} plugins with centralized AST worker support and overrode dynamic imports`
  );
}
