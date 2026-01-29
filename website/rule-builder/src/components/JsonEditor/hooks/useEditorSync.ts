/**
 * useEditorSync hook - Bidirectional sync between editor and store
 *
 * Handles synchronization between the Monaco editor and the Zustand store:
 * - Debounces editor changes before updating store (300ms)
 * - Tracks update source to prevent infinite loops
 * - Provides format, copy, and reset actions
 * - Tracks JSON parse errors
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRuleStore } from '../../../store/ruleStore';
import { selectRule } from '../../../store/selectors';
import { DEBOUNCE_DELAYS } from '../../../lib/utils/debounce';
import type { RuleDefinition } from '../../../types';

/**
 * Parse error information
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * Hook return type
 */
export interface UseEditorSyncReturn {
  /** Current local editor value */
  localValue: string;
  /** Last valid JSON value (for reset) */
  lastValidValue: string;
  /** Current parse error, if any */
  parseError: ParseError | null;
  /** Whether there are unsaved changes */
  hasUnsavedChanges: boolean;
  /** Handle editor content change */
  handleChange: (value: string | undefined) => void;
  /** Format the current JSON */
  formatJson: () => boolean;
  /** Copy current content to clipboard */
  copyToClipboard: () => Promise<boolean>;
  /** Reset to last valid state from store */
  resetToValid: () => void;
  /** Whether the current content is valid JSON */
  isValidJson: boolean;
}

/**
 * Parse JSON and return error info if invalid
 */
function parseJsonSafe(value: string): { parsed: unknown; error: ParseError | null } {
  try {
    const parsed = JSON.parse(value);
    return { parsed, error: null };
  } catch (e) {
    const error = e as SyntaxError;
    // Try to extract line/column from error message
    // Format: "... at position X" or "... at line Y column Z"
    const positionMatch = error.message.match(/position\s+(\d+)/i);
    const lineColMatch = error.message.match(/line\s+(\d+)\s+column\s+(\d+)/i);

    let line: number | undefined;
    let column: number | undefined;

    if (lineColMatch && lineColMatch[1] && lineColMatch[2]) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
    } else if (positionMatch && positionMatch[1]) {
      // Calculate line/column from position
      const position = parseInt(positionMatch[1], 10);
      const lines = value.substring(0, position).split('\n');
      line = lines.length;
      const lastLine = lines[lines.length - 1];
      column = (lastLine?.length ?? 0) + 1;
    }

    return {
      parsed: null,
      error: {
        message: error.message.replace('JSON.parse: ', ''),
        line,
        column,
      },
    };
  }
}

/**
 * Hook for bidirectional editor synchronization
 *
 * Uses source tracking to prevent infinite update loops:
 * - When editor changes, it updates store with source='json'
 * - When store changes from another source, it updates editor
 * - Changes from source='json' are ignored by editor
 *
 * @example
 * ```tsx
 * function JsonEditor() {
 *   const { localValue, handleChange, parseError } = useEditorSync();
 *
 *   return (
 *     <>
 *       <Editor value={localValue} onChange={handleChange} />
 *       {parseError && <div className="error">{parseError.message}</div>}
 *     </>
 *   );
 * }
 * ```
 */
export function useEditorSync(): UseEditorSyncReturn {
  // Store state
  const rule = useRuleStore(selectRule);
  // Use useShallow to prevent infinite re-renders from object selector
  const lastUpdate = useRuleStore(
    useShallow((state) => ({
      source: state.lastUpdateSource,
      time: state.lastUpdateTime,
    }))
  );
  const setRule = useRuleStore((state) => state.setRule);

  // Local state
  const [localValue, setLocalValue] = useState('');
  const [lastValidValue, setLastValidValue] = useState('');
  const [parseError, setParseError] = useState<ParseError | null>(null);

  // Track last external update to prevent loops
  const lastExternalUpdate = useRef<string>('');
  const lastUpdateSource = useRef<string | null>(null);

  // Track if we initiated the current store update
  const pendingStoreUpdate = useRef<boolean>(false);

  // Debounce timeout ref
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced update function
  const debouncedUpdate = useCallback((value: string) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const { parsed, error } = parseJsonSafe(value);

      if (error) {
        setParseError(error);
        return;
      }

      setParseError(null);
      setLastValidValue(value);

      // Mark that we're updating the store
      pendingStoreUpdate.current = true;
      setRule(parsed as RuleDefinition, 'json');
      pendingStoreUpdate.current = false;
    }, DEBOUNCE_DELAYS.JSON_EDITOR);
  }, [setRule]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Sync from store to editor when store changes externally
  useEffect(() => {
    // Skip if we initiated this update
    if (lastUpdate.source === 'json' && !pendingStoreUpdate.current) {
      return;
    }

    const ruleJson = rule ? JSON.stringify(rule, null, 2) : '';

    // Only update if the JSON is actually different
    if (ruleJson !== lastExternalUpdate.current) {
      lastExternalUpdate.current = ruleJson;
      lastUpdateSource.current = lastUpdate.source;
      setLocalValue(ruleJson);
      setLastValidValue(ruleJson);
      setParseError(null);
    }
  }, [rule, lastUpdate]);

  // Handle editor content change
  const handleChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;

    setLocalValue(value);

    // Debounce the store update
    debouncedUpdate(value);
  }, [debouncedUpdate]);

  // Format JSON
  const formatJson = useCallback((): boolean => {
    const { parsed, error } = parseJsonSafe(localValue);

    if (error) {
      setParseError(error);
      return false;
    }

    const formatted = JSON.stringify(parsed, null, 2);
    setLocalValue(formatted);
    setLastValidValue(formatted);
    setParseError(null);
    return true;
  }, [localValue]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(localValue);
      return true;
    } catch {
      // Fallback for older browsers or when clipboard API fails
      try {
        const textarea = document.createElement('textarea');
        textarea.value = localValue;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch {
        return false;
      }
    }
  }, [localValue]);

  // Reset to last valid state
  const resetToValid = useCallback(() => {
    if (lastValidValue) {
      setLocalValue(lastValidValue);
      setParseError(null);
      // Cancel any pending debounced updates
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    }
  }, [lastValidValue]);

  // Compute derived state
  const isValidJson = parseError === null;
  const hasUnsavedChanges = localValue !== lastValidValue;

  return {
    localValue,
    lastValidValue,
    parseError,
    hasUnsavedChanges,
    handleChange,
    formatJson,
    copyToClipboard,
    resetToValid,
    isValidJson,
  };
}
