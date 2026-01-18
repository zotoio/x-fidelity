/**
 * Browser-compatible Non-Standard Directory Structure Operator
 * 
 * Checks if the directory structure deviates from expected standards.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Non-standard directory structure operator
 */
export const nonStandardDirectoryStructureOperator: BrowserOperator = {
  name: 'nonStandardDirectoryStructure',
  description: 'Checks if the directory structure deviates from expected standards',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`nonStandardDirectoryStructure: processing ${typeof factValue}`);
      
      // If factValue is boolean, compare directly
      if (typeof factValue === 'boolean') {
        return factValue === Boolean(compareValue);
      }
      
      // If factValue is an object with nonStandard property
      if (factValue && typeof factValue === 'object') {
        const typedValue = factValue as { nonStandard?: boolean; issues?: string[] };
        const hasIssues = typedValue.nonStandard === true || 
                          (Array.isArray(typedValue.issues) && typedValue.issues.length > 0);
        
        browserLogger.debug(`nonStandardDirectoryStructure: hasIssues=${hasIssues}`);
        return hasIssues === Boolean(compareValue);
      }
      
      return false;
    } catch (e) {
      browserLogger.error(`nonStandardDirectoryStructure error: ${e}`);
      return false;
    }
  },
};
