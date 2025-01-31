import { Logger } from 'pino';
import { OperatorDefn, FactDefn, RuleConfig } from './typeDefs';

import type { Logger as PinoLogger } from 'pino';

export interface XFiLogger extends PinoLogger {
    child(bindings: Record<string, unknown>): PinoLogger;
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
