import { OperatorDefn } from './typeDefs';

export interface XFiPlugin {
  name: string;
  version: string;
  facts?: {
    name: string;
    fn: Function;
  }[];
  operators?: OperatorDefn[];
}

export interface PluginRegistry {
  registerPlugin: (plugin: XFiPlugin) => void;
  getPluginFacts: () => { name: string; fn: Function; }[];
  getPluginOperators: () => OperatorDefn[];
}
