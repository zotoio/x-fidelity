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
import { AnalysisResultCache } from '../utils/analysisResultCache';
import { safeSerializeAnalysisResult } from '../utils/serialization';
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
  private currentAnalysisId: string = '';

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

  private setupEventListeners(): void {
    // Add configuration change listener to clear cache when settings change
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('xfidelity')) {
          this.logger.info(
            'Configuration changed, clearing cache for fresh results'
          );
          AnalysisResultCache.ensureFreshResults();
        }
      })
    );
  }

  get isAnalysisRunning(): boolean {
    return this.isAnalyzing || AnalysisResultCache.isAnalysisRunning();
  }

  get onStateChanged(): vscode.Event<SimpleAnalysisState> {
    return this.onAnalysisStateChanged.event;
  }

  get onComplete(): vscode.Event<AnalysisResult> {
    return this.onAnalysisComplete.event;
  }

  async cancelAnalysis(): Promise<void> {
    if (this.cancellationToken) {
      this.cancellationToken.cancel();
    }
    this.isAnalyzing = false;
    this.setState('idle');

    if (this.currentAnalysisId) {
      AnalysisResultCache.markAnalysisCompleted(this.currentAnalysisId);
      this.currentAnalysisId = '';
    }
  }

  getPerformanceMetrics() {
    return {};
  }

  getLogger() {
    return this.logger;
  }

  getCLISpawner() {
    return this.cliSpawner;
  }

  getCurrentResults(): AnalysisResult | null {
    return this.lastAnalysisResult;
  }

  getLastResult(): AnalysisResult | null {
    return this.getCurrentResults();
  }

  private async processInBatches(
    files: string[],
    batchSize: number = 50
  ): Promise<void> {
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      this.globalLogger.debug(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(files.length / batchSize)}`
      );
      // Simulate processing - replace with actual analysis
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
    }
  }

  async runAnalysis(_options?: {
    forceRefresh?: boolean;
  }): Promise<AnalysisResult | null> {
    // Prevent concurrent execution
    if (this.isAnalyzing || AnalysisResultCache.isAnalysisRunning()) {
      this.globalLogger.warn(
        '🔄 Analysis already in progress, skipping request'
      );
      return null;
    }

    const startTime = performance.now();
    this.setState('analyzing');
    this.isAnalyzing = true;

    logCommandStart('xfidelity.runAnalysis', 'Enhanced CLI Analysis');

    try {
      const workspacePath = getAnalysisTargetDirectory();
      if (!workspacePath) {
        throw new Error('No workspace folder found');
      }

      this.globalLogger.info('🔍 Starting enhanced fresh analysis', {
        workspacePath,
        forceRefresh: _options?.forceRefresh,
        timestamp: new Date().toISOString()
      });

      // CRITICAL FIX: Always ensure fresh results by clearing cache, especially in tests
      await AnalysisResultCache.clearAllCaches(workspacePath);
      await AnalysisResultCache.ensureFreshResults(workspacePath);

      // Mark analysis as started to prevent concurrent runs
      this.currentAnalysisId =
        AnalysisResultCache.markAnalysisStarted(workspacePath);

      // Validate workspace setup and log cache statistics
      const validation = AnalysisResultCache.validateResultFile(workspacePath);
      const cacheStats = AnalysisResultCache.getCacheStatistics(workspacePath);

      this.globalLogger.debug('Pre-analysis validation', {
        validation,
        cacheStats,
        workspacePath,
        analysisId: this.currentAnalysisId
      });

      const config = this.configManager.getConfig();
      const extraArgs = config.cliExtraArgs || [];

      // CRITICAL FIX: Remove invalid arguments that cause CLI to fail
      // The CLI doesn't support --force-refresh or --no-cache
      // Instead, we clear cache manually via AnalysisResultCache above
      const freshAnalysisArgs = [...extraArgs];

      this.globalLogger.debug('📋 Enhanced analysis configuration', {
        workspacePath,
        args: freshAnalysisArgs,
        timeout: config.analysisTimeout,
        archetype: config.archetype,
        analysisId: this.currentAnalysisId
      });

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'X-Fidelity Enhanced Analysis',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({
            message: 'Clearing cache and preparing fresh analysis...',
            increment: 10
          });

          this.globalLogger.info('⚡ Executing enhanced CLI analysis...');

          progress.report({
            message: 'Running analysis...',
            increment: 30
          });

          const analysisResult = await this.cliSpawner.runAnalysis({
            workspacePath,
            args: freshAnalysisArgs,
            timeout: config.analysisTimeout,
            cancellationToken: token,
            progress
          });

          progress.report({
            message: 'Processing and validating results...',
            increment: 80
          });

          // Validate that fresh results were actually generated
          const postValidation =
            AnalysisResultCache.validateResultFile(workspacePath);
          const postCacheStats =
            AnalysisResultCache.getCacheStatistics(workspacePath);

          this.globalLogger.info('📊 Enhanced CLI analysis completed', {
            postValidation,
            postCacheStats,
            filesAnalyzed: analysisResult.summary?.filesAnalyzed || 0,
            totalIssues: analysisResult.summary?.totalIssues || 0,
            analysisTimeMs: analysisResult.summary?.analysisTimeMs || 0,
            analysisId: this.currentAnalysisId
          });

          progress.report({ message: 'Completed', increment: 100 });
          return analysisResult;
        }
      );

      this.globalLogger.info(
        '🔄 Updating VSCode diagnostics with safe serialization...'
      );

      // CRITICAL FIX: Safely serialize result before passing to diagnostics
      const safeResult = this.createSafeAnalysisResult(result);
      await this.diagnosticProvider.updateDiagnostics(safeResult);

      const duration = performance.now() - startTime;

      this.lastAnalysisResult = safeResult;

      // Ensure result has the required summary structure
      if (!safeResult.summary) {
        this.globalLogger.error('❌ Result missing summary object', {
          result: safeResult
        });
        throw new Error('Analysis result missing summary object');
      }

      this.globalLogger.info('✅ Enhanced analysis completed successfully', {
        duration: Math.round(duration),
        filesAnalyzed: safeResult.summary.filesAnalyzed,
        totalIssues: safeResult.summary.totalIssues,
        analysisTimeMs: safeResult.summary.analysisTimeMs,
        analysisId: this.currentAnalysisId
      });

      this.onAnalysisComplete.fire(safeResult);
      this.setState('complete');

      logCommandSuccess(
        'xfidelity.runAnalysis',
        'Enhanced CLI Analysis',
        duration
      );

      return safeResult;
    } catch (error) {
      this.setState('error');

      if (error instanceof vscode.CancellationError) {
        this.globalLogger.warn('⏹️ Analysis cancelled by user');
        return null;
      }

      const duration = performance.now() - startTime;

      this.globalLogger.error('❌ Enhanced analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        duration: Math.round(duration),
        workspacePath: getAnalysisTargetDirectory(),
        analysisId: this.currentAnalysisId
      });

      logCommandError(
        'xfidelity.runAnalysis',
        'Enhanced CLI Analysis',
        error,
        duration
      );

      throw error;
    } finally {
      this.isAnalyzing = false;
      if (this.currentState !== 'complete' && this.currentState !== 'error') {
        this.setState('idle');
      }

      // Mark analysis as completed and clean up
      if (this.currentAnalysisId) {
        AnalysisResultCache.markAnalysisCompleted(this.currentAnalysisId);
        this.currentAnalysisId = '';
      }

      this.cancellationToken?.dispose();
      this.cancellationToken = undefined;
    }
  }

  /**
   * Create a safe, serializable version of the analysis result
   * Prevents toJSON errors in VSCode communication
   */
  private createSafeAnalysisResult(result: AnalysisResult): AnalysisResult {
    try {
      // Use the enhanced serialization utility to clean the result
      const safeResult = safeSerializeAnalysisResult(result);

      if (!safeResult) {
        this.globalLogger.warn(
          'Failed to safely serialize result, creating minimal fallback'
        );
        return this.createMinimalAnalysisResult();
      }

      // Ensure all required fields are present and properly typed
      const typedResult: AnalysisResult = {
        metadata: safeResult.metadata || { XFI_RESULT: { issueDetails: [] } },
        diagnostics: new Map(), // Will be populated by DiagnosticProvider
        timestamp: safeResult.timestamp || Date.now(),
        duration: safeResult.duration || 0,
        summary: {
          totalIssues: safeResult.summary?.totalIssues || 0,
          filesAnalyzed: safeResult.summary?.filesAnalyzed || 0,
          analysisTimeMs: safeResult.summary?.analysisTimeMs || 0,
          issuesByLevel: safeResult.summary?.issuesByLevel || {
            warning: 0,
            error: 0,
            fatality: 0,
            exempt: 0
          }
        },
        operationId: safeResult.operationId || `enhanced-cli-${Date.now()}`
      };

      return typedResult;
    } catch (error) {
      this.globalLogger.error('Failed to create safe analysis result', {
        error
      });
      return this.createMinimalAnalysisResult();
    }
  }

  /**
   * Create a minimal but complete analysis result for fallback situations
   */
  private createMinimalAnalysisResult(): AnalysisResult {
    return {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {
            archetype: 'unknown',
            configServer: '',
            exemptions: []
          },
          issueDetails: [],
          telemetryData: {
            repoUrl: '',
            configServer: '',
            hostInfo: {
              platform: process.platform,
              release: '',
              type: '',
              arch: process.arch,
              cpus: 0,
              totalMemory: 0,
              freeMemory: 0
            },
            userInfo: {
              username: '',
              homedir: '',
              shell: null
            },
            startTime: Date.now()
          },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          startTime: Date.now(),
          finishTime: Date.now(),
          durationSeconds: 0,
          xfiVersion: '0.0.0',
          archetype: 'unknown',
          fileCount: 0,
          totalIssues: 0,
          warningCount: 0,
          errorCount: 0,
          fatalityCount: 0,
          exemptCount: 0,
          repoPath: '',
          repoUrl: ''
        }
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 0,
      summary: {
        totalIssues: 0,
        filesAnalyzed: 0,
        analysisTimeMs: 0,
        issuesByLevel: {
          warning: 0,
          error: 0,
          fatality: 0,
          exempt: 0
        }
      },
      operationId: `enhanced-cli-${Date.now()}`
    };
  }

  private setState(state: SimpleAnalysisState): void {
    this.currentState = state;
    this.onAnalysisStateChanged.fire(state);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.onAnalysisStateChanged.dispose();
    this.onAnalysisComplete.dispose();
  }
}
