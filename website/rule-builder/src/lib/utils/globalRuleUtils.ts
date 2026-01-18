/**
 * Utilities for detecting and managing REPO_GLOBAL_CHECK conditions
 * 
 * Global rules have a condition that checks for fileName === 'REPO_GLOBAL_CHECK'
 * This allows the rule to be evaluated against the entire repository
 * rather than iteratively per file.
 */

import type { RuleDefinition, RuleCondition, NestedCondition } from '../../types';

export const REPO_GLOBAL_CHECK_VALUE = 'REPO_GLOBAL_CHECK';

/**
 * Check if a condition is a REPO_GLOBAL_CHECK condition
 */
export function isGlobalCheckCondition(condition: RuleCondition): boolean {
  return (
    condition.fact === 'fileData' &&
    condition.path === '$.fileName' &&
    condition.operator === 'equal' &&
    condition.value === REPO_GLOBAL_CHECK_VALUE
  );
}

/**
 * Create a REPO_GLOBAL_CHECK condition
 */
export function createGlobalCheckCondition(): RuleCondition {
  return {
    fact: 'fileData',
    path: '$.fileName',
    operator: 'equal',
    value: REPO_GLOBAL_CHECK_VALUE,
  };
}

/**
 * Recursively check if any condition in the tree is a global check condition
 */
function hasGlobalCheckInConditions(conditions: (RuleCondition | NestedCondition)[]): boolean {
  for (const item of conditions) {
    // Check if it's a simple condition
    if ('fact' in item && isGlobalCheckCondition(item as RuleCondition)) {
      return true;
    }
    
    // Check nested conditions
    if ('all' in item && Array.isArray(item.all)) {
      if (hasGlobalCheckInConditions(item.all)) return true;
    }
    if ('any' in item && Array.isArray(item.any)) {
      if (hasGlobalCheckInConditions(item.any)) return true;
    }
    if ('not' in item && item.not) {
      if (hasGlobalCheckInConditions([item.not])) return true;
    }
  }
  return false;
}

/**
 * Check if a rule has a REPO_GLOBAL_CHECK condition
 */
export function isGlobalRule(rule: RuleDefinition | null): boolean {
  if (!rule?.conditions) return false;
  
  const conditions = rule.conditions;
  
  // Check top-level 'all' conditions
  if ('all' in conditions && Array.isArray(conditions.all)) {
    return hasGlobalCheckInConditions(conditions.all);
  }
  
  // Check top-level 'any' conditions
  if ('any' in conditions && Array.isArray(conditions.any)) {
    return hasGlobalCheckInConditions(conditions.any);
  }
  
  return false;
}

/**
 * Find the path to the global check condition in the rule
 * Returns null if not found
 */
export function findGlobalCheckPath(
  conditions: (RuleCondition | NestedCondition)[],
  basePath: string[] = []
): string[] | null {
  for (let i = 0; i < conditions.length; i++) {
    const item = conditions[i];
    if (!item) continue;
    const currentPath = [...basePath, String(i)];
    
    // Check if it's a simple condition
    if ('fact' in item && isGlobalCheckCondition(item as RuleCondition)) {
      return currentPath;
    }
    
    // Check nested conditions
    if ('all' in item && Array.isArray(item.all)) {
      const found = findGlobalCheckPath(item.all, [...currentPath, 'all']);
      if (found) return found;
    }
    if ('any' in item && Array.isArray(item.any)) {
      const found = findGlobalCheckPath(item.any, [...currentPath, 'any']);
      if (found) return found;
    }
    if ('not' in item && item.not) {
      const found = findGlobalCheckPath([item.not], [...currentPath, 'not']);
      if (found) return found;
    }
  }
  return null;
}
