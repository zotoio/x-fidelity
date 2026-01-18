/**
 * Validation Middleware for Rule Store
 * 
 * Automatically validates rules when they change, with debouncing
 * to prevent excessive validation calls during rapid edits.
 */

import { validateRule, ValidationError, ValidationResult } from '../../lib/validation/validator';
import { DEBOUNCE_DELAYS, cancellableDebounce } from '../../lib/utils/debounce';
import type { RuleDefinition } from '../../types';

/**
 * Validation state
 */
export interface ValidationState {
  validationErrors: ValidationError[];
  isValidating: boolean;
  isValid: boolean;
  lastValidatedAt: number | null;
}

/**
 * Validation actions
 */
export interface ValidationActions {
  validate: () => void;
  clearValidation: () => void;
  setValidationErrors: (errors: ValidationError[]) => void;
}

/**
 * Combined validation slice
 */
export interface ValidationSlice extends ValidationState, ValidationActions {}

/**
 * Create initial validation state
 */
export function createValidationState(): ValidationState {
  return {
    validationErrors: [],
    isValidating: false,
    isValid: true,
    lastValidatedAt: null,
  };
}

/**
 * Create debounced validator
 */
export function createDebouncedValidator(
  getRule: () => RuleDefinition | null,
  setValidationResult: (result: ValidationResult) => void
): { validate: () => void; cancel: () => void } {
  const { fn, cancel } = cancellableDebounce(
    () => {
      const rule = getRule();
      if (!rule) {
        setValidationResult({ valid: true, errors: [] });
        return;
      }
      
      const result = validateRule(rule);
      setValidationResult(result);
    },
    DEBOUNCE_DELAYS.VALIDATION
  );
  
  return { validate: fn, cancel };
}

/**
 * Create validation actions
 */
export function createValidationActions(
  set: (fn: (state: ValidationState) => Partial<ValidationState>) => void,
  get: () => { rule: RuleDefinition | null }
): ValidationActions & { _cleanup: () => void } {
  // Create debounced validator
  const { validate: debouncedValidate, cancel } = createDebouncedValidator(
    () => get().rule,
    (result) => {
      set(() => ({
        validationErrors: result.errors,
        isValid: result.valid,
        isValidating: false,
        lastValidatedAt: Date.now(),
      }));
    }
  );
  
  return {
    validate: () => {
      set(() => ({ isValidating: true }));
      debouncedValidate();
    },
    
    clearValidation: () => {
      cancel();
      set(() => ({
        validationErrors: [],
        isValid: true,
        isValidating: false,
        lastValidatedAt: null,
      }));
    },
    
    setValidationErrors: (errors: ValidationError[]) => {
      set(() => ({
        validationErrors: errors,
        isValid: errors.length === 0,
        isValidating: false,
        lastValidatedAt: Date.now(),
      }));
    },
    
    _cleanup: cancel,
  };
}

/**
 * Get validation errors for a specific path
 */
export function getPathErrors(errors: ValidationError[], path: string[]): ValidationError[] {
  return errors.filter((error) => {
    // Exact match
    if (error.path.length === path.length) {
      return error.path.every((segment, i) => segment === path[i]);
    }
    return false;
  });
}

/**
 * Check if path has any errors (including descendants)
 */
export function pathHasErrors(errors: ValidationError[], path: string[]): boolean {
  return errors.some((error) => {
    // Check if error path starts with the given path
    if (error.path.length >= path.length) {
      return path.every((segment, i) => segment === error.path[i]);
    }
    return false;
  });
}

/**
 * Group errors by top-level path
 */
export function groupErrorsByPath(errors: ValidationError[]): Map<string, ValidationError[]> {
  const groups = new Map<string, ValidationError[]>();
  
  for (const error of errors) {
    const key = error.path[0] || 'root';
    const existing = groups.get(key) || [];
    groups.set(key, [...existing, error]);
  }
  
  return groups;
}
