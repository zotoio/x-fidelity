import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type ReportFormat = 'json' | 'md' | 'html' | 'csv';
export type SeverityLevel = 'error' | 'warning' | 'info' | 'hint';
export type GroupingMode = 'file' | 'severity' | 'rule' | 'category';

export interface RuleOverride {
  enabled: boolean;
  severity?: SeverityLevel;
  parameters?: Record<string, any>;
}

export interface ExtensionConfig {
  // Core Analysis Settings
  runInterval: number; // Auto-analysis interval in seconds (0 = disabled)
  autoAnalyzeOnSave: boolean; // Trigger analysis on file save
  autoAnalyzeOnFileChange: boolean; // Trigger analysis on file change (debounced)
  archetype: string; // X-Fidelity archetype

  // CLI Settings - VSCode extension always spawns CLI with --mode vscode
  cliExtraArgs: string[]; // Additional CLI arguments

  // Connection Settings
  configServer: string; // Remote config server URL
  localConfigPath: string; // Local config file path

  // Analysis Features
  openaiEnabled: boolean; // Enable OpenAI analysis
  telemetryCollector: string; // Telemetry endpoint URL
  telemetryEnabled: boolean; // Enable telemetry collection

  // Output & Reporting
  generateReports: boolean; // Auto-generate reports after analysis
  reportOutputDir: string; // Report output directory (default: workspace root)
  reportFormats: ReportFormat[]; // Enabled report formats
  showReportAfterAnalysis: boolean; // Auto-open reports after generation
  reportRetentionDays: number; // How long to keep old reports

  // UI/UX Settings
  showInlineDecorations: boolean; // Show squiggly lines for issues
  highlightSeverity: SeverityLevel[]; // Which severities to highlight
  statusBarVisibility: boolean; // Show status bar item
  problemsPanelGrouping: GroupingMode; // How to group issues in problems panel
  showRuleDocumentation: boolean; // Show rule docs in hover/tooltips

  // Performance Settings
  maxFileSize: number; // Max file size to analyze (bytes)
  analysisTimeout: number; // Analysis timeout (ms)
  excludePatterns: string[]; // Glob patterns to exclude
  includePatterns: string[]; // Glob patterns to include (empty = all)
  maxConcurrentAnalysis: number; // Max parallel analysis operations

  // Advanced Settings
  debugMode: boolean; // Enable debug logging
  customPlugins: string[]; // Additional plugin paths
  ruleOverrides: Record<string, RuleOverride>; // Rule-specific overrides

  // Cache Settings
  cacheResults: boolean; // Enable result caching
  cacheTTL: number; // Cache time-to-live in minutes

  // Enhanced Logging Settings
  logColorization: boolean; // Enable ANSI color codes in output
  logTimestampFormat: 'iso' | 'short' | 'none'; // Timestamp format preference
  logLevelFiltering: boolean; // Enable log level filtering hints
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config!: ExtensionConfig; // Use definite assignment assertion since loadConfiguration() sets it
  private context: vscode.ExtensionContext;
  private configWatcher?: vscode.FileSystemWatcher;

  public readonly onConfigurationChanged =
    new vscode.EventEmitter<ExtensionConfig>();

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadConfiguration();
    this.setupConfigWatcher();
  }

  static getInstance(context?: vscode.ExtensionContext): ConfigManager {
    if (!ConfigManager.instance && context) {
      ConfigManager.instance = new ConfigManager(context);
    }
    return ConfigManager.instance;
  }

  static resetInstance(): void {
    if (ConfigManager.instance) {
      ConfigManager.instance.dispose();
      ConfigManager.instance = undefined as any;
    }
  }

  getConfig(): ExtensionConfig {
    return { ...this.config };
  }

  async updateConfig(updates: Partial<ExtensionConfig>): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceConfig = vscode.workspace.getConfiguration(
      'xfidelity',
      workspaceFolder?.uri
    );

    for (const [key, value] of Object.entries(updates)) {
      await workspaceConfig.update(
        key,
        value,
        vscode.ConfigurationTarget.Workspace
      );
    }

    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceConfig = vscode.workspace.getConfiguration(
      'xfidelity',
      workspaceFolder?.uri
    );

    this.config = {
      // Core Settings
      archetype: workspaceConfig.get('archetype', 'node-fullstack'),
      configServer: workspaceConfig.get('configServer', ''),
      localConfigPath: workspaceConfig.get('localConfigPath', ''),

      // CLI Settings - VSCode extension always spawns CLI with --mode vscode
      cliExtraArgs: workspaceConfig.get('cliExtraArgs', []),

      // Performance Settings - OPTIMIZED FOR SPEED
      runInterval: 0, // DISABLED - was causing concurrent analysis conflicts
      autoAnalyzeOnSave: false, // DISABLED - was causing performance issues
      autoAnalyzeOnFileChange: workspaceConfig.get(
        'autoAnalyzeOnFileChange',
        false
      ),
      generateReports: workspaceConfig.get('generateReports', false), // DISABLED for performance

      // Resource Limits - REDUCED FOR PERFORMANCE
      maxFileSize: workspaceConfig.get('maxFileSize', 128000),
      analysisTimeout: workspaceConfig.get('analysisTimeout', 120000), // Increased to 2 minutes
      excludePatterns: workspaceConfig.get('excludePatterns', [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'build/**',
        '.xfiResults/**'
      ]),
      includePatterns: workspaceConfig.get('includePatterns', []),
      maxConcurrentAnalysis: 1, // FORCED TO 1 - no concurrent analysis

      // Analysis Features - DISABLED for performance
      openaiEnabled: workspaceConfig.get('openaiEnabled', false),
      telemetryCollector: workspaceConfig.get('telemetryCollector', ''),
      telemetryEnabled: workspaceConfig.get('telemetryEnabled', false), // DISABLED for performance

      // Output & Reporting - DISABLED for performance
      reportOutputDir: workspaceConfig.get('reportOutputDir', ''),
      reportFormats: workspaceConfig.get('reportFormats', ['json']), // Reduced formats
      showReportAfterAnalysis: workspaceConfig.get(
        'showReportAfterAnalysis',
        false
      ),
      reportRetentionDays: workspaceConfig.get('reportRetentionDays', 30),

      // UI/UX Settings - OPTIMIZED for performance
      showInlineDecorations: workspaceConfig.get(
        'showInlineDecorations',
        false
      ), // DISABLED for performance
      highlightSeverity: workspaceConfig.get('highlightSeverity', ['error']), // Only errors for performance
      statusBarVisibility: workspaceConfig.get('statusBarVisibility', true),
      problemsPanelGrouping: workspaceConfig.get(
        'problemsPanelGrouping',
        'file'
      ),
      showRuleDocumentation: workspaceConfig.get(
        'showRuleDocumentation',
        false
      ), // DISABLED for performance

      // Advanced Settings
      debugMode: workspaceConfig.get('debugMode', false),
      customPlugins: workspaceConfig.get('customPlugins', []),
      ruleOverrides: workspaceConfig.get('ruleOverrides', {}),

      // Cache Settings
      cacheResults: workspaceConfig.get('cacheResults', true),
      cacheTTL: workspaceConfig.get('cacheTTL', 30),

      // Enhanced Logging Settings
      logColorization: workspaceConfig.get('logColorization', false),
      logTimestampFormat: workspaceConfig.get('logTimestampFormat', 'iso'),
      logLevelFiltering: workspaceConfig.get('logLevelFiltering', false)
    };
  }

  private setupConfigWatcher(): void {
    // Watch for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('xfidelity')) {
        this.loadConfiguration();
        this.onConfigurationChanged.fire(this.config);
      }
    });
  }

  dispose(): void {
    this.configWatcher?.dispose();
    this.onConfigurationChanged.dispose();
  }

  /**
   * Get the resolved local config path following the specified resolution order:
   * 1. Explicit user configuration (configServer or localConfigPath)
   * 2. Home directory ~/.config/x-fidelity (XDG_CONFIG_HOME/x-fidelity)
   * 3. Environment variable XFI_CONFIG_PATH
   * 4. Default to x-fidelity-democonfig package
   */
  getResolvedLocalConfigPath(): string {
    const config = this.getConfig();

    // If user has explicitly configured a path, use it directly
    if (config.configServer || config.localConfigPath) {
      return config.localConfigPath;
    }

    // Resolution order for fallback when no remote config server or local config path is set

    // 1. Check home directory ~/.config/x-fidelity (XDG_CONFIG_HOME/x-fidelity)
    const homeDir = os.homedir();
    // Platform-agnostic XDG config home resolution
    let xdgConfigHome: string;
    if (process.platform === 'win32') {
      // On Windows, use %APPDATA% or fallback to home directory
      xdgConfigHome = process.env.APPDATA || path.join(homeDir, '.config');
    } else {
      // On Unix-like systems, use XDG_CONFIG_HOME or ~/.config
      xdgConfigHome =
        process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
    }
    const homeConfigPath = path.join(xdgConfigHome, 'x-fidelity');

    if (fs.existsSync(homeConfigPath)) {
      return homeConfigPath;
    }

    // 2. Check environment variable
    if (
      process.env.XFI_CONFIG_PATH &&
      fs.existsSync(process.env.XFI_CONFIG_PATH)
    ) {
      return process.env.XFI_CONFIG_PATH;
    }

    // 3. Default to x-fidelity-democonfig package
    // For VSCode extension, this will be relative to the extension's location
    const extensionPath = this.context?.extensionPath || '';
    const demoConfigPath = path.resolve(
      extensionPath,
      '..',
      'x-fidelity-democonfig',
      'src'
    );

    // Check if we're in the monorepo development environment
    if (fs.existsSync(demoConfigPath)) {
      return demoConfigPath;
    }

    // Fallback for packaged extension - look for bundled demoConfig
    const bundledDemoConfigPath = path.join(
      extensionPath,
      'dist',
      'demoConfig'
    );
    if (fs.existsSync(bundledDemoConfigPath)) {
      return bundledDemoConfigPath;
    }

    // Final fallback - return the calculated democonfig path even if it doesn't exist
    // This will allow the system to give a proper error message
    return demoConfigPath;
  }
}
