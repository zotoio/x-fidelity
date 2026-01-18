/**
 * Browser-compatible Missing Required Files Operator
 * 
 * Checks if required files are missing from the repository.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Interface for required files result
 */
interface RequiredFilesResult {
  missing: string[];
  total: number;
  found: number;
}

/**
 * Missing required files operator
 */
export const missingRequiredFilesOperator: BrowserOperator = {
  name: 'missingRequiredFiles',
  description: 'Checks if the number of missing required files exceeds a threshold',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`missingRequiredFiles: processing ${typeof factValue}`);
      
      const typedValue = factValue as RequiredFilesResult;
      
      if (!typedValue || !Array.isArray(typedValue.missing)) {
        browserLogger.debug('missingRequiredFiles: factValue is invalid');
        return false;
      }
      
      const threshold = typeof compareValue === 'number' ? compareValue : 0;
      const result = typedValue.missing.length > threshold;
      
      browserLogger.debug(`missingRequiredFiles: ${typedValue.missing.length} missing files, threshold ${threshold}, result ${result}`);
      return result;
    } catch (e) {
      browserLogger.error(`missingRequiredFiles error: ${e}`);
      return false;
    }
  },
};
