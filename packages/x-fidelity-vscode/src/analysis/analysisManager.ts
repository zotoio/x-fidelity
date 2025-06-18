import * as vscode from 'vscode';
import * as path from 'path';
import { analyzeCodebase } from '@x-fidelity/core';
import { ConfigManager, type ExtensionConfig } from '../configuration/configManager';
import { CacheManager } from './cacheManager';
import { ReportManager } from '../reports/reportManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import type { AnalysisResult, AnalysisState, ResultMetadata } from './types';

// Re-export types for other modules
export type { AnalysisResult, AnalysisState, ResultMetadata };

export class AnalysisManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private isAnalyzing = false;
  private analysisTimeout?: NodeJS.Timeout;
  private periodicTimer?: NodeJS.Timeout;
  private cacheManager: CacheManager;
  public reportManager: ReportManager; // Made public for ExtensionManager access
  private logger: VSCodeLogger;
  
  private readonly onAnalysisStateChanged = new vscode.EventEmitter<AnalysisState>();
  private readonly onAnalysisComplete = new vscode.EventEmitter<AnalysisResult>();
  
  constructor(
    private configManager: ConfigManager,
    private context?: vscode.ExtensionContext
  ) {
    this.logger = new VSCodeLogger('X-Fidelity Analysis');
    this.cacheManager = new CacheManager();
    this.reportManager = new ReportManager(configManager, context!);
    this.setupEventListeners();
  }
  
  get onDidAnalysisStateChange(): vscode.Event<AnalysisState> {
    return this.onAnalysisStateChanged.event;
  }
  
  get onDidAnalysisComplete(): vscode.Event<AnalysisResult> {
    return this.onAnalysisComplete.event;
  }
  
  async runAnalysis(options?: { forceRefresh?: boolean }): Promise<AnalysisResult | null> {
    if (this.isAnalyzing) {
      this.logger.info('Analysis already in progress, skipping request');
      vscode.window.showInformationMessage('Analysis already in progress...');
      return null;
    }
    
    const config = this.configManager.getConfig();
    const workspaceFolder = this.getWorkspaceFolder();
    
    if (!workspaceFolder) {
      this.logger.error('No workspace folder found for analysis');
      vscode.window.showErrorMessage('No workspace folder found for analysis');
      return null;
    }
    
    this.isAnalyzing = true;
    const startTime = Date.now();
    
    this.logger.info('Starting analysis', { 
      workspaceFolder: workspaceFolder.uri.fsPath, 
      archetype: config.archetype,
      forceRefresh: options?.forceRefresh 
    });
    
    try {
      // Check cache first
      if (!options?.forceRefresh && config.cacheResults) {
        this.logger.debug('Checking cache for existing results');
        const cached = await this.cacheManager.getCachedResult(workspaceFolder.uri.fsPath);
        if (cached) {
          this.logger.info('Using cached analysis result');
          this.onAnalysisComplete.fire(cached);
          return cached;
        }
      }
      
      // Update state
      this.onAnalysisStateChanged.fire({
        status: 'analyzing',
        progress: 0
      });
      
      // Run X-Fidelity analysis
      this.logger.debug('Performing X-Fidelity analysis');
      const result = await this.performAnalysis(workspaceFolder, config);
      this.logger.debug('Converting results to diagnostics');
      const diagnostics = this.convertToDiagnostics(result);
      
      const analysisResult: AnalysisResult = {
        metadata: result,
        diagnostics,
        timestamp: Date.now(),
        duration: Date.now() - startTime
      };
      
      this.logger.info('Analysis completed', { 
        duration: analysisResult.duration,
        totalIssues: result.XFI_RESULT.totalIssues,
        filesAnalyzed: result.XFI_RESULT.issueDetails.length
      });
      
      // Cache result
      if (config.cacheResults) {
        this.logger.debug('Caching analysis result');
        await this.cacheManager.cacheResult(workspaceFolder.uri.fsPath, analysisResult);
      }
      
      // Generate reports
      if (config.generateReports) {
        this.logger.debug('Generating reports');
        await this.reportManager.generateReports(result, workspaceFolder.uri.fsPath);
      }
      
      // Update state
      this.onAnalysisStateChanged.fire({
        status: 'complete',
        progress: 100
      });
      
      this.onAnalysisComplete.fire(analysisResult);
      return analysisResult;
      
    } catch (error) {
      const analysisError = error instanceof Error ? error : new Error(String(error));
      
      this.logger.error('Analysis failed', { error: analysisError.message, stack: analysisError.stack });
      
      this.onAnalysisStateChanged.fire({
        status: 'error',
        error: analysisError
      });
      
      vscode.window.showErrorMessage(`Analysis failed: ${analysisError.message}`);
      return null;
      
    } finally {
      this.isAnalyzing = false;
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
      this.periodicTimer = setInterval(() => {
        if (!this.isAnalyzing) {
          this.runAnalysis();
        }
      }, config.runInterval * 1000);
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
  
  private async performAnalysis(
    workspaceFolder: vscode.WorkspaceFolder, 
    config: ExtensionConfig
  ): Promise<ResultMetadata> {
    return await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'X-Fidelity Analysis',
      cancellable: false
    }, async (progress) => {
      progress.report({ message: 'Initializing...', increment: 10 });
      
      // Create .xfiResults directory and set up file logging
      const resultsDir = path.join(workspaceFolder.uri.fsPath, '.xfiResults');
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(resultsDir));
      const logFilePath = path.join(resultsDir, 'x-fidelity.log');
      
      // Create analysis-specific logger that reuses the existing output channel but adds file logging
      const analysisLogger = new VSCodeLogger('X-Fidelity Analysis', logFilePath, '', this.logger.getOutputChannel());
      
      // Use resolved local config path that follows the specified resolution order
      const resolvedLocalConfigPath = this.configManager.getResolvedLocalConfigPath();
      
      const result = await analyzeCodebase({
        repoPath: workspaceFolder.uri.fsPath,
        archetype: config.archetype,
        configServer: config.configServer,
        localConfigPath: resolvedLocalConfigPath,
        executionLogPrefix: `vscode-ext-${Date.now()}`,
        logger: analysisLogger
      });
      
      progress.report({ message: 'Analysis complete', increment: 90 });
      return result;
    });
  }
  
  private convertToDiagnostics(result: ResultMetadata): Map<string, vscode.Diagnostic[]> {
    const diagnosticsMap = new Map<string, vscode.Diagnostic[]>();
    const config = this.configManager.getConfig();
    
    for (const detail of result.XFI_RESULT.issueDetails) {
      if (detail.filePath === 'REPO_GLOBAL_CHECK') {
        continue; // Skip global issues for diagnostics
      }
      
      const diagnostics: vscode.Diagnostic[] = detail.errors
        .filter(error => this.shouldIncludeError(error, config))
        .map(error => this.createDiagnostic(error));
      
      if (diagnostics.length > 0) {
        diagnosticsMap.set(detail.filePath, diagnostics);
      }
    }
    
    return diagnosticsMap;
  }
  
  private shouldIncludeError(error: any, config: ExtensionConfig): boolean {
    const severity = this.mapErrorLevelToSeverity(error.level);
    const severityLevel = this.mapSeverityToLevel(severity);
    return config.highlightSeverity.includes(severityLevel as any);
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
    
    // Add additional metadata for enhanced features
    (diagnostic as any).ruleId = error.ruleFailure;
    (diagnostic as any).category = error.category || 'general';
    (diagnostic as any).fixable = error.fixable || false;
    
    return diagnostic;
  }
  
  private parseLineColumnInfo(message: string, details: any): {
    line: number; column: number; endLine: number; endColumn: number;
  } {
    let line = 0, column = 0, endLine = 0, endColumn = 0;
    
    // Try to extract from details first (more reliable)
    if (details) {
      if (typeof details.lineNumber === 'number') {
        line = Math.max(0, details.lineNumber - 1);
        endLine = line;
      }
      if (typeof details.columnNumber === 'number') {
        column = Math.max(0, details.columnNumber - 1);
        endColumn = column + (details.length || 1);
      }
      if (typeof details.startLine === 'number') {
        line = Math.max(0, details.startLine - 1);
      }
      if (typeof details.endLine === 'number') {
        endLine = Math.max(0, details.endLine - 1);
      }
      if (typeof details.startColumn === 'number') {
        column = Math.max(0, details.startColumn);
      }
      if (typeof details.endColumn === 'number') {
        endColumn = Math.max(0, details.endColumn);
      }
    }
    
    // Fallback: try to parse from message
    if (line === 0 && column === 0) {
      const patterns = [
        /line\s+(\d+)(?:,?\s*column\s+(\d+))?/i,
        /(\d+):(\d+)/,
        /at\s+line\s+(\d+)/i,
        /\((\d+),(\d+)\)/
      ];
      
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          line = Math.max(0, parseInt(match[1], 10) - 1);
          if (match[2]) {
            column = Math.max(0, parseInt(match[2], 10) - 1);
          }
          endLine = line;
          endColumn = column + 1;
          break;
        }
      }
    }
    
    // Ensure valid ranges
    if (endLine < line) endLine = line;
    if (endColumn <= column) endColumn = column + 1;
    
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