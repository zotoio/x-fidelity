import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { CLIAnalysisManager } from '../analysis/cliAnalysisManager';
import { StatusBarProvider } from '../ui/statusBarProvider';
import { IssuesTreeViewManager } from '../ui/treeView/issuesTreeViewManager';
import { ControlCenterTreeViewManager } from '../ui/treeView/controlCenterTreeViewManager';
import { createComponentLogger } from '../utils/globalLogger';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { getAnalysisTargetDirectory } from '../utils/workspaceUtils';
import { preloadDefaultPlugins } from './pluginPreloader';
import { LoggerProvider } from '@x-fidelity/core';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;
  private globalLogger: VSCodeLogger;

  private configManager: ConfigManager;
  private diagnosticProvider: DiagnosticProvider;
  private analysisEngine: CLIAnalysisManager;

  private statusBarProvider: StatusBarProvider;
  private issuesTreeViewManager: IssuesTreeViewManager;
  private controlCenterTreeViewManager: ControlCenterTreeViewManager;

  private periodicAnalysisTimer?: NodeJS.Timeout;
  private isPeriodicAnalysisRunning = false;

  constructor(private context: vscode.ExtensionContext) {
    // PHASE 1: Initialize logger provider FIRST for universal logging
    // This ensures all plugins and components have access to logging
    // Note: Only initialize if not already initialized to prevent duplicate initialization
    if (!LoggerProvider.hasLogger()) {
      LoggerProvider.initializeForPlugins();
    }

    // PHASE 2: Create and inject VSCode logger
    this.logger = new VSCodeLogger('Extension Manager');
    this.globalLogger = createComponentLogger('Extension Manager');

    // Inject the VSCode logger into the provider for use by plugins
    LoggerProvider.setLogger(this.logger);

    this.globalLogger.info('🚀 Initializing X-Fidelity Extension Manager...', {
      hasInjectedLogger: LoggerProvider.hasInjectedLogger(),
      loggerReady: LoggerProvider.hasLogger()
    });

    try {
      this.configManager = new ConfigManager(this.context);
      this.globalLogger.debug('✅ ConfigManager initialized');

      this.diagnosticProvider = new DiagnosticProvider(this.configManager);
      this.globalLogger.debug('✅ DiagnosticProvider initialized');

      this.analysisEngine = new CLIAnalysisManager(
        this.configManager,
        this.diagnosticProvider
      );
      this.globalLogger.debug('✅ CLIAnalysisManager initialized');

      this.statusBarProvider = new StatusBarProvider(this.analysisEngine);
      this.globalLogger.debug('✅ StatusBarProvider initialized');

      this.issuesTreeViewManager = new IssuesTreeViewManager(
        this.context,
        this.diagnosticProvider,
        this.configManager,
        'xfidelityIssuesTreeView'
      );
      this.globalLogger.debug('✅ IssuesTreeViewManager initialized');

      this.controlCenterTreeViewManager = new ControlCenterTreeViewManager(
        this.context,
        'xfidelityControlCenterView'
      );
      this.globalLogger.debug('✅ ControlCenterTreeViewManager initialized');

      // PHASE 3: Initialize plugins AFTER logger setup
      this.initializePlugins();

      this.setupEventListeners();
      this.registerCommands();
      this.globalLogger.info('✅ Extension Manager initialized successfully');
    } catch (error) {
      this.globalLogger.error(
        '❌ Extension Manager initialization failed:',
        error
      );
      throw error;
    }
  }

  private async initializePlugins(): Promise<void> {
    try {
      this.globalLogger.info('🔌 Initializing plugins with logger context...');
      await preloadDefaultPlugins(this.context);
      this.globalLogger.info(
        `✅ Plugin initialization completed. Logger provider status: ${LoggerProvider.hasInjectedLogger() ? 'Injected' : 'Default'}`
      );
    } catch (error) {
      this.globalLogger.warn('Plugin initialization failed:', error);
    }
  }

  private setupEventListeners(): void {
    this.disposables.push(
      this.analysisEngine.onComplete(result => {
        this.globalLogger.info(
          `📊 Analysis completed: ${result.summary.totalIssues} issues found across ${result.summary.filesAnalyzed} files`
        );

        this.issuesTreeViewManager.refresh();

        if (result.summary.totalIssues > 0) {
          vscode.window
            .showInformationMessage(
              `X-Fidelity found ${result.summary.totalIssues} issues across ${result.summary.filesAnalyzed} files`,
              'View Issues'
            )
            .then(choice => {
              if (choice === 'View Issues') {
                this.issuesTreeViewManager.refresh();
              }
            });
        } else {
          vscode.window.showInformationMessage(
            'X-Fidelity analysis completed - no issues found! 🎉'
          );
        }
      })
    );

    this.disposables.push(
      this.analysisEngine.onStateChanged(state => {
        this.globalLogger.debug(`Analysis state changed: ${state}`);
      })
    );

    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.globalLogger.info('Configuration changed, updating components...');
      })
    );
  }

  private registerCommands(): void {
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.runAnalysis', async () => {
        try {
          const workspacePath = getAnalysisTargetDirectory();
          if (!workspacePath) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
          }

          this.globalLogger.info('🔍 Starting analysis...');
          await this.analysisEngine.runAnalysis();
        } catch (error) {
          this.globalLogger.error('Analysis failed:', error);
          vscode.window.showErrorMessage(
            `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.runAnalysisWithDir',
        async (dir?: string) => {
          try {
            const workspacePath = dir || getAnalysisTargetDirectory();
            if (!workspacePath) {
              vscode.window.showErrorMessage('No workspace folder found');
              return;
            }

            try {
              const fs = require('fs');
              if (!fs.existsSync(workspacePath)) {
                this.globalLogger.warn(
                  'Analysis directory does not exist:',
                  workspacePath
                );
                vscode.window.showWarningMessage(
                  `Analysis directory does not exist: ${workspacePath}`
                );
                return;
              }

              const stats = fs.statSync(workspacePath);
              if (!stats.isDirectory()) {
                this.globalLogger.warn(
                  'Analysis path is not a directory:',
                  workspacePath
                );
                vscode.window.showWarningMessage(
                  `Analysis path is not a directory: ${workspacePath}`
                );
                return;
              }
            } catch (fsError) {
              this.globalLogger.warn(
                `Cannot access analysis directory: ${workspacePath} - ${fsError}`
              );
              vscode.window.showWarningMessage(
                `Cannot access analysis directory: ${workspacePath}`
              );
              return;
            }

            this.globalLogger.info(
              '🔍 Starting analysis with directory:',
              workspacePath
            );
            await this.analysisEngine.runAnalysis();
          } catch (error) {
            this.globalLogger.error('Analysis with directory failed:', error);
            vscode.window.showErrorMessage(
              `Analysis failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.cancelAnalysis', async () => {
        await this.analysisEngine.cancelAnalysis();
        vscode.window.showInformationMessage('Analysis cancelled');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showDashboard', () => {
        this.issuesTreeViewManager.refresh();
        vscode.commands.executeCommand('workbench.view.extension.xfidelity');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showControlCenter', () => {
        vscode.commands.executeCommand('workbench.view.extension.xfidelity');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showSettingsUI', () => {
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'xfidelity'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showAdvancedSettings', () => {
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'xfidelity'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.debugDiagnostics', () => {
        this.debugDiagnosticsInfo();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.exportReport', async () => {
        try {
          const currentResults = this.analysisEngine.getCurrentResults();
          if (!currentResults) {
            vscode.window.showErrorMessage(
              'No analysis results available. Run an analysis first.'
            );
            return;
          }

          const exportContent = JSON.stringify(
            currentResults.metadata,
            null,
            2
          );
          await vscode.env.clipboard.writeText(exportContent);
          vscode.window.showInformationMessage(
            'Analysis results copied to clipboard!'
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Export failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.handleReportAction',
        async (type: 'export' | 'share' | 'compare' | 'trends') => {
          try {
            const currentResults = this.analysisEngine.getCurrentResults();
            if (!currentResults) {
              vscode.window.showErrorMessage(
                'No analysis results available. Run an analysis first.'
              );
              return;
            }

            if (type === 'export' || type === 'share') {
              const exportContent = JSON.stringify(
                currentResults.metadata,
                null,
                2
              );
              await vscode.env.clipboard.writeText(exportContent);
              vscode.window.showInformationMessage(
                'Analysis results copied to clipboard!'
              );
            } else {
              vscode.window.showInformationMessage(
                `${type.charAt(0).toUpperCase() + type.slice(1)} feature is coming soon. Use the Problems panel or Issues tree for now.`
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `${type} failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showOutput', () => {
        this.globalLogger.show();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.detectArchetype', async () => {
        try {
          const workspacePath = getAnalysisTargetDirectory();
          if (!workspacePath) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
          }

          this.globalLogger.info('🔍 Detecting project archetype...');
          vscode.window.showInformationMessage(
            'Archetype detection is handled automatically by the CLI during analysis'
          );
        } catch (error) {
          this.globalLogger.error('Archetype detection failed:', error);
          vscode.window.showErrorMessage(
            `Archetype detection failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showInformationMessage(
          'X-Fidelity extension is working!'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.getTestResults', () => {
        if (this.analysisEngine && (this.analysisEngine as any).getLastResult) {
          return (this.analysisEngine as any).getLastResult();
        }
        return null;
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.openSettings', () => {
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'xfidelity'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.resetConfiguration',
        async () => {
          try {
            const result = await vscode.window.showWarningMessage(
              'Are you sure you want to reset X-Fidelity configuration to defaults?',
              { modal: true },
              'Reset',
              'Cancel'
            );

            if (result === 'Reset') {
              const config = vscode.workspace.getConfiguration('xfidelity');
              const keys = ['cliExtraArgs'];

              for (const key of keys) {
                await config.update(
                  key,
                  undefined,
                  vscode.ConfigurationTarget.Workspace
                );
              }

              vscode.window.showInformationMessage(
                'X-Fidelity configuration reset to defaults'
              );
            }
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to reset configuration: ${error}`
            );
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showReportHistory', () => {
        vscode.window.showInformationMessage(
          'Report history is available in the .xfiResults directory of your workspace'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.openReports', () => {
        vscode.commands.executeCommand('xfidelity.showReportHistory');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.startPeriodicAnalysis', () => {
        this.startPeriodicAnalysis();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.stopPeriodicAnalysis', () => {
        this.stopPeriodicAnalysis();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.restartPeriodicAnalysis',
        () => {
          this.restartPeriodicAnalysis();
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.showPeriodicAnalysisStatus',
        () => {
          this.showPeriodicAnalysisStatus();
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showRuleDocumentation', () => {
        vscode.window.showInformationMessage(
          'Rule documentation is available in the hover tooltips and issue details.'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.addExemption', async () => {
        try {
          vscode.window.showInformationMessage(
            'Use the context menu on issues in the tree view to add exemptions.'
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Add exemption failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.addBulkExemptions',
        async () => {
          try {
            vscode.window.showInformationMessage(
              'Bulk exemptions can be added by editing the .xfi-config.json file directly.'
            );
          } catch (error) {
            vscode.window.showErrorMessage(
              `Add bulk exemptions failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.showPerformanceMetrics',
        () => {
          if (
            this.analysisEngine &&
            (this.analysisEngine as any).getPerformanceMetrics
          ) {
            const metrics = (
              this.analysisEngine as any
            ).getPerformanceMetrics();
            vscode.window.showInformationMessage(
              `Analysis Performance: ${metrics.lastAnalysisDuration}ms (avg: ${metrics.averageAnalysisDuration}ms)`
            );
          } else {
            vscode.window.showInformationMessage(
              'No performance metrics available'
            );
          }
        }
      )
    );
  }

  private startPeriodicAnalysis(): void {
    const config = this.configManager.getConfig();
    const runInterval = config.runInterval;

    if (runInterval <= 0) {
      vscode.window.showInformationMessage(
        'Periodic analysis is disabled. Set runInterval > 0 in settings to enable.'
      );
      return;
    }

    if (this.isPeriodicAnalysisRunning) {
      vscode.window.showInformationMessage(
        'Periodic analysis is already running.'
      );
      return;
    }

    this.isPeriodicAnalysisRunning = true;
    const intervalMs = runInterval * 1000;

    this.periodicAnalysisTimer = setInterval(async () => {
      try {
        this.globalLogger.info('🔄 Running periodic analysis...');
        await this.analysisEngine.runAnalysis();
      } catch (error) {
        this.globalLogger.error('❌ Periodic analysis failed:', error);
      }
    }, intervalMs);

    vscode.window.showInformationMessage(
      `Periodic analysis started (interval: ${runInterval}s)`
    );
    this.globalLogger.info(
      `🔄 Periodic analysis started with ${runInterval}s interval`
    );
  }

  private stopPeriodicAnalysis(): void {
    if (!this.isPeriodicAnalysisRunning) {
      vscode.window.showInformationMessage('Periodic analysis is not running.');
      return;
    }

    if (this.periodicAnalysisTimer) {
      clearInterval(this.periodicAnalysisTimer);
      this.periodicAnalysisTimer = undefined;
    }

    this.isPeriodicAnalysisRunning = false;
    vscode.window.showInformationMessage('Periodic analysis stopped.');
    this.globalLogger.info('⏹️ Periodic analysis stopped');
  }

  private restartPeriodicAnalysis(): void {
    this.stopPeriodicAnalysis();
    setTimeout(() => {
      this.startPeriodicAnalysis();
    }, 100);
  }

  private showPeriodicAnalysisStatus(): void {
    const config = this.configManager.getConfig();
    const runInterval = config.runInterval;

    const status = this.isPeriodicAnalysisRunning ? 'Running' : 'Stopped';
    const intervalText = runInterval > 0 ? `${runInterval}s` : 'Disabled';

    const message = `Periodic Analysis Status:
Status: ${status}
Interval: ${intervalText}
CLI Mutex: ${this.analysisEngine.isAnalysisRunning ? 'Locked' : 'Available'}`;

    vscode.window.showInformationMessage(message);
    this.globalLogger.info(
      `🔍 Periodic analysis status: ${status}, interval: ${intervalText}`
    );
  }

  private debugDiagnosticsInfo(): void {
    const diagnostics = this.diagnosticProvider.getAllDiagnostics();

    const info = {
      totalFiles: diagnostics.length,
      totalDiagnostics: diagnostics.reduce(
        (sum, [uri, diags]) => sum + diags.length,
        0
      ),
      xfidelityDiagnostics: 0,
      fileBreakdown: [] as any[]
    };

    for (const [uri, diags] of diagnostics) {
      const xfiDiags = diags.filter(d => d.source === 'X-Fidelity');
      info.xfidelityDiagnostics += xfiDiags.length;

      if (diags.length > 0) {
        info.fileBreakdown.push({
          file: vscode.workspace.asRelativePath(uri),
          totalDiagnostics: diags.length,
          xfidelityDiagnostics: xfiDiags.length,
          sources: [...new Set(diags.map(d => d.source || 'no-source'))],
          firstFewMessages: diags.slice(0, 3).map(d => ({
            source: d.source,
            severity: vscode.DiagnosticSeverity[d.severity],
            message: d.message.substring(0, 100)
          }))
        });
      }
    }

    const treeStats = this.issuesTreeViewManager.getStatistics();
    const currentIssues = this.issuesTreeViewManager.getCurrentIssues();

    const debugInfo = {
      ...info,
      treeViewStats: treeStats,
      currentTreeIssues: currentIssues.length,
      treeViewTitle: this.issuesTreeViewManager.getTreeView().title
    };

    this.globalLogger.info('🔍 DEBUG DIAGNOSTICS INFO:', debugInfo);
    console.log('[DEBUG] Full diagnostics info:', debugInfo);

    const message = `Debug Info:
📊 Total Files: ${info.totalFiles}
🔍 Total Diagnostics: ${info.totalDiagnostics} 
⚡ X-Fidelity Diagnostics: ${info.xfidelityDiagnostics}
🌳 Tree View Issues: ${currentIssues.length}
📝 Tree Title: ${debugInfo.treeViewTitle}

Check Output Console (X-Fidelity) for full details.`;

    vscode.window
      .showInformationMessage(message, 'Open Output')
      .then(choice => {
        if (choice === 'Open Output') {
          vscode.commands.executeCommand(
            'workbench.action.output.show.extension-output-x-fidelity'
          );
        }
      });
  }

  dispose(): void {
    this.globalLogger.info('🔄 Disposing Extension Manager...');

    this.stopPeriodicAnalysis();

    this.disposables.forEach(d => d.dispose());
    this.analysisEngine.dispose();
    this.statusBarProvider.dispose();
    this.issuesTreeViewManager.dispose();
    this.controlCenterTreeViewManager.dispose();
    this.globalLogger.info('✅ Extension Manager disposed');
  }
}
