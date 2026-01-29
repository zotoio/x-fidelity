/**
 * useHistory hook - Access undo/redo functionality
 * 
 * Provides access to history state and undo/redo actions.
 */

import { useCallback, useEffect } from 'react';
import { useRuleStore } from '../store/ruleStore';
import { selectCanUndo, selectCanRedo } from '../store/selectors';

/**
 * Hook return type
 */
export interface UseHistoryReturn {
  // State
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
  historyIndex: number;
  
  // Actions
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

/**
 * Hook for accessing undo/redo functionality
 * 
 * @example
 * ```tsx
 * function UndoRedoButtons() {
 *   const { canUndo, canRedo, undo, redo } = useHistory();
 *   
 *   return (
 *     <div>
 *       <button disabled={!canUndo} onClick={undo}>Undo</button>
 *       <button disabled={!canRedo} onClick={redo}>Redo</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useHistory(): UseHistoryReturn {
  // Select state
  const canUndo = useRuleStore(selectCanUndo);
  const canRedo = useRuleStore(selectCanRedo);
  const history = useRuleStore((state) => state.history);
  const historyIndex = useRuleStore((state) => state.historyIndex);
  
  // Get actions
  const undoAction = useRuleStore((state) => state.undo);
  const redoAction = useRuleStore((state) => state.redo);
  const clearHistoryAction = useRuleStore((state) => state.clearHistory);
  
  // Wrap actions
  const undo = useCallback(() => {
    undoAction();
  }, [undoAction]);
  
  const redo = useCallback(() => {
    redoAction();
  }, [redoAction]);
  
  const clearHistory = useCallback(() => {
    clearHistoryAction();
  }, [clearHistoryAction]);
  
  return {
    // State
    canUndo,
    canRedo,
    historyLength: history.length,
    historyIndex,
    
    // Actions
    undo,
    redo,
    clearHistory,
  };
}

/**
 * Hook that adds keyboard shortcuts for undo/redo
 * 
 * @example
 * ```tsx
 * function App() {
 *   useHistoryKeyboardShortcuts();
 *   
 *   return <RuleBuilder />;
 * }
 * ```
 */
export function useHistoryKeyboardShortcuts(): void {
  const { canUndo, canRedo, undo, redo } = useHistory();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd/Ctrl + Z (undo) or Cmd/Ctrl + Shift + Z (redo)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      
      if (!modifierKey) return;
      
      if (event.key === 'z' && !event.shiftKey && canUndo) {
        event.preventDefault();
        undo();
      } else if (event.key === 'z' && event.shiftKey && canRedo) {
        event.preventDefault();
        redo();
      } else if (event.key === 'y' && canRedo) {
        // Cmd/Ctrl + Y for redo (Windows style)
        event.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo]);
}
