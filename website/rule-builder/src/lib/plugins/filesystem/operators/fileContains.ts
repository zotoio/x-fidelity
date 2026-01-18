/**
 * Browser-compatible File Contains Operator
 * 
 * Checks if files contain specific patterns.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * File contains operator - checks if analysis results contain matches
 */
export const fileContainsOperator: BrowserOperator = {
  name: 'fileContains',
  description: 'Checks if a file contains pattern matches',
  
  evaluate(factValue: unknown, expectedValue: unknown): boolean {
    try {
      browserLogger.debug(`fileContains: processing factValue type: ${typeof factValue}`);
      
      if (!factValue) {
        browserLogger.debug('fileContains: factValue is null/undefined');
        return false;
      }
      
      let hasMatches = false;
      
      // If factValue is an object with a 'result' property (from repoFileAnalysis)
      const objValue = factValue as Record<string, unknown>;
      if (objValue.result && Array.isArray(objValue.result)) {
        hasMatches = objValue.result.length > 0;
        browserLogger.debug(`fileContains: found ${objValue.result.length} matches in result array`);
      }
      // If factValue is directly an array of matches
      else if (Array.isArray(factValue)) {
        hasMatches = factValue.length > 0;
        browserLogger.debug(`fileContains: found ${factValue.length} matches in direct array`);
      }
      // If factValue is a string
      else if (typeof factValue === 'string') {
        hasMatches = factValue.length > 0;
        browserLogger.debug(`fileContains: treating factValue as string with length ${factValue.length}`);
      }
      // If factValue is a boolean
      else if (typeof factValue === 'boolean') {
        hasMatches = factValue;
        browserLogger.debug(`fileContains: treating factValue as boolean: ${factValue}`);
      }
      else {
        browserLogger.debug(`fileContains: unexpected factValue type: ${typeof factValue}`);
        return false;
      }
      
      const result = hasMatches === Boolean(expectedValue);
      browserLogger.debug(`fileContains: hasMatches=${hasMatches}, expectedValue=${expectedValue}, result=${result}`);
      return result;
    } catch (e) {
      browserLogger.error(`fileContains error: ${e}`);
      return false;
    }
  },
};

/**
 * File contains with position operator - checks if analysis results have position data
 */
export const fileContainsWithPositionOperator: BrowserOperator = {
  name: 'fileContainsWithPosition',
  description: 'Checks if a file contains pattern matches with position information',
  
  evaluate(factValue: unknown, expectedValue: unknown): boolean {
    try {
      if (!factValue) {
        return false;
      }
      
      const objValue = factValue as Record<string, unknown>;
      
      // Check if factValue has matches with position data
      if (objValue.matches && Array.isArray(objValue.matches)) {
        const matchesWithPosition = objValue.matches.filter((m: Record<string, unknown>) => m.range);
        const hasMatchesWithPosition = matchesWithPosition.length > 0;
        return hasMatchesWithPosition === Boolean(expectedValue);
      }
      
      return false;
    } catch (e) {
      browserLogger.error(`fileContainsWithPosition error: ${e}`);
      return false;
    }
  },
};
