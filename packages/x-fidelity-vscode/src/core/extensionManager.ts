import * as vscode from 'vscode';
import { ConfigManager, type ExtensionConfig } from '../configuration/configManager';
import { DefaultDetectionService } from '../configuration/defaultDetection';
import { AnalysisManager, type AnalysisResult } from '../analysis/analysisManager';
import { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { XFidelityCodeActionProvider, handleAddExemption, handleBulkExemptions } from '../diagnostics/codeActionProvider';
import { StatusBarProvider } from '../ui/statusBarProvider';
import { SettingsUIPanel, DashboardPanel, IssueDetailsPanel } from '../ui/panels';
import { ControlCenterPanel } from '../ui/panels/controlCenterPanel';
import { logger } from '../utils/logger';

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
  
  constructor(private context: vscode.ExtensionContext) {
    this.configManager = ConfigManager.getInstance(context);
    
    // Initialize Stage 2 components
    this.analysisManager = new AnalysisManager(this.configManager, this.context);
    this.diagnosticProvider = new DiagnosticProvider(this.configManager);
    this.statusBarProvider = new StatusBarProvider(this.configManager, this.diagnosticProvider);
    
    // Initialize Stage 4 components
    this.settingsUIPanel = new SettingsUIPanel(this.context, this.configManager);
    this.dashboardPanel = new DashboardPanel(this.context, this.configManager, this.analysisManager, this.diagnosticProvider);
    this.issueDetailsPanel = new IssueDetailsPanel(this.context, this.configManager, this.diagnosticProvider);
    this.controlCenterPanel = new ControlCenterPanel(this.context, this.configManager, this.analysisManager, this.diagnosticProvider);
    
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    try {
      logger.info('Starting X-Fidelity extension initialization...');
      
      // Add components to disposables
      this.disposables.push(
        this.analysisManager,
        this.diagnosticProvider,
        this.statusBarProvider,
        this.settingsUIPanel,
        this.dashboardPanel,
        this.issueDetailsPanel,
        this.controlCenterPanel
      );
      
      logger.debug('Components added to disposables');
      
      // Register commands
      logger.debug('Registering commands...');
      this.registerCommands();
      
      // Register providers
      logger.debug('Registering providers...');
      this.registerProviders();
      
      // Setup event listeners
      logger.debug('Setting up event listeners...');
      this.setupEventListeners();
      
      // Initialize auto-detection (make this optional to prevent blocking)
      logger.debug('Performing initial setup...');
      try {
        await this.performInitialSetup();
      } catch (setupError) {
        logger.warn('Initial setup warning:', { error: setupError });
        // Don't fail the entire initialization for setup issues
      }
      
      logger.info('X-Fidelity extension initialized successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      
      logger.error('Failed to initialize X-Fidelity extension:', { error: errorMessage, stack });
      
      vscode.window.showErrorMessage(
        `X-Fidelity initialization failed: ${errorMessage}`,
        'Show Output',
        'Retry'
      ).then(choice => {
        if (choice === 'Show Output') {
          // Show VSCode output panel
          vscode.commands.executeCommand('workbench.action.output.toggleOutput');
        } else if (choice === 'Retry') {
          logger.info('Retrying extension initialization...');
          setTimeout(() => this.initialize(), 2000);
        }
      });
      
      throw error; // Re-throw to prevent partial initialization
    }
  }
  
  private registerCommands(): void {
    // Test command to verify extension is working
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.test', () => {
        vscode.window.showInformationMessage('X-Fidelity extension is working!');
      })
    );
    
    // Main analysis command
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.runAnalysis', async () => {
        try {
          logger.info('Manual analysis triggered...');
          vscode.window.showInformationMessage('Starting X-Fidelity analysis...');
          
          const result = await this.analysisManager.runAnalysis({ forceRefresh: true });
          if (result) {
            logger.info('Analysis completed:', { diagnostics: result.diagnostics.size });
            vscode.window.showInformationMessage(
              `Analysis complete: Found ${result.metadata.XFI_RESULT.totalIssues} issues`
            );
          } else {
            vscode.window.showWarningMessage('Analysis completed but no results were returned');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error('Analysis failed:', { error: errorMessage });
          vscode.window.showErrorMessage(`Analysis failed: ${errorMessage}`);
        }
      })
    );
    
    // Configuration commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.openSettings', () => {
        return vscode.commands.executeCommand('workbench.action.openSettings', '@ext:zotoio.x-fidelity-vscode');
      })
    );
    
    // Report commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.openReports', () => {
        return this.openReportsFolder();
      })
    );
    
    // Archetype detection command
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.detectArchetype', async () => {
        await this.performArchetypeDetection(true);
      })
    );
    
    // Configuration reset command
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.resetConfiguration', async () => {
        await this.resetConfiguration();
      })
    );
    
    // Code action command handlers
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.addExemption', handleAddExemption)
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.addBulkExemptions', handleBulkExemptions)
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showRuleDocumentation', (ruleId: string) => {
        const url = `https://github.com/zotoio/x-fidelity/blob/main/docs/rules/${ruleId}.md`;
        vscode.env.openExternal(vscode.Uri.parse(url));
      })
    );
    
    // Stage 3: Enhanced reporting commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showReportHistory', async () => {
        await this.showReportHistory();
      })
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.exportReport', async () => {
        await this.exportReport();
      })
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.shareReport', async () => {
        await this.shareReport();
      })
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.compareReports', async () => {
        await this.compareReports();
      })
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.viewTrends', async () => {
        await this.viewTrends();
      })
    );
    
    // Stage 4: Advanced UI Panel commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showAdvancedSettings', async () => {
        await this.settingsUIPanel.show();
      })
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showDashboard', async () => {
        await this.dashboardPanel.show();
      })
    );
    
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showIssueExplorer', async () => {
        await this.issueDetailsPanel.show();
      })
    );
    
    // Control Center command - main entry point for all extension functionality
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showControlCenter', async () => {
        await this.controlCenterPanel.show();
      })
    );
  }
  
  private registerProviders(): void {
    // Register code action provider
    const codeActionProvider = new XFidelityCodeActionProvider();
    this.disposables.push(
      vscode.languages.registerCodeActionsProvider(
        { scheme: 'file' },
        codeActionProvider,
        {
          providedCodeActionKinds: XFidelityCodeActionProvider.providedCodeActionKinds
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
        this.statusBarProvider.updateAnalysisState(state);
      })
    );
    
    // Analysis completion
    this.disposables.push(
      this.analysisManager.onDidAnalysisComplete(result => {
        this.onAnalysisComplete(result);
      })
    );
    
    // File save events
    this.disposables.push(
      vscode.workspace.onDidSaveTextDocument(document => {
        const config = this.configManager.getConfig();
        if (config.autoAnalyzeOnSave) {
          logger.info(`File saved: ${document.fileName}, scheduling analysis...`);
          this.analysisManager.scheduleAnalysis(2000); // 2 second delay
        }
      })
    );
    
    // File change events (debounced)
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(event => {
        const config = this.configManager.getConfig();
        if (config.autoAnalyzeOnFileChange) {
          logger.info(`File changed: ${event.document.fileName}, scheduling analysis...`);
          this.analysisManager.scheduleAnalysis(5000); // 5 second delay for file changes
        }
      })
    );
    
    // Workspace folder changes
    this.disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(event => {
        logger.info('Workspace folders changed, re-initializing...');
        this.performInitialSetup();
      })
    );
  }
  
  private async performInitialSetup(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      logger.info('No workspace folder found');
      vscode.window.showWarningMessage('X-Fidelity: No workspace folder found');
      return;
    }
    
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    logger.info(`Workspace root: ${workspaceRoot}`);
    
    // Perform archetype detection
    await this.performArchetypeDetection(false);
    
    // Start periodic analysis if enabled
    const config = this.configManager.getConfig();
    if (config.runInterval > 0) {
      logger.info(`Starting periodic analysis (interval: ${config.runInterval}s)`);
      this.analysisManager.startPeriodicAnalysis();
    }
    
    // Run initial analysis
    logger.info('Running initial analysis...');
    this.analysisManager.scheduleAnalysis(1000);
  }
  
  private async performArchetypeDetection(forcePrompt: boolean): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      return;
    }
    
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const detector = new DefaultDetectionService(workspaceRoot);
    
    try {
      const detections = await detector.detectArchetype();
      logger.info(`Detected ${detections.length} potential archetypes:`);
      
      for (const detection of detections) {
        logger.info(`  - ${detection.archetype} (confidence: ${detection.confidence}%) - ${detection.indicators.join(', ')}`);
      }
      
      if (detections.length > 0) {
        const bestMatch = detections[0];
        const currentArchetype = this.configManager.getConfig().archetype;
        
        // If current archetype is default and we found a better match, or force prompt
        if (forcePrompt || (currentArchetype === 'node-fullstack' && bestMatch.archetype !== 'node-fullstack' && bestMatch.confidence > 70)) {
          const message = `X-Fidelity detected a ${bestMatch.archetype} project (${bestMatch.confidence}% confidence). Would you like to use this archetype?`;
          const detail = `Indicators: ${bestMatch.indicators.join(', ')}`;
          
          const choice = await vscode.window.showInformationMessage(
            message,
            { detail, modal: false },
            'Yes',
            'No',
            'Don\'t ask again'
          );
          
          if (choice === 'Yes') {
            await this.configManager.updateConfig({ archetype: bestMatch.archetype });
            logger.info(`Updated archetype to: ${bestMatch.archetype}`);
            vscode.window.showInformationMessage(`Archetype updated to: ${bestMatch.archetype}`);
          } else if (choice === 'Don\'t ask again') {
            // TODO: Store user preference to not ask again
            logger.info('User chose not to be asked about archetype detection again');
          }
        }
      } else {
        logger.info('No specific archetype detected, using current configuration');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Archetype detection failed: ${errorMessage}`);
    }
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
    
    // Log results
    const summary = this.diagnosticProvider.getDiagnosticsSummary();
    logger.info('Analysis complete:', { total: summary.total, errors: summary.errors, warnings: summary.warnings, info: summary.info, hints: summary.hints });
  }
  
  private async openReportsFolder(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      vscode.window.showWarningMessage('No workspace folder found');
      return;
    }
    
    const config = this.configManager.getConfig();
    const reportDir = config.reportOutputDir || workspaceFolders[0].uri.fsPath;
    
    try {
      const uri = vscode.Uri.file(reportDir);
      await vscode.commands.executeCommand('revealFileInOS', uri);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to open reports folder: ${errorMessage}`);
      vscode.window.showErrorMessage(`Failed to open reports folder: ${errorMessage}`);
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
          await workspaceConfig.update(key, undefined, vscode.ConfigurationTarget.Workspace);
        }
        
        logger.info('Configuration reset to defaults');
        vscode.window.showInformationMessage('X-Fidelity configuration reset to defaults');
        
        // Re-run archetype detection
        await this.performArchetypeDetection(false);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to reset configuration: ${errorMessage}`);
        vscode.window.showErrorMessage(`Failed to reset configuration: ${errorMessage}`);
      }
    }
  }
  
  // Stage 3: Enhanced reporting command handlers
  
  private async showReportHistory(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }
    
    try {
      const history = await this.analysisManager.reportManager.getReportHistory(workspaceFolder.uri.fsPath);
      
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
        await this.analysisManager.reportManager.showInteractiveReport(selected.entry.result);
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
    const history = await this.analysisManager.reportManager.getReportHistory(workspaceFolder.uri.fsPath);
    if (history.length === 0 || !history[0].result) {
      vscode.window.showInformationMessage('No analysis results to export. Run an analysis first.');
      return;
    }
    
    const format = await vscode.window.showQuickPick([
      { label: 'JSON', value: 'json' },
      { label: 'CSV', value: 'csv' },
      { label: 'HTML', value: 'html' },
      { label: 'Markdown', value: 'markdown' },
      { label: 'SARIF', value: 'sarif' }
    ], {
      placeHolder: 'Select export format'
    });
    
    if (!format) return;
    
    const destination = await vscode.window.showQuickPick([
      { label: 'Save to File', value: 'file' },
      { label: 'Copy to Clipboard', value: 'clipboard' }
    ], {
      placeHolder: 'Select export destination'
    });
    
    if (!destination) return;
    
    try {
      const result = await this.analysisManager.reportManager.exportReport(history[0].result, {
        format: format.value as any,
        destination: destination.value as any
      });
      
      if (destination.value === 'file') {
        vscode.window.showInformationMessage(`Report exported to: ${result}`, 'Open File').then(choice => {
          if (choice === 'Open File') {
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(result));
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
    
    const history = await this.analysisManager.reportManager.getReportHistory(workspaceFolder.uri.fsPath);
    if (history.length === 0 || !history[0].result) {
      vscode.window.showInformationMessage('No analysis results to share. Run an analysis first.');
      return;
    }
    
    const platform = await vscode.window.showQuickPick([
      { label: 'Email', value: 'email' },
      { label: 'Slack', value: 'slack' },
      { label: 'Microsoft Teams', value: 'teams' },
      { label: 'GitHub Issue', value: 'github' }
    ], {
      placeHolder: 'Select sharing platform'
    });
    
    if (!platform) return;
    
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
    
    const history = await this.analysisManager.reportManager.getReportHistory(workspaceFolder.uri.fsPath);
    if (history.length < 2) {
      vscode.window.showInformationMessage('Need at least 2 analysis reports to compare');
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
    
    if (!current) return;
    
    const previousItems = items.filter(item => item.id !== current.id);
    const previous = await vscode.window.showQuickPick(previousItems, {
      placeHolder: 'Select previous report to compare with'
    });
    
    if (!previous) return;
    
    try {
      const comparison = await this.analysisManager.reportManager.compareReports(
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
      validateInput: (value) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 1) {
          return 'Please enter a valid number of days';
        }
        return null;
      }
    });
    
    if (!days) return;
    
    try {
      const trends = await this.analysisManager.reportManager.getTrendData(
        workspaceFolder.uri.fsPath,
        parseInt(days)
      );
      
      if (trends.timestamps.length === 0) {
        vscode.window.showInformationMessage('No trend data available for the specified period');
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
  
  dispose(): void {
    logger.info('Disposing X-Fidelity extension...');
    
    // Stop periodic analysis
    this.analysisManager?.stopPeriodicAnalysis();
    
    // Dispose all components
    this.disposables.forEach(d => d?.dispose());
    this.configManager?.dispose();
  }
} 