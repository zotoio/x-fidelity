import { XFiPlugin, PluginRegistry, PluginResult, PluginError } from '../types/typeDefs';
import { OperatorDefn, FactDefn } from '../types/typeDefs';
import { logger } from '../utils/logger';

export class XFiPluginRegistry implements PluginRegistry {
  private static instance: XFiPluginRegistry;
  private plugins: XFiPlugin[] = [];

  private constructor() {}

  public static getInstance(): XFiPluginRegistry {
    if (!XFiPluginRegistry.instance) {
      XFiPluginRegistry.instance = new XFiPluginRegistry();
    }
    return XFiPluginRegistry.instance;
  }

  public registerPlugin(plugin: XFiPlugin): void {
    // Validate plugin structure
    if (!plugin.name || !plugin.version) {
        logger.error('Invalid plugin format - missing name or version');
        throw new Error('Invalid plugin format - missing name or version');
    }

    // Enhanced logging
    logger.info({
        plugin: {
            name: plugin.name,
            version: plugin.version,
            factCount: plugin.facts?.length || 0,
            operatorCount: plugin.operators?.length || 0,
            facts: plugin.facts?.map(f => ({
                name: f.name,
                type: typeof f.fn
            })),
            operators: plugin.operators?.map(o => ({
                name: o.name,
                type: typeof o.fn
            }))
        },
        operation: 'register-plugin'
    }, `Registering plugin: ${plugin.name}`);

    // Validate facts and operators
    if (plugin.facts) {
        plugin.facts.forEach(fact => {
            if (!fact.name || typeof fact.fn !== 'function') {
                logger.warn(`Invalid fact in plugin ${plugin.name}: ${fact.name}`);
            }
        });
    }

    if (plugin.operators) {
        plugin.operators.forEach(operator => {
            if (!operator.name || typeof operator.fn !== 'function') {
                logger.warn(`Invalid operator in plugin ${plugin.name}: ${operator.name}`);
            }
        });
    }

    this.plugins.push(plugin);
  }

  public getPluginFacts(): FactDefn[] {
    return this.plugins.reduce((facts, plugin) => {
      return facts.concat(plugin.facts || []);
    }, [] as FactDefn[]);
  }

  public getPluginOperators(): OperatorDefn[] {
    return this.plugins.reduce((operators, plugin) => {
      return operators.concat(plugin.operators || []);
    }, [] as OperatorDefn[]);
  }

  public executePluginFunction(pluginName: string, functionName: string, ...args: any[]): PluginResult {
    try {
      const plugin = this.plugins.find(p => p.name === pluginName);
      if (!plugin) {
        throw new Error(`Plugin ${pluginName} not found`);
      }

      const func = plugin[functionName as keyof XFiPlugin];
      if (typeof func !== 'function') {
        throw new Error(`Function ${functionName} not found in plugin ${pluginName}`);
      }

      // Cast args to a tuple type to allow spreading
      const result = func.call(plugin, ...(args as [any]));
      return { success: true, data: result };

    } catch (error) {
      logger.error({
        err: error,
        plugin: pluginName,
        function: functionName,
        type: 'plugin-error'
      }, 'Error executing plugin');
      
      // Use plugin's error handler if available
      const plugin = this.plugins.find(p => p.name === pluginName);
      if (plugin?.onError && error instanceof Error) {
        const pluginError = plugin.onError(error);
        // Always propagate errors up, let the rule's errorBehavior determine if it's fatal
        return { 
          success: false, 
          error: pluginError,
          data: null 
        };
      }

      // For unhandled errors, throw an error with plugin error details
      const pluginError = {
        message: `Plugin ${pluginName} execution failed: ${error}`,
        level: 'fatality', // Default to fatality for unhandled errors
        details: error instanceof Error ? error.stack : undefined
      };

      const wrappedError = new Error(pluginError.message);
      (wrappedError as any).pluginError = pluginError;
      throw wrappedError;
    }
  }
}

export const pluginRegistry = XFiPluginRegistry.getInstance();
