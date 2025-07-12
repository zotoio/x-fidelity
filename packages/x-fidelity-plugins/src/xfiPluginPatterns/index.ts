import { XFiPlugin, PluginError, PluginContext, ILogger } from '@x-fidelity/types';
import { globalFileAnalysis } from './facts/globalFileAnalysisFacts';
import { regexMatch } from './operators/regexMatch';
import { regexMatchWithPosition } from './operators/regexMatchWithPosition';
import { globalPatternCount } from './operators/globalPatternCount';
import { globalPatternRatio } from './operators/globalPatternRatio';

// Plugin logger - will be set during initialization
let logger: ILogger;

export const xfiPluginPatterns: XFiPlugin = {
    name: 'xfi-plugin-patterns',
    version: '1.0.0',
    description: 'Plugin for pattern matching and regex analysis with enhanced logging',
    facts: [globalFileAnalysis],
    operators: [
        regexMatch,
        regexMatchWithPosition,
        globalPatternCount,
        globalPatternRatio
    ],
    
    // Enhanced initialization with logger context
    initialize: async (context: PluginContext): Promise<void> => {
        // Set up plugin logger from context
        logger = context.logger;
        
        // Log successful initialization
        logger.info('Patterns plugin initialized successfully', {
            version: '1.0.0',
            factsCount: 1,
            operatorsCount: 4
        });
        
        // Create specialized loggers for different components
        const factLogger = context.loggerContext.createFactLogger('globalFileAnalysis');
        factLogger.debug('Global file analysis fact logger ready');
        
        const operatorLogger = context.loggerContext.createOperatorLogger('regexMatch');
        operatorLogger.debug('Regex match operator logger ready');
    },
    
    // Enhanced error handling
    onError: (error: Error): PluginError => {
        if (logger) {
            logger.error('Patterns plugin error occurred:', error);
        }
        
        return {
            message: error.message,
            level: 'error',
            severity: 'error',
            source: 'xfi-plugin-patterns',
            details: error.stack
        };
    },
    
    // Cleanup resources
    cleanup: async (): Promise<void> => {
        if (logger) {
            logger.info('Patterns plugin cleanup completed');
        }
    }
};

// Export logger for use by facts and operators
export { logger as pluginLogger };

