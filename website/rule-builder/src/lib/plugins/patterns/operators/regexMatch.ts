/**
 * Browser-compatible Regex Match Operator
 * 
 * Checks if a value matches a regular expression pattern.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Regex match operator
 */
export const regexMatchOperator: BrowserOperator = {
  name: 'regexMatch',
  description: 'Checks if fact value matches a regular expression pattern',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`regexMatch: processing ${typeof factValue} against ${compareValue}`);
      
      // Get the string to test
      let testValue: string;
      if (typeof factValue === 'string') {
        testValue = factValue;
      } else if (factValue && typeof factValue === 'object') {
        // If factValue is an object, try common properties
        const obj = factValue as Record<string, unknown>;
        testValue = String(obj.value ?? obj.content ?? obj.text ?? obj.path ?? obj.fileName ?? '');
      } else {
        testValue = String(factValue ?? '');
      }
      
      // Get the pattern
      if (typeof compareValue !== 'string') {
        browserLogger.debug('regexMatch: compareValue is not a string');
        return false;
      }
      
      try {
        const regex = new RegExp(compareValue);
        const result = regex.test(testValue);
        browserLogger.debug(`regexMatch: testing "${testValue}" against pattern "${compareValue}" = ${result}`);
        return result;
      } catch (e) {
        browserLogger.error(`regexMatch: invalid regex pattern: ${compareValue}`);
        return false;
      }
    } catch (e) {
      browserLogger.error(`regexMatch error: ${e}`);
      return false;
    }
  },
};
