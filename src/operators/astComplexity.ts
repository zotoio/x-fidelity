import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    fn: (factValue: any, threshold: number) => {
        try {
            if (!factValue?.complexities) {
                return false;
            }

            // Check if any function exceeds the complexity threshold
            const complexFunctions = factValue.complexities.filter(
                (fn: any) => fn.complexity > threshold
            );

            if (complexFunctions.length > 0) {
                logger.warn({
                    complexFunctions,
                    threshold
                }, 'Found functions exceeding complexity threshold');
                return true;
            }

            return false;
        } catch (error) {
            logger.error(`Error in astComplexity operator: ${error}`);
            return false;
        }
    }
};
