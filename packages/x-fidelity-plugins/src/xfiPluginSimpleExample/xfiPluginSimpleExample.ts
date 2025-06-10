import { XFiPlugin } from '@x-fidelity/types';
import { customFact } from './facts/customFact';
import { customOperator } from './operators/customOperator';

export const xfiPluginSimpleExample: XFiPlugin = {
    name: 'xfi-plugin-simple-example',
    version: '1.0.0',
    description: 'A simple example plugin',
    facts: [customFact],
    operators: [customOperator],
    onError: (error: Error) => ({
        message: error.message,
        level: 'error',
        source: 'xfi-plugin-simple-example'
    })
};
