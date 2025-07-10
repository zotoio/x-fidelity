import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { getAnalysisTargetDirectory } from '../utils/workspaceUtils';
import {
  createComponentLogger,
  logCommandStart,
  logCommandSuccess,
  logCommandError
} from '../utils/globalLogger';
import type { AnalysisResult } from './types';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';
import type { IAnalysisEngine } from './analysisEngineInterface';

export interface CLIBinaryInfo {
  path: string | null;
  version: string | null;
  source: 'bundled' | 'global' | 'local' | 'custom' | 'not-found';
}

export interface AnalysisOptions {
  forceRefresh?: boolean;
  cancellationToken?: vscode.CancellationToken;
}

export class CLIAnalysisManager implements IAnalysisEngine {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private cancellationToken?: vscode.CancellationTokenSource;
  private logger: VSCodeLogger;
  private globalLogger: VSCodeLogger;
  private lastAnalysisResult: AnalysisResult | null = null;
  private currentState: SimpleAnalysisState = 'idle';

  // Performance tracking
  private performanceMetrics = {
    lastAnalysisDuration: 0,
    averageAnalysisDuration: 0,
    totalAnalyses: 0,
    cacheHits: 0
  };

  // Event emitters
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
    this.setupEventListeners();
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
   * Detect X-Fidelity CLI binary availability
   */
  async detectCLIBinary(): Promise<CLIBinaryInfo> {
    const config = this.configManager.getConfig();
    const preferredSource = config.cliSource || 'bundled';

    try {
      // If user specified custom path, use it exclusively
      if (preferredSource === 'custom' && config.cliBinaryPath) {
        const validated = await this.validateBinary(config.cliBinaryPath);
        if (validated.path) {
          return { ...validated, source: 'custom' };
        }
        this.logger.warn(
          `Custom CLI path failed: ${config.cliBinaryPath}, not falling back to other sources.`
        );
        return { path: null, version: null, source: 'not-found' };
      }

      // If user explicitly set global or local, use only that
      if (preferredSource === 'global') {
        const globalBinary = await this.findGlobalBinary();
        if (globalBinary.path) return globalBinary;
        this.logger.warn(`Global CLI not found, not falling back to bundled.`);
        return { path: null, version: null, source: 'not-found' };
      }
      if (preferredSource === 'local') {
        const localBinary = await this.findLocalBinary();
        if (localBinary.path) return localBinary;
        this.logger.warn(`Local CLI not found, not falling back to bundled.`);
        return { path: null, version: null, source: 'not-found' };
      }

      // Default: bundled only
      const bundledBinary = await this.findBundledBinary();
      if (bundledBinary.path) return bundledBinary;
      this.logger.error(
        'Bundled CLI not found. Please ensure the extension is properly installed and built.'
      );
      return { path: null, version: null, source: 'not-found' };
    } catch (error) {
      this.logger.error('Error detecting CLI binary:', error);
      return { path: null, version: null, source: 'not-found' };
    }
  }

  /**
   * Find CLI binary by specific source type
   */
  private async findBinaryBySource(source: string): Promise<CLIBinaryInfo> {
    switch (source) {
      case 'bundled':
        const bundledBinary = await this.findBundledBinary();
        if (bundledBinary.path) {
          return { ...bundledBinary, source: 'bundled' };
        }
        break;

      case 'global':
        const globalBinary = await this.findGlobalBinary();
        if (globalBinary.path) {
          return { ...globalBinary, source: 'global' };
        }
        break;

      case 'local':
        const localBinary = await this.findLocalBinary();
        if (localBinary.path) {
          return { ...localBinary, source: 'local' };
        }
        break;

      case 'custom':
        const config = this.configManager.getConfig();
        if (config.cliBinaryPath) {
          const validated = await this.validateBinary(config.cliBinaryPath);
          if (validated.path) {
            return { ...validated, source: 'custom' };
          }
        }
        break;
    }

    return { path: null, version: null, source: 'not-found' };
  }

  /**
   * Run analysis using CLI binary
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

    // Log analysis start to both loggers
    logCommandStart('xfidelity.runAnalysis', 'CLI Analysis');
    this.globalLogger.info('🚀 Starting CLI analysis...');

    try {
      // Detect CLI binary
      this.globalLogger.info('🔍 Detecting CLI binary...');
      const binaryInfo = await this.detectCLIBinary();
      if (!binaryInfo.path) {
        throw new Error(
          'X-Fidelity CLI binary not found. Please install globally with: npm install -g @x-fidelity/cli'
        );
      }

      this.globalLogger.info(
        `✅ CLI binary detected: ${binaryInfo.path} (${binaryInfo.source}, v${binaryInfo.version})`
      );

      // Get workspace path
      const workspacePath = getAnalysisTargetDirectory();
      if (!workspacePath) {
        throw new Error('No workspace folder found');
      }

      this.globalLogger.info(`📁 Analysis target: ${workspacePath}`);

      // Run CLI analysis with progress reporting
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Window,
          title: 'X-Fidelity CLI Analysis',
          cancellable: true
        },
        async (progress, token) => {
          progress.report({
            message: 'Starting CLI analysis...',
            increment: 10
          });

          this.globalLogger.info('⚡ Executing CLI analysis...');
          const analysisResult = await this.executeCLI(
            binaryInfo.path!,
            workspacePath,
            token,
            progress
          );

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

      // Log success to both loggers
      logCommandSuccess('xfidelity.runAnalysis', 'CLI Analysis', duration);
      this.globalLogger.info(
        `✅ CLI analysis completed successfully in ${Math.round(duration)}ms`
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

      // Log error to both loggers
      logCommandError('xfidelity.runAnalysis', 'CLI Analysis', error, duration);
      this.globalLogger.error(`❌ CLI analysis failed: ${errorMessage}`);

      vscode.window
        .showErrorMessage(
          `X-Fidelity CLI analysis failed: ${errorMessage}`,
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
      this.setState('idle');
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

  /**
   * Execute CLI binary and parse results with enhanced progress tracking
   */
  private async executeCLI(
    binaryPath: string,
    workspacePath: string,
    cancellationToken: vscode.CancellationToken,
    progress?: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<AnalysisResult> {
    const config = this.configManager.getConfig();

    return new Promise((resolve, reject) => {
      const args = this.buildCLIArgs(workspacePath, config);

      // Parse binaryPath safely to separate executable from script path
      const binaryParts = binaryPath.trim().split(/\s+/);
      const executable = binaryParts[0];
      const scriptArgs = binaryParts.slice(1);
      const allArgs = [...scriptArgs, ...args];

      this.logger.debug(`Executing CLI: ${executable} ${allArgs.join(' ')}`);

      const child = spawn(executable, allArgs, {
        cwd: workspacePath,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: config.cliTimeout
      });

      let stderr = '';

      // Enhanced progress tracking state
      const progressTracker = {
        currentPhase: 'initializing',
        totalProgress: 0,
        phasesCompleted: 0,
        currentFile: '',
        filesProcessed: 0,
        totalFiles: 0,
        startTime: Date.now(),
        estimatedTimeRemaining: 0,
        lastProgressUpdate: Date.now()
      };

      // Set up cancellation
      const cancelHandler = () => {
        this.logger.info('Killing CLI process due to cancellation');
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      };

      cancellationToken.onCancellationRequested(cancelHandler);

      // Enhanced progress reporting based on CLI output
      const updateProgress = (data: string) => {
        if (!progress) {
          return;
        }

        const lines = data.split('\n');

        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) {
            continue;
          }

          // Parse different progress indicators from CLI output
          if (
            cleanLine.includes('Initializing') ||
            cleanLine.includes('Starting')
          ) {
            progressTracker.currentPhase = 'initializing';
            progressTracker.totalProgress = 5;
            this.globalLogger.info('🔄 Initializing analysis engine...');
            progress.report({
              message: 'Initializing analysis...',
              increment: 5
            });
          } else if (
            cleanLine.includes('Loading plugins') ||
            cleanLine.includes('Plugin')
          ) {
            progressTracker.currentPhase = 'loading-plugins';
            progressTracker.totalProgress = 15;
            this.globalLogger.info('🔌 Loading analysis plugins...');
            progress.report({
              message: 'Loading analysis plugins...',
              increment: 10
            });
          } else if (
            cleanLine.includes('Processing file') ||
            cleanLine.includes('Analyzing')
          ) {
            const fileMatch = cleanLine.match(
              /(?:Processing|Analyzing)[:\s]*(.+)/
            );
            if (fileMatch) {
              progressTracker.currentFile = fileMatch[1];
              progressTracker.filesProcessed++;
              progressTracker.totalProgress = Math.min(
                50 + (progressTracker.filesProcessed * 20) / 100,
                90
              );
              this.globalLogger.info(
                `📄 Processing: ${progressTracker.currentFile}`
              );
              progress.report({
                message: `Processing ${progressTracker.currentFile}...`,
                increment: 1
              });
            }
          } else if (
            cleanLine.includes('Found') &&
            cleanLine.includes('files')
          ) {
            // Extract total file count
            const fileCountMatch = cleanLine.match(/Found\s+(\d+)\s+files/);
            if (fileCountMatch) {
              progressTracker.totalFiles = parseInt(fileCountMatch[1], 10);
              this.globalLogger.info(
                `📊 Found ${progressTracker.totalFiles} files to analyze`
              );
              progress.report({
                message: `Found ${progressTracker.totalFiles} files to analyze`,
                increment: 0
              });
            }
          } else if (
            cleanLine.includes('Generating') ||
            cleanLine.includes('Creating report')
          ) {
            progressTracker.currentPhase = 'generating-report';
            progressTracker.totalProgress = 85;
            this.globalLogger.info('📋 Generating analysis report...');
            progress.report({
              message: 'Generating analysis report...',
              increment: 20
            });
          } else if (
            cleanLine.includes('Completed') ||
            cleanLine.includes('Finished') ||
            cleanLine.includes('Done')
          ) {
            progressTracker.currentPhase = 'completed';
            progressTracker.totalProgress = 100;
            this.globalLogger.info('✅ Analysis completed successfully');
            progress.report({
              message: 'Analysis completed',
              increment: 100 - progressTracker.totalProgress
            });
          } else if (
            cleanLine.includes('issues found') ||
            cleanLine.includes('XFI_RESULT')
          ) {
            // Parse issue count for final report
            const issueMatch = cleanLine.match(/(\d+)\s+issues?\s+found/);
            if (issueMatch) {
              const issueCount = parseInt(issueMatch[1], 10);
              this.globalLogger.info(`🔍 Found ${issueCount} issues`);
              progress.report({
                message: `Found ${issueCount} issues`,
                increment: 0
              });
            }
          } else if (
            cleanLine.includes('Error') ||
            cleanLine.includes('Failed')
          ) {
            progressTracker.currentPhase = 'error';
            this.globalLogger.error(`❌ Analysis error: ${cleanLine}`);
            progress.report({
              message: `Error: ${cleanLine}`,
              increment: 0
            });
          }

          // Update estimated time remaining
          const elapsed = Date.now() - progressTracker.startTime;
          const progressPercent = progressTracker.totalProgress / 100;
          if (progressPercent > 0.1) {
            progressTracker.estimatedTimeRemaining = Math.max(
              0,
              elapsed / progressPercent - elapsed
            );
          }
        }

        // Throttle progress updates to avoid spam
        const now = Date.now();
        if (now - progressTracker.lastProgressUpdate > 500) {
          // Update every 500ms max
          progressTracker.lastProgressUpdate = now;

          if (
            progressTracker.estimatedTimeRemaining > 0 &&
            progressTracker.totalProgress < 95
          ) {
            const timeRemaining = Math.round(
              progressTracker.estimatedTimeRemaining / 1000
            );
            this.globalLogger.debug(
              `⏱️ Estimated time remaining: ${timeRemaining}s (${progressTracker.totalProgress}% complete)`
            );
            progress.report({
              message: `${progressTracker.currentPhase} (${timeRemaining}s remaining)`,
              increment: 0
            });
          }
        }
      };

      // Enhanced progress tracking from stdout
      child.stdout?.on('data', data => {
        const dataStr = data.toString();
        updateProgress(dataStr);
      });

      child.stderr?.on('data', data => {
        const dataStr = data.toString();
        stderr += dataStr;

        // Also check stderr for progress indicators
        updateProgress(dataStr);
      });

      child.on('close', async code => {
        try {
          // X-Fidelity CLI exit codes:
          // 0: No issues found (success)
          // 1: Issues found (successful analysis with findings)
          // 2+: Actual errors/failures
          if (code === 0 || code === 1 || code === null) {
            // Read results from the structured output file instead of parsing stdout
            const result = await this.parseXFIResultFromFile(workspacePath);

            // Log appropriate message based on exit code
            if (code === 1) {
              this.globalLogger.info(
                `✅ Analysis completed successfully with ${result.summary.totalIssues} issues found`
              );
            } else {
              this.globalLogger.info(
                `✅ Analysis completed successfully with no issues found`
              );
            }

            // Final progress report with results
            if (progress) {
              progress.report({
                message: `Analysis completed: ${result.summary.totalIssues} issues found`,
                increment: 100
              });
            }

            resolve(result);
          } else {
            // Exit codes 2+ indicate actual failures
            reject(
              new Error(
                `CLI process failed with exit code ${code}. stderr: ${stderr}`
              )
            );
          }
        } catch (parseError) {
          // If we can't read the result file, it's a real error
          const errorMessage =
            parseError instanceof Error
              ? parseError.message
              : String(parseError);
          this.logger.error('Failed to read CLI result file:', parseError);
          this.logger.debug('CLI stderr:', stderr);
          reject(
            new Error(
              `Failed to read CLI result file: ${errorMessage}. Exit code: ${code}`
            )
          );
        }
      });

      child.on('error', error => {
        reject(new Error(`Failed to start CLI process: ${error.message}`));
      });

      // Handle timeout with progress feedback
      setTimeout(() => {
        if (!child.killed) {
          if (progress) {
            progress.report({
              message: 'Analysis timed out, terminating...',
              increment: 0
            });
          }
          child.kill('SIGTERM');
          reject(
            new Error(`CLI analysis timed out after ${config.cliTimeout}ms`)
          );
        }
      }, config.cliTimeout);
    });
  }

  /**
   * Build CLI arguments from configuration
   */
  private buildCLIArgs(workspacePath: string, config: any): string[] {
    const args = ['--dir', workspacePath, '--archetype', config.archetype];

    if (config.configServer) {
      args.push('--configServer', config.configServer);
    }

    if (config.localConfigPath) {
      args.push('--localConfigPath', config.localConfigPath);
    }

    if (config.openaiEnabled) {
      args.push('--openaiEnabled');
    }

    if (config.telemetryCollector) {
      args.push('--telemetryCollector', config.telemetryCollector);
    }

    // Add extra CLI arguments
    args.push(...config.cliExtraArgs);

    return args;
  }

  /**
   * Parse XFI_RESULT from the XFI_RESULT.json file instead of stdout
   */
  private async parseXFIResultFromFile(
    workspacePath: string
  ): Promise<AnalysisResult> {
    try {
      const resultFilePath = path.join(
        workspacePath,
        '.xfiResults',
        'XFI_RESULT.json'
      );

      // Wait a moment for file to be fully written (CLI flushes logs before exit)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if file exists
      try {
        await fs.access(resultFilePath);
      } catch {
        throw new Error(`Result file not found at ${resultFilePath}`);
      }

      // Read and parse the clean JSON file
      const fileContent = await fs.readFile(resultFilePath, 'utf8');
      const parsedData = JSON.parse(fileContent);

      // Transform CLI output structure to match AnalysisResult interface
      if (parsedData.XFI_RESULT) {
        const xfiResult = parsedData.XFI_RESULT;

        return {
          metadata: parsedData, // Keep the full ResultMetadata
          diagnostics: new Map<string, vscode.Diagnostic[]>(), // Will be populated by DiagnosticProvider
          timestamp: Date.now(),
          duration: (xfiResult.durationSeconds || 0) * 1000, // Convert to milliseconds
          summary: {
            totalIssues: xfiResult.totalIssues || 0,
            filesAnalyzed: xfiResult.fileCount || 0,
            analysisTimeMs: (xfiResult.durationSeconds || 0) * 1000,
            issuesByLevel: {
              warning: xfiResult.warningCount || 0,
              error: xfiResult.errorCount || 0,
              fatality: xfiResult.fatalityCount || 0,
              exempt: xfiResult.exemptCount || 0
            }
          },
          operationId: xfiResult.executionId
        };
      } else {
        // If it's already in AnalysisResult format, return as-is
        return parsedData;
      }
    } catch (error) {
      this.logger.error('Failed to read result file:', error);
      throw new Error(
        `Failed to read analysis results from file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find bundled CLI binary (bundled with extension)
   */
  private async findBundledBinary(): Promise<CLIBinaryInfo> {
    try {
      // Get extension path using VSCode API (most reliable approach)
      const extension = vscode.extensions.getExtension(
        'zotoio.x-fidelity-vscode'
      );
      const extensionPath = extension?.extensionPath;

      const possiblePaths: string[] = [];

      if (extensionPath) {
        // Extension-relative paths (most reliable)
        possiblePaths.push(
          path.join(extensionPath, 'dist', 'cli', 'index.js'),
          path.join(extensionPath, 'cli', 'index.js')
        );
      }

      // Fallback paths relative to compiled location
      possiblePaths.push(
        // In dist directory relative to current compiled location
        path.resolve(__dirname, 'cli/index.js'),
        // In dist directory using parent directory approach
        path.resolve(__dirname, '../cli/index.js'),
        // Absolute path from extension root (safest approach)
        path.resolve(__dirname, '../../cli/index.js')
      );

      for (const bundledCliPath of possiblePaths) {
        try {
          await fs.access(bundledCliPath);
          const nodeCommand = `node ${bundledCliPath}`;
          const validated = await this.validateBinary(nodeCommand);
          if (validated.path) {
            this.logger.debug(`Found bundled CLI at: ${bundledCliPath}`);
            return validated;
          }
        } catch {
          // This path doesn't work, try next
          this.logger.debug(`Bundled CLI not found at: ${bundledCliPath}`);
        }
      }
    } catch (error) {
      this.logger.debug('Bundled binary search failed:', error);
    }

    return { path: null, version: null, source: 'not-found' };
  }

  /**
   * Find global CLI binary
   */
  private async findGlobalBinary(): Promise<CLIBinaryInfo> {
    const commands =
      process.platform === 'win32'
        ? ['where xfidelity', 'where xfi']
        : ['which xfidelity', 'which xfi'];

    for (const cmd of commands) {
      try {
        const result = await this.execCommand(cmd);
        if (result.trim()) {
          const validated = await this.validateBinary(result.trim());
          if (validated.path) {
            return validated;
          }
        }
      } catch {
        // Command failed, try next
      }
    }

    return { path: null, version: null, source: 'not-found' };
  }

  /**
   * Find local CLI binary (development mode)
   */
  private async findLocalBinary(): Promise<CLIBinaryInfo> {
    try {
      // Look for local CLI in monorepo
      const possiblePaths = [
        path.resolve(__dirname, '../../../x-fidelity-cli/dist/index.js'),
        path.resolve(__dirname, '../../../../x-fidelity-cli/dist/index.js')
      ];

      for (const localPath of possiblePaths) {
        try {
          await fs.access(localPath);
          const nodeCommand = `node ${localPath}`;
          const validated = await this.validateBinary(nodeCommand);
          if (validated.path) {
            return validated;
          }
        } catch {
          // Path doesn't exist, try next
        }
      }
    } catch (error) {
      this.logger.debug('Local binary search failed:', error);
    }

    return { path: null, version: null, source: 'not-found' };
  }

  /**
   * Validate binary exists and get version
   */
  private async validateBinary(command: string): Promise<CLIBinaryInfo> {
    try {
      // Parse command safely and add --version argument
      const parts = command.trim().split(/\s+/);
      const executablePath = parts[0];
      const existingArgs = parts.slice(1);
      const versionArgs = [...existingArgs, '--version'];

      const versionOutput = await this.execCommand(executablePath, versionArgs);
      const version = versionOutput.trim();

      if (version) {
        return { path: command, version, source: 'global' };
      }
    } catch (error) {
      this.logger.debug(`Binary validation failed for ${command}:`, error);
    }

    return { path: null, version: null, source: 'not-found' };
  }

  /**
   * Execute shell command and return output (secure implementation)
   */
  private execCommand(command: string, args: string[] = []): Promise<string> {
    return new Promise((resolve, reject) => {
      const { execFile } = require('child_process');

      // Parse command and arguments safely
      let executablePath: string;
      let execArgs: string[];

      if (args.length > 0) {
        // If args provided separately, use them directly
        executablePath = command;
        execArgs = args;
      } else {
        // Parse command string safely
        const parts = command.trim().split(/\s+/);
        executablePath = parts[0];
        execArgs = parts.slice(1);
      }

      this.logger.debug(
        `Executing secure command: ${executablePath} ${execArgs.join(' ')}`
      );

      execFile(
        executablePath,
        execArgs,
        { timeout: 120000 },
        (error: any, stdout: string, _stderr: string) => {
          if (error) {
            reject(error);
          } else {
            resolve(stdout);
          }
        }
      );
    });
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
        this.logger.info(
          'Configuration changed, CLI settings may have updated'
        );
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
