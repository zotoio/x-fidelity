import { Logger } from 'pino';
import { OperatorDefn, FactDefn, RuleConfig } from './typeDefs';

export interface XFiLogger extends Logger {
    child(bindings: Record<string, unknown>): Logger;
    fatal(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    error(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    warn(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    info(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    debug(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
    trace(obj: Record<string, unknown>, msg?: string, ...args: unknown[]): void;
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
