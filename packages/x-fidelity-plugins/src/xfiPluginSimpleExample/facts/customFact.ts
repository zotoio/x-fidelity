import { FactDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

interface CustomFactParams {
    resultFact?: string;
    [key: string]: any;
}

interface CustomFactAlmanac {
    addRuntimeFact: (factName: string, value: any) => void;
}

/**
 * Example custom fact that returns a simple data object
 * Demonstrates basic fact implementation pattern
 */
export const customFact: FactDefn = {
    name: 'customFact',
    description: 'A simple example fact',
    type: 'iterative-function',  // ✅ Iterative-function fact - runs once per file (default behavior)
    priority: 1,                 // ✅ Default priority for iterative functions
    fn: async (params: unknown, almanac?: unknown): Promise<boolean> => {
        try {
            const factParams = params as CustomFactParams;
            const factAlmanac = almanac as CustomFactAlmanac;

            const result = true; // Example result

            if (factParams?.resultFact && factAlmanac?.addRuntimeFact) {
                factAlmanac.addRuntimeFact(factParams.resultFact, result);
            }

            return result;
        } catch (error) {
            logger.error('Error in customFact:', error);
            return false;
        }
    }
};
