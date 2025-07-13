import { XFiPlugin, PluginError, PluginContext } from '@x-fidelity/types';
import { astFact } from './facts/astFact';
import { codeRhythmFact } from './facts/codeRhythmFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCountOperator } from './operators/functionCount';
import { treeSitterManager } from './worker/treeSitterManager';

export const xfiPluginAst: XFiPlugin = {
    name: 'xfiPluginAst',
    version: '1.0.0',
    description: 'AST analysis plugin for x-fidelity',
    facts: [
        astFact,
        codeRhythmFact,
        functionComplexityFact,
        functionCountFact
    ],
    operators: [astComplexity, functionCountOperator],
    initialize: async (context: PluginContext): Promise<void> => {
        // Pre-initialize TreeSitter manager to prevent multiple worker creation
        // This singleton initialization prevents the MaxListenersExceededWarning
        context.logger.info('[AST Plugin] Pre-initializing TreeSitter manager...');
        try {
            await treeSitterManager.initialize();
            context.logger.info('[AST Plugin] TreeSitter manager initialized successfully');
        } catch (error) {
            context.logger.error('[AST Plugin] Failed to pre-initialize TreeSitter manager:', error);
            throw error;
        }
    },
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfi-plugin-ast',
        details: error.stack
    })
};
