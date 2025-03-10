import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    fn: (factValue: any, threshold: number) => {
        try {
            logger.debug({ threshold }, 'Checking AST complexity against threshold');

            if (!factValue || !factValue.maxComplexity) {
                logger.debug('No complexity data available');
                return false;
            }

            const result = factValue.maxComplexity >= threshold;
            logger.trace({ 
                maxComplexity: factValue.maxComplexity,
                threshold,
                exceedsThreshold: result,
                complexityDetails: factValue.complexities?.map((c: any) => ({
                    name: c.name,
                    complexity: c.complexity,
                    exceedsThreshold: c.complexity >= threshold
                }))
            }, 'Completed complexity threshold check');

            return result;
        } catch (error) {
            logger.error(`Error in astComplexity operator: ${error}`);
            return false;
        }
    }
};
