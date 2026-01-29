/**
 * Selectors for derived state from the rule store
 * 
 * These selectors compute derived values from the store state,
 * such as tree structure from JSON and current node data from path.
 */

import type { RuleDefinition, RuleCondition, NestedCondition } from '../types';
import type { RuleStore, TreeNode } from './ruleStore';
import { getAtPath, pathToString, getNodeType } from '../lib/utils/pathUtils';
import type { ValidationError } from '../lib/validation/validator';

/**
 * Truncate a string to a maximum length with ellipsis
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Select the current rule
 */
export function selectRule(state: RuleStore): RuleDefinition | null {
  return state.rule;
}

/**
 * Select the selected path
 */
export function selectSelectedPath(state: RuleStore): string[] {
  return state.selectedPath;
}

/**
 * Select the node at the selected path
 */
export function selectSelectedNode(state: RuleStore): unknown {
  if (!state.rule || state.selectedPath.length === 0) {
    return state.rule;
  }
  return getAtPath(state.rule, state.selectedPath);
}

/**
 * Get the type of the selected node
 */
export function selectSelectedNodeType(state: RuleStore): 'rule' | 'conditions' | 'condition-group' | 'condition' | 'event' | 'event-param' | 'unknown' {
  if (!state.rule) return 'unknown';
  return getNodeType(state.rule, state.selectedPath);
}

/**
 * Select validation errors
 */
export function selectValidationErrors(state: RuleStore): ValidationError[] {
  return state.validationErrors;
}

/**
 * Select validation errors for a specific path
 */
export function selectErrorsAtPath(state: RuleStore, path: string[]): ValidationError[] {
  return state.validationErrors.filter((error) => {
    if (error.path.length < path.length) return false;
    return path.every((segment, i) => segment === error.path[i]);
  });
}

/**
 * Check if a path has errors
 */
export function selectHasErrorsAtPath(state: RuleStore, path: string[]): boolean {
  return selectErrorsAtPath(state, path).length > 0;
}

/**
 * Select whether the store can undo
 */
export function selectCanUndo(state: RuleStore): boolean {
  return state.canUndo;
}

/**
 * Select whether the store can redo
 */
export function selectCanRedo(state: RuleStore): boolean {
  return state.canRedo;
}

/**
 * Select whether the rule is dirty
 */
export function selectIsDirty(state: RuleStore): boolean {
  return state.isDirty;
}

/**
 * Select whether the rule is valid
 */
export function selectIsValid(state: RuleStore): boolean {
  return state.isValid;
}

/**
 * Check if a condition is a leaf condition (has fact/operator/value)
 */
function isLeafCondition(obj: unknown): obj is RuleCondition {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'fact' in obj &&
    'operator' in obj &&
    'value' in obj
  );
}

/**
 * Check if a condition is a nested condition group
 */
function isNestedCondition(obj: unknown): obj is NestedCondition {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    ('all' in obj || 'any' in obj || 'not' in obj)
  );
}

/**
 * Get the condition group type
 */
function getConditionGroupType(obj: NestedCondition): 'all' | 'any' | 'not' {
  if ('all' in obj) return 'all';
  if ('any' in obj) return 'any';
  return 'not';
}

/**
 * Build tree nodes from conditions
 */
function buildConditionNodes(
  condition: NestedCondition | RuleCondition,
  path: string[],
  expandedPaths: Set<string>
): TreeNode {
  const pathString = pathToString(path);
  
  if (isLeafCondition(condition)) {
    return {
      id: pathString,
      path,
      type: 'condition',
      label: `${condition.fact} ${condition.operator} ${JSON.stringify(condition.value)}`,
      children: [],
      data: condition,
    };
  }
  
  if (isNestedCondition(condition)) {
    const groupType = getConditionGroupType(condition);
    const childArray = condition[groupType];
    
    if (groupType === 'not') {
      // 'not' has a single child, not an array
      const notCondition = condition.not;
      if (notCondition) {
        const childNode = buildConditionNodes(
          notCondition as NestedCondition | RuleCondition,
          [...path, 'not'],
          expandedPaths
        );
        return {
          id: pathString,
          path,
          type: 'condition-group',
          label: 'NOT',
          children: [childNode],
          data: condition,
          isExpanded: expandedPaths.has(pathString),
        };
      }
      return {
        id: pathString,
        path,
        type: 'condition-group',
        label: 'NOT',
        children: [],
        data: condition,
        isExpanded: expandedPaths.has(pathString),
      };
    }
    
    // 'all' or 'any' have array children
    const children = (childArray as Array<NestedCondition | RuleCondition> || []).map(
      (child, index) =>
        buildConditionNodes(child, [...path, groupType, String(index)], expandedPaths)
    );
    
    return {
      id: pathString,
      path,
      type: 'condition-group',
      label: groupType.toUpperCase(),
      children,
      data: condition,
      isExpanded: expandedPaths.has(pathString),
    };
  }
  
  // Fallback for unknown structure
  return {
    id: pathString,
    path,
    type: 'condition',
    label: 'Unknown',
    children: [],
    data: condition,
  };
}

/**
 * Build tree structure from rule definition
 */
export function selectTreeStructure(state: RuleStore): TreeNode[] {
  const { rule, expandedPaths } = state;
  
  if (!rule) return [];
  
  const nodes: TreeNode[] = [];
  
  // Root rule node
  const ruleNode: TreeNode = {
    id: 'rule',
    path: [],
    type: 'rule',
    label: rule.name || 'Unnamed Rule',
    children: [],
    data: rule,
    isExpanded: expandedPaths.has(''),
  };
  
  // Conditions node
  if (rule.conditions) {
    const conditionsPath = ['conditions'];
    const conditionsNode: TreeNode = {
      id: 'conditions',
      path: conditionsPath,
      type: 'conditions',
      label: 'Conditions',
      children: [],
      data: rule.conditions,
      isExpanded: expandedPaths.has('conditions'),
    };
    
    // Build condition tree - always show the root group (all/any/not) as a child of Conditions
    if (isNestedCondition(rule.conditions)) {
      const groupType = getConditionGroupType(rule.conditions);
      const childArray = rule.conditions[groupType];
      const rootGroupPath = [...conditionsPath, groupType];
      const rootGroupPathString = pathToString(rootGroupPath);
      
      if (groupType === 'not' && rule.conditions.not) {
        // NOT group with single child
        const notChildNode = buildConditionNodes(
          rule.conditions.not as NestedCondition | RuleCondition,
          [...rootGroupPath],
          expandedPaths
        );
        const rootGroupNode: TreeNode = {
          id: rootGroupPathString,
          path: rootGroupPath,
          type: 'condition-group',
          label: 'NOT',
          children: [notChildNode],
          data: rule.conditions,
          isExpanded: expandedPaths.has(rootGroupPathString),
        };
        conditionsNode.children.push(rootGroupNode);
      } else if (Array.isArray(childArray)) {
        // ALL or ANY group with array children
        const children = childArray.map((child, index) =>
          buildConditionNodes(
            child as NestedCondition | RuleCondition,
            [...rootGroupPath, String(index)],
            expandedPaths
          )
        );
        const rootGroupNode: TreeNode = {
          id: rootGroupPathString,
          path: rootGroupPath,
          type: 'condition-group',
          label: groupType.toUpperCase(),
          children,
          data: rule.conditions,
          isExpanded: expandedPaths.has(rootGroupPathString),
        };
        conditionsNode.children.push(rootGroupNode);
      }
    }
    
    ruleNode.children.push(conditionsNode);
  }
  
  // Event node
  if (rule.event) {
    const eventPath = ['event'];
    const eventPathString = pathToString(eventPath);
    const eventChildren: TreeNode[] = [];
    
    // Type node
    const typePath = [...eventPath, 'type'];
    eventChildren.push({
      id: pathToString(typePath),
      path: typePath,
      type: 'event-param' as TreeNode['type'],
      label: `type: "${rule.event.type}"`,
      children: [],
      data: rule.event.type,
    });
    
    // Params node
    if (rule.event.params) {
      const paramsPath = [...eventPath, 'params'];
      const paramsPathString = pathToString(paramsPath);
      const paramsChildren: TreeNode[] = [];
      
      // Message node
      if (rule.event.params.message) {
        const messagePath = [...paramsPath, 'message'];
        paramsChildren.push({
          id: pathToString(messagePath),
          path: messagePath,
          type: 'event-param' as TreeNode['type'],
          label: `message: "${truncateString(rule.event.params.message, 30)}"`,
          children: [],
          data: rule.event.params.message,
        });
      }
      
      // Details node (if present)
      if (rule.event.params.details) {
        const detailsPath = [...paramsPath, 'details'];
        const detailsPathString = pathToString(detailsPath);
        const detailsChildren: TreeNode[] = [];
        const details = rule.event.params.details as Record<string, unknown>;
        
        // Show all details properties
        for (const [key, value] of Object.entries(details)) {
          const propPath = [...detailsPath, key];
          const displayValue = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
          detailsChildren.push({
            id: pathToString(propPath),
            path: propPath,
            type: 'event-param' as TreeNode['type'],
            label: `${key}: ${truncateString(displayValue, 25)}`,
            children: [],
            data: value,
          });
        }
        
        paramsChildren.push({
          id: detailsPathString,
          path: detailsPath,
          type: 'event-param' as TreeNode['type'],
          label: 'details',
          children: detailsChildren,
          data: rule.event.params.details,
          isExpanded: expandedPaths.has(detailsPathString),
        });
      }
      
      // Category node (if present)
      if (rule.event.params.category) {
        const categoryPath = [...paramsPath, 'category'];
        paramsChildren.push({
          id: pathToString(categoryPath),
          path: categoryPath,
          type: 'event-param' as TreeNode['type'],
          label: `category: "${rule.event.params.category}"`,
          children: [],
          data: rule.event.params.category,
        });
      }
      
      // RuleId node (if present)
      if (rule.event.params.ruleId) {
        const ruleIdPath = [...paramsPath, 'ruleId'];
        paramsChildren.push({
          id: pathToString(ruleIdPath),
          path: ruleIdPath,
          type: 'event-param' as TreeNode['type'],
          label: `ruleId: "${rule.event.params.ruleId}"`,
          children: [],
          data: rule.event.params.ruleId,
        });
      }
      
      eventChildren.push({
        id: paramsPathString,
        path: paramsPath,
        type: 'event-param' as TreeNode['type'],
        label: 'params',
        children: paramsChildren,
        data: rule.event.params,
        isExpanded: expandedPaths.has(paramsPathString),
      });
    }
    
    const eventNode: TreeNode = {
      id: 'event',
      path: eventPath,
      type: 'event',
      label: 'Event',
      children: eventChildren,
      data: rule.event,
      isExpanded: expandedPaths.has(eventPathString),
    };
    ruleNode.children.push(eventNode);
  }
  
  nodes.push(ruleNode);
  
  return nodes;
}

/**
 * Select the rule as formatted JSON string
 */
export function selectRuleJson(state: RuleStore): string {
  if (!state.rule) return '';
  return JSON.stringify(state.rule, null, 2);
}

/**
 * Get rule name
 */
export function selectRuleName(state: RuleStore): string {
  return state.rule?.name || '';
}

/**
 * Get rule priority
 */
export function selectRulePriority(state: RuleStore): number {
  return state.rule?.priority || 1;
}

/**
 * Get rule event
 */
export function selectRuleEvent(state: RuleStore): RuleStore['rule'] extends null ? null : NonNullable<RuleStore['rule']>['event'] | null {
  return state.rule?.event ?? null;
}

/**
 * Check if a path is expanded
 */
export function selectIsExpanded(state: RuleStore, pathString: string): boolean {
  return state.expandedPaths.has(pathString);
}

/**
 * Check if a path is selected
 */
export function selectIsSelected(state: RuleStore, path: string[]): boolean {
  if (state.selectedPath.length !== path.length) return false;
  return state.selectedPath.every((segment, i) => segment === path[i]);
}

/**
 * Get the last update source
 */
export function selectLastUpdateSource(state: RuleStore): RuleStore['lastUpdateSource'] {
  return state.lastUpdateSource;
}

/**
 * Get last update info (source and time)
 */
export interface LastUpdateInfo {
  source: RuleStore['lastUpdateSource'];
  time: number;
}

/**
 * Select last update source only (primitive - safe for direct use)
 */
export function selectLastUpdateSource2(state: RuleStore): string | null {
  return state.lastUpdateSource;
}

/**
 * Select last update time only (primitive - safe for direct use)
 */
export function selectLastUpdateTime(state: RuleStore): number {
  return state.lastUpdateTime;
}

/**
 * NOTE: This selector creates a new object on each call.
 * Use with Zustand's shallow comparison or select primitive values directly
 * using selectLastUpdateSource2 and selectLastUpdateTime.
 */
export function selectLastUpdate(state: RuleStore): LastUpdateInfo {
  return {
    source: state.lastUpdateSource,
    time: state.lastUpdateTime,
  };
}
