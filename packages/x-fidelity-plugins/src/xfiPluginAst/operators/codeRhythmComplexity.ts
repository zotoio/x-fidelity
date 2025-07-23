import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

interface CodeRhythmThresholds {
    consistency: number;
    complexity: number;
    readability: number;
}

export const codeRhythmComplexity: OperatorDefn = {
    name: 'codeRhythmComplexity',
    description: 'Checks if code rhythm metrics exceed specified thresholds',
    fn: (factValue: any, thresholds: CodeRhythmThresholds) => {
        try {
            logger.debug({ factValue, thresholds }, 'Checking code rhythm against thresholds');

            if (!factValue || typeof factValue !== 'object') {
                logger.debug('No code rhythm data available');
                return false;
            }

            // Check if any metric exceeds its threshold
            const exceedsThresholds = {
                consistency: factValue.consistency >= thresholds.consistency,
                complexity: factValue.complexity >= thresholds.complexity,
                readability: factValue.readability >= thresholds.readability
            };

            const isOverThreshold = Object.values(exceedsThresholds).some(Boolean);

            if (isOverThreshold) {
                logger.debug({
                    metrics: factValue,
                    thresholds,
                    exceedsThresholds
                }, 'Code rhythm exceeds thresholds');
            }

            return isOverThreshold;
        } catch (error) {
            logger.error(`Error in codeRhythmComplexity operator: ${error}`);
            return false;
        }
    }
}; 