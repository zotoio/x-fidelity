/**
 * Browser-compatible Outdated Framework Operator
 * 
 * Checks if project uses outdated framework versions.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Interface for dependency failure
 */
interface DependencyFailure {
  dependency: string;
  currentVersion: string;
  requiredVersion: string;
}

/**
 * Outdated framework operator
 */
export const outdatedFrameworkOperator: BrowserOperator = {
  name: 'outdatedFramework',
  description: 'Checks if project uses outdated framework versions',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`outdatedFramework: processing ${typeof factValue}`);
      
      if (!factValue || !Array.isArray(factValue)) {
        browserLogger.debug('outdatedFramework: factValue is not an array');
        return false;
      }
      
      // Check if there are any actual dependency failures
      const hasOutdatedDependencies = factValue.some((item: unknown) => {
        const failure = item as Partial<DependencyFailure>;
        
        // Ensure the item is a proper DependencyFailure object
        if (!failure || typeof failure !== 'object' || 
            !failure.dependency || !failure.currentVersion || !failure.requiredVersion) {
          return false;
        }
        
        // Check if current version is different from required version
        return failure.currentVersion !== failure.requiredVersion;
      });
      
      browserLogger.debug(`outdatedFramework: result is ${hasOutdatedDependencies}`);
      
      // If compareValue is boolean true, return whether there are outdated deps
      // If compareValue is boolean false, return whether there are NO outdated deps
      if (typeof compareValue === 'boolean') {
        return hasOutdatedDependencies === compareValue;
      }
      
      return hasOutdatedDependencies;
    } catch (e) {
      browserLogger.error(`outdatedFramework error: ${e}`);
      return false;
    }
  },
};
