import { XFiPlugin, PluginError, PluginContext } from '@x-fidelity/types';
import { getOptions } from '@x-fidelity/core';
import { astFact } from './facts/astFact';
import { functionComplexityFact } from './facts/functionComplexityFact';
import { functionCountFact } from './facts/functionCountFact';
import { astComplexity } from './operators/astComplexity';
import { functionCountOperator } from './operators/functionCount';
import { treeSitterManager } from '../sharedPluginUtils/astUtils/treeSitterManager';

export const xfiPluginAst: XFiPlugin = {
    name: 'xfiPluginAst',
    version: '1.0.0',
    description: 'AST analysis plugin for x-fidelity',
    facts: [
        astFact,
        functionComplexityFact,
        functionCountFact
    ],
    operators: [astComplexity, functionCountOperator],
    initialize: async (context: PluginContext): Promise<void> => {
        // Check if TreeSitter worker should be enabled before attempting initialization
        const coreOptions = getOptions();
        if (!coreOptions.enableTreeSitterWorker) {
            context.logger.debug('[AST Plugin] Tree-sitter worker not enabled, using direct parsing mode');
            return;
        }

        // Pre-initialize TreeSitter manager to prevent multiple worker creation
        // This singleton initialization prevents the MaxListenersExceededWarning
        context.logger.info('[AST Plugin] Pre-initializing TreeSitter manager...');
        try {
            await treeSitterManager.initialize();
            context.logger.info('[AST Plugin] TreeSitter manager initialized successfully');
        } catch (error) {
            context.logger.warn('[AST Plugin] TreeSitter worker initialization failed, falling back to direct parsing:', error);
            // Don't throw - let it fall back to direct parsing
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
