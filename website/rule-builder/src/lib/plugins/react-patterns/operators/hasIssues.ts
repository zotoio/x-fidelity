/**
 * Browser-compatible Has Issues Operator
 * 
 * Checks if React pattern analysis found issues.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Has issues operator
 */
export const hasIssuesOperator: BrowserOperator = {
  name: 'hasIssues',
  description: 'Checks if React pattern analysis found issues',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`hasIssues: processing ${typeof factValue}`);
      
      let hasIssues = false;
      
      // If factValue is boolean, use directly
      if (typeof factValue === 'boolean') {
        hasIssues = factValue;
      }
      // If factValue is an object with hasIssues property
      else if (factValue && typeof factValue === 'object') {
        const typedValue = factValue as { hasIssues?: boolean; issues?: unknown[] };
        
        if (typeof typedValue.hasIssues === 'boolean') {
          hasIssues = typedValue.hasIssues;
        } else if (Array.isArray(typedValue.issues)) {
          hasIssues = typedValue.issues.length > 0;
        }
      }
      // If factValue is an array (list of issues)
      else if (Array.isArray(factValue)) {
        hasIssues = factValue.length > 0;
      }
      
      const result = hasIssues === Boolean(compareValue);
      browserLogger.debug(`hasIssues: hasIssues=${hasIssues}, expected=${compareValue}, result=${result}`);
      
      return result;
    } catch (e) {
      browserLogger.error(`hasIssues error: ${e}`);
      return false;
    }
  },
};
