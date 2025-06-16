import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

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
  runInterval: number;                    // Auto-analysis interval in seconds (0 = disabled)
  autoAnalyzeOnSave: boolean;            // Trigger analysis on file save
  autoAnalyzeOnFileChange: boolean;      // Trigger analysis on file change (debounced)
  archetype: string;                     // X-Fidelity archetype
  
  // Connection Settings
  configServer: string;                  // Remote config server URL
  localConfigPath: string;               // Local config file path
  
  // Analysis Features
  openaiEnabled: boolean;                // Enable OpenAI analysis
  telemetryCollector: string;            // Telemetry endpoint URL
  telemetryEnabled: boolean;             // Enable telemetry collection
  
  // Output & Reporting
  generateReports: boolean;              // Auto-generate reports after analysis
  reportOutputDir: string;               // Report output directory (default: workspace root)
  reportFormats: ReportFormat[];         // Enabled report formats
  showReportAfterAnalysis: boolean;      // Auto-open reports after generation
  reportRetentionDays: number;           // How long to keep old reports
  
  // UI/UX Settings
  showInlineDecorations: boolean;        // Show squiggly lines for issues
  highlightSeverity: SeverityLevel[];    // Which severities to highlight
  statusBarVisibility: boolean;          // Show status bar item
  problemsPanelGrouping: GroupingMode;   // How to group issues in problems panel
  showRuleDocumentation: boolean;        // Show rule docs in hover/tooltips
  
  // Performance Settings
  maxFileSize: number;                   // Max file size to analyze (bytes)
  analysisTimeout: number;               // Analysis timeout (ms)
  excludePatterns: string[];             // Glob patterns to exclude
  includePatterns: string[];             // Glob patterns to include (empty = all)
  maxConcurrentAnalysis: number;         // Max parallel analysis operations
  
  // Advanced Settings
  debugMode: boolean;                    // Enable debug logging
  customPlugins: string[];               // Additional plugin paths
  ruleOverrides: Record<string, RuleOverride>; // Rule-specific overrides
  cacheResults: boolean;                 // Cache analysis results
  cacheTTL: number;                      // Cache TTL in minutes
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config!: ExtensionConfig; // Use definite assignment assertion since loadConfiguration() sets it
  private context: vscode.ExtensionContext;
  private configWatcher?: vscode.FileSystemWatcher;
  
  public readonly onConfigurationChanged = new vscode.EventEmitter<ExtensionConfig>();
  
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
  
  getConfig(): ExtensionConfig {
    return { ...this.config };
  }
  
  async updateConfig(updates: Partial<ExtensionConfig>): Promise<void> {
    const workspaceConfig = vscode.workspace.getConfiguration('xfidelity');
    
    for (const [key, value] of Object.entries(updates)) {
      await workspaceConfig.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
    
    this.loadConfiguration();
  }
  
  private loadConfiguration(): void {
    const workspaceConfig = vscode.workspace.getConfiguration('xfidelity');
    
    this.config = {
      // Core Analysis Settings
      runInterval: workspaceConfig.get('runInterval', 300),
      autoAnalyzeOnSave: workspaceConfig.get('autoAnalyzeOnSave', true),
      autoAnalyzeOnFileChange: workspaceConfig.get('autoAnalyzeOnFileChange', false),
      archetype: workspaceConfig.get('archetype', 'node-fullstack'),
      
      // Connection Settings
      configServer: workspaceConfig.get('configServer', ''),
      localConfigPath: workspaceConfig.get('localConfigPath', ''),
      
      // Analysis Features
      openaiEnabled: workspaceConfig.get('openaiEnabled', false),
      telemetryCollector: workspaceConfig.get('telemetryCollector', ''),
      telemetryEnabled: workspaceConfig.get('telemetryEnabled', true),
      
      // Output & Reporting
      generateReports: workspaceConfig.get('generateReports', true),
      reportOutputDir: workspaceConfig.get('reportOutputDir', ''),
      reportFormats: workspaceConfig.get('reportFormats', ['json', 'md']),
      showReportAfterAnalysis: workspaceConfig.get('showReportAfterAnalysis', false),
      reportRetentionDays: workspaceConfig.get('reportRetentionDays', 30),
      
      // UI/UX Settings
      showInlineDecorations: workspaceConfig.get('showInlineDecorations', true),
      highlightSeverity: workspaceConfig.get('highlightSeverity', ['error', 'warning']),
      statusBarVisibility: workspaceConfig.get('statusBarVisibility', true),
      problemsPanelGrouping: workspaceConfig.get('problemsPanelGrouping', 'file'),
      showRuleDocumentation: workspaceConfig.get('showRuleDocumentation', true),
      
      // Performance Settings
      maxFileSize: workspaceConfig.get('maxFileSize', 1024 * 1024), // 1MB
      analysisTimeout: workspaceConfig.get('analysisTimeout', 30000), // 30s
      excludePatterns: workspaceConfig.get('excludePatterns', ['node_modules/**', '.git/**']),
      includePatterns: workspaceConfig.get('includePatterns', []),
      maxConcurrentAnalysis: workspaceConfig.get('maxConcurrentAnalysis', 3),
      
      // Advanced Settings
      debugMode: workspaceConfig.get('debugMode', false),
      customPlugins: workspaceConfig.get('customPlugins', []),
      ruleOverrides: workspaceConfig.get('ruleOverrides', {}),
      cacheResults: workspaceConfig.get('cacheResults', true),
      cacheTTL: workspaceConfig.get('cacheTTL', 60), // 1 hour
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
} 