import * as vscode from 'vscode';
import { ConfigManager } from '../configuration/configManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { CLIAnalysisManager } from '../analysis/cliAnalysisManager';
import { StatusBarProvider } from '../ui/statusBarProvider';
import { IssuesTreeViewManager } from '../ui/treeView/issuesTreeViewManager';
import { DashboardPanel } from '../ui/panels/dashboardPanel';
import { ReportHistoryManager } from '../reports/reportHistoryManager';
import { ExportManager } from '../reports/exportManager';
import { createComponentLogger } from '../utils/globalLogger';
import { VSCodeLogger } from '../utils/vscodeLogger';
import { getAnalysisTargetDirectory } from '../utils/workspaceUtils';
import { preloadDefaultPlugins } from './pluginPreloader';

export class ExtensionManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;
  private globalLogger: VSCodeLogger;

  // Core components
  private configManager: ConfigManager;
  private diagnosticProvider: DiagnosticProvider;
  private analysisEngine: CLIAnalysisManager;

  // UI components
  private statusBarProvider: StatusBarProvider;
  private issuesTreeViewManager: IssuesTreeViewManager;
  private dashboardPanel: DashboardPanel;

  // Report components
  private reportHistoryManager: ReportHistoryManager;
  private exportManager: ExportManager;

  constructor(private context: vscode.ExtensionContext) {
    this.logger = new VSCodeLogger('Extension Manager');
    this.globalLogger = createComponentLogger('Extension Manager');

    this.globalLogger.info('🚀 Initializing X-Fidelity Extension Manager...');

    try {
      // Initialize core components
      this.configManager = new ConfigManager(this.context);
      this.globalLogger.debug('✅ ConfigManager initialized');

      this.diagnosticProvider = new DiagnosticProvider(this.configManager);
      this.globalLogger.debug('✅ DiagnosticProvider initialized');

      this.analysisEngine = new CLIAnalysisManager(
        this.configManager,
        this.diagnosticProvider
      );
      this.globalLogger.debug('✅ CLIAnalysisManager initialized');

      // Initialize UI components
      this.statusBarProvider = new StatusBarProvider(this.analysisEngine);
      this.globalLogger.debug('✅ StatusBarProvider initialized');

      this.issuesTreeViewManager = new IssuesTreeViewManager(
        this.context,
        this.diagnosticProvider,
        this.configManager
      );
      this.globalLogger.debug('✅ IssuesTreeViewManager initialized');

      // Initialize panels - pass the CLI analysis engine
      this.dashboardPanel = new DashboardPanel(
        this.context,
        this.configManager,
        this.analysisEngine, // Now using the correct CLI analysis engine
        this.diagnosticProvider
      );
      this.globalLogger.debug('✅ DashboardPanel initialized');

      // Initialize report components
      this.reportHistoryManager = new ReportHistoryManager(this.configManager);
      this.exportManager = new ExportManager(this.configManager);
      this.globalLogger.debug('✅ Report components initialized');

      // Initialize plugin system
      this.initializePlugins();

      this.setupEventListeners();
      this.registerCommands();
      this.globalLogger.info('✅ Extension Manager initialized successfully');
    } catch (error) {
      this.globalLogger.error(
        '❌ Extension Manager initialization failed:',
        error
      );
      throw error; // Re-throw to prevent partial initialization
    }
  }

  private async initializePlugins(): Promise<void> {
    try {
      await preloadDefaultPlugins(this.context);
    } catch (error) {
      this.globalLogger.warn('Plugin initialization failed:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for analysis completion
    this.disposables.push(
      this.analysisEngine.onComplete(result => {
        this.globalLogger.info(
          `📊 Analysis completed: ${result.summary.totalIssues} issues found across ${result.summary.filesAnalyzed} files`
        );

        // Update tree view
        this.issuesTreeViewManager.refresh();

        // Update dashboard
        this.updateDashboard();

        // Show notification
        if (result.summary.totalIssues > 0) {
          vscode.window
            .showInformationMessage(
              `X-Fidelity found ${result.summary.totalIssues} issues across ${result.summary.filesAnalyzed} files`,
              'View Issues',
              'View Dashboard'
            )
            .then(choice => {
              if (choice === 'View Issues') {
                this.issuesTreeViewManager.refresh();
              } else if (choice === 'View Dashboard') {
                this.dashboardPanel.show();
              }
            });
        } else {
          vscode.window.showInformationMessage(
            'X-Fidelity analysis completed - no issues found! 🎉'
          );
        }
      })
    );

    // Listen for analysis state changes
    this.disposables.push(
      this.analysisEngine.onStateChanged(state => {
        this.globalLogger.debug(`Analysis state changed: ${state}`);
      })
    );

    // Listen for configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.globalLogger.info('Configuration changed, updating components...');
        this.updateDashboard();
      })
    );
  }

  private updateDashboard(): void {
    if (this.dashboardPanel) {
      // Trigger dashboard update by calling show() if panel exists
      this.dashboardPanel.show();
    }
  }

  private registerCommands(): void {
    // Analysis commands
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
      vscode.commands.registerCommand('xfidelity.cancelAnalysis', async () => {
        await this.analysisEngine.cancelAnalysis();
        vscode.window.showInformationMessage('Analysis cancelled');
      })
    );

    // Note: Tree view commands are registered by IssuesTreeViewManager to prevent duplicates

    // Panel commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showDashboard', () => {
        this.dashboardPanel.show();
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showControlCenter', () => {
        // Open control center tree view (it's already in sidebar)
        vscode.commands.executeCommand(
          'workbench.view.extension.x-fidelity-activitybar'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showSettingsUI', () => {
        // For now, open VSCode settings for x-fidelity
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'xfidelity'
        );
      })
    );

    // Report commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.exportReport', async () => {
        try {
          const currentResults = this.analysisEngine.getCurrentResults();
          if (!currentResults) {
            vscode.window.showErrorMessage(
              'No analysis results to export. Run an analysis first.'
            );
            return;
          }

          vscode.window.showInformationMessage(
            'Export functionality is being simplified. Results are available in the Problems panel and Issues tree.'
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Export failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      })
    );

    // Utility commands
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
          // For now, just show a message - archetype detection is handled by CLI
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

    // Test commands (for testing only)
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showInformationMessage(
          'X-Fidelity extension is working!'
        );
      })
    );

    // Additional commands expected by tests
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.getTestResults', () => {
        // Return current analysis results for testing
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

    // Configuration commands
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
              // Reset configuration by clearing workspace settings
              const config = vscode.workspace.getConfiguration('xfidelity');
              const keys = [
                'cliSource',
                'cliBinaryPath',
                'cliTimeout',
                'cliExtraArgs'
              ];

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

    // Report commands
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

    // Periodic analysis commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.startPeriodicAnalysis', () => {
        vscode.window.showInformationMessage(
          'Periodic analysis feature is planned for future releases'
        );
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.stopPeriodicAnalysis', () => {
        vscode.window.showInformationMessage(
          'Periodic analysis feature is planned for future releases'
        );
      })
    );

    // Note: Issue exemption commands are handled by IssuesTreeViewManager

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

  dispose(): void {
    this.globalLogger.info('🔄 Disposing Extension Manager...');
    this.disposables.forEach(d => d.dispose());
    this.analysisEngine.dispose();
    this.statusBarProvider.dispose();
    this.issuesTreeViewManager.dispose();
    this.dashboardPanel.dispose();
    // Note: ReportHistoryManager and ExportManager don't have dispose methods
    this.globalLogger.info('✅ Extension Manager disposed');
  }
}
