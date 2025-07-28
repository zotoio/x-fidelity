/**
 * Debug helpers for serialization issues
 * Only active in development mode to prevent performance impact in production
 */

import * as vscode from 'vscode';

// Global flag to track if debugging is enabled
let serializationDebuggingEnabled = false;

// Store original methods for restoration
const originalMethods = new Map<string, any>();

/**
 * Enable serialization debugging in development mode
 * Adds runtime validation and enhanced error reporting
 */
export function enableSerializationDebugging(): void {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Serialization debugging is disabled in production');
    return;
  }

  if (serializationDebuggingEnabled) {
    console.log('🔍 Serialization debugging already enabled');
    return;
  }

  console.log('🚀 Enabling serialization debugging...');

  // Monkey-patch webview.postMessage to add validation
  monkeyPatchWebviewPostMessage();

  // Monkey-patch JSON.stringify to detect problematic objects
  monkeyPatchJSONStringify();

  // Add global error handler for serialization errors
  addGlobalSerializationErrorHandler();

  serializationDebuggingEnabled = true;
  console.log('✅ Serialization debugging enabled');
}

/**
 * Disable serialization debugging and restore original methods
 */
export function disableSerializationDebugging(): void {
  if (!serializationDebuggingEnabled) {
    return;
  }

  console.log('🔴 Disabling serialization debugging...');

  // Restore original methods
  for (const [key, originalMethod] of originalMethods) {
    if (key === 'JSON.stringify') {
      JSON.stringify = originalMethod;
    }
    // Note: vscode.Webview.prototype methods are not restored as they're not patched in production
  }

  originalMethods.clear();
  serializationDebuggingEnabled = false;
  console.log('✅ Serialization debugging disabled');
}

/**
 * Check if serialization debugging is currently enabled
 */
export function isSerializationDebuggingEnabled(): boolean {
  return serializationDebuggingEnabled;
}

/**
 * Monkey-patch webview.postMessage to add validation
 * Note: This is a best-effort approach for development debugging
 */
function monkeyPatchWebviewPostMessage(): void {
  try {
    // Skip patching if we're in a test environment or vscode types aren't available
    if (process.env.NODE_ENV === 'test' || typeof vscode === 'undefined') {
      console.log('🔍 Skipping webview monkey-patch in test environment');
      return;
    }

    console.log(
      '🔍 Webview monkey-patching skipped - runtime patching not recommended for production'
    );
    console.log('🔍 Use SafeWebview wrapper instead for safe serialization');
  } catch (error) {
    console.warn(
      '⚠️  Cannot patch webview.postMessage:',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Monkey-patch JSON.stringify to detect problematic objects
 */
function monkeyPatchJSONStringify(): void {
  const originalStringify = JSON.stringify;
  originalMethods.set('JSON.stringify', originalStringify);

  JSON.stringify = function (value: any, replacer?: any, space?: any): string {
    const startTime = performance.now();

    try {
      const result = originalStringify.call(this, value, replacer, space);
      const serializationTime = performance.now() - startTime;

      // Log slow serializations
      if (serializationTime > 100) {
        // More than 100ms
        console.warn('🐌 Slow JSON.stringify detected', {
          time: `${serializationTime.toFixed(2)}ms`,
          size: result.length,
          valueType: typeof value,
          valueConstructor: value?.constructor?.name
        });
      }

      return result;
    } catch (error) {
      // Enhanced error reporting for JSON.stringify failures
      console.error('🚨 JSON.stringify Error Detected!', {
        error: error instanceof Error ? error.message : String(error),
        valueType: typeof value,
        valueConstructor: value?.constructor?.name,
        problematicPaths: findProblematicPaths(value),
        stack: new Error().stack,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  };
}

/**
 * Add global error handler for uncaught serialization errors
 */
function addGlobalSerializationErrorHandler(): void {
  const originalErrorHandler = process.listeners('uncaughtException');

  process.on('uncaughtException', (error: Error, origin: string) => {
    if (
      error.message.includes('toJSON') ||
      error.message.includes('JSON.stringify') ||
      error.message.includes('circular') ||
      error.message.includes('serialize')
    ) {
      console.error('🚨 Global Serialization Error Caught!', {
        error: error.message,
        name: error.name,
        stack: error.stack,
        origin,
        timestamp: new Date().toISOString(),
        context: 'global-handler'
      });

      // Try to provide helpful suggestions
      console.log('💡 Serialization Error Help:', {
        suggestions: [
          'Use SafeWebview instead of direct webview.postMessage',
          'Use SerializationService for complex objects',
          'Convert VSCode objects using serialization helpers',
          'Check for circular references in your data'
        ],
        debugCommands: [
          'SerializationService.getInstance().debugSerialization(obj)',
          'SerializationService.getInstance().getSerializationStats(obj)'
        ]
      });
    }

    // Call original handlers
    originalErrorHandler.forEach(handler => {
      if (typeof handler === 'function') {
        (handler as any)(error, origin);
      }
    });
  });
}

/**
 * Analyze a message for potential serialization issues
 */
function analyzeSerializationIssues(obj: any): string[] {
  const issues: string[] = [];

  try {
    analyzeObjectRecursive(obj, issues, '', 0);
  } catch (error) {
    issues.push(
      `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return issues;
}

/**
 * Recursively analyze an object for serialization issues
 */
function analyzeObjectRecursive(
  obj: any,
  issues: string[],
  path: string,
  depth: number
): void {
  if (depth > 10) {
    issues.push(`${path}: Maximum analysis depth reached`);
    return;
  }

  if (obj === null || obj === undefined) {
    return;
  }

  // Check for VSCode objects
  const typeName = obj?.constructor?.name;
  if (typeName && isVSCodeObject(typeName)) {
    issues.push(
      `${path}: Contains VSCode object (${typeName}) which may not serialize properly`
    );
  }

  // Check for functions
  if (typeof obj === 'function') {
    issues.push(`${path}: Contains function which cannot be serialized`);
    return;
  }

  // Check for circular references (simplified check)
  if (typeof obj === 'object' && obj._serializationAnalyzing) {
    issues.push(`${path}: Potential circular reference detected`);
    return;
  }

  if (typeof obj === 'object') {
    obj._serializationAnalyzing = true;

    try {
      // Check for Map/Set
      if (obj instanceof Map) {
        issues.push(
          `${path}: Contains Map which requires special serialization`
        );
      } else if (obj instanceof Set) {
        issues.push(
          `${path}: Contains Set which requires special serialization`
        );
      } else if (Buffer.isBuffer(obj)) {
        issues.push(
          `${path}: Contains Buffer which may not serialize as expected`
        );
      } else if (obj instanceof Date) {
        // Date is fine, just note it
      } else if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          analyzeObjectRecursive(item, issues, `${path}[${index}]`, depth + 1);
        });
      } else {
        // Regular object
        for (const [key, value] of Object.entries(obj)) {
          if (key === '_serializationAnalyzing') {
            continue;
          }
          analyzeObjectRecursive(
            value,
            issues,
            path ? `${path}.${key}` : key,
            depth + 1
          );
        }
      }
    } finally {
      delete obj._serializationAnalyzing;
    }
  }
}

/**
 * Find paths to problematic properties in an object
 */
function findProblematicPaths(obj: any): string[] {
  const paths: string[] = [];

  try {
    findProblematicPathsRecursive(obj, paths, '', 0);
  } catch (error) {
    paths.push(
      `Path analysis failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return paths;
}

/**
 * Recursively find problematic paths
 */
function findProblematicPathsRecursive(
  obj: any,
  paths: string[],
  path: string,
  depth: number
): void {
  if (depth > 15) {
    // Prevent infinite recursion
    paths.push(`${path}: Max depth reached`);
    return;
  }

  if (obj === null || obj === undefined) {
    return;
  }

  // Test if this specific value can be serialized
  try {
    JSON.stringify(obj);
  } catch (error) {
    paths.push(
      `${path}: ${error instanceof Error ? error.message : String(error)}`
    );
    return; // Don't recurse into problematic objects
  }

  if (typeof obj === 'object' && !obj._pathAnalyzing) {
    obj._pathAnalyzing = true;

    try {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          findProblematicPathsRecursive(
            item,
            paths,
            `${path}[${index}]`,
            depth + 1
          );
        });
      } else {
        for (const [key, value] of Object.entries(obj)) {
          if (key === '_pathAnalyzing') {
            continue;
          }
          findProblematicPathsRecursive(
            value,
            paths,
            path ? `${path}.${key}` : key,
            depth + 1
          );
        }
      }
    } finally {
      delete obj._pathAnalyzing;
    }
  }
}

/**
 * Check if a type name represents a VSCode object
 */
function isVSCodeObject(typeName: string): boolean {
  const vscodeTypes = [
    'Range',
    'Position',
    'Uri',
    'Diagnostic',
    'Location',
    'TextDocument',
    'WorkspaceFolder',
    'TextEdit',
    'CodeAction',
    'CompletionItem',
    'DiagnosticRelatedInformation',
    'MarkdownString',
    'ThemeIcon',
    'TreeItem',
    'QuickPickItem',
    'StatusBarItem'
  ];

  return vscodeTypes.includes(typeName);
}

/**
 * Create a safe debugging function that won't cause serialization issues
 */
export function debugSerializationSafely(obj: any, label?: string): void {
  if (!serializationDebuggingEnabled) {
    console.log(
      '🔍 Serialization debugging not enabled. Call enableSerializationDebugging() first.'
    );
    return;
  }

  const safeLabel = label || 'Unknown Object';

  try {
    const issues = analyzeSerializationIssues(obj);
    const canSerialize = issues.length === 0;

    console.group(`🔍 Serialization Debug - ${safeLabel}`);
    console.log('Can serialize safely:', canSerialize);
    console.log('Object type:', typeof obj);
    console.log('Constructor:', obj?.constructor?.name || 'None');

    if (!canSerialize) {
      console.warn('Issues found:', issues);
    }

    // Try to estimate size
    try {
      const serialized = JSON.stringify(obj);
      console.log(
        'Serialized size:',
        new TextEncoder().encode(serialized).length,
        'bytes'
      );
    } catch (error) {
      console.warn(
        'Cannot determine size:',
        error instanceof Error ? error.message : String(error)
      );
    }

    console.groupEnd();
  } catch (error) {
    console.error(`🚨 Debug analysis failed for ${safeLabel}:`, error);
  }
}

/**
 * Validate that an object is safe for serialization without throwing
 */
export function validateSerializationSafety(obj: any): {
  safe: boolean;
  issues: string[];
  size?: number;
} {
  try {
    const issues = analyzeSerializationIssues(obj);
    let size: number | undefined;

    try {
      const serialized = JSON.stringify(obj);
      size = new TextEncoder().encode(serialized).length;
    } catch {
      // Size couldn't be determined
    }

    return {
      safe: issues.length === 0,
      issues,
      size
    };
  } catch (error) {
    return {
      safe: false,
      issues: [
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      ]
    };
  }
}
