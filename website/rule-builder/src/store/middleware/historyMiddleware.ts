/**
 * History Middleware for Undo/Redo Support
 * 
 * Implements undo/redo functionality by maintaining a history stack
 * of rule states. Uses Zustand middleware pattern.
 */

import type { StateCreator, StoreMutatorIdentifier } from 'zustand';
import type { RuleDefinition } from '../../types';
import { deepClone, deepEqual } from '../../lib/utils/pathUtils';

/**
 * Maximum history size to prevent memory issues
 */
const MAX_HISTORY_SIZE = 50;

/**
 * History state shape
 */
export interface HistoryState {
  history: RuleDefinition[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * History actions
 */
export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  pushHistory: (rule: RuleDefinition) => void;
}

/**
 * Combined history slice
 */
export interface HistorySlice extends HistoryState, HistoryActions {}

/**
 * Create history state slice
 */
export function createHistorySlice(): HistoryState {
  return {
    history: [],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
  };
}

/**
 * Create history actions
 */
export function createHistoryActions(
  set: (fn: (state: { history: RuleDefinition[]; historyIndex: number; rule: RuleDefinition | null }) => Partial<{ history: RuleDefinition[]; historyIndex: number; rule: RuleDefinition | null; canUndo: boolean; canRedo: boolean; isDirty: boolean }>) => void,
  _get: () => { history: RuleDefinition[]; historyIndex: number; rule: RuleDefinition | null }
): HistoryActions {
  return {
    undo: () => {
      set((state) => {
        if (state.historyIndex <= 0) return {};
        
        const newIndex = state.historyIndex - 1;
        const newRule = deepClone(state.history[newIndex]);
        
        return {
          rule: newRule,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true,
        };
      });
    },
    
    redo: () => {
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return {};
        
        const newIndex = state.historyIndex + 1;
        const newRule = deepClone(state.history[newIndex]);
        
        return {
          rule: newRule,
          historyIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < state.history.length - 1,
        };
      });
    },
    
    clearHistory: () => {
      set(() => ({
        history: [],
        historyIndex: -1,
        canUndo: false,
        canRedo: false,
      }));
    },
    
    pushHistory: (rule: RuleDefinition) => {
      set((state) => {
        // Don't push if the rule is the same as current
        if (state.historyIndex >= 0 && deepEqual(state.history[state.historyIndex], rule)) {
          return {};
        }
        
        // Truncate any "redo" history when making a new change
        const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
        
        // Add new state
        const newHistory = [...truncatedHistory, deepClone(rule)];
        
        // Trim if exceeds max size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }
        
        const newIndex = newHistory.length - 1;
        
        return {
          history: newHistory,
          historyIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: false,
          isDirty: true,
        };
      });
    },
  };
}

/**
 * Temporal middleware type (for undo/redo)
 * This is a Zustand middleware pattern
 */
export type TemporalMiddleware = <
  T extends { rule: RuleDefinition | null },
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  initializer: StateCreator<T, Mps, Mcs>
) => StateCreator<T & HistorySlice, Mps, Mcs>;

/**
 * Check if we should record history for a state change
 * Only record significant changes, not selection or transient states
 */
export function shouldRecordHistory(
  prevRule: RuleDefinition | null,
  nextRule: RuleDefinition | null
): boolean {
  // Don't record if no rule
  if (!prevRule || !nextRule) return false;
  
  // Don't record if identical
  if (deepEqual(prevRule, nextRule)) return false;
  
  return true;
}
