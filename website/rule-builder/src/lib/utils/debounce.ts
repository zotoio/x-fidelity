/**
 * Debounce utilities for state updates
 * 
 * Provides debouncing to prevent expensive operations from running too frequently.
 * Different debounce times for different operations:
 * - Tree selection: immediate (0ms)
 * - Form field changes: 100ms
 * - JSON editor typing: 300ms
 * - Validation: 200ms
 */

/**
 * Debounce delays for different operations
 */
export const DEBOUNCE_DELAYS = {
  TREE_SELECTION: 0,
  FORM_CHANGE: 100,
  JSON_EDITOR: 300,
  VALIDATION: 200,
} as const;

/**
 * Create a debounced function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a debounced function that returns a promise
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((error: unknown) => void) | null = null;
  
  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          pendingResolve?.(result as Awaited<ReturnType<T>>);
        } catch (error) {
          pendingReject?.(error);
        } finally {
          timeoutId = null;
          pendingResolve = null;
          pendingReject = null;
        }
      }, delay);
    });
  };
}

/**
 * Throttle function - execute at most once per delay period
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);
    
    if (remaining <= 0) {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (timeoutId === null) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * Create a debounced function with cancellation support
 */
export function cancellableDebounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): {
  fn: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  
  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
  };
  
  const flush = () => {
    if (timeoutId !== null && lastArgs !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
      fn(...lastArgs);
      lastArgs = null;
    }
  };
  
  const debouncedFn = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
      lastArgs = null;
    }, delay);
  };
  
  return { fn: debouncedFn, cancel, flush };
}
