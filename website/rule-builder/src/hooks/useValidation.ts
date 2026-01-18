/**
 * useValidation hook - Access validation state and errors
 * 
 * Provides access to validation state with helpers for checking
 * errors at specific paths.
 */

import { useCallback, useMemo } from 'react';
import { useRuleStore } from '../store/ruleStore';
import {
  selectValidationErrors,
  selectIsValid,
} from '../store/selectors';
import { ValidationError } from '../lib/validation/validator';

/**
 * Grouped errors by field
 */
export interface GroupedErrors {
  name: ValidationError[];
  conditions: ValidationError[];
  event: ValidationError[];
  other: ValidationError[];
}

/**
 * Hook return type
 */
export interface UseValidationReturn {
  // State
  errors: ValidationError[];
  isValid: boolean;
  isValidating: boolean;
  errorCount: number;
  
  // Grouped errors
  groupedErrors: GroupedErrors;
  
  // Actions
  validate: () => void;
  clearValidation: () => void;
  
  // Helpers
  getErrorsAtPath: (path: string[]) => ValidationError[];
  hasErrorsAtPath: (path: string[]) => boolean;
  getErrorMessage: (path: string[]) => string | null;
}

/**
 * Hook for accessing validation state
 * 
 * @example
 * ```tsx
 * function FieldEditor({ path }) {
 *   const { hasErrorsAtPath, getErrorMessage } = useValidation();
 *   
 *   return (
 *     <div>
 *       <input className={hasErrorsAtPath(path) ? 'error' : ''} />
 *       {hasErrorsAtPath(path) && (
 *         <span className="error">{getErrorMessage(path)}</span>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useValidation(): UseValidationReturn {
  // Select state
  const errors = useRuleStore(selectValidationErrors);
  const isValid = useRuleStore(selectIsValid);
  const isValidating = useRuleStore((state) => state.isValidating);
  
  // Get actions
  const validateAction = useRuleStore((state) => state.validate);
  const clearValidationAction = useRuleStore((state) => state.clearValidation);
  
  // Computed values
  const errorCount = errors.length;
  
  // Group errors by top-level field
  const groupedErrors = useMemo((): GroupedErrors => {
    const groups: GroupedErrors = {
      name: [],
      conditions: [],
      event: [],
      other: [],
    };
    
    for (const error of errors) {
      const topLevel = error.path[0];
      if (topLevel === 'name') {
        groups.name.push(error);
      } else if (topLevel === 'conditions') {
        groups.conditions.push(error);
      } else if (topLevel === 'event') {
        groups.event.push(error);
      } else {
        groups.other.push(error);
      }
    }
    
    return groups;
  }, [errors]);
  
  // Actions
  const validate = useCallback(() => {
    validateAction();
  }, [validateAction]);
  
  const clearValidation = useCallback(() => {
    clearValidationAction();
  }, [clearValidationAction]);
  
  // Helpers
  const getErrorsAtPath = useCallback(
    (path: string[]): ValidationError[] => {
      return errors.filter((error) => {
        if (error.path.length < path.length) return false;
        return path.every((segment, i) => segment === error.path[i]);
      });
    },
    [errors]
  );
  
  const hasErrorsAtPath = useCallback(
    (path: string[]): boolean => {
      return getErrorsAtPath(path).length > 0;
    },
    [getErrorsAtPath]
  );
  
  const getErrorMessage = useCallback(
    (path: string[]): string | null => {
      const pathErrors = getErrorsAtPath(path);
      if (pathErrors.length === 0) return null;
      return pathErrors.map((e) => e.message).join('; ');
    },
    [getErrorsAtPath]
  );
  
  return {
    // State
    errors,
    isValid,
    isValidating,
    errorCount,
    
    // Grouped errors
    groupedErrors,
    
    // Actions
    validate,
    clearValidation,
    
    // Helpers
    getErrorsAtPath,
    hasErrorsAtPath,
    getErrorMessage,
  };
}

/**
 * Hook for checking validation at a specific path
 */
export function useValidationAtPath(path: string[]): {
  hasErrors: boolean;
  errors: ValidationError[];
  errorMessage: string | null;
} {
  const errors = useRuleStore(selectValidationErrors);
  
  const pathErrors = useMemo(() => {
    return errors.filter((error) => {
      if (error.path.length < path.length) return false;
      return path.every((segment, i) => segment === error.path[i]);
    });
  }, [errors, path]);
  
  const hasErrors = pathErrors.length > 0;
  const errorMessage = hasErrors ? pathErrors.map((e) => e.message).join('; ') : null;
  
  return { hasErrors, errors: pathErrors, errorMessage };
}
