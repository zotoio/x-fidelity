import { XFiPlugin, PluginError, PluginContext, OperatorDefn, FactDefn } from '@x-fidelity/types';
import { extractValuesFact } from './facts/extractValuesFact';
import { matchesSatisfyOperator } from './operators/matchesSatisfy';

export const xfiPluginExtractValues: XFiPlugin = {
  name: 'xfiPluginExtractValues',
  version: '1.0.0',
  description: 'Extract values from files by strategy (jsonpath, yaml->jsonpath, xpath, ast, regex) and expose as runtime facts',
  facts: [extractValuesFact as FactDefn],
  operators: [matchesSatisfyOperator as OperatorDefn],
  initialize: async (_context: PluginContext) => {
    // No dynamic initialization required currently
    return;
  },
  onError: (error: Error): PluginError => ({
    message: error.message,
    level: 'error',
    severity: 'error',
    source: 'xfi-plugin-extract-values',
    details: error.stack
  })
};

export default xfiPluginExtractValues;


