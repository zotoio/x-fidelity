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

  private readonly onAnalysisStateChanged =
    new vscode.EventEmitter<SimpleAnalysisState>();
  private readonly onAnalysisComplete =
    new vscode.EventEmitter<AnalysisResult>();

  constructor(
    private configManager: ConfigManager,
    private diagnosticProvider: DiagnosticProvider
  ) {
    this.globalLogger = createComponentLogger('CLI Analysis');
    this.logger = this.globalLogger; // Use the same logger instance
    this.initializeCLISpawner();
    this.setupEventListeners();
  }

  private initializeCLISpawner(): void {
    try {
      this.cliSpawner = createCLISpawner();
    } catch (error) {
      this.cliSpawner = createCLISpawner();
    }
  }

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
    return {};
  }

  getCurrentResults(): AnalysisResult | null {
    return this.lastAnalysisResult;
  }

  getLastResult(): AnalysisResult | null {
    return this.getCurrentResults();
  }

  getCLISpawner(): CLISpawner {
    return this.cliSpawner;
  }

  async runAnalysis(_options?: {
    forceRefresh?: boolean;
  }): Promise<AnalysisResult | null> {
    if (this.isAnalyzing) {
      this.globalLogger.warn(
        '🔄 Analysis already in progress, skipping request'
      );
      return null;
    }

    const startTime = performance.now();
    this.setState('analyzing');
    this.isAnalyzing = true;

    logCommandStart('xfidelity.runAnalysis', 'CLI Analysis');

    try {
      const workspacePath = getAnalysisTargetDirectory();
      if (!workspacePath) {
        throw new Error('No workspace folder found');
      }

      this.globalLogger.info('🔍 Starting fresh analysis', {
        workspacePath,
        forceRefresh: _options?.forceRefresh
      });

      const config = this.configManager.getConfig();
      const extraArgs = config.cliExtraArgs || [];

      this.globalLogger.debug('📋 Analysis configuration', {
        workspacePath,
        extraArgs,
        timeout: config.analysisTimeout,
        archetype: config.archetype
      });

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

          this.globalLogger.info('⚡ Executing CLI analysis...');

          const analysisResult = await this.cliSpawner.runAnalysis({
            workspacePath,
            args: extraArgs,
            timeout: config.analysisTimeout,
            cancellationToken: token,
            progress
          });

          this.globalLogger.info('📊 CLI analysis completed', {
            filesAnalyzed: analysisResult.summary?.filesAnalyzed || 0,
            totalIssues: analysisResult.summary?.totalIssues || 0,
            analysisTimeMs: analysisResult.summary?.analysisTimeMs || 0
          });

          progress.report({ message: 'Completed', increment: 100 });
          return analysisResult;
        }
      );

      this.globalLogger.info('🔄 Updating VSCode diagnostics...');
      await this.diagnosticProvider.updateDiagnostics(result);

      const duration = performance.now() - startTime;

      this.lastAnalysisResult = result;

      // Ensure result has the required summary structure
      if (!result.summary) {
        this.globalLogger.error('❌ Result missing summary object', { result });
        throw new Error('Analysis result missing summary object');
      }

      this.globalLogger.info('✅ Analysis completed successfully', {
        duration: Math.round(duration),
        filesAnalyzed: result.summary.filesAnalyzed,
        totalIssues: result.summary.totalIssues,
        analysisTimeMs: result.summary.analysisTimeMs
      });

      this.onAnalysisComplete.fire(result);

      this.setState('complete');

      logCommandSuccess('xfidelity.runAnalysis', 'CLI Analysis', duration);

      return result;
    } catch (error) {
      this.setState('error');

      if (error instanceof vscode.CancellationError) {
        this.globalLogger.warn('⏹️ Analysis cancelled by user');
        return null;
      }

      const duration = performance.now() - startTime;

      this.globalLogger.error('❌ Analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        duration: Math.round(duration),
        workspacePath: getAnalysisTargetDirectory()
      });

      logCommandError('xfidelity.runAnalysis', 'CLI Analysis', error, duration);

      throw error;
    } finally {
      this.isAnalyzing = false;
      if (this.currentState !== 'complete' && this.currentState !== 'error') {
        this.setState('idle');
      }
      this.cancellationToken?.dispose();
      this.cancellationToken = undefined;
    }
  }

  async cancelAnalysis(): Promise<void> {
    if (this.cancellationToken) {
      this.cancellationToken.cancel();
    }
  }

  private setState(state: SimpleAnalysisState): void {
    this.currentState = state;
    this.onAnalysisStateChanged.fire(state);
  }

  private setupEventListeners(): void {
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {})
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
