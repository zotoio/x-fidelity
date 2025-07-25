import * as vscode from 'vscode';
import * as path from 'path';
import type { AnalysisResult } from '../analysis/types';
import type {
  ProcessedAnalysisResult,
  ProcessedIssue,
  FailedIssue
} from '../types/issues';
import type { ResultMetadata } from '@x-fidelity/types';
import { DiagnosticLocationExtractor } from '../utils/diagnosticLocationExtractor';
import { createComponentLogger } from '../utils/globalLogger';

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
}

/**
 * ResultCoordinator - Central processor for analysis results
 *
 * This class eliminates the counting discrepancy by:
 * 1. Processing analysis results once, comprehensively
 * 2. Distributing identical processed data to all components
 * 3. Tracking both successful and failed diagnostic conversions
 * 4. Ensuring all UI components show consistent counts
 */
export class ResultCoordinator implements vscode.Disposable {
  private logger: any;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.logger = createComponentLogger('ResultCoordinator');
    this.logger.info('ResultCoordinator initialized');
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

      // 3. Log final reconciliation
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
            source: 'X-Fidelity'
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

        // Create processed issue for tree view
        const processedIssue: ProcessedIssue = {
          id: `${issue.file}-${issue.ruleId}-${issue.line}`,
          file: vscode.workspace.asRelativePath(fileUri),
          rule: issue.ruleId,
          severity: this.mapSeverityToString(diagnostic.severity),
          message: issue.message,
          line: issue.line + 1, // Convert back to 1-based for display
          column: issue.column + 1,
          category: issue.category || 'general',
          fixable: false, // TODO: Extract from issue metadata
          exempted: false, // TODO: Extract from issue metadata
          dateFound: Date.now()
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

  private async resolveFileUri(filePath: string): Promise<vscode.Uri | null> {
    try {
      if (!filePath || typeof filePath !== 'string') {
        return null;
      }

      // Handle special global check files
      if (
        filePath === 'REPO_GLOBAL_CHECK' ||
        filePath.endsWith('REPO_GLOBAL_CHECK')
      ) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          return null;
        }
        return workspaceFolder.uri;
      }

      // Handle absolute paths
      if (path.isAbsolute(filePath)) {
        return vscode.Uri.file(filePath);
      }

      // Handle relative paths
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return null;
      }

      const absolutePath = path.resolve(workspaceFolder.uri.fsPath, filePath);
      return vscode.Uri.file(absolutePath);
    } catch (error) {
      this.logger.debug('Failed to resolve file URI', { filePath, error });
      return null;
    }
  }

  private createVSCodeDiagnostic(issue: DiagnosticIssue): vscode.Diagnostic {
    const startLine = Math.max(0, issue.line);
    const startColumn = Math.max(0, issue.column);
    let endLine =
      issue.endLine !== undefined ? Math.max(0, issue.endLine) : startLine;
    let endColumn =
      issue.endColumn !== undefined
        ? Math.max(0, issue.endColumn)
        : startColumn + 1;

    if (endLine < startLine) {
      endLine = startLine;
    }
    if (endLine === startLine && endColumn <= startColumn) {
      endColumn = startColumn + 1;
    }

    // Additional validation to prevent zero-width ranges that would fail integration tests
    if (endLine === startLine && endColumn === startColumn) {
      endColumn = startColumn + 1;
    }

    const range = new vscode.Range(startLine, startColumn, endLine, endColumn);
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
