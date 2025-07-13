/**
 * Flexible location extraction for different XFI plugin result structures
 * Handles various data formats without hardcoding plugin-specific details
 */

export interface LocationInfo {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  source: string; // Describes where the location came from
}

export interface LocationExtractionResult {
  location: LocationInfo;
  found: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Generic location extractor that handles different plugin result structures
 */
export class DiagnosticLocationExtractor {
  private static readonly DEFAULT_RANGE_LENGTH = 20;

  /**
   * Extract location information from any XFI error object
   * Uses a priority-based approach to find the best available location data
   */
  public static extractLocation(error: any): LocationExtractionResult {
    const extractors = [
      // High confidence extractors (precise location data)
      this.extractFromComplexityMetrics,
      this.extractFromLocationObject,
      this.extractFromASTNode,

      // Medium confidence extractors (good but less precise)
      this.extractFromDetailsArray,
      this.extractFromMatchesArray,
      this.extractFromRangeObject,

      // Low confidence extractors (fallback)
      this.extractFromDirectProperties,
      this.extractFromNestedDetails,
      this.extractFromLegacyFields
    ];

    for (const extractor of extractors) {
      const result = extractor(error);
      if (result.found) {
        return result;
      }
    }

    // Ultimate fallback
    return {
      location: {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: this.DEFAULT_RANGE_LENGTH,
        source: 'fallback'
      },
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from function complexity metrics (AST plugin)
   */
  private static extractFromComplexityMetrics(
    error: any
  ): LocationExtractionResult {
    const complexities = error.details?.details?.complexities;
    if (Array.isArray(complexities) && complexities.length > 0) {
      const location = complexities[0].metrics?.location;
      if (location && typeof location.startLine === 'number') {
        return {
          location: {
            startLine: location.startLine,
            startColumn: location.startColumn || 1,
            endLine: location.endLine || location.startLine,
            endColumn: location.endColumn || location.startColumn || 1,
            source: 'complexity-metrics'
          },
          found: true,
          confidence: 'high'
        };
      }
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from direct location object (generic AST results)
   */
  private static extractFromLocationObject(
    error: any
  ): LocationExtractionResult {
    const location = error.details?.location || error.location;
    if (location && typeof location.startLine === 'number') {
      return {
        location: {
          startLine: location.startLine,
          startColumn: location.startColumn || 1,
          endLine: location.endLine || location.startLine,
          endColumn: location.endColumn || location.startColumn || 1,
          source: 'location-object'
        },
        found: true,
        confidence: 'high'
      };
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from AST node information
   */
  private static extractFromASTNode(error: any): LocationExtractionResult {
    const node = error.details?.node || error.node;
    if (
      node &&
      (typeof node.line === 'number' || typeof node.startLine === 'number')
    ) {
      const startLine = node.startLine || node.line;
      const startColumn = node.startColumn || node.column || 1;
      return {
        location: {
          startLine,
          startColumn,
          endLine: node.endLine || startLine,
          endColumn: node.endColumn || startColumn,
          source: 'ast-node'
        },
        found: true,
        confidence: 'high'
      };
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from details array (repoFileAnalysis plugin)
   */
  private static extractFromDetailsArray(error: any): LocationExtractionResult {
    // Handle both nested details and direct details arrays
    const details = error.details?.details || error.details;
    if (Array.isArray(details) && details.length > 0) {
      const detail = details[0];
      if (typeof detail.lineNumber === 'number') {
        const matchLength = detail.match?.length || this.DEFAULT_RANGE_LENGTH;
        return {
          location: {
            startLine: detail.lineNumber,
            startColumn: detail.columnNumber || 1,
            endLine: detail.lineNumber,
            endColumn: (detail.columnNumber || 1) + matchLength,
            source: 'details-array'
          },
          found: true,
          confidence: 'medium'
        };
      }
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from matches array (pattern-based rules)
   */
  private static extractFromMatchesArray(error: any): LocationExtractionResult {
    const matches = error.details?.details?.matches || error.details?.matches;
    if (Array.isArray(matches) && matches.length > 0) {
      const match = matches[0];
      if (typeof match.lineNumber === 'number') {
        const matchLength = match.match?.length || this.DEFAULT_RANGE_LENGTH;
        return {
          location: {
            startLine: match.lineNumber,
            startColumn: match.columnNumber || 1,
            endLine: match.lineNumber,
            endColumn: (match.columnNumber || 1) + matchLength,
            source: 'matches-array'
          },
          found: true,
          confidence: 'medium'
        };
      }
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from range object
   */
  private static extractFromRangeObject(error: any): LocationExtractionResult {
    const range = error.details?.range || error.range;
    if (range && range.start && typeof range.start.line === 'number') {
      return {
        location: {
          startLine: range.start.line,
          startColumn: range.start.column || 1,
          endLine: range.end?.line || range.start.line,
          endColumn: range.end?.column || range.start.column || 1,
          source: 'range-object'
        },
        found: true,
        confidence: 'medium'
      };
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from direct properties on details object
   */
  private static extractFromDirectProperties(
    error: any
  ): LocationExtractionResult {
    const details = error.details;
    if (details && typeof details.lineNumber === 'number') {
      return {
        location: {
          startLine: details.lineNumber,
          startColumn: details.columnNumber || 1,
          endLine: details.lineNumber,
          endColumn: (details.columnNumber || 1) + this.DEFAULT_RANGE_LENGTH,
          source: 'direct-properties'
        },
        found: true,
        confidence: 'medium'
      };
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from nested details object
   */
  private static extractFromNestedDetails(
    error: any
  ): LocationExtractionResult {
    // Handle deeply nested structures
    const nestedDetails = error.details?.details?.details;
    if (nestedDetails && typeof nestedDetails.lineNumber === 'number') {
      return {
        location: {
          startLine: nestedDetails.lineNumber,
          startColumn: nestedDetails.columnNumber || 1,
          endLine: nestedDetails.lineNumber,
          endColumn:
            (nestedDetails.columnNumber || 1) + this.DEFAULT_RANGE_LENGTH,
          source: 'nested-details'
        },
        found: true,
        confidence: 'low'
      };
    }
    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from legacy fields (backward compatibility)
   */
  private static extractFromLegacyFields(error: any): LocationExtractionResult {
    if (typeof error.lineNumber === 'number') {
      return {
        location: {
          startLine: error.lineNumber,
          startColumn: error.columnNumber || 1,
          endLine: error.lineNumber,
          endColumn: (error.columnNumber || 1) + this.DEFAULT_RANGE_LENGTH,
          source: 'legacy-fields'
        },
        found: true,
        confidence: 'low'
      };
    }

    if (typeof error.line === 'number') {
      return {
        location: {
          startLine: error.line,
          startColumn: error.column || 1,
          endLine: error.line,
          endColumn: (error.column || 1) + this.DEFAULT_RANGE_LENGTH,
          source: 'legacy-line-column'
        },
        found: true,
        confidence: 'low'
      };
    }

    return {
      location: this.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Get default location when no information is available
   */
  private static getDefaultLocation(): LocationInfo {
    return {
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: this.DEFAULT_RANGE_LENGTH,
      source: 'default'
    };
  }

  /**
   * Validate and sanitize location information
   */
  public static validateLocation(location: LocationInfo): LocationInfo {
    const startLine = Math.max(1, parseInt(String(location.startLine)) || 1);
    const startColumn = Math.max(
      1,
      parseInt(String(location.startColumn)) || 1
    );
    const endLine = Math.max(
      startLine,
      parseInt(String(location.endLine)) || startLine
    );
    const endColumn = Math.max(
      startColumn,
      parseInt(String(location.endColumn)) || startColumn
    );

    return {
      startLine,
      startColumn,
      endLine,
      endColumn,
      source: location.source
    };
  }

  /**
   * Get confidence description for logging/debugging
   */
  public static getConfidenceDescription(
    confidence: 'high' | 'medium' | 'low'
  ): string {
    switch (confidence) {
      case 'high':
        return 'Precise location data with start/end coordinates';
      case 'medium':
        return 'Good location data with line numbers';
      case 'low':
        return 'Basic location data or fallback';
      default:
        return 'Unknown confidence level';
    }
  }
}
