import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { customFact } from './facts/customFact';
import { customOperator } from './operators/customOperator';

export const xfiPluginSimpleExample: XFiPlugin = {
    name: 'xfi-plugin-simple-example',
    version: '1.0.0',
    description: 'Simple example plugin for x-fidelity',
    facts: [customFact],
    operators: [customOperator],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-simple-example',
        details: error.stack
    })
};
