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
    this.logger = new VSCodeLogger('CLI Analysis');
    this.globalLogger = createComponentLogger('CLI Analysis');
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

      const config = this.configManager.getConfig();
      const extraArgs = config.cliExtraArgs || [];

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

          const analysisResult = await this.cliSpawner.runAnalysis({
            workspacePath,
            args: extraArgs,
            timeout: config.analysisTimeout,
            cancellationToken: token,
            progress
          });

          progress.report({ message: 'Completed', increment: 100 });
          return analysisResult;
        }
      );

      await this.diagnosticProvider.updateDiagnostics(result);

      const duration = performance.now() - startTime;

      this.lastAnalysisResult = result;

      this.onAnalysisComplete.fire(result);

      this.setState('complete');

      logCommandSuccess('xfidelity.runAnalysis', 'CLI Analysis', duration);

      return result;
    } catch (error) {
      this.setState('error');

      if (error instanceof vscode.CancellationError) {
        return null;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const duration = performance.now() - startTime;

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
