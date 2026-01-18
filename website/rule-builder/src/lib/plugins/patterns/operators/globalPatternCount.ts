/**
 * Browser-compatible Global Pattern Count Operator
 * 
 * Checks if global pattern matches meet a threshold.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Threshold configuration
 */
interface ThresholdConfig {
  threshold: number;
}

/**
 * Global pattern count operator
 */
export const globalPatternCountOperator: BrowserOperator = {
  name: 'globalPatternCount',
  description: 'Checks if the global pattern match count meets a threshold',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`globalPatternCount: processing ${typeof factValue}`);
      
      // Validate compareValue
      if (!compareValue || typeof compareValue !== 'object') {
        browserLogger.debug('globalPatternCount: compareValue is not an object');
        return false;
      }
      
      const threshold = (compareValue as ThresholdConfig).threshold;
      if (typeof threshold !== 'number') {
        browserLogger.debug('globalPatternCount: threshold is not a number');
        return false;
      }
      
      // Get the count from factValue
      let count = 0;
      if (Array.isArray(factValue)) {
        count = factValue.length;
      } else if (typeof factValue === 'number') {
        count = factValue;
      } else if (factValue && typeof factValue === 'object') {
        const typedValue = factValue as { count?: number; length?: number };
        count = typedValue.count ?? typedValue.length ?? 0;
      }
      
      const result = count >= threshold;
      browserLogger.debug(`globalPatternCount: count=${count}, threshold=${threshold}, result=${result}`);
      
      return result;
    } catch (e) {
      browserLogger.error(`globalPatternCount error: ${e}`);
      return false;
    }
  },
};
