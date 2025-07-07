import { XFiPlugin, PluginError } from '@x-fidelity/types';
import { astFact } from './facts/astFact';
import { codeRhythmFact } from './facts/codeRhythmFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCountOperator } from './operators/functionCount';

export const xfiPluginAst: XFiPlugin = {
    name: 'xfi-plugin-ast',
    version: '1.0.0',
    description: 'AST analysis plugin for x-fidelity',
    facts: [
        astFact,
        codeRhythmFact,
        functionComplexityFact,
        functionCountFact
    ],
    operators: [astComplexity, functionCountOperator],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-ast',
        details: error.stack
    })
};
