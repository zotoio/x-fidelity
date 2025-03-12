import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    fn: (factValue: any, thresholds: any) => {
        try {
            logger.debug(thresholds, 'Checking AST complexity against threshold');

            if (!factValue || !factValue.complexities) {
                logger.debug('No complexity data available');
                return false;
            }

            // Get thresholds from params or use defaults based on the main threshold
            // const thresholds = {
            //     cyclomaticComplexity: threshold?.cyclomaticComplexity || threshold,
            //     cognitiveComplexity: threshold?.cognitiveComplexity || threshold,
            //     nestingDepth: Math.ceil(threshold / 2),
            //     parameterCount: Math.ceil(threshold / 2),
            //     returnCount: Math.ceil(threshold / 3)
            // };

            // Check if any function exceeds any threshold
            const exceedsThreshold = factValue.complexities.some((func: any) => {
                const metrics = func.metrics || {};
                return (
                    metrics.cyclomaticComplexity >= thresholds.cyclomaticComplexity ||
                    metrics.cognitiveComplexity >= thresholds.cognitiveComplexity ||
                    metrics.nestingDepth >= thresholds.nestingDepth ||
                    metrics.parameterCount >= thresholds.parameterCount ||
                    metrics.returnCount >= thresholds.returnCount
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
