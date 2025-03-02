import { FactDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

/**
 * Example custom fact that returns a simple data object
 * Demonstrates basic fact implementation pattern
 */
export const customFact: FactDefn = {
    name: 'customFact',
    fn: async (params, almanac) => {
        try {
            logger.debug('Executing customFact');
            const result = 'custom fact data';
            
            // Add the result to the almanac if resultFact is provided
            if (params && params.resultFact) {
                almanac.addRuntimeFact(params.resultFact, result);
            }
            
            return result;
        } catch (error) {
            logger.error(`Error in customFact: ${error}`);
            throw error;
        }
    }
};
