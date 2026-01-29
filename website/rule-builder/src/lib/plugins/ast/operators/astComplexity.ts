/**
 * Browser-compatible AST Complexity Operator
 * 
 * Checks if AST complexity metrics exceed specified thresholds.
 */

import { BrowserOperator, ComplexityThresholds, FunctionMetrics } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * AST complexity operator
 */
export const astComplexityOperator: BrowserOperator = {
  name: 'astComplexity',
  description: 'Checks if AST complexity metrics exceed specified thresholds',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      const typedFactValue = factValue as { complexities?: Array<{ name: string; metrics: FunctionMetrics }> };
      
      if (!typedFactValue?.complexities?.length) {
        browserLogger.debug('astComplexity: No complexity data available');
        return false;
      }
      
      // If compareValue is boolean true, just check if any functions exist (pre-filtered by fact)
      if (compareValue === true) {
        browserLogger.debug(`astComplexity: Found ${typedFactValue.complexities.length} complex functions (pre-filtered)`);
        return true;
      }
      
      // If compareValue is boolean false, return false
      if (compareValue === false) {
        return false;
      }
      
      // Legacy mode: compareValue is ComplexityThresholds object
      const thresholds = compareValue as ComplexityThresholds;
      browserLogger.debug('astComplexity: Checking against thresholds (legacy mode)');
      
      // Check if any function exceeds any threshold
      const exceedsThreshold = typedFactValue.complexities.some((func) => {
        const metrics = func.metrics;
        if (!metrics) return false;
        
        const exceeds = 
          (thresholds.cyclomaticComplexity !== undefined && 
            metrics.cyclomaticComplexity >= thresholds.cyclomaticComplexity) ||
          (thresholds.cognitiveComplexity !== undefined && 
            metrics.cognitiveComplexity >= thresholds.cognitiveComplexity) ||
          (thresholds.nestingDepth !== undefined && 
            metrics.nestingDepth >= thresholds.nestingDepth) ||
          (thresholds.parameterCount !== undefined && 
            metrics.parameterCount >= thresholds.parameterCount) ||
          (thresholds.returnCount !== undefined && 
            metrics.returnCount >= thresholds.returnCount);
        
        if (exceeds) {
          browserLogger.debug(`Function ${func.name} exceeds thresholds`);
        }
        
        return exceeds;
      });
      
      return exceedsThreshold;
    } catch (error) {
      browserLogger.error(`astComplexity error: ${error}`);
      return false;
    }
  },
};

/**
 * Function count operator - checks the number of functions
 */
export const functionCountOperator: BrowserOperator = {
  name: 'functionCount',
  description: 'Checks if function count meets criteria',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      const typedFactValue = factValue as { count?: number };
      const count = typedFactValue?.count ?? 0;
      
      // If compareValue is a number, check if count matches
      if (typeof compareValue === 'number') {
        return count === compareValue;
      }
      
      // If compareValue is an object with threshold
      const typedCompareValue = compareValue as { 
        threshold?: number; 
        comparison?: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
      };
      
      if (typedCompareValue?.threshold !== undefined) {
        const threshold = typedCompareValue.threshold;
        const comparison = typedCompareValue.comparison || 'gte';
        
        switch (comparison) {
          case 'gte':
            return count >= threshold;
          case 'lte':
            return count <= threshold;
          case 'eq':
            return count === threshold;
          case 'gt':
            return count > threshold;
          case 'lt':
            return count < threshold;
          default:
            return count >= threshold;
        }
      }
      
      // Default: return true if any functions exist
      return count > 0;
    } catch (error) {
      browserLogger.error(`functionCount error: ${error}`);
      return false;
    }
  },
};
