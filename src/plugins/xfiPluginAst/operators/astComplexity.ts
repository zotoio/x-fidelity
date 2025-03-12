import { logger } from '../../../utils/logger';
import { OperatorDefn } from '../../../types/typeDefs';

interface ComplexityThresholds {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    nestingDepth: number;
    parameterCount: number;
    returnCount: number;
}

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    fn: (factValue: any, thresholds: ComplexityThresholds) => {
        try {
            logger.debug({ thresholds }, 'Checking AST complexity against thresholds');

            if (!factValue?.complexities?.length) {
                logger.debug('No complexity data available');
                return false;
            }

            // Check if any function exceeds any threshold
            const exceedsThreshold = factValue.complexities.some((func: any) => {
                const metrics = func.metrics;
                if (!metrics) return false;

                const exceedsThresholds = {
                    cyclomaticComplexity: metrics.cyclomaticComplexity >= thresholds.cyclomaticComplexity,
                    cognitiveComplexity: metrics.cognitiveComplexity >= thresholds.cognitiveComplexity,
                    nestingDepth: metrics.nestingDepth >= thresholds.nestingDepth,
                    parameterCount: metrics.parameterCount >= thresholds.parameterCount,
                    returnCount: metrics.returnCount >= thresholds.returnCount
                };

                const isOverThreshold = Object.values(exceedsThresholds).some(Boolean);

                if (isOverThreshold) {
                    logger.debug({
                        functionName: func.name,
                        metrics,
                        thresholds,
                        exceedsThresholds
                    }, 'Function exceeds complexity thresholds');
                }

                return isOverThreshold;
            });

            return exceedsThreshold;
        } catch (error) {
            logger.error(`Error in astComplexity operator: ${error}`);
            return false;
        }
    }
};
