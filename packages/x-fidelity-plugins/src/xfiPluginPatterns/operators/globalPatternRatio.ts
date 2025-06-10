import { logger } from '@x-fidelity/core';
import { OperatorDefn, RatioThreshold } from '@x-fidelity/types';

const globalPatternRatio: OperatorDefn = {
    'name': 'globalPatternRatio',
    'description': 'Checks if the ratio of matches to total files meets a threshold',
    'fn': (factValue: any, threshold: RatioThreshold) => {
        try {
            logger.debug(`globalPatternRatio: processing ${JSON.stringify(factValue)} with threshold ${JSON.stringify(threshold)}`);

            if (!factValue || !Array.isArray(factValue)) {
                logger.debug('globalPatternRatio: factValue is not an array');
                return false;
            }

            if (!threshold || typeof threshold !== 'object') {
                logger.debug('globalPatternRatio: threshold is not an object');
                return false;
            }

            const { value, comparison = 'gte' } = threshold;

            if (typeof value !== 'number') {
                logger.debug('globalPatternRatio: threshold value is not a number');
                return false;
            }

            const total = (factValue as any).total || factValue.length;
            const ratio = factValue.length / total;
            const result = comparison === 'gte' ? ratio >= value : ratio <= value;

            logger.debug(`globalPatternRatio: ratio is ${ratio}, threshold is ${value}, comparison is ${comparison}, result is ${result}`);
            return result;
        } catch (e) {
            logger.error(`globalPatternRatio error: ${e}`);
            return false;
        }
    }
};

export { globalPatternRatio }; 