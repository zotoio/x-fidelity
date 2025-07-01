import * as vscode from 'vscode';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { FileWatcherManager } from '../utils/fileWatcherManager';
import { getAnalysisTargetDirectory } from '../utils/workspaceUtils';
import { analyzeCodebase } from '@x-fidelity/core';
import { options } from '@x-fidelity/core';
import path from 'path';

const logger = new VSCodeLogger('PeriodicAnalysisManager');

export interface PeriodicAnalysisConfig {
  enabled: boolean;
  intervalMinutes: number;
  onlyActiveFiles: boolean;
  minIdleTimeSeconds: number;
  maxFilesPerRun: number;
  excludePatterns: string[];
}

export class PeriodicAnalysisManager {
  private static instance: PeriodicAnalysisManager | null = null;
  private timer: NodeJS.Timeout | null = null;
  private fileWatcher: FileWatcherManager | null = null;
  private lastAnalysisTime = 0;
  private isRunning = false;
  private lastActiveTime = Date.now();
  private config: PeriodicAnalysisConfig;
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    this.config = this.loadConfiguration();
    this.setupActivityTracking();
  }

  public static getInstance(): PeriodicAnalysisManager {
    if (!PeriodicAnalysisManager.instance) {
      PeriodicAnalysisManager.instance = new PeriodicAnalysisManager();
    }
    return PeriodicAnalysisManager.instance;
  }

  private loadConfiguration(): PeriodicAnalysisConfig {
    const config = vscode.workspace.getConfiguration(
      'xfidelity.periodicAnalysis'
    );
    return {
      enabled: config.get('enabled', false),
      intervalMinutes: config.get('intervalMinutes', 10),
      onlyActiveFiles: config.get('onlyActiveFiles', true),
      minIdleTimeSeconds: config.get('minIdleTimeSeconds', 30),
      maxFilesPerRun: config.get('maxFilesPerRun', 5),
      excludePatterns: config.get('excludePatterns', [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.log',
        '**/.*'
      ])
    };
  }

  private setupActivityTracking(): void {
    // Track text document changes to detect user activity
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(() => {
        this.lastActiveTime = Date.now();
      })
    );

    // Track active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.lastActiveTime = Date.now();
      })
    );

    // Track configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('xfidelity.periodicAnalysis')) {
          this.config = this.loadConfiguration();
          this.restart();
        }
      })
    );
  }

  public start(): void {
    if (!this.config.enabled) {
      logger.info('⏸️ Periodic analysis is disabled');
      return;
    }

    if (this.timer) {
      this.stop();
    }

    logger.info(
      `🔄 Starting periodic analysis every ${this.config.intervalMinutes} minutes`
    );

    // Initialize file watcher
    this.fileWatcher = FileWatcherManager.getInstance();
    this.fileWatcher.startWatching({
      enabled: true,
      trackActiveFiles: true,
      prioritizeActiveFiles: true,
      debounceMs: 1000,
      maxTrackedChanges: 100
    });

    // Set up periodic timer
    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.timer = setInterval(async () => {
      await this.runPeriodicAnalysis();
    }, intervalMs);

    // Run initial analysis if idle
    setTimeout(async () => {
      await this.runPeriodicAnalysis();
    }, 5000); // 5 second delay on startup
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('⏹️ Stopped periodic analysis');
    }

    if (this.fileWatcher) {
      this.fileWatcher.stopWatching();
      this.fileWatcher = null;
    }
  }

  public restart(): void {
    this.stop();
    if (this.config.enabled) {
      this.start();
    }
  }

  private async runPeriodicAnalysis(): Promise<void> {
    try {
      // Check if analysis is already running
      if (this.isRunning) {
        logger.debug('Analysis already running, skipping');
        return;
      }

      // Check if user has been idle long enough
      const idleTime = (Date.now() - this.lastActiveTime) / 1000;
      if (idleTime < this.config.minIdleTimeSeconds) {
        logger.debug(
          `User active recently (${idleTime.toFixed(1)}s ago), skipping analysis`
        );
        return;
      }

      // Get files to analyze
      const filesToAnalyze = this.getFilesToAnalyze();
      if (filesToAnalyze.length === 0) {
        logger.debug('No files to analyze');
        return;
      }

      this.isRunning = true;
      logger.info(
        `🎯 Running periodic analysis on ${filesToAnalyze.length} files`
      );

      const workspaceRoot = getAnalysisTargetDirectory();
      if (!workspaceRoot) {
        logger.warn('No workspace found for analysis');
        return;
      }

      // Get current archetype from configuration
      const config = vscode.workspace.getConfiguration('xfidelity');
      const archetype = config.get('archetype', 'node-fullstack');

      // Convert absolute paths to relative paths
      const relativePaths = filesToAnalyze.map(filePath => {
        return path.relative(workspaceRoot, filePath);
      });

      // Set up zapFiles in options (temporarily modify global options)
      const originalZapFiles = options.zapFiles;
      const originalDir = options.dir;
      const originalFileCacheTTL = options.fileCacheTTL;

      try {
        // Temporarily set options for this analysis
        options.zapFiles = relativePaths;
        options.dir = workspaceRoot;
        options.fileCacheTTL = 60;

        // Run targeted analysis using zapfiles
        const startTime = Date.now();
        await analyzeCodebase({
          repoPath: workspaceRoot,
          archetype: archetype
        });

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        this.lastAnalysisTime = Date.now();

        logger.info(`✅ Periodic analysis completed in ${duration}s`);

        // Emit event for UI updates
        this.fileWatcher?.onPeriodicAnalysisCompleted.fire({
          filesAnalyzed: filesToAnalyze.length,
          duration: parseFloat(duration),
          timestamp: Date.now()
        });
      } finally {
        // Restore original options
        options.zapFiles = originalZapFiles;
        options.dir = originalDir;
        options.fileCacheTTL = originalFileCacheTTL;
      }
    } catch (error) {
      logger.error('Periodic analysis failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private getFilesToAnalyze(): string[] {
    const files: string[] = [];

    if (this.config.onlyActiveFiles) {
      // Get currently open files
      const openFiles = vscode.workspace.textDocuments
        .map(doc => doc.fileName)
        .filter(fileName => {
          // Filter out untitled documents and non-file schemes
          return (
            fileName &&
            !fileName.startsWith('untitled:') &&
            vscode.Uri.parse(fileName).scheme === 'file'
          );
        });

      files.push(...openFiles);

      // Add files tracked by file watcher as actively changed
      if (this.fileWatcher) {
        const changedFiles = this.fileWatcher
          .getRecentChanges(10) // Last 10 changes
          .filter(change => change.isActive)
          .map(change => change.filePath);

        files.push(...changedFiles);
      }
    } else {
      // Get all relevant files in workspace (fallback)
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        files.push(activeEditor.document.fileName);
      }
    }

    // Remove duplicates and filter by patterns
    const uniqueFiles = Array.from(new Set(files));
    const filteredFiles = uniqueFiles.filter(filePath => {
      return !this.shouldExcludeFile(filePath);
    });

    // Limit the number of files per run
    return filteredFiles.slice(0, this.config.maxFilesPerRun);
  }

  private shouldExcludeFile(filePath: string): boolean {
    for (const pattern of this.config.excludePatterns) {
      // Simple glob pattern matching (could be enhanced with proper glob library)
      const regex = new RegExp(
        pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
      );
      if (regex.test(filePath)) {
        return true;
      }
    }

    // Exclude non-code files
    const ext = path.extname(filePath).toLowerCase();
    const codeExtensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
      '.java',
      '.cs',
      '.php',
      '.rb',
      '.go',
      '.rs',
      '.cpp',
      '.c',
      '.h'
    ];
    return !codeExtensions.includes(ext);
  }

  public getStatus(): {
    enabled: boolean;
    running: boolean;
    lastAnalysisTime: number;
    nextAnalysisIn: number;
    config: PeriodicAnalysisConfig;
  } {
    const nextAnalysisIn = this.timer
      ? Math.max(
          0,
          this.lastAnalysisTime +
            this.config.intervalMinutes * 60 * 1000 -
            Date.now()
        )
      : 0;

    return {
      enabled: this.config.enabled,
      running: this.isRunning,
      lastAnalysisTime: this.lastAnalysisTime,
      nextAnalysisIn,
      config: this.config
    };
  }

  public dispose(): void {
    this.stop();
    this.disposables.forEach(d => d.dispose());
    PeriodicAnalysisManager.instance = null;
  }
}
