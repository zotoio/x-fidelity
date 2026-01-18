/**
 * useSelectedNode hook - Access and manipulate the selected node
 * 
 * Provides access to the currently selected node in the rule tree
 * along with actions to update it.
 */

import { useCallback, useMemo } from 'react';
import { useRuleStore, UpdateSource } from '../store/ruleStore';
import {
  selectSelectedPath,
  selectSelectedNode,
  selectSelectedNodeType,
} from '../store/selectors';
import { pathsEqual } from '../lib/utils/pathUtils';
import type { RuleCondition, NestedCondition, RuleEvent } from '../types';

/**
 * Node types for the selected node
 */
export type SelectedNodeType = 'rule' | 'conditions' | 'condition-group' | 'condition' | 'event' | 'event-param' | 'unknown';

/**
 * Hook return type
 */
export interface UseSelectedNodeReturn {
  // Selection state
  path: string[];
  node: unknown;
  nodeType: SelectedNodeType;
  hasSelection: boolean;
  
  // Type-specific data
  isCondition: boolean;
  isConditionGroup: boolean;
  isEvent: boolean;
  isEventParam: boolean;
  
  // Condition-specific data (when selected node is a condition)
  condition: RuleCondition | null;
  conditionGroup: NestedCondition | null;
  event: RuleEvent | null;
  
  // Actions
  selectNode: (path: string[], source?: UpdateSource) => void;
  clearSelection: () => void;
  updateField: (field: string, value: unknown, source?: UpdateSource) => void;
  deleteSelected: () => void;
  
  // Helpers
  isSelected: (path: string[]) => boolean;
}

/**
 * Hook for accessing and manipulating the selected node
 * 
 * @example
 * ```tsx
 * function NodeEditor() {
 *   const { node, nodeType, updateField } = useSelectedNode();
 *   
 *   if (nodeType === 'condition') {
 *     return <ConditionEditor condition={node} onChange={updateField} />;
 *   }
 *   
 *   return <div>Select a condition to edit</div>;
 * }
 * ```
 */
export function useSelectedNode(): UseSelectedNodeReturn {
  // Select state
  const path = useRuleStore(selectSelectedPath);
  const node = useRuleStore(selectSelectedNode);
  const nodeType = useRuleStore(selectSelectedNodeType);
  
  // Get actions
  const selectNodeAction = useRuleStore((state) => state.selectNode);
  const clearSelection = useRuleStore((state) => state.clearSelection);
  const updateNode = useRuleStore((state) => state.updateNode);
  const deleteNode = useRuleStore((state) => state.deleteNode);
  
  // Computed state
  // When path is empty but rule is loaded, root rule is selected (nodeType will be 'rule')
  // selectSelectedNode returns the rule when path is empty, so node !== null means we have something selected
  const hasSelection = node !== null;
  const isCondition = nodeType === 'condition';
  const isConditionGroup = nodeType === 'condition-group';
  const isEvent = nodeType === 'event';
  const isEventParam = nodeType === 'event-param';
  
  // Type-specific data
  const condition = useMemo((): RuleCondition | null => {
    if (!isCondition || !node) return null;
    return node as RuleCondition;
  }, [isCondition, node]);
  
  const conditionGroup = useMemo((): NestedCondition | null => {
    if (!isConditionGroup || !node) return null;
    return node as NestedCondition;
  }, [isConditionGroup, node]);
  
  const event = useMemo((): RuleEvent | null => {
    if (!isEvent || !node) return null;
    return node as RuleEvent;
  }, [isEvent, node]);
  
  // Actions
  const selectNode = useCallback(
    (nodePath: string[], source: UpdateSource = 'tree') => {
      selectNodeAction(nodePath, source);
    },
    [selectNodeAction]
  );
  
  const updateField = useCallback(
    (field: string, value: unknown, source: UpdateSource = 'form') => {
      if (path.length === 0) return;
      const fieldPath = [...path, field];
      updateNode(fieldPath, value, source);
    },
    [path, updateNode]
  );
  
  const deleteSelected = useCallback(() => {
    if (path.length === 0) return;
    // Don't allow deleting root-level properties
    if (path.length === 1) return;
    deleteNode(path, 'tree');
  }, [path, deleteNode]);
  
  const isSelected = useCallback(
    (checkPath: string[]): boolean => {
      return pathsEqual(path, checkPath);
    },
    [path]
  );
  
  return {
    // Selection state
    path,
    node,
    nodeType,
    hasSelection,
    
    // Type-specific flags
    isCondition,
    isConditionGroup,
    isEvent,
    isEventParam,
    
    // Type-specific data
    condition,
    conditionGroup,
    event,
    
    // Actions
    selectNode,
    clearSelection,
    updateField,
    deleteSelected,
    
    // Helpers
    isSelected,
  };
}

/**
 * Hook for checking if a specific path is selected
 */
export function useIsSelected(path: string[]): boolean {
  const selectedPath = useRuleStore(selectSelectedPath);
  return pathsEqual(selectedPath, path);
}
