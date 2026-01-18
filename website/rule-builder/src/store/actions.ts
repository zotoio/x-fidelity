/**
 * Action helpers for the rule store
 * 
 * These are convenience functions that wrap store actions
 * with additional logic or provide simpler APIs.
 */

import { useRuleStore, UpdateSource } from './ruleStore';
import type { RuleCondition, NestedCondition } from '../types';

/**
 * Create a new empty condition
 */
export function createEmptyCondition(): RuleCondition {
  return {
    fact: 'fileContent',
    operator: 'contains',
    value: '',
  };
}

/**
 * Create a new condition group
 */
export function createConditionGroup(type: 'all' | 'any'): NestedCondition {
  return { [type]: [] };
}

/**
 * Add a new condition to the current rule
 * Convenience function that determines the correct parent path
 */
export function addConditionToRule(condition?: Partial<RuleCondition>): void {
  const store = useRuleStore.getState();
  const { rule, selectedPath } = store;
  
  if (!rule) return;
  
  const newCondition: RuleCondition = {
    fact: condition?.fact || 'fileContent',
    operator: condition?.operator || 'contains',
    value: condition?.value ?? '',
    ...condition,
  };
  
  // Determine parent path
  let parentPath: string[];
  
  if (selectedPath.length === 0) {
    // No selection - add to root conditions
    const rootType = Object.keys(rule.conditions)[0] as 'all' | 'any' | 'not';
    parentPath = ['conditions', rootType];
  } else if (selectedPath[0] === 'conditions') {
    // Selected something in conditions
    parentPath = findArrayParent(rule, selectedPath) || ['conditions', 'all'];
  } else {
    // Selected something else - add to root
    const rootType = Object.keys(rule.conditions)[0] as 'all' | 'any' | 'not';
    parentPath = ['conditions', rootType];
  }
  
  store.addCondition(parentPath, newCondition, 'tree');
}

/**
 * Add a new condition group to the current rule
 */
export function addConditionGroupToRule(type: 'all' | 'any'): void {
  const store = useRuleStore.getState();
  const { rule, selectedPath } = store;
  
  if (!rule) return;
  
  // Determine parent path
  let parentPath: string[];
  
  if (selectedPath.length === 0) {
    const rootType = Object.keys(rule.conditions)[0] as 'all' | 'any' | 'not';
    parentPath = ['conditions', rootType];
  } else if (selectedPath[0] === 'conditions') {
    parentPath = findArrayParent(rule, selectedPath) || ['conditions', 'all'];
  } else {
    const rootType = Object.keys(rule.conditions)[0] as 'all' | 'any' | 'not';
    parentPath = ['conditions', rootType];
  }
  
  store.addConditionGroup(parentPath, type, 'tree');
}

/**
 * Find the nearest array parent for a path
 */
function findArrayParent(rule: object, path: string[]): string[] | null {
  let current: unknown = rule;
  let lastArrayPath: string[] | null = null;
  
  for (let i = 0; i < path.length; i++) {
    const segment = path[i];
    if (segment === undefined) continue;
    
    if (current && typeof current === 'object') {
      if (Array.isArray(current)) {
        lastArrayPath = path.slice(0, i);
      }
      current = (current as Record<string, unknown>)[segment];
    } else {
      break;
    }
  }
  
  // Check if current position is an array
  if (Array.isArray(current)) {
    return path;
  }
  
  return lastArrayPath;
}

/**
 * Delete the currently selected node
 */
export function deleteSelectedNode(): void {
  const store = useRuleStore.getState();
  const { selectedPath } = store;
  
  if (selectedPath.length === 0) return;
  
  // Don't allow deleting root-level properties
  if (selectedPath.length === 1) return;
  
  store.deleteNode(selectedPath, 'tree');
}

/**
 * Update rule from JSON string
 */
export function updateRuleFromJson(json: string, source: UpdateSource = 'json'): boolean {
  try {
    const rule = JSON.parse(json);
    useRuleStore.getState().setRule(rule, source);
    return true;
  } catch {
    return false;
  }
}

/**
 * Update a specific field in the selected node
 */
export function updateSelectedNodeField(field: string, value: unknown, source: UpdateSource = 'form'): void {
  const store = useRuleStore.getState();
  const { selectedPath } = store;
  
  if (selectedPath.length === 0) return;
  
  const fieldPath = [...selectedPath, field];
  store.updateNode(fieldPath, value, source);
}

/**
 * Undo the last change
 */
export function undo(): void {
  useRuleStore.getState().undo();
}

/**
 * Redo the last undone change
 */
export function redo(): void {
  useRuleStore.getState().redo();
}

/**
 * Create a new rule
 */
export function newRule(): void {
  useRuleStore.getState().newRule();
}

/**
 * Load a rule from definition
 */
export function loadRule(rule: ReturnType<typeof useRuleStore.getState>['rule']): void {
  if (rule) {
    useRuleStore.getState().loadRule(rule);
  }
}

/**
 * Reset to original rule
 */
export function resetRule(): void {
  useRuleStore.getState().resetRule();
}
