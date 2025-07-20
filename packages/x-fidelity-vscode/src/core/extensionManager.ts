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

import { LoggerProvider } from '@x-fidelity/core';
import { EXECUTION_MODES } from '@x-fidelity/types';
import { showCLIDiagnosticsDialog } from '../utils/cliDiagnostics';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;

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

    // PHASE 2: Create VSCode mode logger and inject it into the provider
    // Use standardized getLoggerForMode for consistent behavior
    const modeLogger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.VSCODE);
    LoggerProvider.setLogger(modeLogger);

    // Also create component-specific logger for extension manager specific logging
    this.logger = createComponentLogger('Extension Manager');

    this.logger.info('🚀 Initializing X-Fidelity Extension Manager...', {
      hasInjectedLogger: LoggerProvider.hasInjectedLogger(),
      loggerReady: LoggerProvider.hasLogger()
    });

    try {
      this.configManager = new ConfigManager(this.context);
      this.logger.debug('✅ ConfigManager initialized');

      this.diagnosticProvider = new DiagnosticProvider(this.configManager);
      this.logger.debug('✅ DiagnosticProvider initialized');

      this.analysisEngine = new CLIAnalysisManager(
        this.configManager,
        this.diagnosticProvider
      );
      this.logger.debug('✅ CLIAnalysisManager initialized');

      this.statusBarProvider = new StatusBarProvider(this.analysisEngine);
      this.logger.debug('✅ StatusBarProvider initialized');

      this.issuesTreeViewManager = new IssuesTreeViewManager(
        this.context,
        this.diagnosticProvider,
        this.configManager,
        'xfidelityIssuesTreeView'
      );
      this.logger.debug('✅ IssuesTreeViewManager initialized');

      this.controlCenterTreeViewManager = new ControlCenterTreeViewManager(
        this.context,
        'xfidelityControlCenterView'
      );
      this.logger.debug('✅ ControlCenterTreeViewManager initialized');

      // PHASE 3: Plugin initialization is handled by the spawned CLI
      // No need to initialize plugins in the extension itself

      this.setupEventListeners();
      this.registerCommands();
      this.logger.info('✅ Extension Manager initialized successfully');
    } catch (error) {
      this.logger.error('❌ Extension Manager initialization failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.disposables.push(
      this.analysisEngine.onComplete(result => {
        // Validate result structure
        if (!result.summary) {
          this.logger.error('Analysis result missing summary object', {
            result
          });
          return;
        }

        const totalIssues = result.summary.totalIssues || 0;
        const filesAnalyzed = result.summary.filesAnalyzed || 0;

        this.logger.info(
          `📊 Analysis completed: ${totalIssues} issues found across ${filesAnalyzed} files`
        );

        this.issuesTreeViewManager.refresh();

        if (totalIssues > 0) {
          vscode.window
            .showInformationMessage(
              `X-Fidelity found ${totalIssues} issues across ${filesAnalyzed} files`,
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
        this.logger.debug(`Analysis state changed: ${state}`);
      })
    );

    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.logger.info('Configuration changed, updating components...');
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

          this.logger.info('🔍 Starting analysis...');
          await this.analysisEngine.runAnalysis();
        } catch (error) {
          this.logger.error('Analysis failed:', error);
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
                this.logger.warn(
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
                this.logger.warn(
                  'Analysis path is not a directory:',
                  workspacePath
                );
                vscode.window.showWarningMessage(
                  `Analysis path is not a directory: ${workspacePath}`
                );
                return;
              }
            } catch (fsError) {
              this.logger.warn(
                `Cannot access analysis directory: ${workspacePath} - ${fsError}`
              );
              vscode.window.showWarningMessage(
                `Cannot access analysis directory: ${workspacePath}`
              );
              return;
            }

            this.logger.info(
              '🔍 Starting analysis with directory:',
              workspacePath
            );
            await this.analysisEngine.runAnalysis();
          } catch (error) {
            this.logger.error('Analysis with directory failed:', error);
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
      vscode.commands.registerCommand('xfidelity.resetToDefaults', async () => {
        await this.resetSettingsToDefaults();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.debugDiagnostics', () => {
        this.debugDiagnosticsInfo();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.debugCLISetup', async () => {
        await this.debugCLISetup();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.diagnoseCLIResult',
        async () => {
          await showCLIDiagnosticsDialog();
        }
      )
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
        this.logger.show();
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

          this.logger.info('🔍 Detecting project archetype...');
          vscode.window.showInformationMessage(
            'Archetype detection is handled automatically by the CLI during analysis'
          );
        } catch (error) {
          this.logger.error('Archetype detection failed:', error);
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
            const result = await vscode.window.showInformationMessage(
              'Are you sure you want to reset X-Fidelity configuration to defaults?',
              { modal: true },
              'Reset',
              'Cancel'
            );

            if (result === 'Reset') {
              const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
              const config = vscode.workspace.getConfiguration(
                'xfidelity',
                workspaceFolder?.uri
              );
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

    // Additional report commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.shareReport', async () => {
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
            'Analysis results copied to clipboard for sharing!'
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Share report failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.compareReports', () => {
        vscode.window.showInformationMessage(
          'Report comparison feature is coming soon. Use the Problems panel or Issues tree for now.'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.viewTrends', () => {
        vscode.window.showInformationMessage(
          'Trend analysis feature is coming soon. Check the .xfiResults directory for historical data.'
        );
      })
    );

    // Note: Tree view commands are registered by IssuesTreeViewManager
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
        this.logger.info('🔄 Running periodic analysis...');
        await this.analysisEngine.runAnalysis();
      } catch (error) {
        this.logger.error('❌ Periodic analysis failed:', error);
      }
    }, intervalMs);

    vscode.window.showInformationMessage(
      `Periodic analysis started (interval: ${runInterval}s)`
    );
    this.logger.info(
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
    this.logger.info('⏹️ Periodic analysis stopped');
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
    this.logger.info(
      `🔍 Periodic analysis status: ${status}, interval: ${intervalText}`
    );
  }

  private async debugCLISetup(): Promise<void> {
    try {
      const cliSpawner = this.analysisEngine.getCLISpawner();
      if (!cliSpawner) {
        vscode.window.showErrorMessage('CLI Spawner not available');
        return;
      }

      // Get CLI diagnostics
      const diagnostics = await cliSpawner.getDiagnostics();

      this.logger.info('🔍 CLI Setup Diagnostics:', diagnostics);

      const message =
        `CLI Setup Diagnostics:\n` +
        `Platform: ${diagnostics.platform}\n` +
        `Node.js Path: ${diagnostics.nodePath}\n` +
        `CLI Path: ${diagnostics.cliPath}\n` +
        `CLI Exists: ${diagnostics.cliExists ? '✅' : '❌'}\n` +
        `Node.js Exists: ${diagnostics.nodeExists ? '✅' : '❌'}\n` +
        `Working Directory: ${diagnostics.workingDirectory}\n` +
        `Extension Path: ${diagnostics.extensionPath}\n\n` +
        `Check the Output Console (X-Fidelity) for detailed information.`;

      vscode.window
        .showInformationMessage(message, 'Open Output', 'Copy Diagnostics')
        .then(choice => {
          if (choice === 'Open Output') {
            this.logger.show();
          } else if (choice === 'Copy Diagnostics') {
            vscode.env.clipboard.writeText(
              JSON.stringify(diagnostics, null, 2)
            );
            vscode.window.showInformationMessage(
              'CLI diagnostics copied to clipboard'
            );
          }
        });
    } catch (error) {
      this.logger.error('CLI diagnostics failed:', error);
      vscode.window.showErrorMessage(`CLI diagnostics failed: ${error}`);
    }
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

    this.logger.info('🔍 DEBUG DIAGNOSTICS INFO:', debugInfo);
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

  /**
   * Reset all X-Fidelity settings to their default values
   */
  private async resetSettingsToDefaults(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('xfidelity');

      // List of all X-Fidelity settings that can be reset
      const settingsToReset = [
        'enableTreeSitterWasm',
        'generateReports',
        'reportOutputDir',
        'enableTelemetry',
        'logLevel',
        'performance.hideOptimizationNotice',
        'periodicAnalysis.enabled',
        'periodicAnalysis.intervalMinutes',
        'analysis.enableFileWatcher',
        'analysis.debounceMs',
        'analysis.excludePatterns',
        'analysis.includePatterns'
      ];

      const choice = await vscode.window.showWarningMessage(
        '🔄 Reset X-Fidelity Settings\n\nThis will reset ALL X-Fidelity settings to their default values at both user and workspace levels. This action cannot be undone.',
        { modal: true },
        'Reset All Settings',
        'Cancel'
      );

      if (choice !== 'Reset All Settings') {
        return;
      }

      // Reset settings at workspace level
      for (const setting of settingsToReset) {
        try {
          await config.update(
            setting,
            undefined,
            vscode.ConfigurationTarget.Workspace
          );
        } catch (error) {
          this.logger.debug(
            `Failed to reset workspace setting ${setting}:`,
            error
          );
        }
      }

      // Reset settings at user level
      for (const setting of settingsToReset) {
        try {
          await config.update(
            setting,
            undefined,
            vscode.ConfigurationTarget.Global
          );
        } catch (error) {
          this.logger.debug(`Failed to reset user setting ${setting}:`, error);
        }
      }

      this.logger.info('✅ All X-Fidelity settings reset to defaults');

      const restartChoice = await vscode.window.showInformationMessage(
        '✅ Settings Reset Complete\n\nAll X-Fidelity settings have been reset to their default values. A restart is recommended for all changes to take effect.',
        'Restart Extension',
        'Continue'
      );

      if (restartChoice === 'Restart Extension') {
        // Restart the extension by disabling and re-enabling it
        await vscode.commands.executeCommand(
          'workbench.extensions.action.disableWorkspace',
          'zotoio.x-fidelity-vscode'
        );
        await vscode.commands.executeCommand(
          'workbench.extensions.action.enableWorkspace',
          'zotoio.x-fidelity-vscode'
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('❌ Failed to reset settings to defaults:', error);
      vscode.window.showErrorMessage(
        `Failed to reset settings: ${errorMessage}`
      );
    }
  }

  dispose(): void {
    this.logger.info('🔄 Disposing Extension Manager...');

    this.stopPeriodicAnalysis();

    this.disposables.forEach(d => d.dispose());
    this.analysisEngine.dispose();
    this.statusBarProvider.dispose();
    this.issuesTreeViewManager.dispose();
    this.controlCenterTreeViewManager.dispose();
    this.logger.info('✅ Extension Manager disposed');
  }
}
