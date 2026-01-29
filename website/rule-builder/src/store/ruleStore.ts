/**
 * Main Rule Store using Zustand
 * 
 * Central state management for the Rule Builder with:
 * - Bidirectional synchronization between tree, form, and JSON editor
 * - Source tracking to prevent infinite update loops
 * - Undo/redo history
 * - Validation on changes
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { enableMapSet } from 'immer';

// Enable immer support for Set and Map
enableMapSet();
import type { RuleDefinition, RuleCondition, NestedCondition } from '../types';
import { defaultRule } from '../lib/validation/ruleSchema';
import {
  deepClone,
  deepEqual,
  getAtPath,
  setAtPath,
  deleteAtPath,
  insertAtPath,
  getParentPath,
} from '../lib/utils/pathUtils';
import { createHistoryActions, createHistorySlice, HistorySlice } from './middleware/historyMiddleware';
import { createValidationState, createValidationActions, ValidationSlice } from './middleware/validationMiddleware';

/**
 * Source of updates - used to prevent infinite loops
 * When a component updates the store, other components can check
 * the lastUpdateSource to avoid re-triggering updates
 */
export type UpdateSource = 'tree' | 'form' | 'json' | 'external' | 'history';

/**
 * Tree node representation for visualization
 */
export interface TreeNode {
  id: string;
  path: string[];
  type: 'rule' | 'conditions' | 'condition-group' | 'condition' | 'event' | 'event-param';
  label: string;
  children: TreeNode[];
  data: unknown;
  isExpanded?: boolean;
}

/**
 * Core rule state
 */
export interface RuleState {
  // Rule data
  rule: RuleDefinition | null;
  originalRule: RuleDefinition | null;
  
  // Selection
  selectedPath: string[];
  
  // Dirty state
  isDirty: boolean;
  isSaving: boolean;
  
  // Update tracking
  lastUpdateSource: UpdateSource | null;
  lastUpdateTime: number;
  
  // Tree expansion state
  expandedPaths: Set<string>;
}

/**
 * Rule actions
 */
export interface RuleActions {
  // Rule management
  setRule: (rule: RuleDefinition | null, source?: UpdateSource) => void;
  loadRule: (rule: RuleDefinition) => void;
  newRule: () => void;
  resetRule: () => void;
  
  // Node operations
  updateNode: (path: string[], value: unknown, source?: UpdateSource) => void;
  deleteNode: (path: string[], source?: UpdateSource) => void;
  
  // Condition operations
  addCondition: (parentPath: string[], condition: RuleCondition, source?: UpdateSource) => void;
  addConditionGroup: (parentPath: string[], type: 'all' | 'any', source?: UpdateSource) => void;
  moveNode: (sourcePath: string[], targetPath: string[], insertIndex: number, source?: UpdateSource) => void;
  
  // Selection
  selectNode: (path: string[], source?: UpdateSource) => void;
  clearSelection: () => void;
  
  // Tree expansion
  toggleExpanded: (pathString: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  
  // Save state
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
}

/**
 * Full store type
 */
export interface RuleStore extends RuleState, RuleActions, HistorySlice, ValidationSlice {}

/**
 * Create the initial state
 */
function createInitialState(): RuleState {
  return {
    rule: null,
    originalRule: null,
    selectedPath: [],
    isDirty: false,
    isSaving: false,
    lastUpdateSource: null,
    lastUpdateTime: 0,
    expandedPaths: new Set(['conditions']),
  };
}

/**
 * Create the rule store
 */
export const useRuleStore = create<RuleStore>()(
  subscribeWithSelector(
    immer((set, get) => {
      // Create history actions
      const historyActions = createHistoryActions(
        (fn) => set((state) => Object.assign(state, fn(state))),
        get
      );
      
      // Create validation actions  
      const validationActions = createValidationActions(
        (fn) => set((state) => Object.assign(state, fn(state))),
        get
      );
      
      return {
        // Initial state
        ...createInitialState(),
        ...createHistorySlice(),
        ...createValidationState(),
        
        // History actions
        ...historyActions,
        
        // Validation actions (without _cleanup)
        validate: validationActions.validate,
        clearValidation: validationActions.clearValidation,
        setValidationErrors: validationActions.setValidationErrors,
        
        // Rule management
        setRule: (rule, source = 'external') => {
          const currentRule = get().rule;
          
          // Skip if no actual change
          if (deepEqual(currentRule, rule)) {
            return;
          }
          
          set((state) => {
            state.rule = rule ? deepClone(rule) : null;
            state.lastUpdateSource = source;
            state.lastUpdateTime = Date.now();
            state.isDirty = source !== 'history' && rule !== null;
          });
          
          // Push to history if significant change
          if (rule && source !== 'history') {
            historyActions.pushHistory(rule);
          }
          
          // Validate
          validationActions.validate();
        },
        
        loadRule: (rule) => {
          // Clear and initialize history first
          historyActions.clearHistory();
          
          set((state) => {
            state.rule = deepClone(rule);
            state.originalRule = deepClone(rule);
            state.selectedPath = [];
            state.lastUpdateSource = 'external';
            state.lastUpdateTime = Date.now();
            
            // Initialize history inline to avoid isDirty being set
            state.history = [deepClone(rule)];
            state.historyIndex = 0;
            state.canUndo = false;
            state.canRedo = false;
            state.isDirty = false;
          });
          
          // Validate
          validationActions.validate();
        },
        
        newRule: () => {
          const rule = deepClone(defaultRule);
          get().loadRule(rule);
        },
        
        resetRule: () => {
          const original = get().originalRule;
          if (original) {
            get().loadRule(original);
          }
        },
        
        // Node operations
        updateNode: (path, value, source = 'form') => {
          const currentRule = get().rule;
          if (!currentRule) return;
          
          // Get current value and check if changed
          const currentValue = getAtPath(currentRule, path);
          if (deepEqual(currentValue, value)) {
            return;
          }
          
          const newRule = setAtPath(currentRule, path, value);
          get().setRule(newRule, source);
        },
        
        deleteNode: (path, source = 'tree') => {
          const currentRule = get().rule;
          if (!currentRule) return;
          
          const newRule = deleteAtPath(currentRule, path);
          get().setRule(newRule, source);
          
          // Clear selection if deleted node was selected
          const selectedPath = get().selectedPath;
          if (selectedPath.length >= path.length) {
            const isDescendant = path.every((seg, i) => seg === selectedPath[i]);
            if (isDescendant) {
              get().selectNode(getParentPath(path), source);
            }
          }
        },
        
        // Condition operations
        addCondition: (parentPath, condition, source = 'tree') => {
          const currentRule = get().rule;
          if (!currentRule) return;
          
          const parent = getAtPath<unknown[]>(currentRule, parentPath);
          if (!Array.isArray(parent)) return;
          
          const newPath = [...parentPath, String(parent.length)];
          const newRule = insertAtPath(currentRule, newPath, condition);
          get().setRule(newRule, source);
          
          // Select the new condition
          get().selectNode(newPath, source);
        },
        
        addConditionGroup: (parentPath, type, source = 'tree') => {
          const currentRule = get().rule;
          if (!currentRule) return;
          
          const parent = getAtPath<unknown[]>(currentRule, parentPath);
          if (!Array.isArray(parent)) return;
          
          const newGroup: NestedCondition = { [type]: [] };
          const newPath = [...parentPath, String(parent.length)];
          const newRule = insertAtPath(currentRule, newPath, newGroup);
          get().setRule(newRule, source);
          
          // Expand and select the new group
          get().toggleExpanded(newPath.join('.'));
          get().selectNode(newPath, source);
        },
        
        moveNode: (sourcePath, targetPath, insertIndex, source = 'tree') => {
          const currentRule = get().rule;
          if (!currentRule) return;
          
          // Get the node to move
          const nodeToMove = getAtPath<unknown>(currentRule, sourcePath);
          if (nodeToMove === undefined) return;
          
          // Get source parent array and index
          const sourceParentPath = sourcePath.slice(0, -1);
          const sourceIndex = parseInt(sourcePath[sourcePath.length - 1] ?? '0', 10);
          const sourceParent = getAtPath<unknown[]>(currentRule, sourceParentPath);
          if (!Array.isArray(sourceParent)) return;
          
          // Get target parent array
          const targetParent = getAtPath<unknown[]>(currentRule, targetPath);
          if (!Array.isArray(targetParent)) return;
          
          // Check if moving within the same array
          const isSameParent = sourceParentPath.length === targetPath.length &&
            sourceParentPath.every((seg, i) => seg === targetPath[i]);
          
          // Calculate adjusted insert index if moving within same array
          let adjustedIndex = insertIndex;
          if (isSameParent && sourceIndex < insertIndex) {
            adjustedIndex = insertIndex - 1;
          }
          
          // Create new rule by first removing from source, then inserting at target
          let newRule = deleteAtPath(currentRule, sourcePath);
          
          // Insert at target position
          const newPath = [...targetPath, String(adjustedIndex)];
          newRule = insertAtPath(newRule, newPath, nodeToMove);
          
          get().setRule(newRule, source);
          
          // Select the moved node at its new location
          get().selectNode(newPath, source);
        },
        
        // Selection
        selectNode: (path, source = 'tree') => {
          const currentPath = get().selectedPath;
          
          // Skip if already selected
          if (deepEqual(currentPath, path)) {
            return;
          }
          
          set((state) => {
            state.selectedPath = [...path];
            state.lastUpdateSource = source;
            state.lastUpdateTime = Date.now();
          });
        },
        
        clearSelection: () => {
          set((state) => {
            state.selectedPath = [];
          });
        },
        
        // Tree expansion
        toggleExpanded: (pathString) => {
          set((state) => {
            if (state.expandedPaths.has(pathString)) {
              state.expandedPaths.delete(pathString);
            } else {
              state.expandedPaths.add(pathString);
            }
          });
        },
        
        expandAll: () => {
          const rule = get().rule;
          if (!rule) return;
          
          const allPaths = new Set<string>();
          
          // Recursively collect all expandable paths
          function collectPaths(obj: unknown, currentPath: string[]) {
            if (!obj || typeof obj !== 'object') return;
            
            if (Array.isArray(obj)) {
              const pathStr = currentPath.join('.');
              if (pathStr) allPaths.add(pathStr);
              obj.forEach((item, i) => collectPaths(item, [...currentPath, String(i)]));
            } else {
              const pathStr = currentPath.join('.');
              if (pathStr) allPaths.add(pathStr);
              for (const key of Object.keys(obj)) {
                collectPaths((obj as Record<string, unknown>)[key], [...currentPath, key]);
              }
            }
          }
          
          collectPaths(rule.conditions, ['conditions']);
          
          set((state) => {
            state.expandedPaths = allPaths;
          });
        },
        
        collapseAll: () => {
          set((state) => {
            state.expandedPaths = new Set(['conditions']);
          });
        },
        
        // Save state
        markSaved: () => {
          set((state) => {
            state.isDirty = false;
            state.originalRule = state.rule ? deepClone(state.rule) : null;
            state.isSaving = false;
          });
        },
        
        setSaving: (saving) => {
          set((state) => {
            state.isSaving = saving;
          });
        },
      };
    })
  )
);

/**
 * Subscribe to rule changes for validation
 * This sets up automatic validation when the rule changes
 */
useRuleStore.subscribe(
  (state) => state.rule,
  (rule, prevRule) => {
    if (rule !== prevRule) {
      useRuleStore.getState().validate();
    }
  }
);
