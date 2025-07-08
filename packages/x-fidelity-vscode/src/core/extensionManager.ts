import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { AnalysisManager } from '../analysis/analysisManager';
import { PeriodicAnalysisManager } from '../analysis/periodicAnalysisManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { StatusBarProvider } from '../ui/statusBarProvider';
import { IssuesTreeViewManager } from '../ui/treeView/issuesTreeViewManager';
import { ControlCenterTreeViewManager } from '../ui/treeView/controlCenterTreeViewManager';
import { VSCodeLogger } from '../utils/vscodeLogger';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private configManager: ConfigManager;
  private analysisManager: AnalysisManager;
  private periodicAnalysisManager: PeriodicAnalysisManager;
  private diagnosticProvider: DiagnosticProvider;
  private statusBarProvider: StatusBarProvider;
  private issuesTreeViewManager: IssuesTreeViewManager;
  private explorerIssuesTreeViewManager: IssuesTreeViewManager;
  private controlCenterTreeViewManager: ControlCenterTreeViewManager;
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

    // Initialize tree view managers
    this.issuesTreeViewManager = new IssuesTreeViewManager(
      this.context,
      this.diagnosticProvider,
      this.configManager,
      'xfidelityIssuesTreeView'
    );
    this.explorerIssuesTreeViewManager = new IssuesTreeViewManager(
      this.context,
      this.diagnosticProvider,
      this.configManager,
      'xfidelityIssuesTreeViewExplorer'
    );
    this.controlCenterTreeViewManager = new ControlCenterTreeViewManager(
      this.context,
      'xfidelityControlCenterView'
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
      this.addToDisposables(
        this.context,
        this.analysisManager,
        this.periodicAnalysisManager,
        this.diagnosticProvider,
        this.statusBarProvider,
        this.issuesTreeViewManager,
        this.explorerIssuesTreeViewManager,
        this.controlCenterTreeViewManager
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

  private updateIssuesTree(_result: any): void {
    try {
      // Tree view managers automatically refresh from diagnostic provider
      // No manual update needed
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

      // Tree view commands are registered by IssuesTreeViewManager

      // Control center commands
      vscode.commands.registerCommand(
        'xfidelity.showControlCenter',
        async () => {
          const controlCenterPanel = new (
            await import('../ui/panels/controlCenterPanel')
          ).ControlCenterPanel(
            this.context,
            this.configManager,
            this.analysisManager,
            this.diagnosticProvider
          );
          await controlCenterPanel.show();
        }
      ),

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
      ),

      // === NEW CONTROL CENTER COMMANDS ===

      // Dashboard command
      vscode.commands.registerCommand('xfidelity.showDashboard', async () => {
        const dashboardPanel = new (
          await import('../ui/panels/dashboardPanel')
        ).DashboardPanel(
          this.context,
          this.configManager,
          this.analysisManager,
          this.diagnosticProvider
        );
        await dashboardPanel.show();
      }),

      // Report History command
      vscode.commands.registerCommand(
        'xfidelity.showReportHistory',
        async () => {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
          }

          const reportHistoryManager = new (
            await import('../reports/reportHistoryManager')
          ).ReportHistoryManager(this.configManager);

          const history = await reportHistoryManager.getReportHistory(
            workspaceFolder.uri.fsPath
          );

          if (history.length === 0) {
            vscode.window.showInformationMessage(
              'No analysis history found. Run an analysis first.'
            );
            return;
          }

          const items = history.slice(0, 10).map(entry => ({
            label: `$(history) ${new Date(entry.timestamp).toLocaleString()}`,
            description: `${entry.summary.totalIssues} issues found`,
            detail: `Archetype: ${entry.summary.archetype} | Duration: ${entry.summary.durationSeconds}s`,
            entry
          }));

          const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a report from history'
          });

          if (selected) {
            vscode.window.showInformationMessage(
              `Report from ${new Date(selected.entry.timestamp).toLocaleString()}: ${selected.entry.summary.totalIssues} issues found`
            );
          }
        }
      ),

      // Export Report command
      vscode.commands.registerCommand('xfidelity.exportReport', async () => {
        const currentResults = this.analysisManager.getCurrentResults();
        if (!currentResults || !currentResults.metadata) {
          vscode.window.showWarningMessage(
            'No analysis results to export. Run an analysis first.'
          );
          return;
        }

        const formatOptions = [
          {
            label: 'JSON',
            description: 'Structured data format',
            format: 'json' as const
          },
          {
            label: 'CSV',
            description: 'Comma-separated values',
            format: 'csv' as const
          },
          {
            label: 'HTML',
            description: 'Web page report',
            format: 'html' as const
          },
          {
            label: 'Markdown',
            description: 'Markdown document',
            format: 'markdown' as const
          },
          {
            label: 'SARIF',
            description: 'Static Analysis Results Interchange Format',
            format: 'sarif' as const
          }
        ];

        const selectedFormat = await vscode.window.showQuickPick(
          formatOptions,
          {
            placeHolder: 'Select export format'
          }
        );

        if (selectedFormat) {
          const exportManager = new (
            await import('../reports/exportManager')
          ).ExportManager(this.configManager);

          try {
            const exportPath = await exportManager.exportReport(
              currentResults.metadata,
              { format: selectedFormat.format }
            );
            vscode.window.showInformationMessage(
              `Report exported to: ${exportPath}`
            );
          } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
          }
        }
      }),

      // Detect Archetype command
      vscode.commands.registerCommand('xfidelity.detectArchetype', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('No workspace folder found');
          return;
        }

        const { DefaultDetectionService } = await import(
          '../configuration/defaultDetection'
        );
        const detectionService = new DefaultDetectionService(
          workspaceFolder.uri.fsPath
        );

        try {
          vscode.window.showInformationMessage(
            'Detecting project archetype...'
          );
          const detections = await detectionService.detectArchetype();

          if (detections.length === 0) {
            vscode.window.showWarningMessage(
              'Could not detect project archetype'
            );
            return;
          }

          const topDetection = detections[0];
          const message = `Detected Project Archetype: ${topDetection.archetype}
Confidence: ${topDetection.confidence}%
Indicators: ${topDetection.indicators.join(', ')}

Would you like to update your configuration to use this archetype?`;

          const choice = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Yes, Update',
            'No, Keep Current'
          );

          if (choice === 'Yes, Update') {
            await this.configManager.updateConfig({
              archetype: topDetection.archetype
            });
            vscode.window.showInformationMessage(
              `✅ Configuration updated to use ${topDetection.archetype} archetype`
            );

            // Trigger re-analysis with new archetype
            await this.analysisManager.runAnalysis({ forceRefresh: true });
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Archetype detection failed: ${error}`
          );
        }
      }),

      // Reset Configuration command
      vscode.commands.registerCommand(
        'xfidelity.resetConfiguration',
        async () => {
          const choice = await vscode.window.showWarningMessage(
            'Are you sure you want to reset all X-Fidelity configuration to defaults? This cannot be undone.',
            { modal: true },
            'Yes, Reset All',
            'Cancel'
          );

          if (choice === 'Yes, Reset All') {
            // Reset to default configuration
            const defaultConfig = {
              archetype: 'node-fullstack',
              runInterval: 0,
              autoAnalyzeOnSave: false,
              autoAnalyzeOnFileChange: false,
              configServer: '',
              localConfigPath: '',
              openaiEnabled: false,
              telemetryEnabled: true,
              generateReports: false,
              showInlineDecorations: true,
              statusBarVisibility: true
            };

            await this.configManager.updateConfig(defaultConfig);
            vscode.window.showInformationMessage(
              '✅ Configuration reset to defaults'
            );

            // Trigger re-analysis with new configuration
            await this.analysisManager.runAnalysis({ forceRefresh: true });
          }
        }
      ),

      // Advanced Settings command (using SettingsUIPanel)
      vscode.commands.registerCommand(
        'xfidelity.showAdvancedSettings',
        async () => {
          const settingsPanel = new (
            await import('../ui/panels/settingsUIPanel')
          ).SettingsUIPanel(this.context, this.configManager);
          await settingsPanel.show();
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

  private addToDisposables(
    context: vscode.ExtensionContext,
    ...disposables: (
      | vscode.Disposable
      | IssuesTreeViewManager
      | ControlCenterTreeViewManager
    )[]
  ): void {
    for (const disposable of disposables) {
      if (disposable) {
        this.disposables.push(disposable);
        context.subscriptions.push(disposable);
      }
    }
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
