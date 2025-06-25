import * as vscode from 'vscode';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { analyzeCodebase } from '@x-fidelity/core';
import { ConfigManager, type ExtensionConfig } from '../configuration/configManager';
import { CacheManager } from './cacheManager';
import { ReportManager } from '../reports/reportManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { ProgressManager, ProgressReporter } from '../utils/progressManager';
import { getWorkspaceFolder, getAnalysisTargetDirectory, isXFidelityDevelopmentContext } from '../utils/workspaceUtils';
import type { AnalysisResult, AnalysisState, ResultMetadata } from './types';

// Re-export types for other modules
export type { AnalysisResult, AnalysisState, ResultMetadata };

export class AnalysisManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private analysisTimeout?: NodeJS.Timeout;
  private periodicTimer?: NodeJS.Timeout;
  private currentCancellationTokenSource?: vscode.CancellationTokenSource;
  private cacheManager: CacheManager;
  public reportManager: ReportManager; // Made public for ExtensionManager access
  private logger: VSCodeLogger;
  private progressManager: ProgressManager;
  private lastAnalysisResult: AnalysisResult | null = null; // Store last result for testing
  
  private readonly onAnalysisStateChanged = new vscode.EventEmitter<AnalysisState>();
  private readonly onAnalysisComplete = new vscode.EventEmitter<AnalysisResult>();
  
  constructor(
    private configManager: ConfigManager,
    private context?: vscode.ExtensionContext
  ) {
    this.logger = new VSCodeLogger('X-Fidelity Analysis');
    this.cacheManager = new CacheManager();
    this.reportManager = new ReportManager(configManager, context!);
    this.progressManager = new ProgressManager();
    this.setupEventListeners();
  }
  
  get onDidAnalysisStateChange(): vscode.Event<AnalysisState> {
    return this.onAnalysisStateChanged.event;
  }
  
  get onDidAnalysisComplete(): vscode.Event<AnalysisResult> {
    return this.onAnalysisComplete.event;
  }

  get isAnalysisRunning(): boolean {
    return this.isAnalyzing;
  }

  // Method to get current analysis results for testing
  getCurrentResults(): AnalysisResult | null {
    return this.lastAnalysisResult;
  }

  getLogger(): VSCodeLogger {
    return this.logger;
  }

  async cancelAnalysis(): Promise<void> {
    if (!this.isAnalyzing || !this.currentCancellationTokenSource) {
      this.logger.info('No analysis to cancel');
      return;
    }

    this.logger.info('Cancelling analysis...');
    this.currentCancellationTokenSource.cancel();
    
    // Update state to cancelled
    this.onAnalysisStateChanged.fire({
      status: 'idle',
      progress: 0
    });

    vscode.window.showInformationMessage('Analysis cancelled');
  }
  
  async runAnalysis(options?: { forceRefresh?: boolean }): Promise<AnalysisResult | null> {
    const operationId = `analysis-${Date.now()}`;
    const startTime = performance.now();
    
    if (this.isAnalyzing) {
      this.logger.warn('Analysis already in progress, skipping request', { operationId });
      vscode.window.showInformationMessage('Analysis already in progress...');
      return null;
    }
    
    const config = this.configManager.getConfig();
    const analysisTargetPath = getAnalysisTargetDirectory();
    
    if (!analysisTargetPath) {
      this.logger.error('No valid analysis target found', { operationId });
      vscode.window.showErrorMessage('No workspace or analysis target found');
      return null;
    }

    // Get workspace folder for UI purposes (what user sees in VSCode)
    const workspaceFolder = getWorkspaceFolder();
    const workspaceName = workspaceFolder?.name || path.basename(analysisTargetPath);
    
    // Log context information
    const isDevelopmentContext = isXFidelityDevelopmentContext();
    this.logger.info('Analysis context determined', {
      operationId,
      isDevelopmentContext,
      analysisTargetPath,
      workspaceDisplayPath: workspaceFolder?.uri.fsPath,
      workspaceName
    });

    // Create cancellation token with timeout
    this.currentCancellationTokenSource = new vscode.CancellationTokenSource();
    const timeoutHandle = setTimeout(() => {
      this.logger.warn('Analysis timeout reached, cancelling', { 
        operationId, 
        timeout: config.analysisTimeout 
      });
      this.currentCancellationTokenSource?.cancel();
    }, config.analysisTimeout);

    this.isAnalyzing = true;
    
    this.logger.info('Starting analysis', { 
      operationId,
      analysisTargetPath,
      workspaceName,
      archetype: config.archetype,
      forceRefresh: options?.forceRefresh,
      context: isDevelopmentContext ? 'development' : 'user',
      startTime
    });
    
    try {
      // Performance checkpoint: Cache check
      const cacheCheckStart = performance.now();
      const cached = await this.cacheManager.getCachedResult(analysisTargetPath, options?.forceRefresh);
      const cacheCheckTime = performance.now() - cacheCheckStart;
      
      this.logger.debug('Cache check completed', { 
        operationId, 
        cacheCheckTime, 
        cacheHit: !!cached 
      });
      
      if (cached && !this.currentCancellationTokenSource.token.isCancellationRequested) {
        this.logger.info('Using cached analysis result', { operationId, cacheCheckTime });
        this.onAnalysisComplete.fire(cached);
        return cached;
      }
      
      // Update state with progress tracking
      this.onAnalysisStateChanged.fire({
        status: 'analyzing',
        progress: 0,
        operationId
      });
      
      // Run analysis with comprehensive progress tracking
      const result = await this.performAnalysisWithProgress(
        analysisTargetPath, 
        workspaceName,
        config, 
        this.currentCancellationTokenSource.token,
        operationId
      );
      
      // Performance checkpoint: Diagnostics conversion
      const diagnosticsStart = performance.now();
      const diagnostics = this.convertToDiagnostics(result);
      const diagnosticsTime = performance.now() - diagnosticsStart;
      
      this.logger.debug('Diagnostics conversion completed', { 
        operationId, 
        diagnosticsTime,
        diagnosticsCount: diagnostics.size 
      });
      
      const totalTime = performance.now() - startTime;
      const analysisResult: AnalysisResult = {
        metadata: result,
        diagnostics,
        timestamp: Date.now(),
        duration: totalTime,
        summary: {
          totalIssues: result.XFI_RESULT.totalIssues,
          filesAnalyzed: result.XFI_RESULT.fileCount,
          analysisTimeMs: totalTime,
          issuesByLevel: this.calculateIssuesByLevel(result)
        },
        operationId
      };
      
      // Performance monitoring
      if (totalTime > 10000) { // 10 seconds
        this.logger.warn('Slow analysis detected', { 
          operationId, 
          totalTime, 
          filesAnalyzed: result.XFI_RESULT.fileCount 
        });
      }
      
      this.logger.info('Analysis completed successfully', { 
        operationId,
        duration: totalTime,
        totalIssues: result.XFI_RESULT.totalIssues,
        filesAnalyzed: result.XFI_RESULT.fileCount
      });
      
      // Cache and generate reports asynchronously
      this.performPostAnalysisOperations(analysisTargetPath, analysisResult, config, operationId);
      
      // Update state
      this.onAnalysisStateChanged.fire({
        status: 'complete',
        progress: 100,
        operationId
      });
      
      this.lastAnalysisResult = analysisResult;
      this.onAnalysisComplete.fire(analysisResult);
      return analysisResult;
      
    } catch (error) {
      const totalTime = performance.now() - startTime;
      
      if (this.currentCancellationTokenSource?.token.isCancellationRequested) {
        this.logger.info('Analysis cancelled by user', { operationId, totalTime });
        this.onAnalysisStateChanged.fire({
          status: 'idle',
          progress: 0,
          operationId
        });
        return null;
      }

      const analysisError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Analysis failed', { 
        operationId, 
        error: analysisError.message, 
        totalTime,
        stack: analysisError.stack,
        analysisTargetPath,
        workspaceName
      });
      
      this.onAnalysisStateChanged.fire({
        status: 'error',
        error: analysisError,
        operationId
      });
      
      vscode.window.showErrorMessage(`Analysis failed: ${analysisError.message}`);
      return null;
      
    } finally {
      clearTimeout(timeoutHandle);
      this.isAnalyzing = false;
      this.currentCancellationTokenSource?.dispose();
      this.currentCancellationTokenSource = undefined;
      
      const finalTime = performance.now() - startTime;
      this.logger.debug('Analysis cleanup completed', { operationId, finalTime });
    }
  }
  
  scheduleAnalysis(delay: number = 1000): void {
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }
    
    this.analysisTimeout = setTimeout(() => {
      this.runAnalysis();
    }, delay);
  }
  
  startPeriodicAnalysis(): void {
    const config = this.configManager.getConfig();
    
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
    }
    
    if (config.runInterval > 0) {
      // Add safeguards to prevent performance issues
      const minInterval = 60; // Minimum 1 minute between periodic runs
      const actualInterval = Math.max(config.runInterval, minInterval);
      
      if (actualInterval !== config.runInterval) {
        this.logger.warn(`Periodic analysis interval increased from ${config.runInterval}s to ${actualInterval}s to prevent performance issues`);
      }
      
      this.periodicTimer = setInterval(() => {
        if (!this.isAnalyzing) {
          this.logger.info('Running periodic analysis...');
          this.runAnalysis();
        } else {
          this.logger.debug('Skipping periodic analysis - analysis already in progress');
        }
      }, actualInterval * 1000);
      
      this.logger.info(`Periodic analysis started with interval: ${actualInterval}s`);
    } else {
      this.logger.info('Periodic analysis disabled (runInterval = 0)');
    }
  }
  
  stopPeriodicAnalysis(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = undefined;
    }
  }
  
  private setupEventListeners(): void {
    // Listen for configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.startPeriodicAnalysis(); // Restart with new interval
      })
    );
  }
  
  // Add this new method for async post-processing:
  private async performPostAnalysisOperations(
    analysisTargetPath: string,
    analysisResult: AnalysisResult,
    config: ExtensionConfig,
    operationId: string
  ): Promise<void> {
    try {
      // Cache result asynchronously
      if (config.cacheResults) {
        const cacheStart = performance.now();
        await this.cacheManager.cacheResult(analysisTargetPath, analysisResult);
        const cacheTime = performance.now() - cacheStart;
        this.logger.debug('Result cached', { operationId, cacheTime });
      }
      
      // Generate reports asynchronously
      if (config.generateReports) {
        const reportStart = performance.now();
        await this.reportManager.generateReports(analysisResult.metadata, analysisTargetPath);
        const reportTime = performance.now() - reportStart;
        this.logger.debug('Reports generated', { operationId, reportTime });
      }
      
    } catch (error) {
      this.logger.error('Post-analysis operations failed', { 
        operationId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  private async performAnalysisWithProgress(
    analysisTargetPath: string,
    workspaceName: string, 
    config: ExtensionConfig,
    cancellationToken: vscode.CancellationToken,
    operationId: string
  ): Promise<ResultMetadata> {
    return await this.progressManager.runWithProgress(
      'X-Fidelity Analysis',
      async (reporter: ProgressReporter, token: vscode.CancellationToken) => {
        // Phase 1: Initializing
        reporter.updatePhaseProgress(50, 'Setting up analysis environment...');
        
        this.logger.info('Starting enhanced analysis', {
          workspacePath: analysisTargetPath,
          workspaceName: workspaceName,
          archetype: config.archetype,
          configServer: config.configServer
        });
        
        reporter.updatePhaseProgress(100, 'Analysis environment ready');
        
        // Phase 2: Scanning Files
        reporter.nextPhase('Scanning project files...');
        const repoPath = analysisTargetPath;
        const configServer = config.configServer && config.configServer.trim() && 
          (config.configServer.startsWith('http://') || config.configServer.startsWith('https://')) 
          ? config.configServer : undefined;
        const localConfigPath = this.configManager.getResolvedLocalConfigPath();
        
        reporter.updatePhaseProgress(100, 'File scan complete');
        
        // Phase 3: Loading Plugins
        reporter.nextPhase('Initializing analysis plugins...');
        
        // Check for cancellation before starting the core analysis
        if (cancellationToken.isCancellationRequested || token.isCancellationRequested) {
          throw new vscode.CancellationError();
        }
        
        reporter.updatePhaseProgress(100, 'Plugins loaded successfully');
        
        // Phase 4: Running Analysis (main work)
        reporter.nextPhase('Executing code quality analysis...');
        
        const result = await analyzeCodebase({
          repoPath,
          archetype: config.archetype,
          configServer,
          localConfigPath
        });
        
        // Check for cancellation after analysis
        if (cancellationToken.isCancellationRequested || token.isCancellationRequested) {
          throw new vscode.CancellationError();
        }
        
        reporter.updatePhaseProgress(100, 'Analysis execution complete');
        
        // Phase 5: Processing Results
        reporter.nextPhase('Converting analysis results...');
        
        this.logger.info('Analysis completed', {
          duration: result.XFI_RESULT.durationSeconds,
          totalIssues: result.XFI_RESULT.totalIssues,
          filesAnalyzed: result.XFI_RESULT.fileCount
        });
        
        reporter.updatePhaseProgress(100, 'Results processed successfully');
        
        // Phase 6: Finalizing
        reporter.nextPhase('Completing analysis...');
        reporter.updatePhaseProgress(100, 'Analysis complete');
        
        return result;
      }
    ) || await this.performAnalysis(analysisTargetPath, workspaceName, config, cancellationToken);
  }
  
  private async performAnalysis(
    analysisTargetPath: string,
    workspaceName: string, 
    config: ExtensionConfig,
    cancellationToken: vscode.CancellationToken,
    operationId?: string
  ): Promise<ResultMetadata> {
    return await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'X-Fidelity Analysis',
      cancellable: true
    }, async (progress, token) => {
      progress.report({ message: 'Initializing...', increment: 10 });
      
      this.logger.info('Starting analysis', {
        workspacePath: analysisTargetPath,
        workspaceName: workspaceName,
        archetype: config.archetype,
        configServer: config.configServer
      });
      
      const repoPath = analysisTargetPath;
      // Only pass configServer if it's a valid URL to prevent DNS lookup errors
      const configServer = config.configServer && config.configServer.trim() && 
        (config.configServer.startsWith('http://') || config.configServer.startsWith('https://')) 
        ? config.configServer : undefined;
      const localConfigPath = this.configManager.getResolvedLocalConfigPath();
      
      progress.report({ message: 'Running analysis...', increment: 30 });
      
      // Check for cancellation before starting the core analysis
      if (cancellationToken.isCancellationRequested || token.isCancellationRequested) {
        throw new vscode.CancellationError();
      }
      
      const result = await analyzeCodebase({
        repoPath,
        archetype: config.archetype,
        configServer,
        localConfigPath
      });
      
      // Check for cancellation after analysis
      if (cancellationToken.isCancellationRequested || token.isCancellationRequested) {
        throw new vscode.CancellationError();
      }
      
      progress.report({ message: 'Processing results...', increment: 80 });
      
      this.logger.info('Analysis completed', {
        duration: result.XFI_RESULT.durationSeconds,
        totalIssues: result.XFI_RESULT.totalIssues,
        filesAnalyzed: result.XFI_RESULT.fileCount
      });
      
      progress.report({ message: 'Finalizing...', increment: 100 });
      
      return result;
    });
  }
  
  private convertToDiagnostics(result: ResultMetadata): Map<string, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();
    
    // Get workspace folder to make paths relative
    const workspaceFolder = getWorkspaceFolder();
    const workspacePath = workspaceFolder?.uri.fsPath;
    
    for (const detail of result.XFI_RESULT.issueDetails) {
      // Include all issues, including global ones, but handle them appropriately
      const diagnostics: vscode.Diagnostic[] = detail.errors
        .map(error => this.createDiagnostic(error));
      
      if (diagnostics.length > 0) {
        let filePath: string;
        
        // For global issues, use a special file path that VSCode can handle
        if (detail.filePath === 'REPO_GLOBAL_CHECK') {
          filePath = 'README.md'; // Use README.md as a fallback for global issues
        } else {
          // Convert absolute paths to relative paths within the workspace
          if (workspacePath && detail.filePath.startsWith(workspacePath)) {
            filePath = path.relative(workspacePath, detail.filePath);
          } else if (path.isAbsolute(detail.filePath)) {
            // If absolute path doesn't contain workspace path, try to extract relative part
            const analysisTargetPath = getAnalysisTargetDirectory();
            if (analysisTargetPath && detail.filePath.startsWith(analysisTargetPath)) {
              filePath = path.relative(analysisTargetPath, detail.filePath);
            } else {
              // Fallback: use just the filename portion
              filePath = path.basename(detail.filePath);
            }
          } else {
            // Already relative
            filePath = detail.filePath;
          }
        }
        
        this.logger.debug('Converting file path for diagnostics', { 
          originalPath: detail.filePath,
          workspacePath,
          convertedPath: filePath
        });
        
        diagnosticsMap.set(filePath, diagnostics);
      }
    }
    
    return diagnosticsMap;
  }
  
  private shouldIncludeError(_error: any, _config: ExtensionConfig): boolean {
    // Always include all errors for accurate reporting - filtering should only affect display
    return true;
  }
  
  private createDiagnostic(error: any): vscode.Diagnostic {
    const lineInfo = this.parseLineColumnInfo(error.details?.message || error.ruleFailure, error.details);
    const severity = this.mapErrorLevelToSeverity(error.level);
    
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(lineInfo.line, lineInfo.column, lineInfo.endLine, lineInfo.endColumn),
      error.details?.message || error.ruleFailure,
      severity
    );
    
    diagnostic.source = 'X-Fidelity';
    diagnostic.code = error.ruleFailure;
    
    // Enhanced metadata for better navigation and context
    (diagnostic as any).ruleId = error.ruleFailure;
    (diagnostic as any).category = error.category || 'general';
    (diagnostic as any).fixable = error.fixable || false;
    
    // Enhanced position metadata - preserve original XFI core data for reference
    if (error.details) {
      (diagnostic as any).enhancedPosition = {
        hasPositionData: error.details.hasPositionData || false,
        hasMultipleMatches: error.details.hasMultipleMatches || false,
        // Preserve original XFI core range data (1-based)
        originalRange: error.details.range,
        originalPosition: error.details.position,
        originalMatches: error.details.matches,
        // Also include converted range for consistency
        range: error.details.range ? {
          start: {
            line: error.details.range.start?.line || 1,
            column: error.details.range.start?.column || 1
          },
          end: {
            line: error.details.range.end?.line || error.details.range.start?.line || 1,
            column: error.details.range.end?.column || error.details.range.start?.column || 1
          }
        } : undefined,
        position: error.details.position,
        matches: error.details.matches,
        context: error.details.matches?.[0]?.context
      };
      
      // Legacy position fields for backward compatibility (preserve original 1-based values)
      (diagnostic as any).lineNumber = error.details.lineNumber;
      (diagnostic as any).columnNumber = error.details.columnNumber;
      (diagnostic as any).startLine = error.details.startLine;
      (diagnostic as any).endLine = error.details.endLine;
      (diagnostic as any).startColumn = error.details.startColumn;
      (diagnostic as any).endColumn = error.details.endColumn;
    }
    
    return diagnostic;
  }
  
  private parseLineColumnInfo(message: string, details: any): {
    line: number; column: number; endLine: number; endColumn: number;
  } {
    let line = 0, column = 0, endLine = 0, endColumn = 0;
    
    // PRIORITY 1: Enhanced position data with range (XFI core provides 1-based, convert to 0-based for VSCode)
    if (details && details.range) {
      const range = details.range;
      if (range.start && typeof range.start.line === 'number' && typeof range.start.column === 'number') {
        // XFI core provides 1-based line/column numbers, VSCode expects 0-based
        line = Math.max(0, range.start.line - 1);
        column = Math.max(0, range.start.column - 1);
        
        if (range.end && typeof range.end.line === 'number' && typeof range.end.column === 'number') {
          endLine = Math.max(0, range.end.line - 1);
          endColumn = Math.max(0, range.end.column - 1);
        } else {
          endLine = line;
          endColumn = column + 1;
        }
        
        this.logger.debug('Using enhanced range position data', { 
          xfiRange: range, 
          vscodeRange: { line, column, endLine, endColumn }
        });
        return { line, column, endLine, endColumn };
      }
    }
    
    // PRIORITY 2: Enhanced position data with position field (XFI core provides 1-based)
    if (details && details.position) {
      const pos = details.position;
      if (typeof pos.line === 'number' && typeof pos.column === 'number') {
        // XFI core provides 1-based line/column numbers, VSCode expects 0-based
        line = Math.max(0, pos.line - 1);
        column = Math.max(0, pos.column - 1);
        endLine = line;
        endColumn = column + 1;
        
        this.logger.debug('Using enhanced position data', { 
          xfiPosition: pos, 
          vscodeRange: { line, column, endLine, endColumn }
        });
        return { line, column, endLine, endColumn };
      }
    }
    
    // PRIORITY 3: Enhanced position data from first match in matches array (XFI core provides 1-based)
    if (details && details.matches && Array.isArray(details.matches) && details.matches.length > 0) {
      const firstMatch = details.matches[0];
      if (firstMatch.range && firstMatch.range.start) {
        // XFI core provides 1-based line/column numbers, VSCode expects 0-based
        line = Math.max(0, firstMatch.range.start.line - 1);
        column = Math.max(0, firstMatch.range.start.column - 1);
        
        if (firstMatch.range.end) {
          endLine = Math.max(0, firstMatch.range.end.line - 1);
          endColumn = Math.max(0, firstMatch.range.end.column - 1);
        } else {
          endLine = line;
          endColumn = column + (firstMatch.match ? firstMatch.match.length : 1);
        }
        
        this.logger.debug('Using enhanced match position data', { 
          xfiMatch: firstMatch, 
          vscodeRange: { line, column, endLine, endColumn }
        });
        return { line, column, endLine, endColumn };
      }
    }
    
    // PRIORITY 4: Legacy position fields (XFI core provides 1-based, convert to 0-based)
    if (details) {
      let hasLegacyData = false;
      
      // Enhanced fields first (1-based from XFI core)
      if (typeof details.startLine === 'number' && details.startLine > 0) {
        line = details.startLine - 1;
        hasLegacyData = true;
      }
      if (typeof details.endLine === 'number' && details.endLine > 0) {
        endLine = details.endLine - 1;
        hasLegacyData = true;
      }
      if (typeof details.startColumn === 'number' && details.startColumn > 0) {
        column = details.startColumn - 1;
        hasLegacyData = true;
      }
      if (typeof details.endColumn === 'number' && details.endColumn > 0) {
        endColumn = details.endColumn - 1;
        hasLegacyData = true;
      }
      
      // Legacy fields as fallback (1-based from XFI core)
      if (!hasLegacyData && typeof details.lineNumber === 'number' && details.lineNumber > 0) {
        line = details.lineNumber - 1;
        endLine = line;
        hasLegacyData = true;
      }
      if (!hasLegacyData && typeof details.columnNumber === 'number' && details.columnNumber > 0) {
        column = details.columnNumber - 1;
        endColumn = column + (details.length || 1);
        hasLegacyData = true;
      }
      
      if (hasLegacyData) {
        // Ensure we have valid end positions
        if (endLine === 0 && line > 0) {endLine = line;}
        if (endColumn === 0 && column >= 0) {endColumn = column + 1;}
        
        this.logger.debug('Using legacy position data', { 
          xfiDetails: { 
            lineNumber: details.lineNumber, 
            columnNumber: details.columnNumber, 
            startLine: details.startLine, 
            endLine: details.endLine, 
            startColumn: details.startColumn, 
            endColumn: details.endColumn 
          },
          vscodeRange: { line, column, endLine, endColumn }
        });
        return { line, column, endLine, endColumn };
      }
    }
    
    // PRIORITY 5: Fallback - parse from message text (assume 1-based in message, convert to 0-based)
    const patterns = [
      /line\s+(\d+)(?:,?\s*column\s+(\d+))?/i,
      /(\d+):(\d+)/,
      /at\s+line\s+(\d+)/i,
      /\((\d+),(\d+)\)/
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const parsedLine = parseInt(match[1], 10);
        const parsedColumn = match[2] ? parseInt(match[2], 10) : 1;
        
        if (parsedLine > 0) {
          line = parsedLine - 1; // Convert 1-based to 0-based
          endLine = line;
        }
        if (parsedColumn > 0) {
          column = parsedColumn - 1; // Convert 1-based to 0-based
          endColumn = column + 1;
        }
        
        this.logger.debug('Using fallback message parsing', { 
          message, 
          pattern: pattern.source,
          parsedLine,
          parsedColumn,
          vscodeRange: { line, column, endLine, endColumn }
        });
        break;
      }
    }
    
    // Ensure valid ranges (all should be 0-based for VSCode)
    line = Math.max(0, line);
    column = Math.max(0, column);
    endLine = Math.max(line, endLine);
    endColumn = Math.max(column + 1, endColumn);
    
    return { line, column, endLine, endColumn };
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
  
  private mapSeverityToLevel(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      default:
        return 'hint';
    }
  }
  
  private getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    return vscode.workspace.workspaceFolders?.[0];
  }
  
  private calculateIssuesByLevel(result: ResultMetadata): Record<string, number> {
    const issuesByLevel: Record<string, number> = {};
    
    for (const detail of result.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        const level = error.level || 'unknown';
        issuesByLevel[level] = (issuesByLevel[level] || 0) + 1;
      }
    }
    
    return issuesByLevel;
  }
  
  dispose(): void {
    this.stopPeriodicAnalysis();
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }
    this.disposables.forEach(d => d.dispose());
    this.onAnalysisStateChanged.dispose();
    this.onAnalysisComplete.dispose();
  }
} 
