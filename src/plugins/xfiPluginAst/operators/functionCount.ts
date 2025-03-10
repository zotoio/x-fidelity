import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

export const functionCount: OperatorDefn = {
    name: 'functionCount',
    fn: (factValue: any, threshold: number) => {
        try {
            logger.debug({ threshold }, 'Checking function count against threshold');

            if (!factValue || typeof factValue.count !== 'number') {
                logger.debug('No valid function count data available');
                return false;
            }

            const result = factValue.count > threshold;
            logger.debug({ 
                count: factValue.count,
                threshold,
                exceedsThreshold: result,
                functions: factValue.functions
            }, 'Completed function count threshold check');

            return result;
        } catch (error) {
            logger.error(`Error in functionCount operator: ${error}`);
            return false;
        }
    }
};
