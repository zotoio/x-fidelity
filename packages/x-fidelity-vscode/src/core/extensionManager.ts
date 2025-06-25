import * as vscode from 'vscode';
import {
  ConfigManager,
  type ExtensionConfig
} from '../configuration/configManager';
import { DefaultDetectionService } from '../configuration/defaultDetection';
import {
  AnalysisManager,
  type AnalysisResult
} from '../analysis/analysisManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import {
  XFidelityCodeActionProvider,
  handleAddExemption,
  handleBulkExemptions
} from '../diagnostics/codeActionProvider';
import { StatusBarProvider } from '../ui/statusBarProvider';
import {
  SettingsUIPanel,
  DashboardPanel,
  IssueDetailsPanel
} from '../ui/panels';
import { ControlCenterPanel } from '../ui/panels/controlCenterPanel';
import { IssuesTreeViewManager } from '../ui/treeView/issuesTreeViewManager';
import { ControlCenterTreeViewManager } from '../ui/treeView/controlCenterTreeViewManager';
import { logger } from '../utils/logger';
import {
  getWorkspaceFolder,
  isXFidelityDevelopmentContext
} from '../utils/workspaceUtils';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private configManager: ConfigManager;
  public analysisManager: AnalysisManager; // Made public for command access
  private diagnosticProvider: DiagnosticProvider;
  private statusBarProvider: StatusBarProvider;

  // Stage 4: Advanced UI Panels
  private settingsUIPanel: SettingsUIPanel;
  private dashboardPanel: DashboardPanel;
  private issueDetailsPanel: IssueDetailsPanel;
  private controlCenterPanel: ControlCenterPanel;

  // Tree Views
  private issuesTreeViewManager: IssuesTreeViewManager;
  private issuesTreeViewManagerExplorer: IssuesTreeViewManager;
  private controlCenterTreeViewManager: ControlCenterTreeViewManager;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = ConfigManager.getInstance(context);

    // Initialize Stage 2 components
    this.analysisManager = new AnalysisManager(
      this.configManager,
      this.context
    );
    this.diagnosticProvider = new DiagnosticProvider(this.configManager);
    this.statusBarProvider = new StatusBarProvider(this.analysisManager);

    // Initialize Stage 4 components
    this.settingsUIPanel = new SettingsUIPanel(
      this.context,
      this.configManager
    );
    this.dashboardPanel = new DashboardPanel(
      this.context,
      this.configManager,
      this.analysisManager,
      this.diagnosticProvider
    );
    this.issueDetailsPanel = new IssueDetailsPanel(
      this.context,
      this.configManager,
      this.diagnosticProvider
    );
    this.controlCenterPanel = new ControlCenterPanel(
      this.context,
      this.configManager,
      this.analysisManager,
      this.diagnosticProvider
    );

    // Initialize Tree Views
    this.issuesTreeViewManager = new IssuesTreeViewManager(
      this.context,
      this.diagnosticProvider,
      this.configManager,
      'xfidelityIssuesTreeView'
    );
    this.issuesTreeViewManagerExplorer = new IssuesTreeViewManager(
      this.context,
      this.diagnosticProvider,
      this.configManager,
      'xfidelityIssuesTreeViewExplorer'
    );
    this.controlCenterTreeViewManager = new ControlCenterTreeViewManager(
      this.context,
      'xfidelityControlCenterView'
    );

    // CRITICAL FIX: Handle async initialization with proper error handling
    // Don't await in constructor - instead properly handle promise rejection
    this.initialize().catch(error => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('ExtensionManager initialization failed in constructor:', {
        error: errorMessage
      });

      // Register fallback commands to prevent complete extension failure
      this.registerFallbackCommands();

      // Show user-friendly error message
      vscode.window
        .showWarningMessage(
          `X-Fidelity extension started with limited functionality: ${errorMessage}`,
          'Show Output'
        )
        .then(choice => {
          if (choice === 'Show Output') {
            vscode.commands.executeCommand(
              'workbench.action.output.toggleOutput'
            );
          }
        });
    });
  }

  private async initialize(): Promise<void> {
    let initializationSuccessful = false;

    try {
      logger.info('Initializing X-Fidelity extension...');

      // Perform initial setup including auto-archetype detection
      await this.performInitialSetup();

      // Initialize core components
      await this.initializeComponents();

      // Set up event listeners
      this.setupEventListeners();

      // Start periodic analysis if configured
      this.analysisManager.startPeriodicAnalysis();

      // Mark initialization as successful
      initializationSuccessful = true;

      // Register normal commands only after successful initialization
      this.registerCommands();

      // Set extension as active
      vscode.commands.executeCommand(
        'setContext',
        'xfidelity.extensionActive',
        true
      );

      logger.info('X-Fidelity extension initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Extension initialization failed:', { error: errorMessage });

      // Only register fallback commands if normal initialization failed
      if (!initializationSuccessful) {
        logger.info(
          'Registering fallback commands due to initialization failure...'
        );
        this.registerFallbackCommands();
      }

      vscode.window
        .showWarningMessage(
          `X-Fidelity extension started with limited functionality: ${errorMessage}`,
          'Show Output'
        )
        .then(choice => {
          if (choice === 'Show Output') {
            vscode.commands.executeCommand(
              'workbench.action.output.toggleOutput'
            );
          }
        });
    }
  }

  private async performInitialSetup(): Promise<void> {
    logger.info('Performing initial setup...');

    const workspaceFolder = getWorkspaceFolder();
    const isDevelopmentContext = isXFidelityDevelopmentContext();

    if (!workspaceFolder) {
      logger.warn(
        'No workspace folder found - running with limited functionality'
      );

      // Enhanced error reporting for development context
      if (isDevelopmentContext) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        logger.error(
          'DEVELOPMENT: Workspace detection failed in X-Fidelity development context',
          {
            workspaceFoldersCount: workspaceFolders?.length || 0,
            workspaceFolders: workspaceFolders?.map(f => ({
              name: f.name,
              uri: f.uri.fsPath,
              index: f.index
            })),
            cwd: process.cwd(),
            extensionPath: this.context.extensionPath,
            isDevelopmentContext,
            nodeEnv: process.env.NODE_ENV,
            vscodeVersion: vscode.version
          }
        );

        vscode.window
          .showErrorMessage(
            'X-Fidelity Development: No workspace folder detected! Check test configuration.',
            'Show Logs'
          )
          .then(choice => {
            if (choice === 'Show Logs') {
              vscode.commands.executeCommand(
                'workbench.action.output.toggleOutput'
              );
            }
          });
      } else {
        vscode.window.showWarningMessage(
          'X-Fidelity: No workspace folder found'
        );
      }
      return;
    }

    logger.info(`Working with workspace: ${workspaceFolder.uri.fsPath}`);

    // In development context, log additional workspace info
    if (isDevelopmentContext) {
      logger.info('Development context workspace validation:', {
        workspaceName: workspaceFolder.name,
        workspacePath: workspaceFolder.uri.fsPath,
        extensionPath: this.context.extensionPath
      });
    }

    // Auto-detect archetype on startup
    await this.performAutoArchetypeDetection();
  }

  private async performAutoArchetypeDetection(): Promise<void> {
    logger.info('Performing automatic archetype detection...');

    try {
      const workspaceFolder = getWorkspaceFolder();
      if (!workspaceFolder) {
        logger.info('No workspace folder - skipping archetype detection');
        return;
      }

      const detectionService = new DefaultDetectionService(
        workspaceFolder.uri.fsPath
      );
      const detections = await detectionService.detectArchetype();

      logger.info(
        `Archetype detection completed. Found ${detections.length} possible matches:`
      );
      detections.forEach(detection => {
        logger.info(
          `  - ${detection.archetype} (confidence: ${detection.confidence}%) - ${detection.indicators.join(', ')}`
        );
      });

      const currentConfig = this.configManager.getConfig();
      let detectedArchetype = 'node-fullstack'; // Default fallback
      let autoDetected = false;

      if (detections.length > 0) {
        // Use the highest confidence detection
        const bestDetection = detections[0];
        if (bestDetection.confidence >= 60) {
          detectedArchetype = bestDetection.archetype;
          autoDetected = true;
          logger.info(
            `Auto-detected archetype: ${detectedArchetype} (${bestDetection.confidence}% confidence)`
          );
        } else {
          logger.info(
            `Best detection confidence too low (${bestDetection.confidence}%), using fallback: ${detectedArchetype}`
          );
        }
      } else {
        logger.info('No archetype detected, using fallback: node-fullstack');
      }

      // Update configuration if different from current
      if (currentConfig.archetype !== detectedArchetype) {
        await vscode.workspace
          .getConfiguration('xfidelity')
          .update(
            'archetype',
            detectedArchetype,
            vscode.ConfigurationTarget.Workspace
          );

        logger.info(
          `Updated archetype configuration from ${currentConfig.archetype} to ${detectedArchetype}`
        );

        // Show notification about auto-detection
        const message = autoDetected
          ? `X-Fidelity: Auto-detected project archetype as "${detectedArchetype}"`
          : `X-Fidelity: Using default archetype "${detectedArchetype}" (no specific archetype detected)`;

        vscode.window
          .showInformationMessage(message, 'View Settings')
          .then(choice => {
            if (choice === 'View Settings') {
              vscode.commands.executeCommand('xfidelity.openSettings');
            }
          });
      } else {
        logger.info(
          `Current archetype "${currentConfig.archetype}" matches detection, no update needed`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Auto archetype detection failed: ${errorMessage}`);

      // Ensure we have a fallback archetype
      const currentConfig = this.configManager.getConfig();
      if (!currentConfig.archetype || currentConfig.archetype === 'auto') {
        await vscode.workspace
          .getConfiguration('xfidelity')
          .update(
            'archetype',
            'node-fullstack',
            vscode.ConfigurationTarget.Workspace
          );

        vscode.window
          .showWarningMessage(
            'X-Fidelity: Auto-detection failed, using default "node-fullstack" archetype',
            'View Settings'
          )
          .then(choice => {
            if (choice === 'View Settings') {
              vscode.commands.executeCommand('xfidelity.openSettings');
            }
          });
      }
    }
  }

  private async initializeComponents(): Promise<void> {
    // Add components to disposables
    this.disposables.push(
      this.analysisManager,
      this.diagnosticProvider,
      this.statusBarProvider,
      this.settingsUIPanel,
      this.dashboardPanel,
      this.issueDetailsPanel,
      this.controlCenterPanel,
      this.issuesTreeViewManager,
      this.issuesTreeViewManagerExplorer,
      this.controlCenterTreeViewManager
    );

    logger.debug('Components added to disposables');
  }

  private registerCommands(): void {
    // Wrap all commands with performance monitoring
    const registerMonitoredCommand = (
      commandId: string,
      handler: (...args: any[]) => any,
      category: string = 'general'
    ) => {
      return vscode.commands.registerCommand(commandId, async (...args) => {
        const startTime = performance.now();
        const operationId = `${commandId}-${Date.now()}`;

        logger.debug(`Command started: ${commandId}`, {
          operationId,
          args: args.length
        });

        try {
          const result = await handler(...args);
          const duration = performance.now() - startTime;

          logger.debug(`Command completed: ${commandId}`, {
            operationId,
            duration,
            category
          });

          // Warn about slow commands
          if (duration > 1000) {
            logger.warn(`Slow command detected: ${commandId}`, {
              operationId,
              duration,
              category
            });
          }

          return result;
        } catch (error) {
          const duration = performance.now() - startTime;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          logger.error(`Command failed: ${commandId}`, {
            operationId,
            duration,
            error: errorMessage,
            category
          });

          // Show user-friendly error for UI commands
          if (category === 'ui') {
            vscode.window.showErrorMessage(
              `${commandId} failed: ${errorMessage}`
            );
          }

          throw error;
        }
      });
    };

    // Register commands with monitoring
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.test',
        () => {
          vscode.window.showInformationMessage(
            'X-Fidelity extension is working!'
          );
        },
        'test'
      ),

      registerMonitoredCommand(
        'xfidelity.getTestResults',
        () => {
          const results = this.analysisManager.getCurrentResults();
          if (results) {
            // Return the complete ResultMetadata object for consistency testing
            return results.metadata;
          }
          return null;
        },
        'test'
      ),

      registerMonitoredCommand(
        'xfidelity.runAnalysis',
        async () => {
          logger.info('Manual analysis triggered...');

          // Show the analysis output channel to make logs visible
          this.analysisManager.getLogger().show();

          vscode.window.showInformationMessage(
            'Starting X-Fidelity analysis...'
          );

          const result = await this.analysisManager.runAnalysis({
            forceRefresh: true
          });
          if (result) {
            logger.info('Analysis completed:', {
              diagnostics: result.diagnostics.size
            });
            vscode.window.showInformationMessage(
              `Analysis complete: Found ${result.metadata.XFI_RESULT.totalIssues} issues`
            );
          } else {
            vscode.window.showWarningMessage(
              'Analysis completed but no results were returned'
            );
          }
        },
        'analysis'
      ),

      registerMonitoredCommand(
        'xfidelity.cancelAnalysis',
        async () => {
          logger.info('Analysis cancellation requested...');
          await this.analysisManager.cancelAnalysis();
        },
        'analysis'
      )
    );

    // Configuration commands
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.openSettings',
        () => {
          return vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:zotoio.x-fidelity-vscode'
          );
        },
        'ui'
      )
    );

    // Report commands
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.openReports',
        () => {
          return this.openReportsFolder();
        },
        'ui'
      )
    );

    // Archetype detection command
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.detectArchetype',
        async () => {
          await this.performArchetypeDetection(true);
        },
        'config'
      )
    );

    // Configuration reset command
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.resetConfiguration',
        async () => {
          await this.resetConfiguration();
        },
        'config'
      )
    );

    // Code action command handlers
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.addExemption',
        handleAddExemption,
        'action'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.addBulkExemptions',
        handleBulkExemptions,
        'action'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showRuleDocumentation',
        (ruleId: string) => {
          const url = `https://github.com/zotoio/x-fidelity/blob/main/docs/rules/${ruleId}.md`;
          vscode.env.openExternal(vscode.Uri.parse(url));
        },
        'ui'
      )
    );

    // Stage 3: Enhanced reporting commands
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showReportHistory',
        async () => {
          await this.showReportHistory();
        },
        'report'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.exportReport',
        async () => {
          await this.exportReport();
        },
        'report'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.shareReport',
        async () => {
          await this.shareReport();
        },
        'report'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.compareReports',
        async () => {
          await this.compareReports();
        },
        'report'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.viewTrends',
        async () => {
          await this.viewTrends();
        },
        'report'
      )
    );

    // Debug command to run analysis with --dir option
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.runAnalysisWithDir',
        async () => {
          await this.runAnalysisWithDir();
        },
        'analysis'
      )
    );

    // Stage 4: Advanced UI Panel commands
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showAdvancedSettings',
        async () => {
          await this.settingsUIPanel.show();
        },
        'ui'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showDashboard',
        async () => {
          await this.dashboardPanel.show();
        },
        'ui'
      )
    );

    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showIssueExplorer',
        async () => {
          await this.issueDetailsPanel.show();
        },
        'ui'
      )
    );

    // Control Center command - main entry point for all extension functionality
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showControlCenter',
        async () => {
          await this.controlCenterPanel.show();
        },
        'ui'
      )
    );

    // Show output channel command for debugging
    this.disposables.push(
      registerMonitoredCommand(
        'xfidelity.showOutput',
        () => {
          this.analysisManager.getLogger().show();
        },
        'ui'
      )
    );
  }

  private registerProviders(): void {
    // Register code action provider (fixed type compatibility issues)
    const codeActionProvider = new XFidelityCodeActionProvider();
    this.disposables.push(
      vscode.languages.registerCodeActionsProvider(
        { scheme: 'file' },
        codeActionProvider,
        {
          providedCodeActionKinds:
            XFidelityCodeActionProvider.providedCodeActionKinds
        }
      )
    );
  }

  private setupEventListeners(): void {
    // Configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(config => {
        this.onConfigurationChanged(config);
      })
    );

    // Analysis state changes
    this.disposables.push(
      this.analysisManager.onDidAnalysisStateChange(state => {
        // Set context for showing/hiding cancel command in menus
        const isAnalysisRunning = (state as any).status === 'analyzing';
        vscode.commands.executeCommand(
          'setContext',
          'xfidelity.analysisRunning',
          isAnalysisRunning
        );
      })
    );

    // Analysis completion
    this.disposables.push(
      this.analysisManager.onDidAnalysisComplete(result => {
        this.onAnalysisComplete(result);
      })
    );

    // File save events (with safeguards to prevent performance issues)
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        const config = this.configManager.getConfig();
        if (
          config.autoAnalyzeOnSave &&
          !this.analysisManager.isAnalysisRunning
        ) {
          // Only trigger for relevant files to prevent unnecessary analysis
          const ext = document.fileName.toLowerCase();
          if (
            ext.includes('.ts') ||
            ext.includes('.js') ||
            ext.includes('.tsx') ||
            ext.includes('.jsx') ||
            ext.includes('.java') ||
            ext.includes('.py') ||
            ext.includes('.cs') ||
            ext.includes('.json')
          ) {
            logger.info(
              `Relevant file saved: ${document.fileName}, scheduling analysis...`
            );
            this.analysisManager.scheduleAnalysis(5000); // Increased delay to 5 seconds to prevent frequent triggers
          }
        }
      })
    );

    // File change events (heavily debounced and restricted)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        const config = this.configManager.getConfig();
        if (
          config.autoAnalyzeOnFileChange &&
          !this.analysisManager.isAnalysisRunning
        ) {
          // Only trigger for relevant files to prevent unnecessary analysis
          const ext = event.document.fileName.toLowerCase();
          if (
            ext.includes('.ts') ||
            ext.includes('.js') ||
            ext.includes('.tsx') ||
            ext.includes('.jsx') ||
            ext.includes('.java') ||
            ext.includes('.py') ||
            ext.includes('.cs') ||
            ext.includes('.json')
          ) {
            logger.debug(
              `Relevant file changed: ${event.document.fileName}, scheduling analysis...`
            );
            this.analysisManager.scheduleAnalysis(10000); // Heavily debounced to 10 seconds
          }
        }
      })
    );

    // Workspace folder changes
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(_event => {
        logger.info('Workspace folders changed, re-initializing...');
        this.performInitialSetup();
      })
    );
  }

  private onConfigurationChanged(config: ExtensionConfig): void {
    logger.info('Configuration changed:');
    logger.info(`  - Archetype: ${config.archetype}`);
    logger.info(`  - Run interval: ${config.runInterval}s`);
    logger.info(`  - Auto analyze on save: ${config.autoAnalyzeOnSave}`);
    logger.info(`  - Generate reports: ${config.generateReports}`);
    logger.info(`  - Debug mode: ${config.debugMode}`);

    // Update periodic analysis with new interval
    if (config.runInterval > 0) {
      this.analysisManager.startPeriodicAnalysis();
    } else {
      this.analysisManager.stopPeriodicAnalysis();
    }
  }

  private onAnalysisComplete(result: AnalysisResult): void {
    // Update diagnostics
    this.diagnosticProvider.updateDiagnostics(result);

    // Refresh tree views
    this.issuesTreeViewManager.refresh();
    this.issuesTreeViewManagerExplorer.refresh();

    // Log results
    const summary = this.diagnosticProvider.getDiagnosticsSummary();
    logger.info('Analysis complete:', {
      total: summary.total,
      errors: summary.errors,
      warnings: summary.warnings,
      info: summary.info,
      hints: summary.hints
    });
  }

  private async openReportsFolder(): Promise<void> {
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showWarningMessage('No workspace folder found');
      return;
    }

    const config = this.configManager.getConfig();
    const reportDir = config.reportOutputDir || workspaceFolder.uri.fsPath;

    try {
      const uri = vscode.Uri.file(reportDir);
      await vscode.commands.executeCommand('revealFileInOS', uri);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to open reports folder: ${errorMessage}`);
      vscode.window.showErrorMessage(
        `Failed to open reports folder: ${errorMessage}`
      );
    }
  }

  private async resetConfiguration(): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      'Reset X-Fidelity configuration to defaults?',
      { modal: true },
      'Reset',
      'Cancel'
    );

    if (confirmation === 'Reset') {
      try {
        const workspaceConfig = vscode.workspace.getConfiguration('xfidelity');
        const defaultConfig = new ConfigManager(this.context).getConfig();

        // Reset all configuration values
        for (const key of Object.keys(defaultConfig)) {
          await workspaceConfig.update(
            key,
            undefined,
            vscode.ConfigurationTarget.Workspace
          );
        }

        logger.info('Configuration reset to defaults');
        vscode.window.showInformationMessage(
          'X-Fidelity configuration reset to defaults'
        );

        // Re-run archetype detection
        await this.performArchetypeDetection(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Failed to reset configuration: ${errorMessage}`);
        vscode.window.showErrorMessage(
          `Failed to reset configuration: ${errorMessage}`
        );
      }
    }
  }

  // Stage 3: Enhanced reporting command handlers

  private async showReportHistory(): Promise<void> {
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const history = await this.analysisManager.reportManager.getReportHistory(
        workspaceFolder.uri.fsPath
      );

      if (history.length === 0) {
        vscode.window.showInformationMessage('No analysis history found');
        return;
      }

      const items = history.map(entry => ({
        label: `${new Date(entry.timestamp).toLocaleString()}`,
        description: `${entry.summary.totalIssues} issues (${entry.summary.errorCount} errors, ${entry.summary.warningCount} warnings)`,
        detail: `Branch: ${entry.branch || 'unknown'} | Commit: ${entry.commitHash?.substring(0, 8) || 'unknown'}`,
        entry
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a report to view'
      });

      if (selected && selected.entry.result) {
        await this.analysisManager.reportManager.showInteractiveReport(
          selected.entry.result
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to show report history: ${error}`);
    }
  }

  private async exportReport(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    // Get the latest analysis result (you might want to store this in ExtensionManager)
    const history = await this.analysisManager.reportManager.getReportHistory(
      workspaceFolder.uri.fsPath
    );
    if (history.length === 0 || !history[0].result) {
      vscode.window.showInformationMessage(
        'No analysis results to export. Run an analysis first.'
      );
      return;
    }

    const format = await vscode.window.showQuickPick(
      [
        { label: 'JSON', value: 'json' },
        { label: 'CSV', value: 'csv' },
        { label: 'HTML', value: 'html' },
        { label: 'Markdown', value: 'markdown' },
        { label: 'SARIF', value: 'sarif' }
      ],
      {
        placeHolder: 'Select export format'
      }
    );

    if (!format) {
      return;
    }

    const destination = await vscode.window.showQuickPick(
      [
        { label: 'Save to File', value: 'file' },
        { label: 'Copy to Clipboard', value: 'clipboard' }
      ],
      {
        placeHolder: 'Select export destination'
      }
    );

    if (!destination) {
      return;
    }

    try {
      const result = await this.analysisManager.reportManager.exportReport(
        history[0].result,
        {
          format: format.value as any,
          destination: destination.value as any
        }
      );

      if (destination.value === 'file') {
        vscode.window
          .showInformationMessage(`Report exported to: ${result}`, 'Open File')
          .then(choice => {
            if (choice === 'Open File') {
              vscode.commands.executeCommand(
                'revealFileInOS',
                vscode.Uri.file(result)
              );
            }
          });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }

  private async shareReport(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const history = await this.analysisManager.reportManager.getReportHistory(
      workspaceFolder.uri.fsPath
    );
    if (history.length === 0 || !history[0].result) {
      vscode.window.showInformationMessage(
        'No analysis results to share. Run an analysis first.'
      );
      return;
    }

    const platform = await vscode.window.showQuickPick(
      [
        { label: 'Email', value: 'email' },
        { label: 'Slack', value: 'slack' },
        { label: 'Microsoft Teams', value: 'teams' },
        { label: 'GitHub Issue', value: 'github' }
      ],
      {
        placeHolder: 'Select sharing platform'
      }
    );

    if (!platform) {
      return;
    }

    try {
      await this.analysisManager.reportManager.shareReport(history[0].result, {
        platform: platform.value as any
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Sharing failed: ${error}`);
    }
  }

  private async compareReports(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const history = await this.analysisManager.reportManager.getReportHistory(
      workspaceFolder.uri.fsPath
    );
    if (history.length < 2) {
      vscode.window.showInformationMessage(
        'Need at least 2 analysis reports to compare'
      );
      return;
    }

    const items = history.map(entry => ({
      label: `${new Date(entry.timestamp).toLocaleString()}`,
      description: `${entry.summary.totalIssues} issues`,
      detail: `Branch: ${entry.branch || 'unknown'}`,
      id: entry.id
    }));

    const current = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select current report'
    });

    if (!current) {
      return;
    }

    const previousItems = items.filter(item => item.id !== current.id);
    const previous = await vscode.window.showQuickPick(previousItems, {
      placeHolder: 'Select previous report to compare with'
    });

    if (!previous) {
      return;
    }

    try {
      const comparison =
        await this.analysisManager.reportManager.compareReports(
          workspaceFolder.uri.fsPath,
          current.id,
          previous.id
        );

      if (comparison) {
        const message = `Comparison Result:
        
Total Issues: ${comparison.current.summary.totalIssues} (${comparison.changes.totalIssuesChange >= 0 ? '+' : ''}${comparison.changes.totalIssuesChange})
Errors: ${comparison.current.summary.errorCount} (${comparison.changes.errorsChange >= 0 ? '+' : ''}${comparison.changes.errorsChange})
Warnings: ${comparison.current.summary.warningCount} (${comparison.changes.warningsChange >= 0 ? '+' : ''}${comparison.changes.warningsChange})

New Issues: ${comparison.changes.newIssues.length}
Resolved Issues: ${comparison.changes.resolvedIssues.length}
Changed Files: ${comparison.changes.changedFiles.length}`;

        vscode.window.showInformationMessage(message, { modal: true });
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Comparison failed: ${error}`);
    }
  }

  private async viewTrends(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const days = await vscode.window.showInputBox({
      prompt: 'Enter number of days for trend analysis',
      value: '30',
      validateInput: value => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Please enter a valid number of days';
        }
        return null;
      }
    });

    if (!days) {
      return;
    }

    try {
      const trends = await this.analysisManager.reportManager.getTrendData(
        workspaceFolder.uri.fsPath,
        parseInt(days)
      );

      if (trends.timestamps.length === 0) {
        vscode.window.showInformationMessage(
          'No trend data available for the specified period'
        );
        return;
      }

      // Simple trend summary (could be enhanced with charts)
      const latest = trends.totalIssues[0] || 0;
      const oldest = trends.totalIssues[trends.totalIssues.length - 1] || 0;
      const change = latest - oldest;

      const message = `Trend Analysis (${days} days):
      
Data Points: ${trends.timestamps.length}
Latest Issues: ${latest}
Oldest Issues: ${oldest}
Overall Change: ${change >= 0 ? '+' : ''}${change}

Average Errors: ${Math.round(trends.errorCounts.reduce((a, b) => a + b, 0) / trends.errorCounts.length)}
Average Warnings: ${Math.round(trends.warningCounts.reduce((a, b) => a + b, 0) / trends.warningCounts.length)}`;

      vscode.window.showInformationMessage(message, { modal: true });
    } catch (error) {
      vscode.window.showErrorMessage(`Trend analysis failed: ${error}`);
    }
  }

  private async runAnalysisWithDir(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      logger.info('Debug: Running analysis with --dir option', {
        workspaceRoot: workspaceFolder.uri.fsPath
      });

      vscode.window.showInformationMessage(
        `Debug: Running X-Fidelity analysis with --dir=${workspaceFolder.uri.fsPath}`
      );

      const result = await this.analysisManager.runAnalysis({
        forceRefresh: true
      });
      if (result) {
        logger.info('Debug analysis completed:', {
          diagnostics: result.diagnostics.size,
          totalIssues: result.metadata.XFI_RESULT.totalIssues,
          workspaceRoot: workspaceFolder.uri.fsPath
        });

        vscode.window.showInformationMessage(
          `Debug Analysis complete: Found ${result.metadata.XFI_RESULT.totalIssues} issues using --dir=${workspaceFolder.uri.fsPath}`
        );
      } else {
        vscode.window.showWarningMessage(
          'Debug analysis completed but no results were returned'
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('Debug analysis failed:', { error: errorMessage });
      vscode.window.showErrorMessage(`Debug analysis failed: ${errorMessage}`);
    }
  }

  private registerFallbackCommands(): void {
    // Register minimal commands that always work for debugging
    logger.info('Registering fallback commands for debugging...');

    // Test command to verify extension is working
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showInformationMessage(
          'X-Fidelity extension is partially working (fallback mode)!'
        );
        vscode.commands.executeCommand('workbench.action.output.toggleOutput');
      })
    );

    // Test command to get current analysis results for testing (fallback version)
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.getTestResults', () => {
        // In fallback mode, return null since analysis manager may not be fully initialized
        return null;
      })
    );

    // Basic analysis command with error handling
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.runAnalysis', async () => {
        try {
          vscode.window.showInformationMessage(
            'X-Fidelity is in fallback mode. Full analysis not available.'
          );
          vscode.commands.executeCommand(
            'workbench.action.output.toggleOutput'
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Analysis failed: ${error}`);
        }
      })
    );

    // Settings command
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.openSettings', () => {
        return vscode.commands.executeCommand(
          'workbench.action.openSettings',
          '@ext:zotoio.x-fidelity-vscode'
        );
      })
    );

    // Show logs command
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showControlCenter', () => {
        vscode.window
          .showInformationMessage(
            'X-Fidelity Control Center is not available in fallback mode. Check the Output panel for logs.',
            'Show Logs'
          )
          .then(choice => {
            if (choice === 'Show Logs') {
              vscode.commands.executeCommand(
                'workbench.action.output.toggleOutput'
              );
            }
          });
      })
    );

    // Add other essential commands with fallback behavior
    const fallbackCommands = [
      'xfidelity.detectArchetype',
      'xfidelity.resetConfiguration',
      'xfidelity.openReports',
      'xfidelity.showDashboard',
      'xfidelity.showIssueExplorer',
      'xfidelity.showAdvancedSettings'
    ];

    fallbackCommands.forEach(commandId => {
      this.disposables.push(
        vscode.commands.registerCommand(commandId, () => {
          const commandName = commandId.replace('xfidelity.', '');
          vscode.window
            .showWarningMessage(
              `X-Fidelity: ${commandName} is not available in fallback mode. Check logs for initialization errors.`,
              'Show Logs'
            )
            .then(choice => {
              if (choice === 'Show Logs') {
                vscode.commands.executeCommand(
                  'workbench.action.output.toggleOutput'
                );
              }
            });
        })
      );
    });

    logger.info('Fallback commands registered successfully');
  }

  private async performArchetypeDetection(forcePrompt: boolean): Promise<void> {
    const workspaceFolder = getWorkspaceFolder();
    if (!workspaceFolder) {
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;
    const detector = new DefaultDetectionService(workspaceRoot);

    try {
      const detections = await detector.detectArchetype();
      logger.info(`Detected ${detections.length} potential archetypes:`);

      for (const detection of detections) {
        logger.info(
          `  - ${detection.archetype} (confidence: ${detection.confidence}%) - ${detection.indicators.join(', ')}`
        );
      }

      if (detections.length > 0) {
        const bestMatch = detections[0];
        const currentArchetype = this.configManager.getConfig().archetype;

        // If current archetype is default and we found a better match, or force prompt
        if (
          forcePrompt ||
          (currentArchetype === 'node-fullstack' &&
            bestMatch.archetype !== 'node-fullstack' &&
            bestMatch.confidence > 70)
        ) {
          const message = `X-Fidelity detected a ${bestMatch.archetype} project (${bestMatch.confidence}% confidence). Would you like to use this archetype?`;
          const detail = `Indicators: ${bestMatch.indicators.join(', ')}`;

          const choice = await vscode.window.showInformationMessage(
            message,
            { detail, modal: false },
            'Yes',
            'No',
            "Don't ask again"
          );

          if (choice === 'Yes') {
            await this.configManager.updateConfig({
              archetype: bestMatch.archetype
            });
            logger.info(`Updated archetype to: ${bestMatch.archetype}`);
            vscode.window.showInformationMessage(
              `Archetype updated to: ${bestMatch.archetype}`
            );
          } else if (choice === "Don't ask again") {
            // Note: User preference for archetype detection notifications could be added to settings
            logger.info(
              'User chose not to be asked about archetype detection again'
            );
          }
        }
      } else {
        logger.info(
          'No specific archetype detected, using current configuration'
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Archetype detection failed: ${errorMessage}`);
    }
  }

  dispose(): void {
    logger.info('Disposing X-Fidelity extension...');

    // Unset context to hide tree view
    vscode.commands.executeCommand(
      'setContext',
      'xfidelity.extensionActive',
      false
    );

    // Stop periodic analysis
    this.analysisManager?.stopPeriodicAnalysis();

    // Dispose global tree view commands
    IssuesTreeViewManager.disposeGlobalCommands();

    // Dispose all components
    this.disposables.forEach(d => d?.dispose());
    this.configManager?.dispose();
  }
}
