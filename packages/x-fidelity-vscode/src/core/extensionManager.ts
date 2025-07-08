import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { AnalysisManager } from '../analysis/analysisManager';
import { PeriodicAnalysisManager } from '../analysis/periodicAnalysisManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { StatusBarProvider } from '../ui/statusBarProvider';
import { IssuesTreeProvider } from '../ui/treeView/issuesTreeProvider';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { getWorkspaceFolder } from '../utils/workspaceUtils';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private configManager: ConfigManager;
  private analysisManager: AnalysisManager;
  private periodicAnalysisManager: PeriodicAnalysisManager;
  private diagnosticProvider: DiagnosticProvider;
  private statusBarProvider: StatusBarProvider;
  private issuesTreeProvider: IssuesTreeProvider;
  private issuesTreeView: vscode.TreeView<any>;
  private logger: VSCodeLogger;

  constructor(private context: vscode.ExtensionContext) {
    this.logger = new VSCodeLogger('ExtensionManager');
    this.configManager = ConfigManager.getInstance(context);
    this.diagnosticProvider = new DiagnosticProvider(this.configManager);
    this.analysisManager = new AnalysisManager(
      this.configManager,
      this.diagnosticProvider
    );
    this.periodicAnalysisManager = PeriodicAnalysisManager.getInstance();
    this.statusBarProvider = new StatusBarProvider(this.analysisManager);
    this.issuesTreeProvider = new IssuesTreeProvider();

    // Initialize tree view
    this.issuesTreeView = vscode.window.createTreeView(
      'xfidelityIssuesTreeView',
      {
        treeDataProvider: this.issuesTreeProvider,
        showCollapseAll: true
      }
    );

    this.initialize().catch(error => {
      this.logger.error('Extension initialization failed:', error);
      this.registerFallbackCommands();
    });
  }

  private async initialize(): Promise<void> {
    this.logger.info(
      'Initializing X-Fidelity extension (PERFORMANCE OPTIMIZED)...'
    );

    try {
      // Preload plugins first - essential for runtime functionality
      const { preloadDefaultPlugins } = await import('./pluginPreloader');
      await preloadDefaultPlugins(this.context);
      this.logger.info('Plugin preloading completed');

      // Set up event listeners
      this.setupEventListeners();

      // Register commands
      this.registerCommands();

      // Add components to disposables
      this.disposables.push(
        this.analysisManager,
        this.periodicAnalysisManager,
        this.diagnosticProvider,
        this.statusBarProvider,
        this.issuesTreeView
      );

      // PERFORMANCE FIX: Don't start periodic analysis by default (disabled in config)
      // this.analysisManager.startPeriodicAnalysis(); // DISABLED for performance

      // PERFORMANCE FIX: Don't start periodic analysis manager (disabled by default)
      // this.periodicAnalysisManager.start(); // DISABLED for performance

      this.logger.info(
        'X-Fidelity extension initialized successfully (PERFORMANCE MODE)'
      );

      // Show welcome message only in development
      if (this.context.extensionMode === vscode.ExtensionMode.Development) {
        vscode.window.showInformationMessage(
          'X-Fidelity extension activated (Performance Mode)'
        );
      }
    } catch (error) {
      this.logger.error('Extension initialization failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Analysis completion
    this.disposables.push(
      this.analysisManager.onDidAnalysisComplete(result => {
        // Diagnostics are now updated directly by AnalysisManager through DiagnosticProvider
        this.updateIssuesTree(result);

        const stats = result.summary;
        this.logger.info('Analysis complete:', {
          totalIssues: stats.totalIssues,
          filesAnalyzed: stats.filesAnalyzed,
          duration: stats.analysisTimeMs
        });
      })
    );

    // Analysis state changes (disabled to prevent infinite loops)
    this.disposables.push(
      this.analysisManager.onDidAnalysisStateChange(state => {
        try {
          // Simply log state changes for now, no setContext calls
          this.logger.info(`Analysis state changed to: ${state}`);
        } catch (error) {
          this.logger.error('Error in analysis state change handler:', error);
        }
      })
    );

    // Configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(config => {
        this.logger.info('Configuration updated:', {
          archetype: config.archetype,
          runInterval: config.runInterval
        });
      })
    );

    // File save events (with performance safeguards)
    let saveTimeout: NodeJS.Timeout | undefined;
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        const config = this.configManager.getConfig();

        // PERFORMANCE FIX: Stricter checks to prevent unwanted analysis
        if (
          !config.autoAnalyzeOnSave ||
          this.analysisManager.isAnalysisRunning
        ) {
          return;
        }

        // PERFORMANCE FIX: Only trigger for relevant files and debounce heavily
        const ext = document.fileName.toLowerCase();
        if (this.isRelevantFile(ext)) {
          // PERFORMANCE FIX: Longer debounce to prevent rapid saves
          if (saveTimeout) {
            clearTimeout(saveTimeout);
          }
          saveTimeout = setTimeout(() => {
            this.logger.info(
              'Auto-analysis triggered by file save (performance mode)'
            );
            this.analysisManager.scheduleAnalysis(5000); // 5 second delay instead of 2
          }, 3000); // 3 second debounce instead of 1
        }
      })
    );

    // Workspace folder changes
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(() => {
        this.logger.info('Workspace folders changed, reinitializing...');
        // Simple reinitialization
        this.analysisManager.startPeriodicAnalysis();
      })
    );
  }

  private isRelevantFile(fileName: string): boolean {
    const relevantExtensions = [
      '.ts',
      '.js',
      '.tsx',
      '.jsx',
      '.java',
      '.py',
      '.cs',
      '.json'
    ];
    return relevantExtensions.some(ext => fileName.includes(ext));
  }

  private updateIssuesTree(result: any): void {
    try {
      // Convert diagnostics to ProcessedIssue format for tree view
      const issues: any[] = [];
      let issueId = 0;

      for (const [filePath, diagnostics] of result.diagnostics) {
        for (const diagnostic of diagnostics) {
          issues.push({
            id: `issue-${++issueId}`,
            message: diagnostic.message,
            severity: this.mapSeverityToString(diagnostic.severity),
            rule: diagnostic.code || 'unknown',
            file: filePath,
            line: diagnostic.range.start.line + 1,
            column: diagnostic.range.start.character + 1,
            category: 'general',
            fixable: false,
            exempted: false
          });
        }
      }

      this.issuesTreeProvider.setIssues(issues);
    } catch (error) {
      this.logger.error('Failed to update issues tree:', error);
    }
  }

  private mapSeverityToString(severity: vscode.DiagnosticSeverity): string {
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

  private registerCommands(): void {
    const commands = [
      // Core commands
      vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showInformationMessage(
          'X-Fidelity extension is working!'
        );
      }),

      vscode.commands.registerCommand('xfidelity.getTestResults', () => {
        return this.analysisManager.getCurrentResults();
      }),

      vscode.commands.registerCommand('xfidelity.runAnalysis', async () => {
        this.logger.info('Manual analysis triggered...');
        this.analysisManager.getLogger().show();
        const result = await this.analysisManager.runAnalysis({
          forceRefresh: true
        });
        if (!result) {
          vscode.window.showWarningMessage(
            'Analysis completed but no results were returned'
          );
        }
      }),

      vscode.commands.registerCommand('xfidelity.cancelAnalysis', async () => {
        await this.analysisManager.cancelAnalysis();
      }),

      vscode.commands.registerCommand('xfidelity.openSettings', () => {
        return vscode.commands.executeCommand(
          'workbench.action.openSettings',
          '@ext:zotoio.x-fidelity-vscode'
        );
      }),

      vscode.commands.registerCommand('xfidelity.showOutput', () => {
        this.analysisManager.getLogger().show();
      }),

      // Tree view commands
      vscode.commands.registerCommand('xfidelity.refreshIssuesTree', () => {
        this.issuesTreeProvider.refresh();
      }),

      vscode.commands.registerCommand(
        'xfidelity.issuesTreeGroupBySeverity',
        () => {
          this.issuesTreeProvider.setGroupingMode('severity');
        }
      ),

      vscode.commands.registerCommand('xfidelity.issuesTreeGroupByRule', () => {
        this.issuesTreeProvider.setGroupingMode('rule');
      }),

      vscode.commands.registerCommand('xfidelity.issuesTreeGroupByFile', () => {
        this.issuesTreeProvider.setGroupingMode('file');
      }),

      vscode.commands.registerCommand(
        'xfidelity.issuesTreeGroupByCategory',
        () => {
          this.issuesTreeProvider.setGroupingMode('category');
        }
      ),

      vscode.commands.registerCommand('xfidelity.goToIssue', (issue: any) => {
        if (issue && issue.file && issue.line) {
          const workspaceFolder = getWorkspaceFolder();
          if (workspaceFolder) {
            const filePath = vscode.Uri.joinPath(
              workspaceFolder.uri,
              issue.file
            );
            vscode.window.showTextDocument(filePath).then(editor => {
              const position = new vscode.Position(
                issue.line - 1,
                issue.column - 1 || 0
              );
              editor.selection = new vscode.Selection(position, position);
              editor.revealRange(new vscode.Range(position, position));
            });
          }
        }
      }),

      // Performance monitoring command
      vscode.commands.registerCommand(
        'xfidelity.showPerformanceMetrics',
        () => {
          const metrics = this.analysisManager.getPerformanceMetrics();
          const message = `Performance Metrics (OPTIMIZED):
Total Analyses: ${metrics.totalAnalyses}
Last Duration: ${Math.round(metrics.lastAnalysisDuration)}ms
Average Duration: ${Math.round(metrics.averageAnalysisDuration)}ms
Cache Hits: ${metrics.cacheHits}
Performance Mode: ✅ Enabled`;
          vscode.window.showInformationMessage(message, { modal: true });
        }
      ),

      // PERFORMANCE FIX: Update periodic analysis commands with warnings
      vscode.commands.registerCommand('xfidelity.startPeriodicAnalysis', () => {
        vscode.window
          .showWarningMessage(
            'Periodic analysis can impact performance. Consider using manual analysis instead.',
            'Enable Anyway',
            'Cancel'
          )
          .then(choice => {
            if (choice === 'Enable Anyway') {
              this.periodicAnalysisManager.start();
              vscode.window.showInformationMessage(
                '🔄 Periodic analysis started (performance impact expected)'
              );
            }
          });
      }),

      vscode.commands.registerCommand('xfidelity.stopPeriodicAnalysis', () => {
        this.periodicAnalysisManager.stop();
        vscode.window.showInformationMessage(
          '⏹️ Periodic analysis stopped (performance optimized)'
        );
      }),

      vscode.commands.registerCommand(
        'xfidelity.restartPeriodicAnalysis',
        () => {
          this.periodicAnalysisManager.restart();
          vscode.window.showInformationMessage(
            '🔄 Periodic analysis restarted'
          );
        }
      ),

      vscode.commands.registerCommand(
        'xfidelity.showPeriodicAnalysisStatus',
        () => {
          const status = this.periodicAnalysisManager.getStatus();
          const nextAnalysisText =
            status.nextAnalysisIn > 0
              ? `Next analysis in: ${Math.ceil(status.nextAnalysisIn / 1000 / 60)} minutes`
              : 'No analysis scheduled';

          const lastAnalysisText =
            status.lastAnalysisTime > 0
              ? `Last analysis: ${new Date(status.lastAnalysisTime).toLocaleTimeString()}`
              : 'No analysis run yet';

          const message = `Periodic Analysis Status:
Enabled: ${status.enabled ? '✅' : '❌'}
Running: ${status.running ? '🔄' : '⏸️'}
Interval: ${status.config.intervalMinutes} minutes
Max files per run: ${status.config.maxFilesPerRun}
${lastAnalysisText}
${nextAnalysisText}`;

          vscode.window.showInformationMessage(message, { modal: true });
        }
      )
    ];

    this.disposables.push(...commands);
  }

  private registerFallbackCommands(): void {
    this.logger.info('Registering fallback commands...');

    const fallbackCommands = [
      vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showWarningMessage(
          'X-Fidelity is running in fallback mode!'
        );
      }),

      vscode.commands.registerCommand('xfidelity.runAnalysis', () => {
        vscode.window.showWarningMessage(
          'Analysis not available in fallback mode'
        );
      }),

      vscode.commands.registerCommand('xfidelity.showOutput', () => {
        this.logger.show();
      })
    ];

    this.disposables.push(...fallbackCommands);
  }

  dispose(): void {
    this.logger.info('Disposing X-Fidelity extension (PERFORMANCE MODE)...');

    // PERFORMANCE FIX: Clean shutdown
    this.analysisManager?.stopPeriodicAnalysis();
    this.periodicAnalysisManager?.dispose();
    this.disposables.forEach(d => d?.dispose());
    this.configManager?.dispose();
  }
}
