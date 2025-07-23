import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
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
  private lastTriggerSource: string = 'unknown'; // Track the last analysis trigger source

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

      // ENHANCEMENT: Run automatic analysis on extension activation (but don't open sidebar)
      this.scheduleStartupAnalysis();
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

        // ENHANCEMENT: Only show notifications for manual analysis, not automatic startup analysis
        if (this.lastTriggerSource === 'manual') {
          if (totalIssues > 0) {
            vscode.window
              .showInformationMessage(
                `X-Fidelity found ${totalIssues} issues across ${filesAnalyzed} files`,
                'View Issues'
              )
              .then(choice => {
                if (choice === 'View Issues') {
                  // Open the X-Fidelity sidebar and refresh the tree view
                  vscode.commands.executeCommand(
                    'workbench.view.extension.xfidelity'
                  );
                  this.issuesTreeViewManager.refresh();
                }
              });
          } else {
            vscode.window.showInformationMessage(
              'X-Fidelity analysis completed - no issues found! 🎉'
            );
          }
        } else {
          // For automatic analysis, just log the results without user notification
          this.logger.info(
            `🔍 Automatic analysis completed: ${totalIssues} issues found across ${filesAnalyzed} files`
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
    // NOTE: xfidelity.refreshIssuesTree is registered by IssuesTreeViewManager, not here

    // 🆕 NEW: Force refresh with cache clearing
    this.context.subscriptions.push(
      vscode.commands.registerCommand(
        'xfidelity.forceRefreshWithDiagnostics',
        async () => {
          this.logger.info('🔍 Force refresh with diagnostics triggered');

          // Step 1: Show current state before refresh
          this.debugDiagnosticsInfo();

          // Step 2: Clear diagnostics
          this.logger.info('🧹 Clearing all diagnostics...');
          vscode.languages.getDiagnostics().forEach(([uri, diagnostics]) => {
            if (diagnostics.some(d => d.source === 'X-Fidelity')) {
              this.logger.debug(`Clearing diagnostics for ${uri.fsPath}`);
            }
          });

          // Step 3: Force fresh analysis
          this.logger.info('🔄 Running fresh analysis...');
          try {
            await this.analysisEngine.runAnalysis({
              forceRefresh: true,
              triggerSource: 'manual'
            });

            // Step 4: Wait for diagnostics to settle
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 5: Show final state
            this.logger.info('📊 Final state after refresh:');
            this.debugDiagnosticsInfo();

            vscode.window
              .showInformationMessage(
                'X-Fidelity: Force refresh completed. Check Output console for diagnostics.',
                'View Output'
              )
              .then(choice => {
                if (choice === 'View Output') {
                  vscode.commands.executeCommand(
                    'workbench.action.output.show.x-fidelity'
                  );
                }
              });
          } catch (error) {
            this.logger.error('Force refresh failed:', error);
            vscode.window.showErrorMessage(`Force refresh failed: ${error}`);
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.runAnalysis', async () => {
        try {
          const workspacePath = getAnalysisTargetDirectory();
          if (!workspacePath) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
          }

          this.logger.info('🔍 Starting manual analysis...');
          this.lastTriggerSource = 'manual'; // Track trigger source for notification handling
          await this.analysisEngine.runAnalysis({ triggerSource: 'manual' });
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
              '🔍 Starting manual analysis with directory:',
              workspacePath
            );
            await this.analysisEngine.runAnalysis({ triggerSource: 'manual' });
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
      vscode.commands.registerCommand('xfidelity.showDashboard', async () => {
        try {
          await this.openDashboardMarkdownPreview();
        } catch (error) {
          this.logger.error('Failed to open dashboard:', error);
          // Fallback to original behavior
          this.issuesTreeViewManager.refresh();
          vscode.commands.executeCommand('workbench.view.extension.xfidelity');
        }
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

    // ENHANCEMENT: Register enhanced explainIssue command that handles both diagnostic and tree view contexts
    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.explainIssue',
        async (context?: any) => {
          try {
            if (!context) {
              vscode.window.showWarningMessage(
                'No issue data available to explain'
              );
              return;
            }

            // Handle diagnostic context from hover
            if (context.ruleId && context.message && !context.issue) {
              await this.explainIssueFromDiagnostic(context);
            }
            // Handle tree view item context (delegate to tree view manager)
            else if (context.issue || context.id) {
              if (this.issuesTreeViewManager) {
                await vscode.commands.executeCommand(
                  'xfidelity.explainIssueFromTree',
                  context
                );
              }
            } else {
              vscode.window.showWarningMessage(
                'Invalid issue context for explanation'
              );
            }
          } catch (error) {
            this.logger.error('Failed to explain issue:', error);
            vscode.window.showErrorMessage(
              `Failed to explain issue: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    // ENHANCEMENT: Register enhanced fixIssue command that handles both diagnostic and tree view contexts
    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.fixIssue',
        async (context?: any) => {
          try {
            if (!context) {
              vscode.window.showWarningMessage(
                'No issue data available to fix'
              );
              return;
            }

            // Handle diagnostic context from hover
            if (context.ruleId && context.message && !context.issue) {
              await this.fixIssueFromDiagnostic(context);
            }
            // Handle tree view item context (delegate to tree view manager)
            else if (context.issue || context.id) {
              if (this.issuesTreeViewManager) {
                await vscode.commands.executeCommand(
                  'xfidelity.fixIssueFromTree',
                  context
                );
              }
            } else {
              vscode.window.showWarningMessage('Invalid issue context for fix');
            }
          } catch (error) {
            this.logger.error('Failed to fix issue:', error);
            vscode.window.showErrorMessage(
              `Failed to fix issue: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    // REMOVED: Exemption commands are no longer supported
    // this.disposables.push(
    //   vscode.commands.registerCommand('xfidelity.addExemption', async () => {
    //     try {
    //       vscode.window.showInformationMessage(
    //         'Use the context menu on issues in the tree view to add exemptions.'
    //       );
    //     } catch (error) {
    //       vscode.window.showErrorMessage(
    //         `Add exemption failed: ${error instanceof Error ? error.message : String(error)}`
    //       );
    //     }
    //   })
    // );

    // this.disposables.push(
    //   vscode.commands.registerCommand(
    //     'xfidelity.addBulkExemptions',
    //     async () => {
    //       try {
    //         vscode.window.showInformationMessage(
    //           'Bulk exemptions can be added by editing the .xfi-config.json file directly.'
    //         );
    //       } catch (error) {
    //         vscode.window.showErrorMessage(
    //           `Add bulk exemptions failed: ${error instanceof Error ? error.message : String(error)}`
    //         );
    //       }
    //     }
    //   )
    // );

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
        await this.analysisEngine.runAnalysis({ triggerSource: 'periodic' });
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

  /**
   * ENHANCEMENT: Explain issue from diagnostic context (hover tooltip)
   */
  private async explainIssueFromDiagnostic(
    diagnosticContext: any
  ): Promise<void> {
    const { ruleId, message, category, severity, file, line } =
      diagnosticContext;

    // Create a comprehensive explanation
    const explanation = await this.generateIssueExplanation(
      ruleId,
      message,
      category,
      severity
    );

    // Show explanation in a dedicated panel or information message
    const choice = await vscode.window.showInformationMessage(
      `**${ruleId}** explanation:\n\n${explanation}`,
      {
        modal: false,
        detail: `Rule: ${ruleId}\nSeverity: ${severity}\nCategory: ${category}\nLocation: ${file}:${line}`
      },
      'View Details',
      'Copy Explanation'
    );

    if (choice === 'View Details') {
      // Open a dedicated webview or output channel with detailed explanation
      await this.showDetailedExplanation(
        ruleId,
        message,
        category,
        severity,
        diagnosticContext
      );
    } else if (choice === 'Copy Explanation') {
      await vscode.env.clipboard.writeText(
        `Rule: ${ruleId}\n\nExplanation: ${explanation}`
      );
      vscode.window.showInformationMessage('Explanation copied to clipboard');
    }
  }

  /**
   * ENHANCEMENT: Fix issue from diagnostic context (hover tooltip)
   */
  private async fixIssueFromDiagnostic(diagnosticContext: any): Promise<void> {
    const { ruleId, message, fixable, file, line } = diagnosticContext;

    if (!fixable) {
      vscode.window.showInformationMessage(
        `Rule ${ruleId} does not have an automated fix available.`
      );
      return;
    }

    // Generate fix suggestions
    const fixSuggestions = await this.generateFixSuggestions(
      ruleId,
      message,
      diagnosticContext
    );

    if (fixSuggestions.length === 0) {
      vscode.window.showInformationMessage(
        `No automated fixes available for rule ${ruleId}.`
      );
      return;
    }

    // Show fix options to user
    const choice = await vscode.window.showQuickPick(
      fixSuggestions.map(fix => ({
        label: fix.title,
        description: fix.description,
        detail: fix.preview,
        fix: fix
      })),
      {
        placeHolder: `Select a fix for ${ruleId}`,
        canPickMany: false
      }
    );

    if (choice && choice.fix) {
      await this.applyFix(choice.fix, diagnosticContext);
    }
  }

  /**
   * Generate issue explanation based on rule context
   */
  private async generateIssueExplanation(
    ruleId: string,
    message: string,
    category: string,
    severity: string
  ): Promise<string> {
    // This would ideally integrate with the CLI or a knowledge base
    // For now, provide a structured explanation

    const explanations: { [key: string]: string } = {
      // Add rule-specific explanations
      complexity:
        'This rule checks for excessive complexity in code blocks. High complexity makes code harder to understand and maintain.',
      'inconsistent-naming':
        'This rule ensures consistent naming conventions across your codebase for better readability.',
      'unused-import':
        'This rule identifies imports that are not used in the code, which can improve bundle size and clarity.',
      'missing-documentation':
        'This rule checks for proper documentation in code to improve maintainability.'
      // Add more rule-specific explanations as needed
    };

    const baseExplanation =
      explanations[ruleId] ||
      `This rule (${ruleId}) has flagged an issue that needs attention. The issue is categorized as '${category}' with ${severity} severity.`;

    return `${baseExplanation}\n\nIssue details: ${message}\n\nCategory: ${category}\nSeverity: ${severity}`;
  }

  /**
   * Generate fix suggestions for a specific rule
   */
  private async generateFixSuggestions(
    ruleId: string,
    message: string,
    context: any
  ): Promise<any[]> {
    // This would ideally integrate with the CLI's fix capabilities
    // For now, provide common fix patterns

    const fixes: { [key: string]: any[] } = {
      'unused-import': [
        {
          title: 'Remove unused import',
          description: 'Automatically remove the unused import statement',
          preview: 'Remove the import line',
          type: 'remove-line'
        }
      ],
      'inconsistent-naming': [
        {
          title: 'Fix naming convention',
          description: 'Rename to follow project naming conventions',
          preview: 'Apply consistent naming pattern',
          type: 'rename'
        }
      ],
      'missing-documentation': [
        {
          title: 'Add documentation',
          description: 'Generate appropriate documentation',
          preview: 'Add JSDoc or comments',
          type: 'add-documentation'
        }
      ]
    };

    return (
      fixes[ruleId] || [
        {
          title: 'Manual fix required',
          description: 'This issue requires manual attention',
          preview: 'Please review and fix manually',
          type: 'manual'
        }
      ]
    );
  }

  /**
   * Apply a fix to the code
   */
  private async applyFix(fix: any, context: any): Promise<void> {
    // This would integrate with VSCode's edit capabilities
    vscode.window.showInformationMessage(`Applying fix: ${fix.title}`, {
      modal: false
    });

    // For now, show what would be done
    vscode.window.showInformationMessage(
      `Fix "${fix.title}" would be applied. Integration with automated fixes coming soon.`
    );
  }

  /**
   * Show detailed explanation in a dedicated view
   */
  private async showDetailedExplanation(
    ruleId: string,
    message: string,
    category: string,
    severity: string,
    context: any
  ): Promise<void> {
    // Create a webview or use the output channel for detailed explanation
    const outputChannel = vscode.window.createOutputChannel(
      `X-Fidelity: ${ruleId} Explanation`
    );

    outputChannel.appendLine(`=== X-Fidelity Rule Explanation ===`);
    outputChannel.appendLine(`Rule: ${ruleId}`);
    outputChannel.appendLine(`Category: ${category}`);
    outputChannel.appendLine(`Severity: ${severity}`);
    outputChannel.appendLine(`Message: ${message}`);
    outputChannel.appendLine(``);
    outputChannel.appendLine(`=== Detailed Explanation ===`);

    const explanation = await this.generateIssueExplanation(
      ruleId,
      message,
      category,
      severity
    );
    outputChannel.appendLine(explanation);

    outputChannel.appendLine(``);
    outputChannel.appendLine(`=== Context ===`);
    outputChannel.appendLine(`File: ${context.file || 'Unknown'}`);
    outputChannel.appendLine(`Line: ${context.line || 'Unknown'}`);
    outputChannel.appendLine(`Column: ${context.column || 'Unknown'}`);

    outputChannel.show();
  }

  /**
   * ENHANCEMENT: Schedule automatic analysis on startup (without opening sidebar)
   */
  private scheduleStartupAnalysis(): void {
    // Run analysis after a short delay to ensure everything is initialized
    setTimeout(async () => {
      try {
        this.logger.info('🔄 Running automatic startup analysis...');
        this.lastTriggerSource = 'automatic'; // Track trigger source for notification handling
        await this.analysisEngine.runAnalysis({
          forceRefresh: false,
          triggerSource: 'automatic' // This will NOT open the sidebar
        });
      } catch (error) {
        this.logger.warn('Startup analysis failed:', error);
        // Don't show error messages for automatic startup analysis
      }
    }, 2000); // 2-second delay to ensure full initialization
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

  /**
   * ENHANCEMENT: Open dashboard markdown preview - assumes XFI_RESULT.md exists
   */
  private async openDashboardMarkdownPreview(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('No workspace folder found');
      return;
    }

    const workspacePath = workspaceFolder.uri.fsPath;
    const markdownPath = path.join(
      workspacePath,
      '.xfiResults',
      'XFI_RESULT.md'
    );

    // Check if XFI_RESULT.md exists
    if (!fs.existsSync(markdownPath)) {
      const choice = await vscode.window.showWarningMessage(
        'No dashboard found. Would you like to run an analysis first?',
        'Run Analysis',
        'Cancel'
      );

      if (choice === 'Run Analysis') {
        await vscode.commands.executeCommand('xfidelity.runAnalysis');
        return;
      }
      return;
    }

    try {
      // Open the existing XFI_RESULT.md file directly
      const markdownUri = vscode.Uri.file(markdownPath);

      // Open markdown preview with mermaid support
      await vscode.commands.executeCommand('markdown.showPreview', markdownUri);

      this.logger.info(`✅ Dashboard opened: ${markdownPath}`);
    } catch (error) {
      this.logger.error('Failed to open dashboard:', error);

      // Show error and offer fallback
      const choice = await vscode.window.showErrorMessage(
        'Failed to open dashboard. Would you like to open the issues panel instead?',
        'Open Issues Panel',
        'Cancel'
      );

      if (choice === 'Open Issues Panel') {
        this.issuesTreeViewManager.refresh();
        vscode.commands.executeCommand('workbench.view.extension.xfidelity');
      }
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
