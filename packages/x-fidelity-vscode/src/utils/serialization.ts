/**
 * Serialization utilities to prevent toJSON errors in VSCode webview communication
 */

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
