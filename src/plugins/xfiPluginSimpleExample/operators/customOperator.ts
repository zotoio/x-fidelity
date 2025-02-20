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
            
            // Special case: if both values are null or both are undefined, they're equal
            if ((factValue === null && expectedValue === null) || 
                (factValue === undefined && expectedValue === undefined)) {
                return true;
            }

            // If only one value is null/undefined but not both, they're not equal
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
