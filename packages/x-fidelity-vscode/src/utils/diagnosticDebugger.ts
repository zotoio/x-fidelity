import * as vscode from 'vscode';
import { LocationExtractionResult } from './diagnosticLocationExtractor';

/**
 * Diagnostic debugging utilities for location extraction analysis
 * Provides comprehensive analysis and debugging capabilities for VSCode highlighting
 */
export class DiagnosticDebugger {
  /**
   * Analyze and log diagnostic location extraction issues
   */
  public static analyzeLocationExtraction(
    error: any,
    result: LocationExtractionResult
  ): void {
    const analysis = {
      ruleFailure: error?.ruleFailure || 'unknown',
      extractionSuccess: result?.found || false,
      confidence: result?.confidence || 'unknown',
      locationSource: result?.location?.source || 'unknown',

      // Analyze available data structures
      availableStructures: this.analyzeAvailableStructures(error),

      // Final location used
      finalLocation: result?.location,

      // Extraction metadata
      metadata: result?.metadata
    };

    if (!result?.found) {
      console.warn('🔍 Diagnostic location extraction failed:', analysis);
      this.suggestImprovements(error);
    } else if (result?.confidence === 'low') {
      console.info('📊 Low confidence location extraction:', analysis);
    }

    // Log successful high-confidence extractions for validation
    if (result?.found && result?.confidence === 'high') {
      console.debug('✅ High confidence location extraction:', {
        rule: analysis.ruleFailure,
        source: analysis.locationSource,
        location: analysis.finalLocation
      });
    }
  }

  /**
   * Analyze available data structures in error object
   */
  private static analyzeAvailableStructures(error: any): any {
    if (!error) {
      return null;
    }

    return {
      hasDetails: !!error.details,
      hasLocation: !!error.location,
      hasRange: !!error.range,
      hasLineNumber: typeof error.lineNumber === 'number',

      detailsAnalysis: error.details
        ? {
            type: Array.isArray(error.details) ? 'array' : 'object',
            hasNestedDetails: !!error.details.details,
            hasLocation: !!error.details.location,
            hasRange: !!error.details.range,
            hasLineNumber: typeof error.details.lineNumber === 'number',
            keys:
              typeof error.details === 'object'
                ? Object.keys(error.details)
                : [],

            // Analyze nested details if array
            arrayAnalysis: Array.isArray(error.details)
              ? {
                  length: error.details.length,
                  firstElementKeys:
                    error.details.length > 0
                      ? Object.keys(error.details[0])
                      : [],
                  hasLineNumbers: error.details.some(
                    (d: any) => typeof d.lineNumber === 'number'
                  ),
                  hasMatches: error.details.some((d: any) => d.match)
                }
              : null,

            // Analyze nested details object
            nestedDetailsAnalysis: error.details.details
              ? {
                  type: Array.isArray(error.details.details)
                    ? 'array'
                    : 'object',
                  keys:
                    typeof error.details.details === 'object'
                      ? Object.keys(error.details.details)
                      : [],
                  hasComplexities: !!error.details.details.complexities,
                  hasMatches: !!error.details.details.matches
                }
              : null
          }
        : null,

      complexityAnalysis: error.details?.details?.complexities
        ? {
            count: error.details.details.complexities.length,
            hasMetrics: error.details.details.complexities.some(
              (c: any) => c.metrics
            ),
            hasLocation: error.details.details.complexities.some(
              (c: any) => c.metrics?.location
            ),
            sampleLocation: error.details.details.complexities.find(
              (c: any) => c.metrics?.location
            )?.metrics?.location
          }
        : null
    };
  }

  /**
   * Suggest improvements for location extraction
   */
  private static suggestImprovements(error: any): void {
    const suggestions: string[] = [];

    if (
      error?.details &&
      !error.details.lineNumber &&
      !error.details.location
    ) {
      suggestions.push(
        'Consider adding lineNumber or location to details object'
      );
    }

    if (
      Array.isArray(error?.details?.details) &&
      error.details.details.some((d: any) => d.match && !d.lineNumber)
    ) {
      suggestions.push(
        'Pattern matches should include lineNumber for accurate highlighting'
      );
    }

    if (
      error?.details?.details?.complexities &&
      !error.details.details.complexities.some((c: any) => c.metrics?.location)
    ) {
      suggestions.push(
        'Complexity metrics should include location data for precise highlighting'
      );
    }

    if (error?.details?.range && !error.details.range.start) {
      suggestions.push(
        'Range objects should include start/end properties with line/column data'
      );
    }

    if (typeof error?.lineNumber === 'number' && !error.columnNumber) {
      suggestions.push(
        'Adding columnNumber alongside lineNumber would improve highlighting precision'
      );
    }

    if (suggestions.length > 0) {
      console.info(
        '💡 Location extraction improvement suggestions:',
        suggestions
      );
    }
  }

  /**
   * Validate diagnostic highlighting accuracy against document content
   */
  public static async validateHighlightingAccuracy(
    uri: vscode.Uri,
    diagnostic: vscode.Diagnostic
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    metadata: any;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let valid = true;

    try {
      const document = await vscode.workspace.openTextDocument(uri);

      // Validate line bounds
      if (diagnostic.range.start.line >= document.lineCount) {
        errors.push(
          `Start line ${diagnostic.range.start.line + 1} exceeds document bounds (${document.lineCount} lines)`
        );
        valid = false;
      }

      if (diagnostic.range.end.line >= document.lineCount) {
        errors.push(
          `End line ${diagnostic.range.end.line + 1} exceeds document bounds (${document.lineCount} lines)`
        );
        valid = false;
      }

      // Validate column bounds if line is valid
      if (diagnostic.range.start.line < document.lineCount) {
        const startLineText = document.lineAt(diagnostic.range.start.line).text;
        if (diagnostic.range.start.character > startLineText.length) {
          errors.push(
            `Start column ${diagnostic.range.start.character} exceeds line bounds (${startLineText.length} characters)`
          );
          valid = false;
        }
      }

      if (diagnostic.range.end.line < document.lineCount) {
        const endLineText = document.lineAt(diagnostic.range.end.line).text;
        if (diagnostic.range.end.character > endLineText.length) {
          warnings.push(
            `End column ${diagnostic.range.end.character} exceeds line bounds (${endLineText.length} characters) - may be intentional for highlighting`
          );
        }
      }

      // Validate range consistency
      if (diagnostic.range.start.line > diagnostic.range.end.line) {
        errors.push(
          `Start line ${diagnostic.range.start.line + 1} is after end line ${diagnostic.range.end.line + 1}`
        );
        valid = false;
      }

      if (
        diagnostic.range.start.line === diagnostic.range.end.line &&
        diagnostic.range.start.character >= diagnostic.range.end.character
      ) {
        errors.push(
          `Start column ${diagnostic.range.start.character} is not before end column ${diagnostic.range.end.character} on same line`
        );
        valid = false;
      }

      // Extract highlighted text for analysis
      let highlightedText = '';
      try {
        if (diagnostic.range.start.line === diagnostic.range.end.line) {
          const lineText = document.lineAt(diagnostic.range.start.line).text;
          highlightedText = lineText.substring(
            diagnostic.range.start.character,
            Math.min(diagnostic.range.end.character, lineText.length)
          );
        } else {
          // Multi-line highlighting
          const startLineText = document.lineAt(
            diagnostic.range.start.line
          ).text;
          highlightedText = startLineText.substring(
            diagnostic.range.start.character
          );
          // Note: For simplicity, we only capture the first line for multi-line ranges
        }
      } catch (textError) {
        warnings.push(`Could not extract highlighted text: ${textError}`);
      }

      return {
        valid,
        errors,
        warnings,
        metadata: {
          documentLines: document.lineCount,
          highlightedText: highlightedText.substring(0, 100), // Limit for logging
          rangeSize:
            (diagnostic.range.end.line - diagnostic.range.start.line) * 1000 +
            (diagnostic.range.end.character - diagnostic.range.start.character),
          isMultiLine:
            diagnostic.range.start.line !== diagnostic.range.end.line,
          ruleId: diagnostic.code,
          locationSource: (diagnostic as any).locationSource,
          locationConfidence: (diagnostic as any).locationConfidence
        }
      };
    } catch (error) {
      errors.push(`Cannot validate highlighting for ${uri.fsPath}: ${error}`);
      return {
        valid: false,
        errors,
        warnings,
        metadata: {
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Analyze diagnostic distribution across files and rules
   */
  public static analyzeDiagnosticDistribution(
    diagnostics: [vscode.Uri, vscode.Diagnostic[]][]
  ): {
    summary: {
      totalFiles: number;
      totalDiagnostics: number;
      xfidelityDiagnostics: number;
      averageDiagnosticsPerFile: number;
    };
    byRule: Map<
      string,
      {
        count: number;
        files: Set<string>;
        locationSources: Set<string>;
        confidenceLevels: Set<string>;
      }
    >;
    byFile: Map<
      string,
      {
        count: number;
        rules: Set<string>;
        locationTypes: Set<string>;
      }
    >;
    locationSourceDistribution: Map<string, number>;
    confidenceDistribution: Map<string, number>;
  } {
    const byRule = new Map<string, any>();
    const byFile = new Map<string, any>();
    const locationSourceDistribution = new Map<string, number>();
    const confidenceDistribution = new Map<string, number>();

    let totalDiagnostics = 0;
    let xfidelityDiagnostics = 0;

    for (const [uri, diags] of diagnostics) {
      const xfiDiags = diags.filter(d => d.source === 'X-Fidelity');
      const fileName = vscode.workspace.asRelativePath(uri);

      totalDiagnostics += diags.length;
      xfidelityDiagnostics += xfiDiags.length;

      if (xfiDiags.length > 0) {
        if (!byFile.has(fileName)) {
          byFile.set(fileName, {
            count: 0,
            rules: new Set<string>(),
            locationTypes: new Set<string>()
          });
        }

        const fileStats = byFile.get(fileName)!;
        fileStats.count += xfiDiags.length;

        for (const diag of xfiDiags) {
          const ruleId = (diag.code as string) || 'unknown';
          const locationSource = (diag as any).locationSource || 'unknown';
          const confidence = (diag as any).locationConfidence || 'unknown';

          // Track by rule
          if (!byRule.has(ruleId)) {
            byRule.set(ruleId, {
              count: 0,
              files: new Set<string>(),
              locationSources: new Set<string>(),
              confidenceLevels: new Set<string>()
            });
          }

          const ruleStats = byRule.get(ruleId)!;
          ruleStats.count++;
          ruleStats.files.add(fileName);
          ruleStats.locationSources.add(locationSource);
          ruleStats.confidenceLevels.add(confidence);

          // Track by file
          fileStats.rules.add(ruleId);
          fileStats.locationTypes.add(locationSource);

          // Track distributions
          locationSourceDistribution.set(
            locationSource,
            (locationSourceDistribution.get(locationSource) || 0) + 1
          );
          confidenceDistribution.set(
            confidence,
            (confidenceDistribution.get(confidence) || 0) + 1
          );
        }
      }
    }

    return {
      summary: {
        totalFiles: diagnostics.length,
        totalDiagnostics,
        xfidelityDiagnostics,
        averageDiagnosticsPerFile:
          diagnostics.length > 0 ? xfidelityDiagnostics / diagnostics.length : 0
      },
      byRule,
      byFile,
      locationSourceDistribution,
      confidenceDistribution
    };
  }

  /**
   * Generate comprehensive diagnostic report
   */
  public static generateDiagnosticReport(
    diagnostics: [vscode.Uri, vscode.Diagnostic[]][]
  ): string {
    const analysis = this.analyzeDiagnosticDistribution(diagnostics);

    let report = '# X-Fidelity Diagnostic Analysis Report\n\n';

    // Summary
    report += '## Summary\n';
    report += `- **Total files with diagnostics:** ${analysis.summary.totalFiles}\n`;
    report += `- **Total X-Fidelity diagnostics:** ${analysis.summary.xfidelityDiagnostics}\n`;
    report += `- **Average diagnostics per file:** ${analysis.summary.averageDiagnosticsPerFile.toFixed(2)}\n\n`;

    // Location source distribution
    report += '## Location Source Distribution\n';
    for (const [source, count] of Array.from(
      analysis.locationSourceDistribution.entries()
    ).sort((a, b) => b[1] - a[1])) {
      const percentage = (
        (count / analysis.summary.xfidelityDiagnostics) *
        100
      ).toFixed(1);
      report += `- **${source}:** ${count} (${percentage}%)\n`;
    }
    report += '\n';

    // Confidence distribution
    report += '## Confidence Level Distribution\n';
    for (const [confidence, count] of Array.from(
      analysis.confidenceDistribution.entries()
    ).sort((a, b) => b[1] - a[1])) {
      const percentage = (
        (count / analysis.summary.xfidelityDiagnostics) *
        100
      ).toFixed(1);
      report += `- **${confidence}:** ${count} (${percentage}%)\n`;
    }
    report += '\n';

    // Top rules by occurrence
    report += '## Top Rules by Occurrence\n';
    const topRules = Array.from(analysis.byRule.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    for (const [rule, stats] of topRules) {
      report += `- **${rule}:** ${stats.count} issues across ${stats.files.size} files\n`;
      report += `  - Location sources: ${Array.from(stats.locationSources).join(', ')}\n`;
      report += `  - Confidence levels: ${Array.from(stats.confidenceLevels).join(', ')}\n`;
    }
    report += '\n';

    // Files with most issues
    report += '## Files with Most Issues\n';
    const topFiles = Array.from(analysis.byFile.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);

    for (const [file, stats] of topFiles) {
      report += `- **${file}:** ${stats.count} issues from ${stats.rules.size} rules\n`;
      report += `  - Rules: ${Array.from(stats.rules).slice(0, 5).join(', ')}${stats.rules.size > 5 ? '...' : ''}\n`;
      report += `  - Location types: ${Array.from(stats.locationTypes).join(', ')}\n`;
    }

    return report;
  }

  /**
   * Log comprehensive debugging information
   */
  public static logDebuggingInfo(
    diagnostics: [vscode.Uri, vscode.Diagnostic[]][],
    options: {
      includeFileDetails?: boolean;
      includeLocationAnalysis?: boolean;
      includePerformanceMetrics?: boolean;
    } = {}
  ): void {
    const startTime = performance.now();

    console.group('🔍 X-Fidelity Diagnostic Debugging Information');

    const analysis = this.analyzeDiagnosticDistribution(diagnostics);

    console.log('📊 Summary:', analysis.summary);
    console.log(
      '🎯 Location Source Distribution:',
      Array.from(analysis.locationSourceDistribution.entries())
    );
    console.log(
      '📈 Confidence Distribution:',
      Array.from(analysis.confidenceDistribution.entries())
    );

    if (options.includeFileDetails) {
      console.group('📁 File Details');
      for (const [file, stats] of analysis.byFile) {
        console.log(`${file}:`, stats);
      }
      console.groupEnd();
    }

    if (options.includeLocationAnalysis) {
      console.group('📍 Location Analysis');
      for (const [rule, stats] of analysis.byRule) {
        console.log(`${rule}:`, {
          count: stats.count,
          files: stats.files.size,
          locationSources: Array.from(stats.locationSources),
          confidenceLevels: Array.from(stats.confidenceLevels)
        });
      }
      console.groupEnd();
    }

    if (options.includePerformanceMetrics) {
      const analysisTime = performance.now() - startTime;
      console.log(`⚡ Analysis completed in ${analysisTime.toFixed(2)}ms`);
    }

    console.groupEnd();
  }

  /**
   * Validate all diagnostics and return validation summary
   */
  public static async validateAllDiagnostics(
    diagnostics: [vscode.Uri, vscode.Diagnostic[]][]
  ): Promise<{
    totalValidated: number;
    validDiagnostics: number;
    invalidDiagnostics: number;
    validationErrors: string[];
    validationWarnings: string[];
  }> {
    const validationErrors: string[] = [];
    const validationWarnings: string[] = [];
    let totalValidated = 0;
    let validDiagnostics = 0;

    for (const [uri, diags] of diagnostics) {
      const xfiDiags = diags.filter(d => d.source === 'X-Fidelity');

      for (const diag of xfiDiags) {
        totalValidated++;

        const validation = await this.validateHighlightingAccuracy(uri, diag);

        if (validation.valid) {
          validDiagnostics++;
        }

        validationErrors.push(...validation.errors);
        validationWarnings.push(...validation.warnings);
      }
    }

    return {
      totalValidated,
      validDiagnostics,
      invalidDiagnostics: totalValidated - validDiagnostics,
      validationErrors,
      validationWarnings
    };
  }
}
