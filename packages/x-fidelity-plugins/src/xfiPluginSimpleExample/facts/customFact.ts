import { FactDefn, FileData } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core';

interface CustomFactParams {
    resultFact?: string;
    [key: string]: any;
}

interface CustomFactAlmanac {
    addRuntimeFact?: (name: string, value: any) => void;
    [key: string]: any;
}

/**
 * Example custom fact that returns a simple data object
 * Demonstrates basic fact implementation pattern with enhanced logging
 */
export const customFact: FactDefn = {
    name: 'customFact',
    description: 'A simple example fact with enhanced logging support',
    type: 'iterative-function',  // ✅ Iterative-function fact - runs once per file (default behavior)
    priority: 1,                 // ✅ Default priority for iterative functions
    fn: async (params: unknown, almanac?: unknown): Promise<boolean> => {
        // Create or get plugin logger
        const logger = pluginLogger.createOperationLogger('xfi-plugin-simple-example', 'customFact');
        
        try {
            const factParams = params as CustomFactParams;
            const factAlmanac = almanac as CustomFactAlmanac;

            logger.debug('Executing custom fact', {
                paramsKeys: Object.keys(factParams || {}),
                hasAlmanac: !!factAlmanac,
                fact: 'customFact'
            });

            const result = true; // Example result

            if (factParams?.resultFact && factAlmanac?.addRuntimeFact) {
                logger.debug('Adding runtime fact to almanac', {
                    factName: factParams.resultFact,
                    result,
                    fact: 'customFact'
                });
                factAlmanac.addRuntimeFact(factParams.resultFact, result);
            }

            logger.debug('Custom fact completed successfully', { 
                result,
                fact: 'customFact' 
            });
            return result;
        } catch (error) {
            const logger = pluginLogger.getLogger();
            logger.error('Error in customFact:', error);
            return false;
        }
    }
};
