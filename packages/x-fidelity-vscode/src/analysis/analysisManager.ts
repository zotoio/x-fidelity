import * as vscode from 'vscode';
import * as path from 'path';
import { analyzeCodebase } from '@x-fidelity/core';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { VSCodeLogger } from '../utils/vscodeLogger';
import {
  getWorkspaceFolder,
  getAnalysisTargetDirectory
} from '../utils/workspaceUtils';
import {
  createComponentLogger,
  logCommandStart,
  logCommandSuccess,
  logCommandError
} from '../utils/globalLogger';
import type { AnalysisResult, ResultMetadata } from './types';
import type { IExtensionAnalysisEngine } from './analysisEngineInterface';

// Simplified analysis state
type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class AnalysisManager implements IExtensionAnalysisEngine {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private analysisTimeout?: NodeJS.Timeout;
  private periodicTimer?: NodeJS.Timeout;
  private cancellationToken?: vscode.CancellationTokenSource;
  private logger: VSCodeLogger;
  private globalLogger: ReturnType<typeof createComponentLogger>;
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

  constructor(
    private configManager: ConfigManager,
    private diagnosticProvider: DiagnosticProvider
  ) {
    this.logger = new VSCodeLogger('X-Fidelity Analysis');
    this.globalLogger = createComponentLogger('Extension Analysis');
    this.setupEventListeners();
  }

  get onDidAnalysisStateChange(): vscode.Event<SimpleAnalysisState> {
    return this.onAnalysisStateChanged.event;
  }

  get onDidAnalysisComplete(): vscode.Event<AnalysisResult> {
    return this.onAnalysisComplete.event;
  }

  // New interface compatibility events
  get onStateChanged(): vscode.Event<SimpleAnalysisState> {
    return this.onAnalysisStateChanged.event;
  }

  get onComplete(): vscode.Event<AnalysisResult> {
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

    // Log analysis start to message channel
    logCommandStart('xfidelity.runAnalysis', 'Extension Analysis');
    this.globalLogger.info('🚀 Starting extension analysis...');

    try {
      const config = this.configManager.getConfig();
      const analysisTargetPath = getAnalysisTargetDirectory();

      if (!analysisTargetPath) {
        this.logger.error('No valid analysis target found');
        this.globalLogger.error('❌ No workspace or analysis target found');
        vscode.window.showErrorMessage('No workspace or analysis target found');
        return null;
      }

      const workspaceFolder = getWorkspaceFolder();
      const workspaceName =
        workspaceFolder?.name || path.basename(analysisTargetPath);

      this.globalLogger.info(`📁 Analysis target: ${analysisTargetPath}`);
      this.globalLogger.info(`🎯 Archetype: ${config.archetype}`);

      // Set up cancellation
      this.cancellationToken = new vscode.CancellationTokenSource();
      timeoutHandle = setTimeout(() => {
        this.logger.warn('Analysis timeout reached');
        this.globalLogger.warn('⏱️ Analysis timeout reached');
        this.cancellationToken?.cancel();
      }, config.analysisTimeout);

      this.isAnalyzing = true;
      this.emitStateChange('analyzing');

      this.logger.info('Starting analysis', {
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
          this.globalLogger.info('⚡ Initializing analysis engine...');

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
          this.globalLogger.info('🔍 Running core analysis...');

          const analysisResult = await analyzeCodebase({
            repoPath: analysisTargetPath,
            archetype: config.archetype,
            configServer: this.getValidConfigServer(config.configServer),
            localConfigPath: this.configManager.getResolvedLocalConfigPath(),
            logger: this.globalLogger
          });

          progress.report({ message: 'Completed', increment: 100 });
          this.globalLogger.info('✅ Core analysis completed');
          return analysisResult;
        }
      );

      // Update diagnostics through centralized provider
      this.globalLogger.info('📝 Updating diagnostics...');
      await this.diagnosticProvider.updateDiagnostics(result);

      // Get diagnostics from provider for consistent data
      const diagnostics = this.diagnosticProvider.getAllDiagnostics();
      const diagnosticsMap = new Map(
        diagnostics.map(([uri, diags]) => [uri.fsPath, diags])
      );

      const duration = performance.now() - startTime;

      const analysisResult: AnalysisResult = {
        metadata: result,
        diagnostics: diagnosticsMap,
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

      // Log success to message channel
      logCommandSuccess(
        'xfidelity.runAnalysis',
        'Extension Analysis',
        duration
      );
      this.globalLogger.info(
        `✅ Extension analysis completed successfully in ${Math.round(duration)}ms`
      );
      this.globalLogger.info(
        `📊 Analysis results: ${result.XFI_RESULT.totalIssues} issues found across ${result.XFI_RESULT.fileCount} files`
      );

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
        this.globalLogger.info('⏹️ Analysis was cancelled by user');
        this.emitStateChange('idle');
        return null;
      }

      const analysisError =
        error instanceof Error ? error : new Error(String(error));

      // Log error to message channel
      logCommandError(
        'xfidelity.runAnalysis',
        'Extension Analysis',
        error,
        duration
      );
      this.globalLogger.error(
        `❌ Extension analysis failed: ${analysisError.message}`
      );

      this.emitStateChange('error');
      vscode.window.showErrorMessage(
        `Analysis failed: ${analysisError.message}`
      );
      return null;
    } finally {
      // PERFORMANCE FIX: Always release global lock
      AnalysisManager.globalAnalysisLock = false;
      this.isAnalyzing = false;
      this.cancellationToken?.dispose();
      this.cancellationToken = undefined;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
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

  async startPeriodicAnalysis(): Promise<void> {
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
