import { FactDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

/**
 * Example custom fact that returns a simple data object
 * Demonstrates basic fact implementation pattern
 */
export const customFact: FactDefn = {
    name: 'customFact',
    fn: async (params) => {
        try {
            logger.debug('Executing customFact');
            return { result: 'custom fact data' };
        } catch (error) {
            logger.error(`Error in customFact: ${error}`);
            throw error;
        }
    }
};
