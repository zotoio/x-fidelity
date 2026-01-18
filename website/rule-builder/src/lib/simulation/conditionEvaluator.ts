/**
 * Condition Evaluator for Rule Simulation
 * 
 * Handles the evaluation of individual conditions and condition groups.
 */

import type { RuleCondition, NestedCondition } from '../../types';
import type { BrowserAlmanac, BrowserPluginRegistry } from '../plugins/types';
import type { ConditionResult } from './types';
import { evaluateFact, getValueAtPath } from './factEvaluator';
import { browserLogger } from '../plugins/browserContext';

/**
 * Standard operators provided by json-rules-engine
 */
const standardOperators: Record<string, (a: unknown, b: unknown) => boolean> = {
  equal: (a, b) => a === b,
  notEqual: (a, b) => a !== b,
  lessThan: (a, b) => typeof a === 'number' && typeof b === 'number' && a < b,
  lessThanInclusive: (a, b) => typeof a === 'number' && typeof b === 'number' && a <= b,
  greaterThan: (a, b) => typeof a === 'number' && typeof b === 'number' && a > b,
  greaterThanInclusive: (a, b) => typeof a === 'number' && typeof b === 'number' && a >= b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
  notIn: (a, b) => Array.isArray(b) && !b.includes(a),
  contains: (a, b) => {
    if (typeof a === 'string' && typeof b === 'string') return a.includes(b);
    if (Array.isArray(a)) return a.includes(b);
    return false;
  },
  doesNotContain: (a, b) => {
    if (typeof a === 'string' && typeof b === 'string') return !a.includes(b);
    if (Array.isArray(a)) return !a.includes(b);
    return true;
  },
};

/**
 * Evaluate a single condition
 */
export async function evaluateCondition(
  condition: RuleCondition,
  path: string[],
  almanac: BrowserAlmanac,
  registry: BrowserPluginRegistry
): Promise<ConditionResult> {
  const startTime = performance.now();
  
  try {
    // Evaluate the fact
    const factResult = await evaluateFact(
      condition.fact,
      condition.params,
      almanac,
      registry
    );
    
    if (!factResult.success) {
      return {
        path,
        factName: condition.fact,
        factValue: undefined,
        operator: condition.operator,
        compareValue: condition.value,
        result: false,
        error: factResult.error,
        duration: factResult.duration,
        params: condition.params,
      };
    }
    
    // Apply JSON path if specified
    let factValue = factResult.value;
    if (condition.path) {
      factValue = getValueAtPath(factValue, condition.path);
    }
    
    // Evaluate the operator
    let operatorResult: boolean;
    let operatorError: string | undefined;
    
    // First check standard operators
    if (condition.operator in standardOperators) {
      try {
        operatorResult = standardOperators[condition.operator]?.(factValue, condition.value) ?? false;
      } catch (e) {
        operatorResult = false;
        operatorError = e instanceof Error ? e.message : String(e);
      }
    } else {
      // Try custom operator from registry
      const customOperator = registry.getOperator(condition.operator);
      if (customOperator) {
        try {
          operatorResult = customOperator.evaluate(factValue, condition.value);
        } catch (e) {
          operatorResult = false;
          operatorError = e instanceof Error ? e.message : String(e);
        }
      } else {
        operatorResult = false;
        operatorError = `Unknown operator: ${condition.operator}. This operator is not available in the browser plugin system.`;
      }
    }
    
    return {
      path,
      factName: condition.fact,
      factValue,
      operator: condition.operator,
      compareValue: condition.value,
      result: operatorResult,
      error: operatorError,
      duration: performance.now() - startTime,
      jsonPath: condition.path,
      params: condition.params,
    };
  } catch (error) {
    return {
      path,
      factName: condition.fact,
      factValue: undefined,
      operator: condition.operator,
      compareValue: condition.value,
      result: false,
      error: error instanceof Error ? error.message : String(error),
      duration: performance.now() - startTime,
      params: condition.params,
    };
  }
}

/**
 * Check if an object is a condition (has fact property)
 */
function isCondition(obj: unknown): obj is RuleCondition {
  return obj !== null && typeof obj === 'object' && 'fact' in obj;
}

/**
 * Check if an object is a nested condition group
 */
function isNestedCondition(obj: unknown): obj is NestedCondition {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ('all' in obj || 'any' in obj || 'not' in obj)
  );
}

/**
 * Evaluate a condition or condition group recursively
 */
export async function evaluateConditions(
  conditions: NestedCondition | RuleCondition,
  path: string[],
  almanac: BrowserAlmanac,
  registry: BrowserPluginRegistry
): Promise<ConditionResult[]> {
  const results: ConditionResult[] = [];
  
  if (isCondition(conditions)) {
    const result = await evaluateCondition(conditions, path, almanac, registry);
    results.push(result);
    return results;
  }
  
  if (!isNestedCondition(conditions)) {
    browserLogger.warn(`Invalid condition structure at path: ${path.join('.')}`);
    return results;
  }
  
  // Handle 'all' conditions
  if ('all' in conditions && Array.isArray(conditions.all)) {
    for (let i = 0; i < conditions.all.length; i++) {
      const child = conditions.all[i];
      const childPath = [...path, 'all', String(i)];
      
      if (!child) continue;
      
      if (isCondition(child)) {
        const result = await evaluateCondition(child, childPath, almanac, registry);
        results.push(result);
      } else {
        const childResults = await evaluateConditions(child, childPath, almanac, registry);
        results.push(...childResults);
      }
    }
  }
  
  // Handle 'any' conditions
  if ('any' in conditions && Array.isArray(conditions.any)) {
    for (let i = 0; i < conditions.any.length; i++) {
      const child = conditions.any[i];
      const childPath = [...path, 'any', String(i)];
      
      if (!child) continue;
      
      if (isCondition(child)) {
        const result = await evaluateCondition(child, childPath, almanac, registry);
        results.push(result);
      } else {
        const childResults = await evaluateConditions(child, childPath, almanac, registry);
        results.push(...childResults);
      }
    }
  }
  
  // Handle 'not' condition
  if ('not' in conditions && conditions.not) {
    const notPath = [...path, 'not'];
    
    if (isCondition(conditions.not)) {
      const result = await evaluateCondition(conditions.not, notPath, almanac, registry);
      // Invert the result for 'not'
      results.push({
        ...result,
        result: !result.result,
      });
    } else {
      const childResults = await evaluateConditions(conditions.not, notPath, almanac, registry);
      // Invert results for 'not'
      for (const result of childResults) {
        results.push({
          ...result,
          result: !result.result,
        });
      }
    }
  }
  
  return results;
}

/**
 * Determine if conditions are met based on the structure
 */
export function areConditionsMet(
  conditions: NestedCondition,
  results: ConditionResult[]
): boolean {
  // Create a map of path to result for quick lookup
  const resultMap = new Map<string, boolean>();
  for (const result of results) {
    resultMap.set(result.path.join('.'), result.result);
  }
  
  return evaluateConditionGroup(conditions, ['conditions'], resultMap);
}

/**
 * Recursively evaluate condition groups
 */
function evaluateConditionGroup(
  conditions: NestedCondition | RuleCondition,
  path: string[],
  resultMap: Map<string, boolean>
): boolean {
  if (isCondition(conditions)) {
    return resultMap.get(path.join('.')) ?? false;
  }
  
  if (!isNestedCondition(conditions)) {
    return false;
  }
  
  // Handle 'all' - all conditions must be true
  if ('all' in conditions && Array.isArray(conditions.all)) {
    if (conditions.all.length === 0) return true;
    
    for (let i = 0; i < conditions.all.length; i++) {
      const child = conditions.all[i];
      if (!child) continue;
      
      const childPath = [...path, 'all', String(i)];
      if (!evaluateConditionGroup(child, childPath, resultMap)) {
        return false;
      }
    }
    return true;
  }
  
  // Handle 'any' - at least one condition must be true
  if ('any' in conditions && Array.isArray(conditions.any)) {
    if (conditions.any.length === 0) return false;
    
    for (let i = 0; i < conditions.any.length; i++) {
      const child = conditions.any[i];
      if (!child) continue;
      
      const childPath = [...path, 'any', String(i)];
      if (evaluateConditionGroup(child, childPath, resultMap)) {
        return true;
      }
    }
    return false;
  }
  
  // Handle 'not' - condition must be false
  if ('not' in conditions && conditions.not) {
    const notPath = [...path, 'not'];
    return !evaluateConditionGroup(conditions.not, notPath, resultMap);
  }
  
  return false;
}
