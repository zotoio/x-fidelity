import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { createComponentLogger, commandLogger } from '../utils/globalLogger';
import { getAnalysisTargetDirectory } from '../utils/workspaceUtils';
import { createCLISpawner, CLISpawner } from '../utils/cliSpawner';
import { AnalysisResultCache } from '../utils/analysisResultCache';
import { safeSerializeAnalysisResult } from '../utils/serialization';
import type { AnalysisResult } from './types';
import type {
  IAnalysisEngine,
  AnalysisTriggerSource
} from './analysisEngineInterface';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class CLIAnalysisManager implements IAnalysisEngine {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private cancellationToken?: vscode.CancellationTokenSource;
  private logger: VSCodeLogger;
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
    this.logger = createComponentLogger('CLI Analysis');
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
      this.logger.debug(
        `Processing batch ${i / batchSize + 1} of ${Math.ceil(files.length / batchSize)}`
      );
      // Simulate processing - replace with actual analysis
      await new Promise(resolve => setTimeout(resolve, 1000)); // Placeholder
    }
  }

  async runAnalysis(options?: {
    forceRefresh?: boolean;
    triggerSource?: AnalysisTriggerSource;
  }): Promise<AnalysisResult | null> {
    // Prevent concurrent execution
    if (this.isAnalyzing || AnalysisResultCache.isAnalysisRunning()) {
      this.logger.warn('🔄 Analysis already in progress, skipping request');
      return null;
    }

    const startTime = performance.now();
    this.setState('analyzing');
    this.isAnalyzing = true;

    const triggerSource = options?.triggerSource || 'automatic';

    commandLogger.execution(
      'xfidelity.runAnalysis',
      `Enhanced CLI Analysis (${triggerSource})`
    );

    try {
      const workspacePath = getAnalysisTargetDirectory();
      if (!workspacePath) {
        throw new Error('No workspace folder found');
      }

      this.logger.info('🔍 Starting enhanced fresh analysis', {
        workspacePath,
        forceRefresh: options?.forceRefresh,
        triggerSource,
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

      this.logger.debug('Pre-analysis validation', {
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

      this.logger.debug('Analysis configuration', {
        workspacePath,
        args: freshAnalysisArgs,
        timeout: config.analysisTimeout,
        archetype: config.archetype,
        analysisId: this.currentAnalysisId
      });

      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'X-Fi',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({
            message: 'Clearing cache and preparing fresh analysis...',
            increment: 10
          });

          this.logger.info('⚡ Executing enhanced CLI analysis...');

          progress.report({
            message: 'Running analysis...',
            increment: 30
          });

          const analysisResult = await this.cliSpawner.runAnalysis({
            workspacePath,
            args: freshAnalysisArgs,
            timeout: config.analysisTimeout,
            cancellationToken: token,
            progress,
            triggerSource
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

          this.logger.info('📊 Enhanced CLI analysis completed', {
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

      this.logger.info(
        '🔄 Updating VSCode diagnostics with safe serialization...'
      );

      // CRITICAL FIX: Safely serialize result before passing to diagnostics
      const safeResult = this.createSafeAnalysisResult(result);
      await this.diagnosticProvider.updateDiagnostics(safeResult);

      const duration = performance.now() - startTime;

      this.lastAnalysisResult = safeResult;

      // Ensure result has the required summary structure
      if (!safeResult.summary) {
        this.logger.error('❌ Result missing summary object', {
          result: safeResult
        });
        throw new Error('Analysis result missing summary object');
      }

      this.logger.info('✅ Analysis completed successfully', {
        duration: Math.round(duration),
        filesAnalyzed: safeResult.summary.filesAnalyzed,
        totalIssues: safeResult.summary.totalIssues,
        analysisTimeMs: safeResult.summary.analysisTimeMs,
        analysisId: this.currentAnalysisId
      });

      this.onAnalysisComplete.fire(safeResult);
      this.setState('complete');

      // 🎯 NEW: Open side panel for manual analysis triggers
      if (triggerSource === 'manual') {
        try {
          await vscode.commands.executeCommand(
            'workbench.view.extension.xfidelity'
          );
          this.logger.info(
            '📋 Opened X-Fidelity side panel for manual analysis'
          );
        } catch (error) {
          this.logger.warn('Failed to open side panel after manual analysis', {
            error
          });
        }
      }

      commandLogger.completion(
        'xfidelity.runAnalysis',
        `Enhanced CLI Analysis (${triggerSource})`,
        duration
      );

      return safeResult;
    } catch (error) {
      this.setState('error');

      if (error instanceof vscode.CancellationError) {
        this.logger.warn('⏹️ Analysis cancelled by user');
        return null;
      }

      const duration = performance.now() - startTime;

      this.logger.error('❌ Analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        duration: Math.round(duration),
        workspacePath: getAnalysisTargetDirectory(),
        analysisId: this.currentAnalysisId
      });

      commandLogger.error(
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
        this.logger.warn(
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
      this.logger.error('Failed to create safe analysis result', {
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
