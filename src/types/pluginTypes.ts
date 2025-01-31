import { Logger } from 'pino';
import { OperatorDefn, FactDefn, RuleConfig } from './typeDefs';

export interface XFiLogger extends Logger {
    child(bindings: Record<string, unknown>): XFiLogger;
    fatal(obj: unknown, msg?: string, ...args: unknown[]): void;
    error(obj: unknown, msg?: string, ...args: unknown[]): void;
    warn(obj: unknown, msg?: string, ...args: unknown[]): void;
    info(obj: unknown, msg?: string, ...args: unknown[]): void;
    debug(obj: unknown, msg?: string, ...args: unknown[]): void;
    trace(obj: unknown, msg?: string, ...args: unknown[]): void;
}

export interface XFiPlugin {
  name: string;
  version: string;
  facts?: FactDefn[];
  operators?: OperatorDefn[];
  sampleRules?: RuleConfig[];  // Add sample rules array
}

export interface PluginRegistry {
  registerPlugin: (plugin: XFiPlugin) => void;
  getPluginFacts: () => FactDefn[];
  getPluginOperators: () => OperatorDefn[];
}
