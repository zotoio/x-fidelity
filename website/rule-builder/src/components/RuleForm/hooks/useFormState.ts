/**
 * useFormState - Form-specific state management with debouncing
 *
 * Provides debounced updates to the store to prevent excessive
 * re-renders during rapid user input.
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRuleStore, UpdateSource } from '../../../store/ruleStore';
import { useSelectedNode } from '../../../hooks';
import { DEBOUNCE_DELAYS } from '../../../lib/utils/debounce';

/**
 * Hook options
 */
export interface UseFormStateOptions {
  /** Custom debounce delay in ms (default: 100ms) */
  debounceDelay?: number;
  /** Update source to use (default: 'form') */
  source?: UpdateSource;
}

/**
 * Return type for useFormState
 */
export interface UseFormStateReturn<T> {
  /** Current local value */
  value: T;
  /** Set local value (updates immediately, syncs to store with debounce) */
  setValue: (value: T) => void;
  /** Force immediate sync to store */
  flush: () => void;
  /** Whether local value differs from store */
  isDirty: boolean;
  /** Cancel pending debounced update */
  cancel: () => void;
}

/**
 * Hook for managing local form state with debounced sync to store
 *
 * @param path - Path segments to the field in the rule object
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * function NameInput() {
 *   const { path } = useSelectedNode();
 *   const { value, setValue } = useFormState<string>([...path, 'name']);
 *
 *   return (
 *     <input
 *       value={value}
 *       onChange={(e) => setValue(e.target.value)}
 *     />
 *   );
 * }
 * ```
 */
export function useFormState<T>(
  path: string[],
  options: UseFormStateOptions = {}
): UseFormStateReturn<T> {
  const { debounceDelay = DEBOUNCE_DELAYS.FORM_CHANGE, source = 'form' } = options;

  // Get store state and actions
  const rule = useRuleStore((state) => state.rule);
  const updateNode = useRuleStore((state) => state.updateNode);
  const lastUpdateSource = useRuleStore((state) => state.lastUpdateSource);

  // Get the current value from store
  const storeValue = useMemo((): T => {
    if (!rule || path.length === 0) return undefined as T;

    let current: unknown = rule;
    for (const segment of path) {
      if (current === null || current === undefined) return undefined as T;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined as T;
      }
    }
    return current as T;
  }, [rule, path]);

  // Local state for immediate updates
  const [localValue, setLocalValue] = useState<T>(storeValue);

  // Track if we have pending changes
  const [isDirty, setIsDirty] = useState(false);

  // Debounce timer ref
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Last committed value to prevent duplicate updates
  const lastCommittedRef = useRef<T>(storeValue);

  // Sync local value with store when store changes from external source
  useEffect(() => {
    // Only sync if the update came from a different source
    if (lastUpdateSource !== source && lastUpdateSource !== null) {
      setLocalValue(storeValue);
      lastCommittedRef.current = storeValue;
      setIsDirty(false);
    }
  }, [storeValue, lastUpdateSource, source]);

  // Cancel any pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Flush pending changes to store
  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (isDirty && localValue !== lastCommittedRef.current) {
      updateNode(path, localValue, source);
      lastCommittedRef.current = localValue;
      setIsDirty(false);
    }
  }, [isDirty, localValue, path, source, updateNode]);

  // Cancel pending update
  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLocalValue(lastCommittedRef.current);
    setIsDirty(false);
  }, []);

  // Set value with debounced store sync
  const setValue = useCallback(
    (newValue: T) => {
      setLocalValue(newValue);
      setIsDirty(true);

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set new debounce timer
      timerRef.current = setTimeout(() => {
        if (newValue !== lastCommittedRef.current) {
          updateNode(path, newValue, source);
          lastCommittedRef.current = newValue;
          setIsDirty(false);
        }
        timerRef.current = null;
      }, debounceDelay);
    },
    [debounceDelay, path, source, updateNode]
  );

  return {
    value: localValue,
    setValue,
    flush,
    isDirty,
    cancel,
  };
}

/**
 * Hook for managing a single field's local state without debouncing
 *
 * Use this when you need immediate updates or for controlled inputs
 * that should sync on blur rather than on change.
 */
export function useFieldValue<T>(
  path: string[],
  source: UpdateSource = 'form'
): [T, (value: T) => void] {
  const rule = useRuleStore((state) => state.rule);
  const updateNode = useRuleStore((state) => state.updateNode);

  // Get the current value from store
  const value = useMemo((): T => {
    if (!rule || path.length === 0) return undefined as T;

    let current: unknown = rule;
    for (const segment of path) {
      if (current === null || current === undefined) return undefined as T;
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined as T;
      }
    }
    return current as T;
  }, [rule, path]);

  const setValue = useCallback(
    (newValue: T) => {
      updateNode(path, newValue, source);
    },
    [path, source, updateNode]
  );

  return [value, setValue];
}

/**
 * Hook for getting selected node data with typing
 */
export function useNodeData<T>(): {
  data: T | null;
  path: string[];
  nodeType: string;
  updateField: (field: string, value: unknown) => void;
} {
  const { node, path, nodeType, updateField } = useSelectedNode();

  return {
    data: node as T | null,
    path,
    nodeType,
    updateField,
  };
}
