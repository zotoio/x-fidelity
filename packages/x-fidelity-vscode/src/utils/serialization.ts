/**
 * Enhanced serialization utilities to prevent toJSON errors and handle complex objects
 * This file provides comprehensive serialization support for VSCode webview communication
 */

import * as vscode from 'vscode';
import type { LocationInfo } from './diagnosticLocationExtractor';

/**
 * Safely serialize a range object for webview postMessage
 * Handles objects that might not have toJSON methods
 */
export function safeSerializeRange(range: any): any {
  if (!range || typeof range !== 'object') {
    return null;
  }

  try {
    // Test if the object can be serialized
    JSON.stringify(range);
    return range;
  } catch (error) {
    // If serialization fails, extract safe properties
    console.warn(
      'Range object cannot be serialized, extracting safe properties:',
      error
    );

    if (range.start && range.end) {
      return {
        start: {
          line: range.start.line || 0,
          column: range.start.column || 0
        },
        end: {
          line: range.end.line || 0,
          column: range.end.column || 0
        }
      };
    }

    return null;
  }
}

/**
 * Safely serialize any object for webview communication
 * Removes properties that can't be serialized
 */
export function safeSerializeObject<T>(obj: T): T | null {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  try {
    // Test serialization
    const serialized = JSON.stringify(obj);
    return JSON.parse(serialized);
  } catch (error) {
    console.warn('Object cannot be serialized safely:', error);
    return null;
  }
}

/**
 * Create a serializable version of enhanced position data
 */
export function createSerializableEnhancedPosition(enhancedPos: any): any {
  if (!enhancedPos) {
    return null;
  }

  return {
    originalRange: safeSerializeRange(enhancedPos.originalRange),
    originalPosition: enhancedPos.originalPosition
      ? {
          line: enhancedPos.originalPosition.line || 0,
          column: enhancedPos.originalPosition.column || 0
        }
      : null,
    originalMatches:
      enhancedPos.originalMatches?.map((match: any) => ({
        range: safeSerializeRange(match.range),
        text: match.text || ''
      })) || null
  };
}

/**
 * Safely serialize location metadata from the diagnostic location extractor
 * Ensures location info can be passed through webview postMessage
 */
export function safeSerializeLocationMetadata(locationMetadata: any): any {
  if (!locationMetadata) {
    return null;
  }

  return {
    confidence: locationMetadata.confidence || 'low',
    source: locationMetadata.source || 'unknown',
    extractionFound: Boolean(locationMetadata.extractionFound)
  };
}

/**
 * Safely serialize location info for webview communication
 */
export function safeSerializeLocationInfo(location: LocationInfo): any {
  if (!location) {
    return null;
  }

  return {
    startLine: location.startLine || 1,
    startColumn: location.startColumn || 1,
    endLine: location.endLine || 1,
    endColumn: location.endColumn || 1,
    source: location.source || 'unknown'
  };
}

/**
 * Comprehensive object serialization that handles VSCode objects and circular references
 */
export function safeSerializeForVSCode<T>(obj: T): T | null {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  try {
    // Create a clean serializable object by walking through properties
    return JSON.parse(JSON.stringify(obj, createSafeReplacer()));
  } catch (error) {
    console.warn(
      'Object serialization failed, attempting manual cleanup:',
      error
    );
    return manualObjectCleanup(obj);
  }
}

/**
 * Create a replacer function that handles VSCode objects and problematic types
 */
function createSafeReplacer(): (key: string, value: any) => any {
  const seen = new WeakSet();

  return function (key: string, value: any) {
    // Handle circular references
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    // Handle VSCode Range objects
    if (
      value &&
      typeof value === 'object' &&
      'start' in value &&
      'end' in value
    ) {
      if (value.start && typeof value.start.line === 'number') {
        return {
          start: {
            line: value.start.line,
            character: value.start.character || 0
          },
          end: {
            line: value.end?.line || value.start.line,
            character: value.end?.character || value.start.character || 0
          }
        };
      }
    }

    // Handle VSCode Position objects
    if (value && typeof value === 'object' && typeof value.line === 'number') {
      return {
        line: value.line,
        character: value.character || 0
      };
    }

    // Handle VSCode Uri objects
    if (value && typeof value === 'object' && value.scheme && value.fsPath) {
      return {
        scheme: value.scheme,
        fsPath: value.fsPath,
        path: value.path
      };
    }

    // Handle VSCode Diagnostic objects
    if (value && typeof value === 'object' && value.range && value.message) {
      return {
        range: this('range', value.range),
        message: value.message,
        severity: value.severity,
        source: value.source,
        code: value.code
      };
    }

    // Handle functions by converting to string representation
    if (typeof value === 'function') {
      return `[Function: ${value.name || 'anonymous'}]`;
    }

    // Handle Maps and Sets
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    if (value instanceof Set) {
      return Array.from(value);
    }

    // Handle Buffers
    if (Buffer.isBuffer(value)) {
      return `[Buffer: ${value.length} bytes]`;
    }

    // Handle undefined values
    if (value === undefined) {
      return null;
    }

    return value;
  };
}

/**
 * Manual object cleanup for cases where JSON.stringify fails completely
 */
function manualObjectCleanup<T>(obj: T): T | null {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  try {
    const cleaned: any = {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = (obj as any)[key];

        if (value === null || value === undefined) {
          cleaned[key] = null;
        } else if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          cleaned[key] = value;
        } else if (Array.isArray(value)) {
          cleaned[key] = value
            .map(item => manualObjectCleanup(item))
            .filter(item => item !== null);
        } else if (typeof value === 'object') {
          // Try to serialize the object
          try {
            JSON.stringify(value);
            cleaned[key] = value;
          } catch {
            // Object can't be serialized, try manual cleanup
            const cleanedValue = manualObjectCleanup(value);
            if (cleanedValue !== null) {
              cleaned[key] = cleanedValue;
            }
          }
        }
      }
    }

    return cleaned as T;
  } catch (error) {
    console.error('Manual object cleanup failed:', error);
    return null;
  }
}

/**
 * Safe serialization specifically for diagnostic ranges
 */
export function safeSerializeDiagnosticRange(range: vscode.Range | any): any {
  if (!range) {
    return null;
  }

  try {
    // Handle VSCode Range objects
    if (range.start && range.end) {
      return {
        start: {
          line: range.start.line || 0,
          character: range.start.character || 0
        },
        end: {
          line: range.end.line || 0,
          character: range.end.character || 0
        }
      };
    }

    // Handle plain objects with range-like structure
    if (typeof range.startLine === 'number') {
      return {
        start: {
          line: range.startLine - 1, // Convert 1-based to 0-based
          character: (range.startColumn || 1) - 1
        },
        end: {
          line: (range.endLine || range.startLine) - 1,
          character: (range.endColumn || range.startColumn || 1) - 1
        }
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to serialize diagnostic range:', error);
    return null;
  }
}

/**
 * Safe serialization for analysis results that contain complex VSCode objects
 */
export function safeSerializeAnalysisResult(result: any): any {
  if (!result) {
    return null;
  }

  try {
    const safeResult = {
      metadata: safeSerializeForVSCode(result.metadata),
      timestamp: result.timestamp || Date.now(),
      duration: result.duration || 0,
      summary: safeSerializeForVSCode(result.summary),
      operationId: result.operationId || `safe-${Date.now()}`
    };

    // Handle diagnostics Map specially
    if (result.diagnostics instanceof Map) {
      const diagnosticsObj: any = {};
      for (const [uri, diagnostics] of result.diagnostics) {
        const uriKey = typeof uri === 'string' ? uri : uri.toString();
        diagnosticsObj[uriKey] = diagnostics.map((diag: any) => ({
          range: safeSerializeDiagnosticRange(diag.range),
          message: diag.message,
          severity: diag.severity,
          source: diag.source,
          code: diag.code
        }));
      }
      safeResult.diagnostics = diagnosticsObj;
    } else {
      safeResult.diagnostics = {};
    }

    return safeResult;
  } catch (error) {
    console.error('Failed to safely serialize analysis result:', error);
    return {
      metadata: { XFI_RESULT: { issueDetails: [] } },
      diagnostics: {},
      timestamp: Date.now(),
      duration: 0,
      summary: {
        totalIssues: 0,
        filesAnalyzed: 0,
        analysisTimeMs: 0
      },
      operationId: `fallback-${Date.now()}`
    };
  }
}
