/**
 * Browser-compatible Global Pattern Ratio Operator
 * 
 * Checks if the ratio of pattern matches meets a threshold.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Threshold configuration for ratio
 */
interface RatioThreshold {
  threshold: number;
}

/**
 * Global pattern ratio operator
 */
export const globalPatternRatioOperator: BrowserOperator = {
  name: 'globalPatternRatio',
  description: 'Checks if the ratio of pattern matches to total files meets a threshold',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`globalPatternRatio: processing ${typeof factValue}`);
      
      // Validate compareValue
      if (!compareValue || typeof compareValue !== 'object') {
        browserLogger.debug('globalPatternRatio: compareValue is not an object');
        return false;
      }
      
      const threshold = (compareValue as RatioThreshold).threshold;
      if (typeof threshold !== 'number') {
        browserLogger.debug('globalPatternRatio: threshold is not a number');
        return false;
      }
      
      // Get the ratio from factValue
      let ratio = 0;
      
      if (typeof factValue === 'number') {
        ratio = factValue;
      } else if (factValue && typeof factValue === 'object') {
        const typedValue = factValue as { ratio?: number; matchCount?: number; totalCount?: number };
        
        if (typeof typedValue.ratio === 'number') {
          ratio = typedValue.ratio;
        } else if (typeof typedValue.matchCount === 'number' && typeof typedValue.totalCount === 'number') {
          ratio = typedValue.totalCount > 0 ? typedValue.matchCount / typedValue.totalCount : 0;
        }
      }
      
      const result = ratio >= threshold;
      browserLogger.debug(`globalPatternRatio: ratio=${ratio}, threshold=${threshold}, result=${result}`);
      
      return result;
    } catch (e) {
      browserLogger.error(`globalPatternRatio error: ${e}`);
      return false;
    }
  },
};
