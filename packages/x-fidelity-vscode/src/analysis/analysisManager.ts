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
    if (this.isAnalyzing) {
      this.logger.warn('Analysis already in progress');
      vscode.window.showInformationMessage('Analysis already in progress...');
      return null;
    }

    const startTime = performance.now();
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
    const timeoutHandle = setTimeout(() => {
      this.logger.warn('Analysis timeout reached');
      this.cancellationToken?.cancel();
    }, config.analysisTimeout);

    this.isAnalyzing = true;
    this.emitStateChange('analyzing');

    this.logger.info('Starting analysis', {
      analysisTargetPath,
      workspaceName,
      archetype: config.archetype,
      forceRefresh: options?.forceRefresh
    });

    try {
      // Show simplified progress
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'X-Fidelity Analysis',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({ message: 'Analyzing code...', increment: 50 });

          // Check for cancellation
          if (
            this.cancellationToken?.token.isCancellationRequested ||
            token.isCancellationRequested
          ) {
            throw new vscode.CancellationError();
          }

          // Run core analysis
          const analysisResult = await analyzeCodebase({
            repoPath: analysisTargetPath,
            archetype: config.archetype,
            configServer: this.getValidConfigServer(config.configServer),
            localConfigPath: this.configManager.getResolvedLocalConfigPath()
          });

          progress.report({ message: 'Processing results...', increment: 100 });
          return analysisResult;
        }
      );

      // Convert to diagnostics efficiently
      const diagnostics = this.convertToDiagnostics(result);
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

      this.logger.info('Analysis completed successfully', {
        duration,
        totalIssues: result.XFI_RESULT.totalIssues,
        filesAnalyzed: result.XFI_RESULT.fileCount
      });

      // Generate reports asynchronously (don't wait)
      if (config.generateReports) {
        this.generateReportsAsync(result, analysisTargetPath).catch(error => {
          this.logger.warn('Report generation failed:', error);
        });
      }

      this.emitStateChange('complete');
      this.lastAnalysisResult = analysisResult;
      this.onAnalysisComplete.fire(analysisResult);

      vscode.window.showInformationMessage(
        `Analysis complete: Found ${result.XFI_RESULT.totalIssues} issues`
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
      this.logger.error('Analysis failed', {
        error: analysisError.message,
        duration,
        analysisTargetPath,
        workspaceName
      });

      this.emitStateChange('error');
      vscode.window.showErrorMessage(
        `Analysis failed: ${analysisError.message}`
      );
      return null;
    } finally {
      clearTimeout(timeoutHandle);
      this.isAnalyzing = false;
      this.cancellationToken?.dispose();
      this.cancellationToken = undefined;
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

  private convertToDiagnostics(
    result: ResultMetadata
  ): Map<string, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();
    const workspaceFolder = getWorkspaceFolder();
    const workspacePath = workspaceFolder?.uri.fsPath;

    for (const detail of result.XFI_RESULT.issueDetails) {
      const diagnostics: vscode.Diagnostic[] = detail.errors.map(error => {
        const range = this.parseLineColumnInfo(error.details);
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
        let filePath = detail.filePath;

        // Handle global issues
        if (filePath === 'REPO_GLOBAL_CHECK') {
          filePath = 'README.md';
        } else if (workspacePath && filePath.startsWith(workspacePath)) {
          filePath = path.relative(workspacePath, filePath);
        } else if (path.isAbsolute(filePath)) {
          const analysisTargetPath = getAnalysisTargetDirectory();
          if (analysisTargetPath && filePath.startsWith(analysisTargetPath)) {
            filePath = path.relative(analysisTargetPath, filePath);
          } else {
            filePath = path.basename(filePath);
          }
        }

        diagnosticsMap.set(filePath, diagnostics);
      }
    }

    return diagnosticsMap;
  }

  private parseLineColumnInfo(details: any): vscode.Range {
    let line = 0,
      column = 0,
      endLine = 0,
      endColumn = 0;

    // Enhanced position data with range
    if (details?.range?.start) {
      line = Math.max(0, details.range.start.line - 1);
      column = Math.max(0, details.range.start.column - 1);

      if (details.range.end) {
        endLine = Math.max(0, details.range.end.line - 1);
        endColumn = Math.max(0, details.range.end.column - 1);
      } else {
        endLine = line;
        endColumn = column + 1;
      }
    }
    // Enhanced position data
    else if (details?.position) {
      line = Math.max(0, details.position.line - 1);
      column = Math.max(0, details.position.column - 1);
      endLine = line;
      endColumn = column + 1;
    }
    // Legacy position fields
    else if (details?.lineNumber && details.lineNumber > 0) {
      line = details.lineNumber - 1;
      endLine = line;
      column = details.columnNumber ? details.columnNumber - 1 : 0;
      endColumn = column + 1;
    }

    return new vscode.Range(line, column, endLine, endColumn);
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
