import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    fn: (factValue: any, threshold: number) => {
        try {
            logger.debug({ threshold }, 'Checking AST complexity against threshold');

            if (!factValue || !factValue.complexities) {
                logger.debug('No complexity data available');
                return false;
            }

            // Check if any function exceeds the complexity threshold
            const exceedsThreshold = factValue.complexities.some((func: any) => {
                const metrics = func.metrics || {};
                return (
                    metrics.cyclomaticComplexity >= threshold ||
                    metrics.cognitiveComplexity >= threshold ||
                    metrics.nestingDepth >= Math.ceil(threshold / 2) // Nesting depth threshold is half
                );
            });

            logger.debug({ 
                exceedsThreshold,
                complexities: factValue.complexities.map((c: any) => ({
                    name: c.name,
                    metrics: c.metrics
                }))
            }, 'Completed complexity threshold check');

            return exceedsThreshold;
        } catch (error) {
            logger.error(`Error in astComplexity operator: ${error}`);
            return false;
        }
    }
};
