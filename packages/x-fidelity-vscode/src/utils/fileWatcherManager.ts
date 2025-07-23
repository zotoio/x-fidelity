import * as vscode from 'vscode';
import * as path from 'path';
import { createComponentLogger } from './globalLogger';
import { getAnalysisTargetDirectory } from './workspaceUtils';
import { FileCacheManager } from '@x-fidelity/core';

const logger = createComponentLogger('FileWatcherManager');

export interface FileChangeInfo {
  filePath: string;
  changeType: 'created' | 'changed' | 'deleted';
  timestamp: number;
  isActive?: boolean; // Whether this file is currently being edited
  priority: number; // Priority for analysis (higher = more important)
}

export interface PeriodicAnalysisResult {
  filesAnalyzed: number;
  duration: number;
  timestamp: number;
}

export interface FileWatcherConfig {
  enabled: boolean;
  trackActiveFiles: boolean;
  prioritizeActiveFiles: boolean;
  debounceMs: number;
  maxTrackedChanges: number;
}

/**
 * Enhanced file watcher that tracks changes and prioritizes active files
 */
export class FileWatcherManager implements vscode.Disposable {
  private static instance: FileWatcherManager | null = null;
  private disposables: vscode.Disposable[] = [];
  private fileWatcher?: vscode.FileSystemWatcher;
  private activeFileWatcher?: vscode.Disposable;
  private changeTracker = new Map<string, FileChangeInfo>();
  private activeFiles = new Set<string>();
  private debounceTimer?: NodeJS.Timeout;
  private config: FileWatcherConfig;

  private readonly onFileChangesDetected = new vscode.EventEmitter<
    FileChangeInfo[]
  >();
  private readonly onActiveFileChanged = new vscode.EventEmitter<
    string | undefined
  >();
  public readonly onFileChanged = new vscode.EventEmitter<FileChangeInfo>();
  public readonly onPeriodicAnalysisCompleted =
    new vscode.EventEmitter<PeriodicAnalysisResult>();

  constructor(config: Partial<FileWatcherConfig> = {}) {
    this.config = {
      enabled: true,
      trackActiveFiles: true,
      prioritizeActiveFiles: true,
      debounceMs: 500,
      maxTrackedChanges: 200,
      ...config
    };

    if (this.config.enabled) {
      this.initialize();
    }
  }

  public static getInstance(): FileWatcherManager {
    if (!FileWatcherManager.instance) {
      FileWatcherManager.instance = new FileWatcherManager();
    }
    return FileWatcherManager.instance;
  }

  get onDidFileChangesDetect(): vscode.Event<FileChangeInfo[]> {
    return this.onFileChangesDetected.event;
  }

  get onDidActiveFileChange(): vscode.Event<string | undefined> {
    return this.onActiveFileChanged.event;
  }

  private async initialize(): Promise<void> {
    const targetDir = getAnalysisTargetDirectory();
    if (!targetDir) {
      logger.warn('No analysis target directory found for file watching');
      return;
    }

    // Set up file system watcher for code files
    const pattern = new vscode.RelativePattern(
      targetDir,
      '**/*.{ts,tsx,js,jsx,json,md,py,java,cs,php,rb,go,rs,cpp,c,h}'
    );

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.disposables.push(this.fileWatcher);

    // Track file changes
    this.fileWatcher.onDidCreate(uri => {
      this.recordFileChange(uri.fsPath, 'created');
    });

    this.fileWatcher.onDidChange(uri => {
      this.recordFileChange(uri.fsPath, 'changed');
    });

    this.fileWatcher.onDidDelete(uri => {
      this.recordFileChange(uri.fsPath, 'deleted');
    });

    // Track active file changes
    if (this.config.trackActiveFiles) {
      this.setupActiveFileTracking();
    }

    logger.info('File watcher initialized', {
      targetDir,
      config: this.config
    });
  }

  private setupActiveFileTracking(): void {
    // Track active editor changes
    this.activeFileWatcher = vscode.window.onDidChangeActiveTextEditor(
      editor => {
        if (editor?.document?.fileName) {
          const filePath = editor.document.fileName;

          // Update active files set
          this.activeFiles.clear();
          this.activeFiles.add(filePath);

          // Mark this file as active and high priority
          this.recordFileChange(filePath, 'changed', true);

          logger.debug(`Active file changed: ${path.basename(filePath)}`);
          this.onActiveFileChanged.fire(filePath);
        } else {
          this.activeFiles.clear();
          this.onActiveFileChanged.fire(undefined);
        }
      }
    );

    this.disposables.push(this.activeFileWatcher);

    // Track document changes for active files
    const docChangeWatcher = vscode.workspace.onDidChangeTextDocument(event => {
      const filePath = event.document.fileName;
      if (this.activeFiles.has(filePath)) {
        this.recordFileChange(filePath, 'changed', true);
      }
    });

    this.disposables.push(docChangeWatcher);
  }

  private recordFileChange(
    filePath: string,
    changeType: 'created' | 'changed' | 'deleted',
    isActive: boolean = false
  ): void {
    const targetDir = getAnalysisTargetDirectory();
    if (!targetDir || !filePath.startsWith(targetDir)) {
      return; // Ignore files outside analysis target
    }

    // Calculate priority
    let priority = 1;
    if (isActive) {
      priority += 100;
    }
    if (this.activeFiles.has(filePath)) {
      priority += 50;
    }
    if (changeType === 'changed') {
      priority += 10;
    }
    if (changeType === 'created') {
      priority += 5;
    }

    const changeInfo: FileChangeInfo = {
      filePath,
      changeType,
      timestamp: Date.now(),
      isActive,
      priority
    };

    this.changeTracker.set(filePath, changeInfo);

    // Cleanup old entries if we have too many
    if (this.changeTracker.size > this.config.maxTrackedChanges) {
      const entries = Array.from(this.changeTracker.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      ); // Oldest first

      const toDelete = entries.slice(
        0,
        entries.length - this.config.maxTrackedChanges
      );
      toDelete.forEach(([key]) => this.changeTracker.delete(key));
    }

    // Debounced emission of change events
    this.debounceChangeEmission();

    logger.debug(
      `File change recorded: ${path.basename(filePath)} (${changeType}, priority: ${priority})`
    );
  }

  private debounceChangeEmission(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const changes = this.getRecentChanges();
      if (changes.length > 0) {
        this.onFileChangesDetected.fire(changes);
      }
    }, this.config.debounceMs);
  }

  /**
   * Get recent file changes, sorted by priority
   */
  getRecentChanges(maxAge: number = 30000): FileChangeInfo[] {
    const cutoff = Date.now() - maxAge;

    return Array.from(this.changeTracker.values())
      .filter(change => change.timestamp > cutoff)
      .sort((a, b) => b.priority - a.priority); // Highest priority first
  }

  /**
   * Get files that have changed and should be re-analyzed
   */
  async getChangedFilesForAnalysis(): Promise<string[]> {
    const targetDir = getAnalysisTargetDirectory();
    if (!targetDir) {
      return [];
    }

    const changes = this.getRecentChanges();
    const changedFiles = changes
      .filter(change => change.changeType !== 'deleted')
      .map(change => change.filePath);

    // Use file cache to verify which files actually need re-analysis
    try {
      const fileCache = FileCacheManager.getInstance(
        path.join(targetDir, '.xfiResults')
      );
      const filteredFiles = await fileCache.getChangedFiles(changedFiles);

      // Prioritize active files
      if (this.config.prioritizeActiveFiles) {
        const activeChanged = filteredFiles.filter(f =>
          this.activeFiles.has(f)
        );
        const otherChanged = filteredFiles.filter(
          f => !this.activeFiles.has(f)
        );
        return [...activeChanged, ...otherChanged];
      }

      return filteredFiles;
    } catch (error) {
      logger.warn(
        'Failed to use file cache for change detection, falling back to simple tracking',
        error
      );
      return changedFiles;
    }
  }

  /**
   * Clear change tracking history
   */
  clearChangeHistory(): void {
    this.changeTracker.clear();
    logger.info('File change history cleared');
  }

  /**
   * Get current active files
   */
  getActiveFiles(): string[] {
    return Array.from(this.activeFiles);
  }

  /**
   * Get file watcher statistics
   */
  getStats(): {
    trackedChanges: number;
    activeFiles: number;
    recentChanges: number;
    config: FileWatcherConfig;
  } {
    return {
      trackedChanges: this.changeTracker.size,
      activeFiles: this.activeFiles.size,
      recentChanges: this.getRecentChanges().length,
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FileWatcherConfig>): void {
    const oldEnabled = this.config.enabled;
    this.config = { ...this.config, ...newConfig };

    // Reinitialize if enabled state changed
    if (oldEnabled !== this.config.enabled) {
      this.dispose();
      if (this.config.enabled) {
        this.initialize();
      }
    }

    logger.info('File watcher config updated', { config: this.config });
  }

  /**
   * Force analysis prioritization for specific files
   */
  prioritizeFiles(filePaths: string[]): void {
    for (const filePath of filePaths) {
      this.recordFileChange(filePath, 'changed', false);
    }
  }

  public startWatching(config?: Partial<FileWatcherConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (!this.config.enabled) {
      logger.debug('File watching is disabled');
      return;
    }

    this.initialize();
    logger.info('File watching started');
  }

  public stopWatching(): void {
    this.dispose();
    logger.info('File watching stopped');
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.disposables.forEach(d => d.dispose());
    this.disposables = [];

    this.onFileChangesDetected.dispose();
    this.onActiveFileChanged.dispose();

    this.changeTracker.clear();
    this.activeFiles.clear();

    logger.info('File watcher manager disposed');
  }
}
