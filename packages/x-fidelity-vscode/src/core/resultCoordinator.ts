import * as vscode from 'vscode';
import type { AnalysisResult } from '../analysis/types';
import type {
  ProcessedAnalysisResult,
  ProcessedIssue,
  FailedIssue,
  EnhancedIssueDetails,
  EnhancedIssueItem
} from '../types/issues';
import type { ResultMetadata } from '@x-fidelity/types';
import { DiagnosticLocationExtractor } from '../utils/diagnosticLocationExtractor';
import { createComponentLogger } from '../utils/globalLogger';
import { validateRange } from '../utils/rangeValidation';
import { FileSourceTranslator } from '../utils/fileSourceTranslator';

// Internal interface for processing issues from analysis results
interface DiagnosticIssue {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleId: string;
  issueId?: string;
  category?: string;
  documentation?: string;
  source?: string;
  code?: string;
  tags?: vscode.DiagnosticTag[];
  isFileLevelRule?: boolean;
  // Raw error details for extracting dependency locations
  rawError?: any;
}

/**
 * ResultCoordinator - Central processor for analysis results
 *
 * This class eliminates the counting discrepancy by:
 * 1. Processing analysis results once, comprehensively
 * 2. Distributing identical processed data to all components
 * 3. Tracking both successful and failed diagnostic conversions
 * 4. Ensuring all UI components show consistent counts
 * 5. Caching results for diagnostic toggle support
 */
export class ResultCoordinator implements vscode.Disposable {
  private logger: any;
  private disposables: vscode.Disposable[] = [];

  /**
   * Cache of the last processed analysis result.
   * Used to restore diagnostics when toggled back on without re-running analysis.
   */
  private lastProcessedResult: ProcessedAnalysisResult | null = null;

  constructor() {
    this.logger = createComponentLogger('ResultCoordinator');
    this.logger.info('ResultCoordinator initialized');
  }

  /**
   * Get the last processed analysis result (for diagnostic restoration)
   */
  public getLastProcessedResult(): ProcessedAnalysisResult | null {
    return this.lastProcessedResult;
  }

  /**
   * Check if there are cached results available
   */
  public hasCachedResults(): boolean {
    return this.lastProcessedResult !== null;
  }

  /**
   * Restore diagnostics from cached results
   * Used when diagnostics are toggled back ON
   */
  public async restoreDiagnosticsFromCache(components: {
    diagnosticProvider: any;
    issuesTreeViewManager: any;
    statusBarProvider: any;
  }): Promise<boolean> {
    if (!this.lastProcessedResult) {
      this.logger.warn(
        'No cached results available - user must run analysis again'
      );
      return false;
    }

    this.logger.info('Restoring diagnostics from cached results', {
      cachedIssues: this.lastProcessedResult.totalIssues,
      diagnosticFiles: this.lastProcessedResult.diagnostics.size
    });

    try {
      await this.distributeToComponents(this.lastProcessedResult, components);
      this.logger.info('Diagnostics restored successfully from cache');
      return true;
    } catch (error) {
      this.logger.error('Failed to restore diagnostics from cache', error);
      return false;
    }
  }

  /**
   * Main entry point: process results once and distribute to all components
   */
  public async processAndDistributeResults(
    rawResult: AnalysisResult,
    components: {
      diagnosticProvider: any;
      issuesTreeViewManager: any;
      statusBarProvider: any;
    }
  ): Promise<ProcessedAnalysisResult> {
    const startTime = performance.now();

    this.logger.info('Processing analysis result for distribution', {
      operationId: rawResult.operationId,
      rawTotalIssues: rawResult.summary?.totalIssues || 0
    });

    try {
      // 1. Process the raw result once, comprehensively
      const processed = await this.processAnalysisResult(rawResult);

      this.logger.info('Analysis result processed', {
        totalIssues: processed.totalIssues,
        successfulIssues: processed.successfulIssues,
        failedIssues: processed.failedIssues,
        diagnosticsCount: processed.diagnostics.size
      });

      // 2. Update ALL components directly with the SAME processed data
      await this.distributeToComponents(processed, components);

      // 3. Cache the processed result for diagnostic toggle support
      this.lastProcessedResult = processed;
      this.logger.debug('Cached processed result for diagnostic restoration');

      // 4. Log final reconciliation
      this.logReconciliation(processed, rawResult);

      const processingTime = performance.now() - startTime;
      this.logger.info(
        `Result processing and distribution completed in ${processingTime.toFixed(2)}ms`
      );

      return processed;
    } catch (error) {
      this.logger.error(
        'Failed to process and distribute analysis results',
        error
      );
      throw error;
    }
  }

  /**
   * Process raw analysis result into comprehensive processed data
   */
  private async processAnalysisResult(
    result: AnalysisResult
  ): Promise<ProcessedAnalysisResult> {
    // Extract issues from XFI_RESULT
    const extractedIssues = this.extractIssuesFromResult(result);
    this.logger.debug(
      `Extracted ${extractedIssues.length} issues from XFI_RESULT`
    );

    // Process diagnostics with failure tracking
    const { diagnostics, processedIssues, failedIssues } =
      await this.convertToVSCodeDiagnostics(extractedIssues);

    this.logger.debug(`Converted to VSCode diagnostics`, {
      successful: processedIssues.length,
      failed: failedIssues.length,
      diagnosticFiles: diagnostics.size
    });

    // Calculate comprehensive statistics
    const issueBreakdown = this.calculateIssueBreakdown(
      processedIssues,
      failedIssues
    );

    return {
      totalIssues: processedIssues.length + failedIssues.length,
      successfulIssues: processedIssues.length,
      failedIssuesCount: failedIssues.length,
      issueBreakdown,
      diagnostics,
      processedIssues,
      failedIssues,
      metadata: result.metadata,
      timestamp: result.timestamp,
      duration: result.duration
    };
  }

  /**
   * Distribute processed results to all components directly
   */
  private async distributeToComponents(
    processed: ProcessedAnalysisResult,
    components: {
      diagnosticProvider: any;
      issuesTreeViewManager: any;
      statusBarProvider: any;
    }
  ): Promise<void> {
    this.logger.debug('Distributing processed results to components');

    try {
      // Update all components in parallel with the same data
      await Promise.all([
        this.updateDiagnosticProvider(processed, components.diagnosticProvider),
        this.updateIssuesTreeViewManager(
          processed,
          components.issuesTreeViewManager
        ),
        this.updateStatusBarProvider(processed, components.statusBarProvider)
      ]);

      this.logger.debug('All components updated successfully');
    } catch (error) {
      this.logger.error('Failed to update one or more components', error);
      throw error;
    }
  }

  /**
   * Update DiagnosticProvider with processed diagnostics
   */
  private async updateDiagnosticProvider(
    processed: ProcessedAnalysisResult,
    provider: any
  ): Promise<void> {
    try {
      if (typeof provider.updateFromProcessedResult === 'function') {
        await provider.updateFromProcessedResult(processed);
      } else {
        // Fallback to existing method if new one not implemented yet
        this.logger.warn(
          'DiagnosticProvider missing updateFromProcessedResult method, using fallback'
        );
        // We'll implement this fallback after updating the provider
      }
    } catch (error) {
      this.logger.error('Failed to update DiagnosticProvider', error);
      throw error;
    }
  }

  /**
   * Update IssuesTreeViewManager with all issues (successful + unhandled)
   */
  private updateIssuesTreeViewManager(
    processed: ProcessedAnalysisResult,
    manager: any
  ): void {
    try {
      if (typeof manager.updateFromProcessedResult === 'function') {
        manager.updateFromProcessedResult(processed);
      } else {
        this.logger.warn(
          'IssuesTreeViewManager missing updateFromProcessedResult method, using fallback'
        );
        // We'll implement this fallback after updating the manager
      }
    } catch (error) {
      this.logger.error('Failed to update IssuesTreeViewManager', error);
      throw error;
    }
  }

  /**
   * Update StatusBarProvider with consistent counts
   */
  private updateStatusBarProvider(
    processed: ProcessedAnalysisResult,
    provider: any
  ): void {
    try {
      if (typeof provider.updateFromProcessedResult === 'function') {
        provider.updateFromProcessedResult(processed);
      } else {
        this.logger.warn(
          'StatusBarProvider missing updateFromProcessedResult method, using fallback'
        );
        // We'll implement this fallback after updating the provider
      }
    } catch (error) {
      this.logger.error('Failed to update StatusBarProvider', error);
      throw error;
    }
  }

  /**
   * Extract issues from analysis result using proper ResultMetadata validation
   */
  private extractIssuesFromResult(result: AnalysisResult): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    try {
      // Type-safe validation of ResultMetadata structure
      const resultMetadata = this.validateAndExtractResultMetadata(result);

      if (!resultMetadata) {
        this.logger.warn('No valid ResultMetadata found in analysis result');
        return issues;
      }

      const xfiResult = resultMetadata.XFI_RESULT;

      this.logger.debug('Processing XFI_RESULT', {
        archetype: xfiResult.archetype,
        totalIssues: xfiResult.totalIssues,
        fileCount: xfiResult.fileCount,
        issueDetailsCount: xfiResult.issueDetails?.length || 0
      });

      // Process issue details using proper ScanResult type
      if (!xfiResult.issueDetails || !Array.isArray(xfiResult.issueDetails)) {
        this.logger.warn('Issue details is not a valid array');
        return issues;
      }

      // Convert ScanResult[] to DiagnosticIssue[]
      for (const scanResult of xfiResult.issueDetails) {
        if (!this.isValidScanResult(scanResult)) {
          this.logger.warn('Invalid ScanResult structure, skipping', {
            filePath: scanResult.filePath
          });
          continue;
        }

        const filePath = scanResult.filePath;

        for (const ruleFailure of scanResult.errors) {
          if (!this.isValidRuleFailure(ruleFailure)) {
            this.logger.warn('Invalid RuleFailure structure, skipping', {
              file: filePath,
              ruleFailure: ruleFailure.ruleFailure
            });
            continue;
          }

          // Use enhanced location extraction
          const locationResult =
            DiagnosticLocationExtractor.extractLocation(ruleFailure);
          const location = DiagnosticLocationExtractor.validateLocation(
            locationResult.location
          );

          // Extract clean message
          const rawMessage =
            ruleFailure.details?.message ||
            ruleFailure.message ||
            `Rule violation: ${ruleFailure.ruleFailure}`;
          let message = this.cleanMessage(rawMessage);

          // Enhance message for file-level rules
          if (location.source === 'file-level-rule') {
            const fileName = filePath.split('/').pop() || 'file';
            message = `${message} (affects entire ${fileName})`;
          }

          const diagnosticIssue: DiagnosticIssue = {
            file: filePath,
            line: Math.max(0, location.startLine - 1), // Convert 1-based to 0-based
            column: Math.max(0, location.startColumn - 1),
            endLine: Math.max(0, location.endLine - 1),
            endColumn: Math.max(0, location.endColumn - 1),
            message: message,
            severity: this.mapSeverity(ruleFailure.level),
            ruleId: ruleFailure.ruleFailure || 'unknown-rule',
            category: this.extractCategory(ruleFailure),
            code: ruleFailure.ruleFailure,
            source: 'X-Fidelity',
            rawError: ruleFailure // Pass raw error for dependency location extraction
          };

          issues.push(diagnosticIssue);
        }
      }

      this.logger.debug(
        `Successfully extracted ${issues.length} diagnostic issues`
      );
      return issues;
    } catch (error) {
      this.logger.error('Failed to extract issues from result', error);
      return issues;
    }
  }

  /**
   * Convert DiagnosticIssue[] to VSCode diagnostics with comprehensive failure tracking
   */
  private async convertToVSCodeDiagnostics(issues: DiagnosticIssue[]): Promise<{
    diagnostics: Map<string, vscode.Diagnostic[]>;
    processedIssues: ProcessedIssue[];
    failedIssues: FailedIssue[];
  }> {
    const diagnostics = new Map<string, vscode.Diagnostic[]>();
    const processedIssues: ProcessedIssue[] = [];
    const failedIssues: FailedIssue[] = [];

    for (const issue of issues) {
      try {
        // Resolve file path to URI
        const fileUri = await this.resolveFileUri(issue.file);
        if (!fileUri) {
          failedIssues.push({
            originalData: issue,
            filePath: issue.file,
            ruleId: issue.ruleId,
            message: issue.message,
            severity: issue.severity,
            failureReason: 'File URI resolution failed',
            category: issue.category
          });
          continue;
        }

        // Create VSCode diagnostic
        const diagnostic = this.createVSCodeDiagnostic(issue);
        const uriString = fileUri.toString();

        // Group diagnostics by file
        if (!diagnostics.has(uriString)) {
          diagnostics.set(uriString, []);
        }
        diagnostics.get(uriString)!.push(diagnostic);

        // Create processed issue for tree view with translated file source
        // For dependency issues, use manifest file location instead of README.md
        const isGlobalCheck = FileSourceTranslator.isGlobalCheck(issue.file);
        const depLocation = this.extractFirstDependencyLocation(issue.rawError);

        let displayFile: string;
        let displayLine: number;
        let displayColumn: number;

        if (isGlobalCheck && depLocation) {
          // Use the manifest file and location from the dependency
          displayFile = depLocation.manifestPath;
          displayLine = depLocation.lineNumber;
          displayColumn = depLocation.columnNumber;
        } else {
          displayFile = FileSourceTranslator.translateFileSourceForDisplay(
            issue.file
          );
          displayLine = issue.line + 1; // Convert back to 1-based for display
          displayColumn = issue.column + 1;
        }

        // Extract enhanced details for all issue types
        const enhancedDetails = this.extractEnhancedDetails(issue.rawError);

        const processedIssue: ProcessedIssue = {
          id: `${issue.file}-${issue.ruleId}-${issue.line}`,
          file: displayFile,
          rule: issue.ruleId,
          severity: this.mapSeverityToString(diagnostic.severity),
          message: issue.message,
          line: displayLine,
          column: displayColumn,
          category: issue.category || 'general',
          fixable: false, // TODO: Extract from issue metadata
          exempted: false, // TODO: Extract from issue metadata
          dateFound: Date.now(),
          isGlobalCheck,
          enhancedDetails
        };

        processedIssues.push(processedIssue);
      } catch (error) {
        failedIssues.push({
          originalData: issue,
          filePath: issue.file,
          ruleId: issue.ruleId,
          message: issue.message,
          severity: issue.severity,
          failureReason: `Diagnostic creation failed: ${error}`,
          rawError: error,
          category: issue.category
        });
      }
    }

    this.logger.debug('Diagnostic conversion completed', {
      successful: processedIssues.length,
      failed: failedIssues.length,
      diagnosticFiles: diagnostics.size
    });

    return { diagnostics, processedIssues, failedIssues };
  }

  /**
   * Calculate issue breakdown by severity including unhandled
   */
  private calculateIssueBreakdown(
    processedIssues: ProcessedIssue[],
    failedIssues: FailedIssue[]
  ): ProcessedAnalysisResult['issueBreakdown'] {
    const breakdown = {
      error: 0,
      warning: 0,
      info: 0,
      hint: 0,
      exempt: 0,
      unhandled: failedIssues.length
    };

    for (const issue of processedIssues) {
      switch (issue.severity.toLowerCase()) {
        case 'error':
          breakdown.error++;
          break;
        case 'warning':
          breakdown.warning++;
          break;
        case 'info':
          breakdown.info++;
          break;
        case 'hint':
          breakdown.hint++;
          break;
        case 'exempt':
          breakdown.exempt++;
          break;
      }
    }

    return breakdown;
  }

  /**
   * Log reconciliation between raw and processed results
   */
  private logReconciliation(
    processed: ProcessedAnalysisResult,
    rawResult: AnalysisResult
  ): void {
    const rawTotal = rawResult.summary?.totalIssues || 0;
    const processedTotal = processed.totalIssues;
    const difference = rawTotal - processedTotal;

    if (difference === 0) {
      this.logger.info(
        '✅ Perfect reconciliation: all issues processed successfully',
        {
          rawTotal,
          processedTotal,
          successful: processed.successfulIssues,
          failed: processed.failedIssuesCount
        }
      );
    } else {
      this.logger.warn('⚠️ Issue count discrepancy detected', {
        rawTotal,
        processedTotal,
        difference,
        successful: processed.successfulIssues,
        failed: processed.failedIssuesCount,
        breakdown: processed.issueBreakdown
      });
    }
  }

  // Helper methods (extracted from DiagnosticProvider)

  private validateAndExtractResultMetadata(
    result: AnalysisResult
  ): ResultMetadata | null {
    if (!result || typeof result !== 'object') {
      return null;
    }

    if (result.metadata?.XFI_RESULT) {
      return result.metadata as ResultMetadata;
    }

    if ((result as any).XFI_RESULT) {
      return { XFI_RESULT: (result as any).XFI_RESULT } as ResultMetadata;
    }

    return null;
  }

  private isValidScanResult(scanResult: any): boolean {
    return (
      scanResult &&
      typeof scanResult === 'object' &&
      typeof scanResult.filePath === 'string' &&
      Array.isArray(scanResult.errors)
    );
  }

  private isValidRuleFailure(ruleFailure: any): boolean {
    return (
      ruleFailure &&
      typeof ruleFailure === 'object' &&
      typeof ruleFailure.ruleFailure === 'string'
    );
  }

  private cleanMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'Unknown issue';
    }
    return message.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  }

  private mapSeverity(severity?: string): 'error' | 'warning' | 'info' {
    if (!severity) {
      return 'info';
    }

    const normalized = severity.toLowerCase().trim();
    if (
      ['error', 'critical', 'high', 'fatality', 'fatal'].includes(normalized)
    ) {
      return 'error';
    }
    if (['warning', 'warn', 'medium', 'moderate'].includes(normalized)) {
      return 'warning';
    }
    return 'info';
  }

  private mapSeverityToString(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'info';
    }
  }

  private extractCategory(ruleFailure: any): string {
    return ruleFailure?.category || ruleFailure?.details?.category || 'general';
  }

  /**
   * Extract the first dependency location from a rule failure's details
   * Used to get manifest file path and line number for dependency issues
   */
  private extractFirstDependencyLocation(ruleFailure: any): {
    manifestPath: string;
    lineNumber: number;
    columnNumber: number;
  } | null {
    if (!ruleFailure) {
      return null;
    }

    // Check for dependency details array
    const dependencyDetails = ruleFailure.details?.details;
    if (Array.isArray(dependencyDetails) && dependencyDetails.length > 0) {
      const firstDep = dependencyDetails.find(
        (dep: any) =>
          dep &&
          dep.location &&
          typeof dep.location.manifestPath === 'string' &&
          typeof dep.location.lineNumber === 'number'
      );

      if (firstDep?.location) {
        return {
          manifestPath: firstDep.location.manifestPath,
          lineNumber: firstDep.location.lineNumber,
          columnNumber: firstDep.location.columnNumber || 1
        };
      }
    }

    return null;
  }

  /**
   * Extract enhanced details from a rule failure for tooltips and commands
   * Coerces all issue types into a unified structure
   */
  private extractEnhancedDetails(
    ruleFailure: any
  ): EnhancedIssueDetails | undefined {
    if (!ruleFailure) {
      return undefined;
    }

    const ruleId = ruleFailure.ruleFailure || '';
    const details = ruleFailure.details;

    // Try to detect and extract dependency issues
    const dependencyItems = this.extractDependencyItems(details);
    if (dependencyItems.length > 0) {
      return {
        type: 'dependency',
        summary: `${dependencyItems.length} outdated dependenc${dependencyItems.length === 1 ? 'y' : 'ies'}`,
        actionable: true,
        items: dependencyItems,
        rawDetails: details
      };
    }

    // Try to detect and extract complexity issues
    const complexityItems = this.extractComplexityItems(details);
    if (complexityItems.length > 0) {
      return {
        type: 'complexity',
        summary: `${complexityItems.length} complex function${complexityItems.length === 1 ? '' : 's'}`,
        actionable: true,
        items: complexityItems,
        rawDetails: details
      };
    }

    // Try to detect and extract sensitive data issues
    const sensitiveItems = this.extractSensitiveDataItems(details, ruleId);
    if (sensitiveItems.length > 0) {
      return {
        type: 'sensitive-data',
        summary: `${sensitiveItems.length} sensitive data pattern${sensitiveItems.length === 1 ? '' : 's'}`,
        actionable: true,
        items: sensitiveItems,
        rawDetails: details
      };
    }

    // Try to detect and extract pattern match issues (database calls, etc.)
    const patternItems = this.extractPatternMatchItems(details, ruleId);
    if (patternItems.length > 0) {
      return {
        type: 'pattern-match',
        summary: `${patternItems.length} pattern match${patternItems.length === 1 ? '' : 'es'}`,
        actionable: true,
        items: patternItems,
        rawDetails: details
      };
    }

    // Try to detect validation issues (remote validation, etc.)
    const validationItems = this.extractValidationItems(details, ruleId);
    if (validationItems.length > 0) {
      return {
        type: 'validation',
        summary: `${validationItems.length} validation issue${validationItems.length === 1 ? '' : 's'}`,
        actionable: true,
        items: validationItems,
        rawDetails: details
      };
    }

    // Generic fallback - extract any structured data
    const genericItems = this.extractGenericItems(details);
    if (genericItems.length > 0) {
      return {
        type: 'generic',
        summary: `${genericItems.length} detail${genericItems.length === 1 ? '' : 's'}`,
        actionable: false,
        items: genericItems,
        rawDetails: details
      };
    }

    return undefined;
  }

  /**
   * Extract dependency items into unified structure
   */
  private extractDependencyItems(details: any): EnhancedIssueItem[] {
    const items: EnhancedIssueItem[] = [];
    const dependencyDetails = details?.details;

    if (Array.isArray(dependencyDetails)) {
      for (const dep of dependencyDetails) {
        if (dep?.dependency && dep?.location?.manifestPath) {
          items.push({
            label: dep.dependency,
            description: `${dep.currentVersion || 'unknown'} → ${dep.requiredVersion || 'unknown'}`,
            file: dep.location.manifestPath,
            line: dep.location.lineNumber,
            column: dep.location.columnNumber || 1,
            currentValue: dep.currentVersion,
            expectedValue: dep.requiredVersion,
            itemSeverity: dep.requiredVersion?.startsWith('>=')
              ? 'medium'
              : 'high',
            metadata: {
              section: dep.location.section,
              isTransitive: dep.isTransitive
            }
          });
        }
      }
    }

    return items;
  }

  /**
   * Extract complexity items into unified structure
   */
  private extractComplexityItems(details: any): EnhancedIssueItem[] {
    const items: EnhancedIssueItem[] = [];
    let complexities: any[] | undefined;

    if (
      details?.details?.complexities &&
      Array.isArray(details.details.complexities)
    ) {
      complexities = details.details.complexities;
    } else if (details?.complexities && Array.isArray(details.complexities)) {
      complexities = details.complexities;
    }

    if (complexities) {
      for (const c of complexities) {
        const metrics = c.metrics || c;
        const metricsObj: Record<string, number> = {};

        if (metrics.cyclomaticComplexity !== undefined) {
          metricsObj.cyclomatic = metrics.cyclomaticComplexity;
        }
        if (metrics.cognitiveComplexity !== undefined) {
          metricsObj.cognitive = metrics.cognitiveComplexity;
        }
        if (metrics.nestingDepth !== undefined) {
          metricsObj.nesting = metrics.nestingDepth;
        }
        if (metrics.parameterCount !== undefined) {
          metricsObj.parameters = metrics.parameterCount;
        }
        if (metrics.returnCount !== undefined) {
          metricsObj.returns = metrics.returnCount;
        }

        const severity = this.calculateComplexitySeverity(metrics);

        items.push({
          label: metrics.name || c.name || 'anonymous',
          description: this.formatComplexityDescription(metricsObj),
          line: metrics.location?.startLine || c.location?.startLine,
          itemSeverity: severity,
          metrics: metricsObj
        });
      }
    }

    return items;
  }

  /**
   * Extract sensitive data items into unified structure
   */
  private extractSensitiveDataItems(
    details: any,
    ruleId: string
  ): EnhancedIssueItem[] {
    const items: EnhancedIssueItem[] = [];

    if (
      !ruleId.includes('sensitive') &&
      !ruleId.includes('logging') &&
      !ruleId.includes('secret')
    ) {
      return items;
    }

    // Check for line/match data in details
    if (details?.line || details?.lineNumber) {
      items.push({
        label: details.pattern || details.match || 'Sensitive pattern',
        description: details.message || 'Potential sensitive data detected',
        line: details.line || details.lineNumber,
        itemSeverity: 'high',
        metadata: {
          pattern: details.pattern,
          match: details.match
        }
      });
    }

    // Check for matches array
    if (Array.isArray(details?.matches)) {
      for (const match of details.matches) {
        items.push({
          label: match.pattern || match.text || 'Pattern match',
          description: match.context || 'Sensitive data found',
          line: match.line || match.lineNumber,
          itemSeverity: 'high',
          metadata: { match }
        });
      }
    }

    return items;
  }

  /**
   * Extract pattern match items (database calls, etc.)
   */
  private extractPatternMatchItems(
    details: any,
    ruleId: string
  ): EnhancedIssueItem[] {
    const items: EnhancedIssueItem[] = [];

    if (
      !ruleId.includes('database') &&
      !ruleId.includes('pattern') &&
      !ruleId.includes('noDatabases')
    ) {
      return items;
    }

    if (details?.lineNumber || details?.line) {
      items.push({
        label: details.pattern || details.match || 'Pattern detected',
        description: details.message || 'Code pattern violation',
        line: details.line || details.lineNumber,
        itemSeverity: 'medium',
        metadata: {
          pattern: details.pattern,
          context: details.context
        }
      });
    }

    return items;
  }

  /**
   * Extract validation items (remote validation failures, etc.)
   */
  private extractValidationItems(
    details: any,
    ruleId: string
  ): EnhancedIssueItem[] {
    const items: EnhancedIssueItem[] = [];

    if (
      !ruleId.includes('validation') &&
      !ruleId.includes('invalid') &&
      !ruleId.includes('extracted')
    ) {
      return items;
    }

    // Check for validation results
    if (Array.isArray(details?.validationResults)) {
      for (const result of details.validationResults) {
        if (!result.valid) {
          items.push({
            label: result.value || result.key || 'Invalid value',
            description: result.reason || 'Validation failed',
            currentValue: result.value,
            expectedValue: result.expected,
            itemSeverity: 'high',
            metadata: { result }
          });
        }
      }
    }

    // Check for extracted values that failed
    if (Array.isArray(details?.extractedValues)) {
      for (const value of details.extractedValues) {
        items.push({
          label: value.key || value.path || 'Extracted value',
          description: value.message || 'Validation issue',
          currentValue: value.value,
          itemSeverity: 'medium',
          metadata: { value }
        });
      }
    }

    return items;
  }

  /**
   * Extract generic items from any structured details
   */
  private extractGenericItems(details: any): EnhancedIssueItem[] {
    const items: EnhancedIssueItem[] = [];

    if (!details) {
      return items;
    }

    // Try to extract any array of objects
    const detailsArray = details?.details;
    if (Array.isArray(detailsArray)) {
      for (const item of detailsArray.slice(0, 10)) {
        // Limit to 10 items
        if (typeof item === 'object' && item !== null) {
          const label =
            item.name ||
            item.id ||
            item.key ||
            item.label ||
            Object.keys(item)[0] ||
            'Detail';
          items.push({
            label: String(label),
            description:
              item.description ||
              item.message ||
              item.value ||
              JSON.stringify(item).slice(0, 100),
            line: item.line || item.lineNumber,
            metadata: item
          });
        }
      }
    }

    return items;
  }

  /**
   * Calculate severity based on complexity metrics
   */
  private calculateComplexitySeverity(metrics: any): 'high' | 'medium' | 'low' {
    const cyclo = metrics.cyclomaticComplexity || 0;
    const cognitive = metrics.cognitiveComplexity || 0;
    const nesting = metrics.nestingDepth || 0;

    if (cyclo > 50 || cognitive > 100 || nesting > 10) {
      return 'high';
    }
    if (cyclo > 25 || cognitive > 50 || nesting > 6) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Format complexity metrics for display
   */
  private formatComplexityDescription(metrics: Record<string, number>): string {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(metrics)) {
      if (value !== undefined) {
        parts.push(`${key}: ${value}`);
      }
    }
    return parts.join(', ') || 'Complex function';
  }

  private async resolveFileUri(filePath: string): Promise<vscode.Uri | null> {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return null;
      }

      // Use the centralized file source translator for consistent handling
      return await FileSourceTranslator.resolveFileUri(filePath);
    } catch (error) {
      this.logger.debug('Failed to resolve file URI', { filePath, error });
      return null;
    }
  }

  private createVSCodeDiagnostic(issue: DiagnosticIssue): vscode.Diagnostic {
    const rawStartLine = Math.max(0, issue.line);
    const rawStartColumn = Math.max(0, issue.column);
    const rawEndLine =
      issue.endLine !== undefined ? Math.max(0, issue.endLine) : rawStartLine;
    const rawEndColumn =
      issue.endColumn !== undefined
        ? Math.max(0, issue.endColumn)
        : rawStartColumn + 1;

    // Safe range validation that prevents invalid ranges exceeding line boundaries
    const validatedRange = validateRange(
      rawStartLine,
      rawStartColumn,
      rawEndLine,
      rawEndColumn,
      undefined, // No document access in this context for performance
      { preserveZeroWidth: true, fallbackExpansion: 1 }
    );

    const range = new vscode.Range(
      validatedRange.startLine,
      validatedRange.startColumn,
      validatedRange.endLine,
      validatedRange.endColumn
    );
    const diagnostic = new vscode.Diagnostic(
      range,
      issue.message,
      this.mapToVSCodeSeverity(issue.severity)
    );

    diagnostic.source = issue.source || 'X-Fidelity';
    diagnostic.code = issue.code || issue.ruleId;

    return diagnostic;
  }

  private mapToVSCodeSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}
