import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { VSCodeLogger } from '../utils/vscodeLogger';
import {
  createComponentLogger,
  logCommandStart,
  logCommandSuccess,
  logCommandError
} from '../utils/globalLogger';
import { getAnalysisTargetDirectory } from '../utils/workspaceUtils';
import { createCLISpawner, CLISpawner } from '../utils/cliSpawner';
import type { AnalysisResult } from './types';
import type { IAnalysisEngine } from './analysisEngineInterface';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class CLIAnalysisManager implements IAnalysisEngine {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private cancellationToken?: vscode.CancellationTokenSource;
  private logger: VSCodeLogger;
  private globalLogger: VSCodeLogger;
  private lastAnalysisResult: AnalysisResult | null = null;
  private currentState: SimpleAnalysisState = 'idle';
  private cliSpawner!: CLISpawner;

  private performanceMetrics = {
    lastAnalysisDuration: 0,
    totalAnalyses: 0,
    averageAnalysisDuration: 0
  };

  private readonly onAnalysisStateChanged =
    new vscode.EventEmitter<SimpleAnalysisState>();
  private readonly onAnalysisComplete =
    new vscode.EventEmitter<AnalysisResult>();

  constructor(
    private configManager: ConfigManager,
    private diagnosticProvider: DiagnosticProvider
  ) {
    this.logger = new VSCodeLogger('CLI Analysis');
    this.globalLogger = createComponentLogger('CLI Analysis');
    this.initializeCLISpawner();
    this.setupEventListeners();
  }

  private initializeCLISpawner(): void {
    try {
      const config = this.configManager.getConfig();
      this.cliSpawner = createCLISpawner(
        config.cliSource,
        config.cliBinaryPath || undefined
      );
      this.globalLogger.debug('✅ CLI Spawner initialized successfully');
    } catch (error) {
      this.globalLogger.error('❌ Failed to initialize CLI Spawner:', error);
      // Create a fallback CLI spawner with default settings
      this.cliSpawner = createCLISpawner('bundled');
      this.globalLogger.info(
        '⚠️ Using fallback CLI spawner with bundled configuration'
      );
    }
  }

  // Public API
  get isAnalysisRunning(): boolean {
    return this.isAnalyzing;
  }

  get onStateChanged(): vscode.Event<SimpleAnalysisState> {
    return this.onAnalysisStateChanged.event;
  }

  get onComplete(): vscode.Event<AnalysisResult> {
    return this.onAnalysisComplete.event;
  }

  getLogger(): VSCodeLogger {
    return this.logger;
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  getCurrentResults(): AnalysisResult | null {
    return this.lastAnalysisResult;
  }

  /**
   * Alias for getCurrentResults() (for test compatibility)
   */
  getLastResult(): AnalysisResult | null {
    return this.getCurrentResults();
  }

  /**
   * Run analysis using CLI spawner
   */
  async runAnalysis(_options?: {
    forceRefresh?: boolean;
  }): Promise<AnalysisResult | null> {
    if (this.isAnalyzing) {
      this.logger.warn('Analysis already in progress, skipping...');
      return null;
    }

    const startTime = performance.now();
    this.setState('analyzing');
    this.isAnalyzing = true;

    // Log analysis start
    logCommandStart('xfidelity.runAnalysis', 'CLI Analysis');
    this.globalLogger.info('🚀 Starting CLI analysis...');

    try {
      // Get workspace path
      const workspacePath = getAnalysisTargetDirectory();
      if (!workspacePath) {
        throw new Error('No workspace folder found');
      }

      this.globalLogger.info(`📁 Analysis target: ${workspacePath}`);

      // Get config for CLI arguments
      const config = this.configManager.getConfig();
      const extraArgs = config.cliExtraArgs || [];

      // Run CLI analysis
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'X-Fidelity Analysis',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({
            message: 'Starting analysis...',
            increment: 10
          });

          this.globalLogger.info('⚡ Executing analysis...');
          const analysisResult = await this.cliSpawner.runAnalysis({
            workspacePath,
            args: extraArgs,
            timeout: config.cliTimeout,
            cancellationToken: token,
            progress
          });

          progress.report({ message: 'Completed', increment: 100 });
          return analysisResult;
        }
      );

      // Update diagnostics
      this.globalLogger.info('📝 Updating diagnostics...');
      await this.diagnosticProvider.updateDiagnostics(result);

      // Update performance metrics
      const duration = performance.now() - startTime;
      this.updatePerformanceMetrics(duration);

      // Store result
      this.lastAnalysisResult = result;

      // Emit completion event
      this.onAnalysisComplete.fire(result);

      // Set state to complete on successful analysis
      this.setState('complete');

      // Log success
      logCommandSuccess('xfidelity.runAnalysis', 'CLI Analysis', duration);
      this.globalLogger.info(
        `✅ Analysis completed successfully in ${Math.round(duration)}ms`
      );
      this.globalLogger.info(
        `📊 Analysis results: ${result.summary.totalIssues} issues found across ${result.summary.filesAnalyzed} files`
      );

      return result;
    } catch (error) {
      this.setState('error');

      if (error instanceof vscode.CancellationError) {
        this.globalLogger.info('⏹️ Analysis was cancelled by user');
        return null;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const duration = performance.now() - startTime;

      // Log error
      logCommandError('xfidelity.runAnalysis', 'CLI Analysis', error, duration);
      this.globalLogger.error(`❌ Analysis failed: ${errorMessage}`);

      vscode.window
        .showErrorMessage(
          `X-Fidelity analysis failed: ${errorMessage}`,
          'Show Output'
        )
        .then(choice => {
          if (choice === 'Show Output') {
            this.globalLogger.show();
          }
        });

      throw error;
    } finally {
      this.isAnalyzing = false;
      // Only set to idle if we're not in a complete or error state
      if (this.currentState !== 'complete' && this.currentState !== 'error') {
        this.setState('idle');
      }
      this.cancellationToken?.dispose();
      this.cancellationToken = undefined;
    }
  }

  /**
   * Cancel running analysis
   */
  async cancelAnalysis(): Promise<void> {
    if (this.cancellationToken) {
      this.cancellationToken.cancel();
      this.logger.info('Analysis cancellation requested');
    }
  }

  private setState(state: SimpleAnalysisState): void {
    this.currentState = state;
    this.onAnalysisStateChanged.fire(state);
  }

  private updatePerformanceMetrics(duration: number): void {
    this.performanceMetrics.lastAnalysisDuration = duration;
    this.performanceMetrics.totalAnalyses++;

    // Calculate rolling average
    const totalTime =
      this.performanceMetrics.averageAnalysisDuration *
        (this.performanceMetrics.totalAnalyses - 1) +
      duration;
    this.performanceMetrics.averageAnalysisDuration =
      totalTime / this.performanceMetrics.totalAnalyses;
  }

  private setupEventListeners(): void {
    // Listen for configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.logger.info('Configuration changed');
      })
    );
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.onAnalysisStateChanged.dispose();
    this.onAnalysisComplete.dispose();

    if (this.cancellationToken) {
      this.cancellationToken.dispose();
    }
  }
}
