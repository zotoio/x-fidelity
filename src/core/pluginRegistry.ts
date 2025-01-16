import { XFiPlugin, PluginRegistry } from '../types/pluginTypes';
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
    this.plugins.push(plugin);
  }

  public getPluginFacts(): { name: string; fn: Function; }[] {
    return this.plugins.reduce((facts, plugin) => {
      return facts.concat(plugin.facts || []);
    }, [] as { name: string; fn: Function; }[]);
  }

  public getPluginOperators(): OperatorDefn[] {
    return this.plugins.reduce((operators, plugin) => {
      return operators.concat(plugin.operators || []);
    }, [] as OperatorDefn[]);
  }
}

export const pluginRegistry = XFiPluginRegistry.getInstance();
