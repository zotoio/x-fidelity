import { XFiPlugin, PluginError, PluginContext, ILogger } from '@x-fidelity/types';
import { customFact } from './facts/customFact';
import { customOperator } from './operators/customOperator';

// Plugin logger - will be set during initialization
let logger: ILogger;

export const xfiPluginSimpleExample: XFiPlugin = {
    name: 'xfiPluginSimpleExample',
    version: '1.0.0',
    description: 'Simple example plugin for x-fidelity with enhanced logging',
    facts: [customFact],
    operators: [customOperator],
    
    // Enhanced initialization with logger context
    initialize: async (context: PluginContext): Promise<void> => {
        // Set up plugin logger from context
        logger = context.logger;
        
        // Log successful initialization
        logger.info('Simple example plugin initialized successfully', {
            version: '1.0.0',
            factsCount: 1,
            operatorsCount: 1
        });
        
        // Demonstrate different logger utilities
        const operationLogger = context.loggerContext.createOperationLogger('plugin-startup');
        operationLogger.debug('Plugin startup operation completed');
        
        const factLogger = context.loggerContext.createFactLogger('customFact');
        factLogger.debug('Custom fact logger created');
        
        const operatorLogger = context.loggerContext.createOperatorLogger('customOperator');
        operatorLogger.debug('Custom operator logger created');
    },
    
    // Enhanced error handling
    onError: (error: Error): PluginError => {
        if (logger) {
            logger.error('Plugin error occurred:', error);
        }
        
        return {
            message: error.message,
            level: 'error',
            severity: 'error',
            source: 'xfi-plugin-simple-example',
            details: error.stack
        };
    },
    
    // Cleanup resources
    cleanup: async (): Promise<void> => {
        if (logger) {
            logger.info('Simple example plugin cleanup completed');
        }
    }
};

// Export logger for use by facts and operators
export { logger as pluginLogger };
