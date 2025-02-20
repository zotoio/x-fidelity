import { OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

/**
 * Example custom operator that performs simple equality comparison
 * Demonstrates basic operator implementation pattern
 */
export const customOperator: OperatorDefn = {
    name: 'customOperator',
    fn: (factValue: any, expectedValue: any) => {
        try {
            logger.debug('Executing customOperator', { factValue, expectedValue });
            
            if (factValue === undefined || factValue === null) {
                logger.warn('customOperator received undefined/null factValue');
                return false;
            }

            return factValue === expectedValue;
        } catch (error) {
            logger.error(`Error in customOperator: ${error}`);
            return false;
        }
    }
};
