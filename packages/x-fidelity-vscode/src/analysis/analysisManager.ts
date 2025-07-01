import * as vscode from 'vscode';
import * as path from 'path';
import { analyzeCodebase } from '@x-fidelity/core';
import { ConfigManager } from '../configuration/configManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import {
  getWorkspaceFolder,
  getAnalysisTargetDirectory
} from '../utils/workspaceUtils';
import type { AnalysisResult, ResultMetadata } from './types';

// Simplified analysis state
type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class AnalysisManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private analysisTimeout?: NodeJS.Timeout;
  private periodicTimer?: NodeJS.Timeout;
  private cancellationToken?: vscode.CancellationTokenSource;
  private logger: VSCodeLogger;
  private lastAnalysisResult: AnalysisResult | null = null;
  private currentState: SimpleAnalysisState = 'idle';
  private stateChangeTimeout?: NodeJS.Timeout;

  // PERFORMANCE FIX: Global analysis lock to prevent concurrent execution
  private static globalAnalysisLock = false;
  private static pendingAnalysisQueue: Array<() => Promise<void>> = [];

  // Simplified event emitters
  private readonly onAnalysisStateChanged =
    new vscode.EventEmitter<SimpleAnalysisState>();
  private readonly onAnalysisComplete =
    new vscode.EventEmitter<AnalysisResult>();

  // Performance tracking
  private performanceMetrics = {
    lastAnalysisDuration: 0,
    averageAnalysisDuration: 0,
    totalAnalyses: 0,
    cacheHits: 0
  };

  constructor(private configManager: ConfigManager) {
    this.logger = new VSCodeLogger('X-Fidelity Analysis');
    this.setupEventListeners();
  }

  get onDidAnalysisStateChange(): vscode.Event<SimpleAnalysisState> {
    return this.onAnalysisStateChanged.event;
  }

  get onDidAnalysisComplete(): vscode.Event<AnalysisResult> {
    return this.onAnalysisComplete.event;
  }

  get isAnalysisRunning(): boolean {
    return this.isAnalyzing;
  }

  getCurrentResults(): AnalysisResult | null {
    return this.lastAnalysisResult;
  }

  getLogger(): VSCodeLogger {
    return this.logger;
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  private emitStateChange(newState: SimpleAnalysisState): void {
    if (this.currentState === newState) {
      return; // Prevent duplicate state changes
    }

    this.currentState = newState;

    // Debounce state changes to prevent rapid firing
    if (this.stateChangeTimeout) {
      clearTimeout(this.stateChangeTimeout);
    }

    this.stateChangeTimeout = setTimeout(() => {
      try {
        this.onAnalysisStateChanged.fire(newState);
      } catch (error) {
        this.logger.error('Error emitting state change:', error);
      }
    }, 10); // Small delay to prevent infinite loops
  }

  async cancelAnalysis(): Promise<void> {
    if (!this.isAnalyzing || !this.cancellationToken) {
      this.logger.info('No analysis to cancel');
      return;
    }

    this.logger.info('Cancelling analysis...');
    this.cancellationToken.cancel();
    this.emitStateChange('idle');
    vscode.window.showInformationMessage('Analysis cancelled');
  }

  async runAnalysis(options?: {
    forceRefresh?: boolean;
  }): Promise<AnalysisResult | null> {
    // PERFORMANCE FIX: Strict concurrency control
    if (this.isAnalyzing) {
      this.logger.warn('Analysis already in progress');
      vscode.window.showInformationMessage('Analysis already in progress...');
      return null;
    }

    // PERFORMANCE FIX: Global lock to prevent ANY concurrent analysis
    if (AnalysisManager.globalAnalysisLock) {
      this.logger.warn('Another analysis is running globally, skipping');
      vscode.window.showWarningMessage(
        'Another analysis is currently running. Please wait...'
      );
      return null;
    }

    // PERFORMANCE FIX: Set global lock immediately
    AnalysisManager.globalAnalysisLock = true;

    const startTime = performance.now();
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      const config = this.configManager.getConfig();
      const analysisTargetPath = getAnalysisTargetDirectory();

      if (!analysisTargetPath) {
        this.logger.error('No valid analysis target found');
        vscode.window.showErrorMessage('No workspace or analysis target found');
        return null;
      }

      const workspaceFolder = getWorkspaceFolder();
      const workspaceName =
        workspaceFolder?.name || path.basename(analysisTargetPath);

      // Set up cancellation
      this.cancellationToken = new vscode.CancellationTokenSource();
      timeoutHandle = setTimeout(() => {
        this.logger.warn('Analysis timeout reached');
        this.cancellationToken?.cancel();
      }, config.analysisTimeout);

      this.isAnalyzing = true;
      this.emitStateChange('analyzing');

      this.logger.info('Starting OPTIMIZED analysis', {
        analysisTargetPath,
        workspaceName,
        archetype: config.archetype,
        forceRefresh: options?.forceRefresh,
        globalLock: true
      });

      // PERFORMANCE FIX: Simplified progress, no complex UI updates
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window, // Use window instead of notification for less overhead
          title: 'X-Fidelity Analysis',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({ message: 'Analyzing...', increment: 20 });

          // Check for cancellation
          if (
            this.cancellationToken?.token.isCancellationRequested ||
            token.isCancellationRequested
          ) {
            throw new vscode.CancellationError();
          }

          // PERFORMANCE FIX: Run core analysis with minimal overhead
          progress.report({
            message: 'Running core analysis...',
            increment: 50
          });

          const analysisResult = await analyzeCodebase({
            repoPath: analysisTargetPath,
            archetype: config.archetype,
            configServer: this.getValidConfigServer(config.configServer),
            localConfigPath: this.configManager.getResolvedLocalConfigPath()
          });

          progress.report({ message: 'Completed', increment: 100 });
          return analysisResult;
        }
      );

      // PERFORMANCE FIX: Optimized diagnostic conversion
      const diagnostics = this.convertToDiagnosticsOptimized(result);
      const duration = performance.now() - startTime;

      const analysisResult: AnalysisResult = {
        metadata: result,
        diagnostics,
        timestamp: Date.now(),
        duration,
        summary: {
          totalIssues: result.XFI_RESULT.totalIssues,
          filesAnalyzed: result.XFI_RESULT.fileCount,
          analysisTimeMs: duration,
          issuesByLevel: this.calculateIssuesByLevel(result)
        }
      };

      // Update performance metrics
      this.updatePerformanceMetrics(duration);

      this.logger.info('OPTIMIZED Analysis completed successfully', {
        duration,
        totalIssues: result.XFI_RESULT.totalIssues,
        filesAnalyzed: result.XFI_RESULT.fileCount,
        optimized: true
      });

      // PERFORMANCE FIX: Skip report generation by default (disabled in config)
      // Reports are now disabled by default for performance

      this.emitStateChange('complete');
      this.lastAnalysisResult = analysisResult;
      this.onAnalysisComplete.fire(analysisResult);

      vscode.window.showInformationMessage(
        `✅ Analysis complete: ${result.XFI_RESULT.totalIssues} issues (${Math.round(duration)}ms)`
      );

      return analysisResult;
    } catch (error) {
      const duration = performance.now() - startTime;

      if (this.cancellationToken?.token.isCancellationRequested) {
        this.logger.info('Analysis cancelled by user', { duration });
        this.emitStateChange('idle');
        return null;
      }

      const analysisError =
        error instanceof Error ? error : new Error(String(error));
      this.logger.error('OPTIMIZED Analysis failed', {
        error: analysisError.message,
        duration,
        analysisTargetPath: getAnalysisTargetDirectory(),
        workspaceName: getWorkspaceFolder()?.name
      });

      this.emitStateChange('error');
      vscode.window.showErrorMessage(
        `Analysis failed: ${analysisError.message}`
      );
      return null;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      this.isAnalyzing = false;
      this.cancellationToken?.dispose();
      this.cancellationToken = undefined;

      // PERFORMANCE FIX: Always release global lock
      AnalysisManager.globalAnalysisLock = false;
    }
  }

  scheduleAnalysis(delay: number = 1000): void {
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }

    this.analysisTimeout = setTimeout(() => {
      if (!this.isAnalyzing) {
        this.runAnalysis();
      }
    }, delay);
  }

  startPeriodicAnalysis(): void {
    const config = this.configManager.getConfig();
    this.stopPeriodicAnalysis();

    if (config.runInterval > 0) {
      const minInterval = 60; // Minimum 1 minute
      const actualInterval = Math.max(config.runInterval, minInterval);

      this.periodicTimer = setInterval(() => {
        if (!this.isAnalyzing) {
          this.logger.info('Running periodic analysis...');
          this.runAnalysis();
        }
      }, actualInterval * 1000);

      this.logger.info(
        `Periodic analysis started with interval: ${actualInterval}s`
      );
    }
  }

  stopPeriodicAnalysis(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = undefined;
    }
  }

  private setupEventListeners(): void {
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.startPeriodicAnalysis();
      })
    );
  }

  private getValidConfigServer(configServer?: string): string | undefined {
    return configServer?.trim() &&
      (configServer.startsWith('http://') ||
        configServer.startsWith('https://'))
      ? configServer
      : undefined;
  }

  // PERFORMANCE FIX: Optimized diagnostic conversion with reduced overhead
  private convertToDiagnosticsOptimized(
    result: ResultMetadata
  ): Map<string, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();
    const workspaceFolder = getWorkspaceFolder();
    const workspacePath = workspaceFolder?.uri.fsPath;

    // PERFORMANCE FIX: Batch process diagnostics more efficiently
    const issuesByFile = new Map<string, any[]>();

    // First pass: group by file to reduce map operations
    for (const detail of result.XFI_RESULT.issueDetails) {
      const existing = issuesByFile.get(detail.filePath) || [];
      existing.push(
        ...detail.errors.map(error => ({ ...error, filePath: detail.filePath }))
      );
      issuesByFile.set(detail.filePath, existing);
    }

    // Second pass: convert to diagnostics efficiently
    for (const [filePath, errors] of issuesByFile) {
      const diagnostics: vscode.Diagnostic[] = errors.map(error => {
        const range = this.parseLineColumnInfoOptimized(error.details);
        const diagnostic = new vscode.Diagnostic(
          range,
          error.details?.message || error.ruleFailure,
          this.mapErrorLevelToSeverity(error.level || 'warning')
        );

        diagnostic.source = 'X-Fidelity';
        diagnostic.code = error.ruleFailure;
        return diagnostic;
      });

      if (diagnostics.length > 0) {
        let normalizedPath = filePath;

        // Handle global issues
        if (filePath === 'REPO_GLOBAL_CHECK') {
          normalizedPath = 'README.md';
        } else if (workspacePath && filePath.startsWith(workspacePath)) {
          normalizedPath = path.relative(workspacePath, filePath);
        } else if (path.isAbsolute(filePath)) {
          const analysisTargetPath = getAnalysisTargetDirectory();
          if (analysisTargetPath && filePath.startsWith(analysisTargetPath)) {
            normalizedPath = path.relative(analysisTargetPath, filePath);
          } else {
            normalizedPath = path.basename(filePath);
          }
        }

        diagnosticsMap.set(normalizedPath, diagnostics);
      }
    }

    return diagnosticsMap;
  }

  // PERFORMANCE FIX: Optimized line/column parsing
  private parseLineColumnInfoOptimized(details: any): vscode.Range {
    if (details?.range?.start) {
      const startLine = Math.max(0, details.range.start.line - 1);
      const startCol = Math.max(0, details.range.start.column - 1);
      const endLine = details.range.end
        ? Math.max(0, details.range.end.line - 1)
        : startLine;
      const endCol = details.range.end
        ? Math.max(0, details.range.end.column - 1)
        : startCol + 1;
      return new vscode.Range(startLine, startCol, endLine, endCol);
    }

    if (details?.position) {
      const line = Math.max(0, details.position.line - 1);
      const col = Math.max(0, details.position.column - 1);
      return new vscode.Range(line, col, line, col + 1);
    }

    if (details?.lineNumber && details.lineNumber > 0) {
      const line = details.lineNumber - 1;
      const col = details.columnNumber ? details.columnNumber - 1 : 0;
      return new vscode.Range(line, col, line, col + 1);
    }

    return new vscode.Range(0, 0, 0, 1);
  }

  private mapErrorLevelToSeverity(level: string): vscode.DiagnosticSeverity {
    switch (level) {
      case 'fatal':
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  private calculateIssuesByLevel(
    result: ResultMetadata
  ): Record<string, number> {
    const issuesByLevel: Record<string, number> = {};

    for (const detail of result.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        const level = error.level || 'unknown';
        issuesByLevel[level] = (issuesByLevel[level] || 0) + 1;
      }
    }

    return issuesByLevel;
  }

  private updatePerformanceMetrics(duration: number): void {
    this.performanceMetrics.lastAnalysisDuration = duration;
    this.performanceMetrics.totalAnalyses++;

    // Calculate running average
    const prevAvg = this.performanceMetrics.averageAnalysisDuration;
    const count = this.performanceMetrics.totalAnalyses;
    this.performanceMetrics.averageAnalysisDuration =
      (prevAvg * (count - 1) + duration) / count;

    // Log performance warnings
    if (duration > 10000) {
      this.logger.warn('Slow analysis detected', { duration });
    }
  }

  private async generateReportsAsync(
    result: ResultMetadata,
    workspacePath: string
  ): Promise<void> {
    try {
      // Simple report generation without heavy dependencies
      const reportDir = path.join(workspacePath, '.xfiResults');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(reportDir, `xfi-report-${timestamp}.json`);

      // Ensure directory exists
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(reportDir));

      // Write simple JSON report
      const reportData = JSON.stringify(result, null, 2);
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(reportPath),
        Buffer.from(reportData, 'utf8')
      );

      this.logger.info('Report generated', { reportPath });
    } catch (error) {
      this.logger.error('Failed to generate report:', error);
    }
  }

  dispose(): void {
    this.stopPeriodicAnalysis();
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }
    if (this.stateChangeTimeout) {
      clearTimeout(this.stateChangeTimeout);
    }
    this.disposables.forEach(d => d.dispose());
    this.onAnalysisStateChanged.dispose();
    this.onAnalysisComplete.dispose();
  }
}
