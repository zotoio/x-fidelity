import { XFiPlugin, PluginRegistry, PluginResult, PluginError } from '../types/pluginTypes';
import { OperatorDefn, FactDefn } from '../types/typeDefs';
import { logger } from '../utils/logger';

class XFiPluginRegistry implements PluginRegistry {
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
    logger.info({
      plugin: {
        name: plugin.name,
        version: plugin.version,
        factCount: plugin.facts?.length || 0,
        operatorCount: plugin.operators?.length || 0,
        facts: plugin.facts?.map(f => f.name),
        operators: plugin.operators?.map(o => o.name),
        sampleRuleCount: plugin.sampleRules?.length || 0
      },
      operation: 'register-plugin'
    }, 'Registering plugin');

    if (plugin.sampleRules) {
      plugin.sampleRules.forEach(rule => {
        logger.debug({ rule, operation: 'register-plugin-rule' }, 'Registering plugin sample rule');
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

      // Cast args to unknown[] to allow spreading
      const result = func.call(plugin, ...(args as unknown[]));
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

      // For unhandled errors, return error result to be handled by rule's errorBehavior
      return {
        success: false,
        error: {
          message: `Plugin ${pluginName} execution failed: ${error}`,
          level: 'fatality', // Default to fatality for unhandled errors
          details: error instanceof Error ? error.stack : undefined
        },
        data: null
      };
    }
  }
}

export const pluginRegistry = XFiPluginRegistry.getInstance();
