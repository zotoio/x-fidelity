import { XFiPlugin, PluginRegistry } from '../types/pluginTypes';
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
}

export const pluginRegistry = XFiPluginRegistry.getInstance();
