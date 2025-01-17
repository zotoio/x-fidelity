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
    logger.info(`Registering plugin: ${plugin.name} v${plugin.version}`);
    if (plugin.facts) {
      logger.info(`Plugin ${plugin.name} provides ${plugin.facts.length} facts: ${plugin.facts.map(f => f.name).join(', ')}`);
    }
    if (plugin.operators) {
      logger.info(`Plugin ${plugin.name} provides ${plugin.operators.length} operators: ${plugin.operators.map(o => o.name).join(', ')}`);
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
