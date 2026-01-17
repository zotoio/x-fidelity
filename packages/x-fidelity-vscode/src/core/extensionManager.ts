import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { XFidelityCodeActionProvider } from '../diagnostics/codeActionProvider';
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
import {
  CommandDelegationRegistry,
  IssueContext
} from './commandDelegationRegistry';
import { ResultCoordinator } from './resultCoordinator';
import {
  getGitHubConfigCacheManager,
  disposeGitHubConfigCacheManager
} from '../config/gitHubConfigCacheManager';
import { CodeSnippetExtractor } from '../utils/codeSnippetExtractor';
import { DiagnosticLocationExtractor } from '../utils/diagnosticLocationExtractor';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;

  private configManager: ConfigManager;
  private diagnosticProvider: DiagnosticProvider;
  private analysisEngine: CLIAnalysisManager;

  private statusBarProvider: StatusBarProvider;
  private issuesTreeViewManager: IssuesTreeViewManager;
  private controlCenterTreeViewManager: ControlCenterTreeViewManager;
  private commandDelegationRegistry: CommandDelegationRegistry;
  private resultCoordinator: ResultCoordinator;

  private periodicAnalysisTimer?: NodeJS.Timeout;
  private isPeriodicAnalysisRunning = false;
  private lastTriggerSource: string = 'unknown'; // Track the last analysis trigger source
  private fileSaveWatcher?: vscode.Disposable;

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

      this.commandDelegationRegistry = new CommandDelegationRegistry(
        this.context
      );
      this.logger.debug('✅ CommandDelegationRegistry initialized');

      // NEW: Initialize ResultCoordinator after all components are created
      this.resultCoordinator = new ResultCoordinator();
      this.logger.debug('✅ ResultCoordinator initialized');

      // Initialize GitHub configuration cache manager for cache invalidation
      getGitHubConfigCacheManager();
      this.logger.debug('✅ GitHubConfigCacheManager initialized');

      // PHASE 3: Plugin initialization is handled by the spawned CLI
      // No need to initialize plugins in the extension itself

      this.setupEventListeners();
      this.registerCommands();
      this.registerCodeActionProvider();
      this.logger.info('✅ Extension Manager initialized successfully');

      // ENHANCEMENT: Run automatic analysis on extension activation (but don't open sidebar)
      this.scheduleStartupAnalysis();

      // ENHANCEMENT: Set up automation features (file save watching, periodic analysis)
      this.setupAutomationFeatures();
    } catch (error) {
      this.logger.error('❌ Extension Manager initialization failed:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.disposables.push(
      this.analysisEngine.onComplete(async result => {
        try {
          // NEW: Use ResultCoordinator for direct, consistent updates
          const processed =
            await this.resultCoordinator.processAndDistributeResults(result, {
              diagnosticProvider: this.diagnosticProvider,
              issuesTreeViewManager: this.issuesTreeViewManager,
              statusBarProvider: this.statusBarProvider
            });

          this.logger.info(
            `📊 Analysis completed and distributed: ${processed.totalIssues} total issues ` +
              `(${processed.successfulIssues} successful, ${processed.failedIssuesCount} unhandled)`
          );

          // If diagnostics are disabled for this session, clear them after update
          if (!this.controlCenterTreeViewManager.isDiagnosticsEnabled()) {
            this.logger.debug(
              '🔕 Diagnostics disabled - clearing squiggly lines'
            );
            this.diagnosticProvider.clearDiagnostics();
          }

          // Show user notifications based on trigger source and results
          this.showAnalysisCompleteNotification(processed);
        } catch (error) {
          this.logger.error(
            'Failed to process and distribute analysis results',
            error
          );

          // Fallback to basic notification
          vscode.window.showErrorMessage(
            `X-Fidelity analysis failed to process results: ${error instanceof Error ? error.message : 'Unknown error'}`
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
        this.setupAutomationFeatures();
      })
    );
  }

  /**
   * Register Code Action Provider for lightbulb quick fixes
   */
  private registerCodeActionProvider(): void {
    const codeActionProvider = new XFidelityCodeActionProvider();

    // Register for all file types
    const disposable = vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      codeActionProvider,
      {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
      }
    );

    this.disposables.push(disposable);
    this.logger.debug('✅ Code Action Provider registered for quick fixes');
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

    // Toggle commands for session-based settings
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.toggleDiagnostics', () => {
        const enabled = this.controlCenterTreeViewManager.toggleDiagnostics();
        if (enabled) {
          // Re-run analysis to restore diagnostics
          this.logger.info(
            '🔔 Diagnostics enabled - refreshing analysis results'
          );
          vscode.window.showInformationMessage(
            'X-Fidelity: Diagnostics enabled for this session'
          );
          // Trigger a refresh to restore diagnostics from cached results
          this.issuesTreeViewManager.refresh();
        } else {
          // Clear all diagnostics
          this.logger.info('🔕 Diagnostics disabled - clearing squiggly lines');
          this.diagnosticProvider.clearDiagnostics();
          vscode.window.showInformationMessage(
            'X-Fidelity: Diagnostics disabled for this session'
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.toggleAutorun', () => {
        const enabled = this.controlCenterTreeViewManager.toggleAutorun();
        if (enabled) {
          // Re-enable automation features
          this.logger.info(
            '🔄 Autorun enabled - restoring automation features'
          );
          this.setupAutomationFeatures();
          vscode.window.showInformationMessage(
            'X-Fidelity: Autorun enabled for this session'
          );
        } else {
          // Disable automation features (stop periodic analysis and file save watching)
          this.logger.info('⏸️ Autorun disabled - pausing automation features');
          this.pauseAutomationFeatures();
          vscode.window.showInformationMessage(
            'X-Fidelity: Autorun disabled for this session'
          );
        }
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showRuleDocumentation', () => {
        vscode.window.showInformationMessage(
          'Rule documentation is available in the hover tooltips and issue details.'
        );
      })
    );

    // ENHANCEMENT: Register delegating explainIssue command that handles both diagnostic and tree view contexts
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

            const issueContext = await this.extractIssueContext(context);
            await this.commandDelegationRegistry.delegateExplainIssue(
              issueContext
            );
          } catch (error) {
            this.logger.error('Failed to explain issue:', error);
            vscode.window.showErrorMessage(
              `Failed to explain issue: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    // ENHANCEMENT: Register delegating fixIssue command that handles both diagnostic and tree view contexts
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

            const issueContext = await this.extractIssueContext(context);
            await this.commandDelegationRegistry.delegateFixIssue(issueContext);
          } catch (error) {
            this.logger.error('Failed to fix issue:', error);
            vscode.window.showErrorMessage(
              `Failed to fix issue: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    // NEW: Register fixIssueGroup command for batch fixing
    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.fixIssueGroup',
        async (context?: any) => {
          try {
            if (!context) {
              vscode.window.showWarningMessage(
                'No group data available to fix'
              );
              return;
            }

            const groupContext = await this.extractGroupContext(context);
            await this.commandDelegationRegistry.delegateFixIssueGroup(
              groupContext
            );
          } catch (error) {
            this.logger.error('Failed to fix issue group:', error);
            vscode.window.showErrorMessage(
              `Failed to fix issue group: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    // NEW: Register command provider configuration command
    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.configureCommandProviders',
        async () => {
          try {
            await this.commandDelegationRegistry.showConfigurationUI();
          } catch (error) {
            this.logger.error('Failed to configure command providers:', error);
            vscode.window.showErrorMessage(
              `Failed to configure command providers: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    // NEW: Register editor context menu commands (right-click on code)
    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.explainIssueAtCursor',
        async () => {
          try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              vscode.window.showWarningMessage('No active editor');
              return;
            }

            const position = editor.selection.active;
            const diagnostics = vscode.languages.getDiagnostics(
              editor.document.uri
            );

            // Find X-Fidelity diagnostic at cursor position
            const diagnostic = diagnostics.find(
              d => d.source === 'X-Fidelity' && d.range.contains(position)
            );

            if (!diagnostic) {
              vscode.window.showInformationMessage(
                'No X-Fidelity issue found at cursor position'
              );
              return;
            }

            // Extract context from diagnostic's xfidelity metadata
            const xfiData = (diagnostic as any).xfidelity || {};
            const issueContext = await this.extractIssueContext({
              ...xfiData,
              message: diagnostic.message,
              code: diagnostic.code
            });

            await this.commandDelegationRegistry.delegateExplainIssue(
              issueContext
            );
          } catch (error) {
            this.logger.error('Failed to explain issue at cursor:', error);
            vscode.window.showErrorMessage(
              `Failed to explain issue: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      )
    );

    this.disposables.push(
      vscode.commands.registerCommand(
        'xfidelity.fixIssueAtCursor',
        async () => {
          try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              vscode.window.showWarningMessage('No active editor');
              return;
            }

            const position = editor.selection.active;
            const diagnostics = vscode.languages.getDiagnostics(
              editor.document.uri
            );

            // Find X-Fidelity diagnostic at cursor position
            const diagnostic = diagnostics.find(
              d => d.source === 'X-Fidelity' && d.range.contains(position)
            );

            if (!diagnostic) {
              vscode.window.showInformationMessage(
                'No X-Fidelity issue found at cursor position'
              );
              return;
            }

            // Extract context from diagnostic's xfidelity metadata
            const xfiData = (diagnostic as any).xfidelity || {};
            const issueContext = await this.extractIssueContext({
              ...xfiData,
              message: diagnostic.message,
              code: diagnostic.code
            });

            await this.commandDelegationRegistry.delegateFixIssue(issueContext);
          } catch (error) {
            this.logger.error('Failed to fix issue at cursor:', error);
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
    const { ruleId, message, fixable } = diagnosticContext;

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
    _message: string,
    _context: any
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
  private async applyFix(fix: any, _context: any): Promise<void> {
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
    // Check if analyze on startup is enabled
    const config = this.configManager.getConfig();
    if (!config.analyzeOnStartup) {
      this.logger.info(
        '🚫 Startup analysis disabled by analyzeOnStartup setting'
      );
      return;
    }

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

  /**
   * Setup automation features based on current configuration
   */
  private setupAutomationFeatures(): void {
    // Skip if autorun is disabled for this session
    if (!this.controlCenterTreeViewManager.isAutorunEnabled()) {
      this.logger.info(
        '⏸️ Autorun disabled for this session - skipping automation setup'
      );
      return;
    }

    const config = this.configManager.getConfig();

    // Setup or update periodic analysis
    this.setupPeriodicAnalysis(config.runInterval);

    // Setup or update file save watching
    this.setupFileSaveWatching(config.autoAnalyzeOnSave);
  }

  /**
   * Pause automation features for current session (without changing settings)
   */
  private pauseAutomationFeatures(): void {
    // Stop periodic analysis
    if (this.periodicAnalysisTimer) {
      clearInterval(this.periodicAnalysisTimer);
      this.periodicAnalysisTimer = undefined;
      this.isPeriodicAnalysisRunning = false;
      this.logger.info('⏸️ Paused periodic analysis for session');
    }

    // Stop file save watching
    if (this.fileSaveWatcher) {
      this.fileSaveWatcher.dispose();
      this.fileSaveWatcher = undefined;
      this.logger.info('⏸️ Paused file save watching for session');
    }
  }

  /**
   * Setup periodic analysis timer
   */
  private setupPeriodicAnalysis(runInterval: number): void {
    // Stop existing timer
    if (this.periodicAnalysisTimer) {
      clearInterval(this.periodicAnalysisTimer);
      this.periodicAnalysisTimer = undefined;
      this.isPeriodicAnalysisRunning = false;
      this.logger.info('🛑 Stopped existing periodic analysis');
    }

    // Start new timer if interval > 0
    if (runInterval > 0) {
      const intervalMs = runInterval * 1000;
      this.periodicAnalysisTimer = setInterval(async () => {
        try {
          this.logger.info('🔄 Running periodic analysis...');
          await this.analysisEngine.runAnalysis({ triggerSource: 'periodic' });
        } catch (error) {
          this.logger.error('❌ Periodic analysis failed:', error);
        }
      }, intervalMs);

      this.isPeriodicAnalysisRunning = true;
      this.logger.info(
        `🔄 Periodic analysis started with ${runInterval}s interval`
      );
    } else {
      this.logger.info('🚫 Periodic analysis disabled (runInterval = 0)');
    }
  }

  /**
   * Setup file save watching for autoAnalyzeOnSave
   */
  private setupFileSaveWatching(autoAnalyzeOnSave: boolean): void {
    // Dispose existing watcher
    if (this.fileSaveWatcher) {
      this.fileSaveWatcher.dispose();
      this.fileSaveWatcher = undefined;
      this.logger.info('🛑 Stopped file save watching');
    }

    // Setup new watcher if enabled
    if (autoAnalyzeOnSave) {
      this.fileSaveWatcher = vscode.workspace.onDidSaveTextDocument(
        async document => {
          // Only analyze if the saved file is in a workspace and is a relevant file type
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders) {
            return;
          }

          const isInWorkspace = workspaceFolders.some(folder =>
            document.uri.fsPath.startsWith(folder.uri.fsPath)
          );

          const isRelevantFile =
            /\.(ts|tsx|js|jsx|json|py|java|cs|php|rb|go|rs|cpp|c|h)$/.test(
              document.fileName
            );

          if (isInWorkspace && isRelevantFile) {
            try {
              this.logger.info(
                `💾 File saved, running analysis: ${vscode.workspace.asRelativePath(document.uri)}`
              );
              await this.analysisEngine.runAnalysis({
                triggerSource: 'file-save'
              });
            } catch (error) {
              this.logger.error('❌ File save analysis failed:', error);
            }
          }
        }
      );

      this.disposables.push(this.fileSaveWatcher);
      this.logger.info('💾 File save watching enabled');
    } else {
      this.logger.info('🚫 File save watching disabled');
    }
  }

  private debugDiagnosticsInfo(): void {
    const diagnostics = this.diagnosticProvider.getAllDiagnostics();

    const info = {
      totalFiles: diagnostics.length,
      totalDiagnostics: diagnostics.reduce(
        (sum, [_uri, diags]) => sum + diags.length,
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

  /**
   * Extract issue context from various input formats with complete metadata
   * Enhanced to include highlighting details, dependency info, and recommendations
   */
  private async extractIssueContext(context: any): Promise<IssueContext> {
    // Determine source of context data
    const issueData = context.issue || context;
    const originalData = issueData.originalData || issueData;

    // Extract basic location information
    const file = issueData.file || issueData.filePath || '';
    const line = issueData.line || 1;
    const column = issueData.column || 1;
    const endLine = issueData.endLine || line;
    const endColumn = issueData.endColumn || column + 1;

    // Use DiagnosticLocationExtractor to get enhanced location details
    let locationResult: ReturnType<
      typeof DiagnosticLocationExtractor.extractLocation
    > | null = null;
    try {
      locationResult =
        DiagnosticLocationExtractor.extractLocation(originalData);
    } catch (error) {
      this.logger.debug('Failed to extract enhanced location:', error);
    }

    // Extract code snippet if file path is available
    let codeSnippet = '';
    if (file) {
      try {
        codeSnippet = await CodeSnippetExtractor.extractSnippet(
          file,
          line,
          endLine,
          { contextLines: 3, highlightRange: true }
        );
      } catch (error) {
        this.logger.debug('Failed to extract code snippet:', error);
      }
    }

    // Extract highlighting details from location result and original data
    const highlighting = this.extractHighlightingDetails(
      locationResult,
      originalData
    );

    // Extract dependency-specific information
    const dependencyInfo = this.extractDependencyInfo(originalData);

    // Extract recommendations from rule details
    const recommendations = this.extractRecommendations(originalData);
    const ruleDescription = this.extractRuleDescription(originalData);

    // Build comprehensive issue context
    const issueContext: IssueContext = {
      // Basic identification
      ruleId: issueData.ruleId || issueData.rule || issueData.code || 'unknown',
      message: issueData.message || '',
      file: file,

      // Location information (1-based)
      line: line,
      column: column,
      endLine: endLine,
      endColumn: endColumn,

      // Issue metadata
      severity: issueData.severity || 'info',
      category: issueData.category || 'general',
      fixable: issueData.fixable || false,
      exempted: issueData.exempted || false,
      issueId: issueData.issueId || issueData.id || undefined,

      // Context and documentation
      codeSnippet: codeSnippet,
      documentation: issueData.documentation || undefined,
      ruleDocUrl: issueData.ruleDocUrl || undefined,

      // Enhanced highlighting details
      highlighting: highlighting,

      // Rule recommendations and description
      recommendations: recommendations,
      ruleDescription: ruleDescription,

      // Dependency-specific details
      dependencyInfo: dependencyInfo,

      // Fix suggestions (if available)
      suggestedFix: issueData.suggestedFix || null,

      // Original data for advanced providers
      originalData: issueData.originalData || undefined,

      // Workspace context
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',

      // Related issues (if available)
      relatedIssues: issueData.relatedIssues || []
    };

    return issueContext;
  }

  /**
   * Extract highlighting details from location result and original data
   */
  private extractHighlightingDetails(
    locationResult: ReturnType<
      typeof DiagnosticLocationExtractor.extractLocation
    > | null,
    originalData: any
  ): IssueContext['highlighting'] {
    const highlighting: IssueContext['highlighting'] = {};
    let hasContent = false;

    // Extract from location result metadata
    if (locationResult?.metadata) {
      if (locationResult.metadata.originalMatch) {
        highlighting.matchedText = locationResult.metadata.originalMatch;
        hasContent = true;
      }
      if (locationResult.metadata.pattern) {
        highlighting.pattern = locationResult.metadata.pattern;
        hasContent = true;
      }
    }

    // Extract location source and confidence
    if (locationResult?.found) {
      highlighting.locationSource = locationResult.location.source;
      highlighting.confidence = locationResult.confidence;
      hasContent = true;
    }

    // Try to extract match details from original data structures
    const details = originalData?.details;

    // Handle sensitive logging patterns
    if (Array.isArray(details?.details)) {
      const patterns = details.details.filter(
        (d: any) => d && typeof d.lineNumber === 'number' && d.match
      );
      if (patterns.length > 0) {
        // First match
        if (!highlighting.matchedText && patterns[0].match) {
          highlighting.matchedText = patterns[0].match.substring(0, 100);
          hasContent = true;
        }
        if (!highlighting.pattern && patterns[0].pattern) {
          highlighting.pattern = patterns[0].pattern;
          hasContent = true;
        }
        if (patterns[0].context) {
          highlighting.matchContext = patterns[0].context;
          hasContent = true;
        }
        // Additional matches
        if (patterns.length > 1) {
          highlighting.additionalMatches = patterns.slice(1).map((p: any) => ({
            line: p.lineNumber,
            column: p.columnNumber || 1,
            matchedText: p.match?.substring(0, 50)
          }));
          hasContent = true;
        }
      }
    }

    // Handle pattern matches array
    const matches = details?.matches || details?.details?.matches;
    if (Array.isArray(matches) && matches.length > 0) {
      const firstMatch = matches[0];
      if (!highlighting.matchedText && (firstMatch.match || firstMatch.text)) {
        highlighting.matchedText = (
          firstMatch.match || firstMatch.text
        ).substring(0, 100);
        hasContent = true;
      }
      // Additional matches
      if (matches.length > 1 && !highlighting.additionalMatches) {
        highlighting.additionalMatches = matches.slice(1).map((m: any) => ({
          line: m.lineNumber || m.line,
          column: m.columnNumber || m.column || 1,
          matchedText: (m.match || m.text)?.substring(0, 50)
        }));
        hasContent = true;
      }
    }

    // Handle complexity metrics (for function complexity rules)
    const complexities =
      details?.details?.complexities || details?.complexities;
    if (Array.isArray(complexities) && complexities.length > 0) {
      const firstFunc = complexities[0];
      if (firstFunc.functionName) {
        highlighting.matchedText = `function ${firstFunc.functionName}`;
        hasContent = true;
      }
      if (firstFunc.metrics) {
        highlighting.matchContext = `Complexity: ${firstFunc.metrics.cyclomatic || 'N/A'}, Lines: ${firstFunc.metrics.lines || 'N/A'}`;
        hasContent = true;
      }
    }

    return hasContent ? highlighting : undefined;
  }

  /**
   * Extract dependency-specific information from original data
   */
  private extractDependencyInfo(
    originalData: any
  ): IssueContext['dependencyInfo'] {
    const details = originalData?.details;
    const depDetails = details?.details;

    // Check for array of dependency failures
    if (Array.isArray(depDetails) && depDetails.length > 0) {
      const dep = depDetails.find(
        (d: any) =>
          d && (d.dependency || d.location?.section || d.currentVersion)
      );
      if (dep) {
        return {
          section: dep.location?.section || dep.section,
          currentVersion: dep.currentVersion,
          requiredVersion: dep.requiredVersion,
          lineContent: dep.location?.lineContent
        };
      }
    }

    // Check for single dependency failure
    if (depDetails && !Array.isArray(depDetails)) {
      if (
        depDetails.dependency ||
        depDetails.location?.section ||
        depDetails.currentVersion
      ) {
        return {
          section: depDetails.location?.section || depDetails.section,
          currentVersion: depDetails.currentVersion,
          requiredVersion: depDetails.requiredVersion,
          lineContent: depDetails.location?.lineContent
        };
      }
    }

    // Check for version data in details
    if (details?.dep || details?.ver || details?.min) {
      return {
        currentVersion: details.ver,
        requiredVersion: details.min
      };
    }

    return undefined;
  }

  /**
   * Extract recommendations from rule details
   */
  private extractRecommendations(originalData: any): string[] | undefined {
    const details = originalData?.details;

    // Check for recommendations array
    if (Array.isArray(details?.recommendations)) {
      return details.recommendations;
    }

    // Check nested details
    if (Array.isArray(details?.details?.recommendations)) {
      return details.details.recommendations;
    }

    return undefined;
  }

  /**
   * Extract rule description from original data
   */
  private extractRuleDescription(originalData: any): string | undefined {
    const details = originalData?.details;

    return (
      details?.ruleDescription ||
      details?.details?.ruleDescription ||
      originalData?.ruleDescription
    );
  }

  /**
   * Extract group context for batch operations
   */
  private async extractGroupContext(context: any): Promise<any> {
    // Handle tree view group context
    if (context.groupKey) {
      const issues = context.issues || [];
      const issueContexts = await Promise.all(
        issues.map((issue: any) => this.extractIssueContext({ issue }))
      );
      return {
        groupKey: context.groupKey,
        issues: issueContexts,
        groupType: context.groupType || 'rule'
      };
    }

    // Fallback for single issue
    return {
      groupKey: 'single-issue',
      issues: [await this.extractIssueContext(context)],
      groupType: 'rule'
    };
  }

  /**
   * Show user notifications after analysis completion based on trigger source and results
   */
  private showAnalysisCompleteNotification(processed: any): void {
    try {
      const totalIssues = processed.totalIssues || 0;
      const unhandledIssues = processed.failedIssuesCount || 0;

      // ENHANCEMENT: Only show notifications for manual analysis, not automatic startup analysis
      if (this.lastTriggerSource === 'manual') {
        if (totalIssues > 0) {
          const message = `X-Fidelity found ${totalIssues} issues${unhandledIssues > 0 ? ` (${unhandledIssues} unhandled)` : ''}`;
          vscode.window
            .showInformationMessage(message, 'View Issues')
            .then(choice => {
              if (choice === 'View Issues') {
                // Open the X-Fidelity sidebar
                vscode.commands.executeCommand(
                  'workbench.view.extension.xfidelity'
                );
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
          `🔍 Automatic analysis completed: ${totalIssues} total issues ` +
            `(${processed.successfulIssues || 0} successful, ${unhandledIssues} unhandled)`
        );
      }
    } catch (error) {
      this.logger.error('Failed to show analysis complete notification', error);
    }
  }

  dispose(): void {
    this.logger.info('🔄 Disposing Extension Manager...');

    this.stopPeriodicAnalysis();

    // Clean up file save watcher
    if (this.fileSaveWatcher) {
      this.fileSaveWatcher.dispose();
      this.fileSaveWatcher = undefined;
    }

    this.disposables.forEach(d => d.dispose());
    this.analysisEngine.dispose();
    this.commandDelegationRegistry.dispose();
    this.statusBarProvider.dispose();
    this.issuesTreeViewManager.dispose();
    this.controlCenterTreeViewManager.dispose();
    this.resultCoordinator.dispose();
    disposeGitHubConfigCacheManager();
    this.logger.info('✅ Extension Manager disposed');
  }
}
