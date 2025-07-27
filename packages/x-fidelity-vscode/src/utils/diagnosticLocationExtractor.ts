/**
 * ENHANCED: Flexible location extraction for different XFI plugin result structures
 * Handles various data formats without hardcoding plugin-specific details
 *
 * SUPPORTED FORMATS:
 * 1. AST/Function Complexity: location.{startLine,endLine,startColumn,endColumn}
 * 2. Pattern-based Details: details[].{lineNumber,columnNumber,match}
 * 3. Direct Details: details.{lineNumber,columnNumber}
 * 4. Matches Array: matches[].{lineNumber,columnNumber}
 * 5. Range Objects: range.{start:{line,column},end:{line,column}}
 * 6. File-level Rules: No specific location (entire file)
 * 7. Repository-level Rules: Global scope
 * 8. Legacy formats for backward compatibility
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
  metadata?: {
    originalMatch?: string;
    extractorUsed?: string;
    rawData?: any;
    pattern?: string;
  };
}

/**
 * Enhanced location extractor with comprehensive format support
 */
export class DiagnosticLocationExtractor {
  private static readonly DEFAULT_RANGE_LENGTH = 20;
  private static readonly REASONABLE_MATCH_LENGTH = 10;

  /**
   * Extract location information from any XFI error object
   * Uses a priority-based approach to find the best available location data
   */
  public static extractLocation(error: any): LocationExtractionResult {
    // Enhanced debugging for missing rules
    const ruleFailure = error?.ruleFailure;
    if (
      ruleFailure === 'functionComplexity-iterative' ||
      ruleFailure === 'sensitiveLogging-iterative'
    ) {
      console.warn(`🐛 DEBUGGING MISSING RULE: ${ruleFailure}`, {
        errorStructure: this.analyzeErrorStructure(error),
        hasDetails: !!error?.details,
        hasComplexities: !!error?.details?.details?.complexities,
        hasDetailsArray: Array.isArray(error?.details?.details),
        detailsKeys: error?.details ? Object.keys(error.details) : [],
        nestedDetailsKeys: error?.details?.details
          ? Object.keys(error.details.details)
          : []
      });
    }

    const extractors = [
      // File-level rules handler (highest priority for these specific rules)
      this.extractFromFileLevelRules,

      // High confidence extractors (precise location data)
      this.extractFromComplexityMetrics,
      this.extractFromLocationObject,
      this.extractFromASTNode,

      // Medium confidence extractors (good but less precise)
      this.extractFromSensitiveLoggingPatterns,
      this.extractFromPatternMatches,
      this.extractFromDetailsArray,
      this.extractFromMatchesArray,
      this.extractFromRangeObject,
      this.extractFromDetailsLineNumber,

      // Low confidence extractors (fallback)
      this.extractFromDirectProperties,
      this.extractFromNestedDetails,
      this.extractFromLegacyFields
    ];

    // Try each extractor in priority order
    for (const extractor of extractors) {
      try {
        const result = extractor(error);
        if (result.found) {
          // Add metadata for debugging
          result.metadata = {
            extractorUsed: extractor.name,
            rawData: this.sanitizeForLogging(error)
          };
          return result;
        }
      } catch (extractorError) {
        console.warn(
          `Location extractor ${extractor.name} failed:`,
          extractorError
        );
      }
    }

    // Enhanced fallback with comprehensive logging
    const debugInfo = {
      ruleFailure: error?.ruleFailure || 'unknown',
      availableKeys: error ? Object.keys(error) : [],
      detailsKeys: error?.details ? Object.keys(error.details) : [],
      hasDetails: !!error?.details,
      hasComplexities: !!error?.details?.details?.complexities,
      detailsStructure: this.analyzeDetailsStructure(error)
    };

    console.warn('No location found for error:', debugInfo);

    // Ultimate fallback
    return {
      location: DiagnosticLocationExtractor.getDefaultLocation(),
      found: false,
      confidence: 'low',
      metadata: {
        extractorUsed: 'fallback',
        rawData: this.sanitizeForLogging(error)
      }
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
      'outdatedFramework-global',
      'invalidSystemIdConfigured-iterative',
      'factDoesNotAddResultToAlmanac-iterative',
      'sensitiveLogging-iterative'
    ];

    const ruleFailure = error?.ruleFailure;
    if (fileLevelRules.includes(ruleFailure)) {
      // Check if this rule has specific location data anyway
      const hasComplexityLocation =
        error.details?.details?.complexities?.[0]?.metrics?.location;
      const hasDetailsArray =
        Array.isArray(error.details?.details) &&
        error.details.details.some(
          (detail: any) => typeof detail.lineNumber === 'number'
        );
      const hasDirectLocation =
        typeof error.details?.lineNumber === 'number' ||
        typeof error.lineNumber === 'number';

      if (!hasComplexityLocation && !hasDetailsArray && !hasDirectLocation) {
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
   * Handles both nested structure (details.details.complexities) and resolved fact structure (details.complexities)
   */
  private static extractFromComplexityMetrics(
    error: any
  ): LocationExtractionResult {
    // Try nested structure first (details.details.complexities)
    let complexities = error.details?.details?.complexities;

    // If nested structure not found, try resolved fact structure (details.complexities)
    if (!complexities || !Array.isArray(complexities)) {
      complexities = error.details?.complexities;
    }

    if (Array.isArray(complexities) && complexities.length > 0) {
      const location = complexities[0].metrics?.location;
      if (location && typeof location.startLine === 'number') {
        // ENHANCEMENT: Ensure meaningful ranges for function complexity
        const startLine = location.startLine;
        const startColumn = location.startColumn || 1;
        let endLine = location.endLine || startLine;
        let endColumn = location.endColumn || startColumn;

        // For function complexity rules, ensure a meaningful range
        // If no explicit end position, assume the function spans multiple lines or significant columns
        if (endLine === startLine && endColumn === startColumn) {
          // Assume function spans at least 20 characters or to end of line
          endColumn = Math.max(startColumn + 20, startColumn + 10);
        }

        // If still a single line with small range, extend to multiple lines for better visibility
        if (endLine === startLine && endColumn - startColumn < 50) {
          endLine = startLine + 1; // Extend to next line for better highlighting
          endColumn = startColumn + 10; // Reset column for next line
        }

        return {
          location: {
            startLine: startLine,
            startColumn: startColumn,
            endLine: endLine,
            endColumn: endColumn,
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
   * ENHANCED: Extract from sensitive logging patterns (file contains patterns)
   * Handles the repoFileAnalysis fact structure used by sensitiveLogging rules
   */
  private static extractFromSensitiveLoggingPatterns(
    error: any
  ): LocationExtractionResult {
    // sensitiveLogging uses repoFileAnalysis fact with fileContains operator
    // Structure: details.details[].{pattern, match, lineNumber, columnNumber, context}
    const sensitivePatterns = error.details?.details;

    if (Array.isArray(sensitivePatterns) && sensitivePatterns.length > 0) {
      // Find the first pattern match with location data
      const matchWithLocation = sensitivePatterns.find(
        (pattern: any) =>
          pattern && typeof pattern.lineNumber === 'number' && pattern.match
      );

      if (matchWithLocation) {
        const startColumn = matchWithLocation.columnNumber || 1;
        const matchLength =
          matchWithLocation.match?.length ||
          DiagnosticLocationExtractor.REASONABLE_MATCH_LENGTH;

        return {
          location: {
            startLine: matchWithLocation.lineNumber,
            startColumn,
            endLine: matchWithLocation.lineNumber,
            endColumn: startColumn + matchLength,
            source: 'sensitive-logging-pattern'
          },
          found: true,
          confidence: 'high',
          metadata: {
            originalMatch: matchWithLocation.match?.substring(0, 50),
            pattern: matchWithLocation.pattern
          }
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
   * ENHANCED: Extract from pattern-based matches (patterns plugin)
   * Handles both file-level and line-level pattern matches
   */
  private static extractFromPatternMatches(
    error: any
  ): LocationExtractionResult {
    // Check for various pattern match structures
    const patterns =
      error.details?.details?.matches ||
      error.details?.matches ||
      error.details?.patternData;

    if (Array.isArray(patterns) && patterns.length > 0) {
      const patternWithLocation = patterns.find(
        (pattern: any) =>
          pattern &&
          (typeof pattern.lineNumber === 'number' ||
            typeof pattern.line === 'number')
      );

      if (patternWithLocation) {
        const lineNumber =
          patternWithLocation.lineNumber || patternWithLocation.line;
        const columnNumber =
          patternWithLocation.columnNumber || patternWithLocation.column || 1;
        const matchLength =
          patternWithLocation.match?.length ||
          patternWithLocation.text?.length ||
          DiagnosticLocationExtractor.REASONABLE_MATCH_LENGTH;

        return {
          location: {
            startLine: lineNumber,
            startColumn: columnNumber,
            endLine: lineNumber,
            endColumn: columnNumber + matchLength,
            source: 'pattern-match'
          },
          found: true,
          confidence: 'high',
          metadata: {
            originalMatch: (
              patternWithLocation.match || patternWithLocation.text
            )?.substring(0, 50)
          }
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
   * ENHANCED: Improved details array extraction with better column handling
   */
  private static extractFromDetailsArray(error: any): LocationExtractionResult {
    // Handle both nested details and direct details arrays
    const details = error.details?.details || error.details;
    if (Array.isArray(details) && details.length > 0) {
      const detail = details[0];
      if (typeof detail.lineNumber === 'number') {
        const startColumn = detail.columnNumber || 1;
        let endColumn =
          startColumn + DiagnosticLocationExtractor.REASONABLE_MATCH_LENGTH;

        // Enhanced: Try to get actual match length
        if (detail.matchLength && typeof detail.matchLength === 'number') {
          endColumn = startColumn + detail.matchLength;
        } else if (detail.length && typeof detail.length === 'number') {
          endColumn = startColumn + detail.length;
        } else if (detail.match && typeof detail.match === 'string') {
          endColumn = startColumn + detail.match.length;
        }

        return {
          location: {
            startLine: detail.lineNumber,
            startColumn,
            endLine: detail.lineNumber,
            endColumn,
            source: 'details-array-enhanced'
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
   * Analyze details structure for debugging
   */
  private static analyzeDetailsStructure(error: any): any {
    if (!error?.details) {
      return null;
    }

    const details = error.details;
    return {
      type: Array.isArray(details) ? 'array' : 'object',
      keys: typeof details === 'object' ? Object.keys(details) : [],
      hasLineNumber: !!details.lineNumber,
      hasNestedDetails: !!details.details,
      hasLocation: !!details.location,
      hasRange: !!details.range,
      hasPosition: !!details.position,
      firstArrayElement:
        Array.isArray(details) && details.length > 0
          ? Object.keys(details[0])
          : null
    };
  }

  /**
   * Analyze error structure for enhanced debugging
   */
  private static analyzeErrorStructure(error: any): any {
    if (!error) {
      return null;
    }
    return {
      type: typeof error,
      keys: Object.keys(error),
      hasRuleFailure: !!error.ruleFailure,
      hasDetails: !!error.details,
      hasComplexities: !!error.details?.details?.complexities,
      hasDetailsArray: Array.isArray(error.details?.details),
      hasNestedDetails: !!error.details?.details,
      errorLineNumber: typeof error.lineNumber === 'number',
      errorColumnNumber: typeof error.columnNumber === 'number',
      errorStartLine: typeof error.startLine === 'number',
      errorStartColumn: typeof error.startColumn === 'number',
      errorEndLine: typeof error.endLine === 'number',
      errorEndColumn: typeof error.endColumn === 'number',
      detailsLocation: !!error.details?.location,
      detailsRange: !!error.details?.range,
      detailsPosition: !!error.details?.position,
      detailsNode: !!error.details?.node,
      complexityMetrics: !!error.details?.details?.complexities?.[0]?.metrics,
      complexityLocation:
        !!error.details?.details?.complexities?.[0]?.metrics?.location,
      detailsArray:
        Array.isArray(error.details?.details) &&
        error.details.details.length > 0,
      detailsArrayLineNumber:
        Array.isArray(error.details?.details) &&
        typeof error.details.details?.[0]?.lineNumber === 'number'
    };
  }

  /**
   * Sanitize data for logging (remove sensitive info, limit size)
   */
  private static sanitizeForLogging(data: any): any {
    if (!data) {
      return data;
    }

    try {
      const serialized = JSON.stringify(data);
      if (serialized.length > 500) {
        return JSON.parse(serialized.substring(0, 500) + '...');
      }
      return data;
    } catch {
      return '[unable to serialize]';
    }
  }

  /**
   * Enhanced validation with better error handling
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
    let endColumn = Math.max(
      startColumn,
      parseInt(String(location.endColumn)) || startColumn
    );

    // Ensure end column is at least start column + 1 for proper highlighting
    if (endColumn === startColumn) {
      endColumn = startColumn + 1;
    }

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
