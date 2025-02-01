import { OperatorDefn, FactDefn, RuleConfig } from './typeDefs';

import type { LoggerOptions } from 'pino';

export interface PluginError {
  message: string;
  level: 'warning' | 'error' | 'fatality';
  details?: any;
}

export interface PluginResult {
  success: boolean;
  data: any;
  error?: PluginError;
}

export interface XFiPlugin {
  name: string;
  version: string;
  facts?: FactDefn[];
  operators?: OperatorDefn[];
  sampleRules?: RuleConfig[];
  onError?: (error: Error) => PluginError;
}

export interface PluginRegistry {
  registerPlugin: (plugin: XFiPlugin) => void;
  getPluginFacts: () => FactDefn[];
  getPluginOperators: () => OperatorDefn[];
  executePluginFunction: (pluginName: string, functionName: string, ...args: any[]) => PluginResult;
}
