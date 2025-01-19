import { OperatorDefn, FactDefn, RuleConfig } from './typeDefs';

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
