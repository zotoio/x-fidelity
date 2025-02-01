import { Logger } from 'pino';
import { OperatorDefn, FactDefn, RuleConfig } from './typeDefs';

import type { Logger as PinoLogger, LoggerOptions } from 'pino';

export interface XFiLogger extends Omit<PinoLogger, 'child'> {
    child(bindings: Record<string, unknown>): XFiLogger;
    fatal(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    trace(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
}

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
