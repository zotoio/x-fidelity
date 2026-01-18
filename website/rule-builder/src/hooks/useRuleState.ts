/**
 * useRuleState hook - Main hook for components to access rule state
 * 
 * Provides convenient access to rule state with automatic rerenders
 * when relevant state changes.
 */

import { useCallback, useMemo } from 'react';
import { useRuleStore, UpdateSource, TreeNode } from '../store/ruleStore';
import {
  selectRule,
  selectTreeStructure,
  selectIsDirty,
  selectIsValid,
  selectRuleName,
  selectRulePriority,
  selectRuleEvent,
} from '../store/selectors';
import type { RuleDefinition, RuleCondition } from '../types';

/**
 * Hook return type
 */
export interface UseRuleStateReturn {
  // State
  rule: RuleDefinition | null;
  ruleJson: string;
  treeStructure: TreeNode[];
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  
  // Rule properties
  name: string;
  priority: number;
  event: RuleDefinition['event'] | null;
  
  // Actions
  setRule: (rule: RuleDefinition | null, source?: UpdateSource) => void;
  loadRule: (rule: RuleDefinition) => void;
  newRule: () => void;
  resetRule: () => void;
  updateNode: (path: string[], value: unknown, source?: UpdateSource) => void;
  deleteNode: (path: string[], source?: UpdateSource) => void;
  addCondition: (parentPath: string[], condition: RuleCondition, source?: UpdateSource) => void;
  addConditionGroup: (parentPath: string[], type: 'all' | 'any', source?: UpdateSource) => void;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
}

/**
 * Main hook for accessing rule state
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { rule, isDirty, setRule } = useRuleState();
 *   
 *   return (
 *     <div>
 *       <h1>{rule?.name}</h1>
 *       {isDirty && <span>Unsaved changes</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRuleState(): UseRuleStateReturn {
  // Select state slices
  const rule = useRuleStore(selectRule);
  const isDirty = useRuleStore(selectIsDirty);
  const isValid = useRuleStore(selectIsValid);
  const isSaving = useRuleStore((state) => state.isSaving);
  
  // Computed values
  const ruleJson = useMemo(() => {
    if (!rule) return '';
    return JSON.stringify(rule, null, 2);
  }, [rule]);
  
  const treeStructure = useRuleStore(selectTreeStructure);
  const name = useRuleStore(selectRuleName);
  const priority = useRuleStore(selectRulePriority);
  const event = useRuleStore(selectRuleEvent);
  
  // Get actions from store
  const setRule = useRuleStore((state) => state.setRule);
  const loadRule = useRuleStore((state) => state.loadRule);
  const newRule = useRuleStore((state) => state.newRule);
  const resetRule = useRuleStore((state) => state.resetRule);
  const updateNode = useRuleStore((state) => state.updateNode);
  const deleteNode = useRuleStore((state) => state.deleteNode);
  const addCondition = useRuleStore((state) => state.addCondition);
  const addConditionGroup = useRuleStore((state) => state.addConditionGroup);
  const markSaved = useRuleStore((state) => state.markSaved);
  const setSaving = useRuleStore((state) => state.setSaving);
  
  return {
    // State
    rule,
    ruleJson,
    treeStructure,
    isDirty,
    isValid,
    isSaving,
    
    // Rule properties
    name,
    priority,
    event,
    
    // Actions
    setRule,
    loadRule,
    newRule,
    resetRule,
    updateNode,
    deleteNode,
    addCondition,
    addConditionGroup,
    markSaved,
    setSaving,
  };
}

/**
 * Hook for just the rule JSON (useful for the JSON editor)
 */
export function useRuleJson(): {
  json: string;
  setJson: (json: string, source?: UpdateSource) => boolean;
} {
  const rule = useRuleStore(selectRule);
  
  const json = useMemo(() => {
    if (!rule) return '';
    return JSON.stringify(rule, null, 2);
  }, [rule]);
  
  const setRule = useRuleStore((state) => state.setRule);
  
  const setJson = useCallback(
    (jsonString: string, source: UpdateSource = 'json'): boolean => {
      try {
        const parsed = JSON.parse(jsonString);
        setRule(parsed, source);
        return true;
      } catch {
        return false;
      }
    },
    [setRule]
  );
  
  return { json, setJson };
}
