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
      // File-level rules handler (new - highest priority for these specific rules)
      this.extractFromFileLevelRules,

      // High confidence extractors (precise location data)
      this.extractFromComplexityMetrics,
      this.extractFromLocationObject,
      this.extractFromASTNode,

      // Medium confidence extractors (good but less precise)
      this.extractFromDetailsArray,
      this.extractFromMatchesArray,
      this.extractFromRangeObject,
      this.extractFromDetailsLineNumber, // New extractor for rules with lineNumber in details

      // Low confidence extractors (fallback)
      this.extractFromDirectProperties,
      this.extractFromNestedDetails,
      this.extractFromLegacyFields
    ];

    // CRITICAL FIX: Add logging for extraction attempts
    for (const extractor of extractors) {
      try {
        const result = extractor(error);
        if (result.found) {
          return result;
        }
      } catch (extractorError) {
        console.warn('Location extractor failed:', extractorError);
      }
    }

    // Enhanced fallback with better logging
    console.warn('No location found for error:', {
      ruleFailure: error?.ruleFailure || 'unknown',
      availableKeys: error ? Object.keys(error) : [],
      detailsKeys: error?.details ? Object.keys(error.details) : [],
      hasDetails: !!error?.details,
      hasComplexities: !!error?.details?.details?.complexities
    });

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
   * Handle file-level rules that don't have specific line information
   * These rules analyze the entire file and should be displayed at line 1
   */
  private static extractFromFileLevelRules(
    error: any
  ): LocationExtractionResult {
    const fileLevelRules = [
      'functionCount-iterative',
      'codeRhythm-iterative',
      'functionComplexity-iterative', // when no specific function location
      'outdatedFramework-global',
      'invalidSystemIdConfigured-iterative'
    ];

    const ruleFailure = error?.ruleFailure;
    if (fileLevelRules.includes(ruleFailure)) {
      // Check if this rule has specific location data anyway
      const hasSpecificLocation =
        error.details?.details?.some?.((detail: any) => detail.lineNumber) ||
        error.details?.lineNumber ||
        error.lineNumber;

      if (!hasSpecificLocation) {
        return {
          location: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
            source: 'file-level-rule'
          },
          found: true,
          confidence: 'medium' // Medium because it's intentionally file-level
        };
      }
    }

    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
        // CRITICAL FIX: Use reasonable default instead of regex pattern length
        // The detail.match field contains regex patterns, not actual matched text
        // Using detail.match.length causes incorrect highlighting ranges
        const REASONABLE_MATCH_LENGTH = 10; // Reasonable default for most actual matches

        return {
          location: {
            startLine: detail.lineNumber,
            startColumn: detail.columnNumber || 1,
            endLine: detail.lineNumber,
            endColumn: (detail.columnNumber || 1) + REASONABLE_MATCH_LENGTH,
            source: 'details-array'
          },
          found: true,
          confidence: 'medium'
        };
      }
    }
    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
        const matchLength =
          match.match?.length ||
          DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH;
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
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
      location: DiagnosticLocationExtractor.getDefaultLocation(),
      found: false,
      confidence: 'low'
    };
  }

  /**
   * Extract from details object if it has a lineNumber property
   */
  private static extractFromDetailsLineNumber(
    error: any
  ): LocationExtractionResult {
    const details = error.details;
    if (details && typeof details.lineNumber === 'number') {
      return {
        location: {
          startLine: details.lineNumber,
          startColumn: details.columnNumber || 1,
          endLine: details.lineNumber,
          endColumn:
            (details.columnNumber || 1) +
            DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
          source: 'details-line-number'
        },
        found: true,
        confidence: 'medium'
      };
    }

    // Also check if the error itself has lineNumber (some rules put it at the top level)
    if (typeof error.lineNumber === 'number') {
      return {
        location: {
          startLine: error.lineNumber,
          startColumn: error.columnNumber || 1,
          endLine: error.lineNumber,
          endColumn:
            (error.columnNumber || 1) +
            DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
          source: 'error-line-number'
        },
        found: true,
        confidence: 'medium'
      };
    }

    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
          endColumn:
            (details.columnNumber || 1) +
            DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
          source: 'direct-properties'
        },
        found: true,
        confidence: 'medium'
      };
    }
    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
            (nestedDetails.columnNumber || 1) +
            DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
          source: 'nested-details'
        },
        found: true,
        confidence: 'low'
      };
    }
    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
          endColumn:
            (error.columnNumber || 1) +
            DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
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
          endColumn:
            (error.column || 1) +
            DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
          source: 'legacy-line-column'
        },
        found: true,
        confidence: 'low'
      };
    }

    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
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
      endColumn: DiagnosticLocationExtractor.DEFAULT_RANGE_LENGTH,
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
