import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';
import { ComplexityThresholds } from '../types';

export const astComplexity: OperatorDefn = {
    name: 'astComplexity',
    description: 'Checks if AST complexity metrics exceed specified thresholds, or if using boolean mode, checks if any complex functions exist',
    fn: (factValue: any, value: ComplexityThresholds | boolean) => {
        try {
            if (!factValue?.complexities?.length) {
                logger.debug('No complexity data available');
                return false;
            }

            // If value is boolean true, just check if any functions exist (fact already filtered them)
            if (value === true) {
                logger.debug(`Found ${factValue.complexities.length} complex functions (pre-filtered by fact)`);
                return true;
            }

            // If value is boolean false, return false
            if (value === false) {
                return false;
            }

            // Legacy mode: value is ComplexityThresholds object
            const thresholds = value as ComplexityThresholds;
            logger.debug({ thresholds }, 'Checking AST complexity against thresholds (legacy mode)');

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
