import * as vscode from 'vscode';
import * as path from 'path';
import {
  ConfigManager,
  type ExtensionConfig
} from '../../configuration/configManager';
import { DefaultDetectionService } from '../../configuration/defaultDetection';
import { isTestEnvironment } from '../../utils/testDetection';

export interface SettingsCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  settings: SettingDefinition[];
}

export interface SettingDefinition {
  key: keyof ExtensionConfig;
  name: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'array' | 'object' | 'enum';
  default: any;
  options?: string[];
  min?: number;
  max?: number;
  validation?: (value: any) => string | null;
  dependencies?: Array<{ key: keyof ExtensionConfig; value: any }>;
}

export class SettingsUIPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager
  ) {}

  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'xfidelitySettings',
      'X-Fidelity Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(
            path.join(this.context.extensionUri.fsPath, 'resources')
          )
        ]
      }
    );

    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.disposables
    );

    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      this.disposables
    );

    await this.updateContent();
  }

  private async updateContent(): Promise<void> {
    if (!this.panel) {
      return;
    }

    const config = this.configManager.getConfig();
    const categories = this.getSettingsCategories();

    this.panel.webview.html = this.generateHTML(config, categories);
  }

  private getSettingsCategories(): SettingsCategory[] {
    return [
      {
        id: 'analysis',
        name: 'Analysis Settings',
        icon: '🔍',
        description: 'Configure analysis behavior and scheduling',
        settings: [
          {
            key: 'archetype',
            name: 'Project Archetype',
            description:
              'The X-Fidelity archetype that best matches your project',
            type: 'enum',
            default: 'node-fullstack',
            options: [
              'node-fullstack',
              'java-microservice',
              'python-service',
              'dotnet-service'
            ]
          },
          {
            key: 'runInterval',
            name: 'Auto-run Interval (seconds)',
            description:
              'How often to automatically run analysis (0 = disabled)',
            type: 'number',
            default: 300,
            min: 0,
            max: 3600
          },
          {
            key: 'autoAnalyzeOnSave',
            name: 'Analyze on Save',
            description: 'Automatically run analysis when files are saved',
            type: 'boolean',
            default: true
          },
          {
            key: 'autoAnalyzeOnFileChange',
            name: 'Analyze on File Change',
            description:
              'Automatically run analysis when files are changed (debounced)',
            type: 'boolean',
            default: false
          },
          {
            key: 'analysisTimeout',
            name: 'Analysis Timeout (ms)',
            description: 'Maximum time to wait for analysis completion',
            type: 'number',
            default: 30000,
            min: 5000,
            max: 300000
          }
        ]
      },
      {
        id: 'connection',
        name: 'Connection Settings',
        icon: '🌐',
        description: 'Configure remote services and integrations',
        settings: [
          {
            key: 'configServer',
            name: 'Config Server URL',
            description:
              'URL of remote X-Fidelity configuration server (optional)',
            type: 'string',
            default: ''
          },
          {
            key: 'localConfigPath',
            name: 'Local Config Path',
            description: 'Path to local X-Fidelity configuration file',
            type: 'string',
            default: ''
          },
          {
            key: 'openaiEnabled',
            name: 'OpenAI Integration',
            description: 'Enable OpenAI analysis for advanced code insights',
            type: 'boolean',
            default: false
          },
          {
            key: 'telemetryEnabled',
            name: 'Telemetry Collection',
            description:
              'Allow anonymous usage analytics to improve the extension',
            type: 'boolean',
            default: true
          },
          {
            key: 'telemetryCollector',
            name: 'Telemetry Endpoint',
            description: 'Custom telemetry collection endpoint (optional)',
            type: 'string',
            default: '',
            dependencies: [{ key: 'telemetryEnabled', value: true }]
          }
        ]
      },
      {
        id: 'reporting',
        name: 'Reporting & Output',
        icon: '📊',
        description: 'Configure report generation and output formats',
        settings: [
          {
            key: 'generateReports',
            name: 'Generate Reports',
            description: 'Automatically generate reports after analysis',
            type: 'boolean',
            default: true
          },
          {
            key: 'reportOutputDir',
            name: 'Report Output Directory',
            description: 'Directory for report output (empty = workspace root)',
            type: 'string',
            default: '',
            dependencies: [{ key: 'generateReports', value: true }]
          },
          {
            key: 'reportFormats',
            name: 'Report Formats',
            description: 'Which report formats to generate automatically',
            type: 'array',
            default: ['json', 'md'],
            options: ['json', 'md', 'html', 'csv'],
            dependencies: [{ key: 'generateReports', value: true }]
          },
          {
            key: 'showReportAfterAnalysis',
            name: 'Auto-open Reports',
            description: 'Automatically open reports after generation',
            type: 'boolean',
            default: false,
            dependencies: [{ key: 'generateReports', value: true }]
          },
          {
            key: 'reportRetentionDays',
            name: 'Report Retention (days)',
            description: 'How long to keep old reports (0 = keep forever)',
            type: 'number',
            default: 30,
            min: 0,
            max: 365,
            dependencies: [{ key: 'generateReports', value: true }]
          }
        ]
      },
      {
        id: 'ui',
        name: 'User Interface',
        icon: '🎨',
        description: 'Customize the visual appearance and behavior',
        settings: [
          {
            key: 'showInlineDecorations',
            name: 'Inline Decorations',
            description: 'Show squiggly lines and decorations for issues',
            type: 'boolean',
            default: true
          },
          {
            key: 'highlightSeverity',
            name: 'Highlight Severities',
            description: 'Which issue severities to highlight in the editor',
            type: 'array',
            default: ['error', 'warning'],
            options: ['error', 'warning', 'info', 'hint']
          },
          {
            key: 'statusBarVisibility',
            name: 'Status Bar Item',
            description: 'Show X-Fidelity status in the status bar',
            type: 'boolean',
            default: true
          },
          {
            key: 'problemsPanelGrouping',
            name: 'Problems Panel Grouping',
            description: 'How to group issues in the Problems panel',
            type: 'enum',
            default: 'file',
            options: ['file', 'severity', 'rule', 'category']
          },
          {
            key: 'showRuleDocumentation',
            name: 'Rule Documentation',
            description: 'Show rule documentation in hover tooltips',
            type: 'boolean',
            default: true
          }
        ]
      },
      {
        id: 'performance',
        name: 'Performance',
        icon: '⚡',
        description: 'Optimize performance and resource usage',
        settings: [
          {
            key: 'maxFileSize',
            name: 'Max File Size (bytes)',
            description: 'Maximum file size to analyze',
            type: 'number',
            default: 1048576,
            min: 1024,
            max: 10485760
          },
          {
            key: 'maxConcurrentAnalysis',
            name: 'Max Concurrent Analysis',
            description: 'Maximum number of parallel analysis operations',
            type: 'number',
            default: 3,
            min: 1,
            max: 10
          },
          {
            key: 'cacheResults',
            name: 'Cache Results',
            description: 'Cache analysis results for better performance',
            type: 'boolean',
            default: true
          },
          {
            key: 'cacheTTL',
            name: 'Cache TTL (minutes)',
            description: 'How long to keep cached results',
            type: 'number',
            default: 60,
            min: 1,
            max: 1440,
            dependencies: [{ key: 'cacheResults', value: true }]
          },
          {
            key: 'excludePatterns',
            name: 'Exclude Patterns',
            description: 'Glob patterns for files to exclude from analysis',
            type: 'array',
            default: ['node_modules/**', '.git/**'],
            options: []
          },
          {
            key: 'includePatterns',
            name: 'Include Patterns',
            description: 'Glob patterns for files to include (empty = all)',
            type: 'array',
            default: [],
            options: []
          }
        ]
      },
      {
        id: 'advanced',
        name: 'Advanced',
        icon: '⚙️',
        description: 'Advanced settings for power users',
        settings: [
          {
            key: 'debugMode',
            name: 'Debug Mode',
            description: 'Enable debug logging for troubleshooting',
            type: 'boolean',
            default: false
          },
          {
            key: 'customPlugins',
            name: 'Custom Plugins',
            description: 'Paths to custom X-Fidelity plugins',
            type: 'array',
            default: [],
            options: []
          },
          {
            key: 'ruleOverrides',
            name: 'Rule Overrides',
            description: 'Rule-specific configuration overrides (JSON)',
            type: 'object',
            default: {}
          }
        ]
      }
    ];
  }

  private generateHTML(
    config: ExtensionConfig,
    categories: SettingsCategory[]
  ): string {
    const nonce = this.getNonce();
    const isDark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>X-Fidelity Settings</title>
    ${this.getStyles(isDark)}
</head>
<body class="${isDark ? 'dark' : 'light'}">
    <div class="settings-container">
        <header class="settings-header">
            <h1>⚙️ X-Fidelity Settings</h1>
            <div class="header-actions">
                <input type="text" id="searchInput" class="search-bar" placeholder="Search settings...">
                <button class="btn btn-secondary" onclick="exportSettings()">Export</button>
                <button class="btn btn-secondary" onclick="importSettings()">Import</button>
                <button class="btn btn-primary" onclick="detectArchetype()">Auto-detect</button>
                <button class="btn btn-danger" onclick="resetSettings()">Reset All</button>
            </div>
        </header>
        
        <div class="settings-content">
            <nav class="settings-sidebar">
                <div class="sidebar-header">
                    <h3>Categories</h3>
                </div>
                <div class="category-list">
                    ${categories
                      .map(
                        category => `
                        <div class="category-item ${category.id === 'analysis' ? 'active' : ''}" 
                             onclick="selectCategory('${category.id}')">
                            <span class="category-icon">${category.icon}</span>
                            <div class="category-info">
                                <span class="category-name">${category.name}</span>
                                <span class="category-description">${category.description}</span>
                            </div>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </nav>
            
            <main class="settings-main">
                ${categories.map(category => this.generateCategoryHTML(category, config)).join('')}
            </main>
        </div>
    </div>
    
    <script nonce="${nonce}">
        ${this.getJavaScript(config, categories)}
    </script>
</body>
</html>`;
  }

  private generateCategoryHTML(
    category: SettingsCategory,
    config: ExtensionConfig
  ): string {
    return `
        <div class="category-section" id="category-${category.id}" 
             style="display: ${category.id === 'analysis' ? 'block' : 'none'}">
            <div class="category-header">
                <h2>${category.icon} ${category.name}</h2>
                <p class="category-description">${category.description}</p>
            </div>
            
            <div class="settings-grid">
                ${category.settings.map(setting => this.generateSettingHTML(setting, config)).join('')}
            </div>
        </div>
    `;
  }

  private generateSettingHTML(
    setting: SettingDefinition,
    config: ExtensionConfig
  ): string {
    const currentValue = config[setting.key];
    const isDisabled = setting.dependencies
      ? !setting.dependencies.every(dep => config[dep.key] === dep.value)
      : false;

    let inputHTML = '';

    switch (setting.type) {
      case 'boolean':
        inputHTML = `
            <label class="toggle-switch ${isDisabled ? 'disabled' : ''}">
                <input type="checkbox" id="${setting.key}" 
                       ${currentValue ? 'checked' : ''} 
                       ${isDisabled ? 'disabled' : ''}
                       onchange="updateSetting('${setting.key}', this.checked)">
                <span class="toggle-slider"></span>
            </label>
        `;
        break;

      case 'string':
        inputHTML = `
            <input type="text" id="${setting.key}" 
                   value="${currentValue || ''}" 
                   class="setting-input ${isDisabled ? 'disabled' : ''}"
                   ${isDisabled ? 'disabled' : ''}
                   onchange="updateSetting('${setting.key}', this.value)"
                   placeholder="${setting.default || ''}">
        `;
        break;

      case 'number':
        inputHTML = `
            <input type="number" id="${setting.key}" 
                   value="${currentValue}" 
                   class="setting-input ${isDisabled ? 'disabled' : ''}"
                   ${isDisabled ? 'disabled' : ''}
                   ${setting.min !== undefined ? `min="${setting.min}"` : ''}
                   ${setting.max !== undefined ? `max="${setting.max}"` : ''}
                   onchange="updateSetting('${setting.key}', parseInt(this.value))">
        `;
        break;

      case 'enum':
        inputHTML = `
            <select id="${setting.key}" 
                    class="setting-select ${isDisabled ? 'disabled' : ''}"
                    ${isDisabled ? 'disabled' : ''}
                    onchange="updateSetting('${setting.key}', this.value)">
                ${setting.options
                  ?.map(
                    option => `
                    <option value="${option}" ${currentValue === option ? 'selected' : ''}>
                        ${option}
                    </option>
                `
                  )
                  .join('')}
            </select>
        `;
        break;

      case 'array':
        const arrayValue = Array.isArray(currentValue) ? currentValue : [];
        if (setting.options && setting.options.length > 0) {
          // Multi-select checkboxes
          inputHTML = `
              <div class="checkbox-group ${isDisabled ? 'disabled' : ''}">
                  ${setting.options
                    .map(
                      option => `
                      <label class="checkbox-item">
                          <input type="checkbox" 
                                 value="${option}"
                                 ${arrayValue.includes(option) ? 'checked' : ''}
                                 ${isDisabled ? 'disabled' : ''}
                                 onchange="updateArraySetting('${setting.key}', '${option}', this.checked)">
                          <span>${option}</span>
                      </label>
                  `
                    )
                    .join('')}
              </div>
          `;
        } else {
          // Text area for free-form arrays
          inputHTML = `
              <textarea id="${setting.key}" 
                        class="setting-textarea ${isDisabled ? 'disabled' : ''}"
                        ${isDisabled ? 'disabled' : ''}
                        onchange="updateArrayTextSetting('${setting.key}', this.value)"
                        placeholder="One item per line">${arrayValue.join('\n')}</textarea>
          `;
        }
        break;

      case 'object':
        inputHTML = `
            <textarea id="${setting.key}" 
                      class="setting-textarea ${isDisabled ? 'disabled' : ''}"
                      ${isDisabled ? 'disabled' : ''}
                      onchange="updateObjectSetting('${setting.key}', this.value)"
                      placeholder="JSON object">${JSON.stringify(currentValue, null, 2)}</textarea>
        `;
        break;
    }

    return `
        <div class="setting-item ${isDisabled ? 'disabled' : ''}" data-key="${setting.key}">
            <div class="setting-info">
                <label class="setting-label" for="${setting.key}">${setting.name}</label>
                <p class="setting-description">${setting.description}</p>
                ${
                  setting.dependencies
                    ? `
                    <p class="setting-dependency">
                        Requires: ${setting.dependencies.map(dep => `${dep.key} = ${dep.value}`).join(', ')}
                    </p>
                `
                    : ''
                }
            </div>
            <div class="setting-control">
                ${inputHTML}
            </div>
        </div>
    `;
  }

  private getStyles(isDark: boolean): string {
    return `<style>
        :root {
            --bg-primary: ${isDark ? '#1e1e1e' : '#ffffff'};
            --bg-secondary: ${isDark ? '#252526' : '#f3f3f3'};
            --bg-tertiary: ${isDark ? '#2d2d30' : '#e8e8e8'};
            --text-primary: ${isDark ? '#cccccc' : '#333333'};
            --text-secondary: ${isDark ? '#969696' : '#666666'};
            --border-color: ${isDark ? '#3c3c3c' : '#e0e0e0'};
            --accent-color: #007acc;
            --success-color: #238636;
            --warning-color: #d18616;
            --error-color: #f85149;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        .settings-container {
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .settings-header {
            background: var(--bg-secondary);
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        
        .settings-header h1 {
            font-size: 1.5em;
            color: var(--accent-color);
        }
        
        .header-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .search-bar {
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
            width: 250px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.2s;
        }
        
        .btn-primary { background: var(--accent-color); color: white; }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
        .btn-danger { background: var(--error-color); color: white; }
        
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        
        .settings-content {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .settings-sidebar {
            width: 300px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            overflow-y: auto;
            flex-shrink: 0;
        }
        
        .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .sidebar-header h3 {
            font-size: 1.1em;
        }
        
        .category-list {
            padding: 10px 0;
        }
        
        .category-item {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            cursor: pointer;
            transition: background-color 0.2s;
            border-left: 3px solid transparent;
        }
        
        .category-item:hover {
            background: var(--bg-tertiary);
        }
        
        .category-item.active {
            background: var(--bg-tertiary);
            border-left-color: var(--accent-color);
        }
        
        .category-icon {
            font-size: 1.2em;
            margin-right: 15px;
        }
        
        .category-info {
            flex: 1;
        }
        
        .category-name {
            display: block;
            font-weight: 500;
        }
        
        .category-description {
            display: block;
            font-size: 0.8em;
            color: var(--text-secondary);
            margin-top: 2px;
        }
        
        .settings-main {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .category-section {
            max-width: 800px;
        }
        
        .category-header {
            margin-bottom: 30px;
        }
        
        .category-header h2 {
            font-size: 1.4em;
            margin-bottom: 8px;
        }
        
        .category-header .category-description {
            color: var(--text-secondary);
        }
        
        .settings-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .setting-item {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            transition: all 0.2s;
        }
        
        .setting-item:hover {
            border-color: var(--accent-color);
        }
        
        .setting-item.disabled {
            opacity: 0.6;
            background: var(--bg-tertiary);
        }
        
        .setting-info {
            margin-bottom: 15px;
        }
        
        .setting-label {
            font-weight: 500;
            font-size: 1.1em;
            display: block;
            margin-bottom: 5px;
        }
        
        .setting-description {
            color: var(--text-secondary);
            font-size: 0.9em;
        }
        
        .setting-dependency {
            color: var(--warning-color);
            font-size: 0.8em;
            margin-top: 5px;
            font-style: italic;
        }
        
        .setting-input, .setting-select, .setting-textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
            font-size: 0.9em;
        }
        
        .setting-textarea {
            min-height: 100px;
            resize: vertical;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }
        
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        
        .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--border-color);
            transition: 0.3s;
            border-radius: 24px;
        }
        
        .toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background: white;
            transition: 0.3s;
            border-radius: 50%;
        }
        
        input:checked + .toggle-slider {
            background: var(--accent-color);
        }
        
        input:checked + .toggle-slider:before {
            transform: translateX(26px);
        }
        
        .toggle-switch.disabled .toggle-slider {
            cursor: not-allowed;
            opacity: 0.6;
        }
        
        .checkbox-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }
        
        .checkbox-item input[type="checkbox"] {
            width: auto;
        }
        
        .hidden {
            display: none !important;
        }
        
        @media (max-width: 1024px) {
            .settings-content {
                flex-direction: column;
            }
            
            .settings-sidebar {
                width: 100%;
                max-height: 200px;
            }
            
            .header-actions {
                flex-wrap: wrap;
                gap: 5px;
            }
            
            .search-bar {
                width: 200px;
            }
        }
    </style>`;
  }

  private getJavaScript(
    config: ExtensionConfig,
    categories: SettingsCategory[]
  ): string {
    return `
        const vscode = acquireVsCodeApi();
        let currentConfig = ${JSON.stringify(config)};
        const categories = ${JSON.stringify(categories)};
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            filterSettings(searchTerm);
        });
        
        function filterSettings(searchTerm) {
            const settingItems = document.querySelectorAll('.setting-item');
            let visibleCount = 0;
            
            settingItems.forEach(item => {
                const key = item.dataset.key;
                const setting = findSettingByKey(key);
                
                if (!setting) return;
                
                const matches = !searchTerm || 
                    setting.name.toLowerCase().includes(searchTerm) ||
                    setting.description.toLowerCase().includes(searchTerm) ||
                    key.toLowerCase().includes(searchTerm);
                
                if (matches) {
                    item.classList.remove('hidden');
                    visibleCount++;
                } else {
                    item.classList.add('hidden');
                }
            });
            
            // Show/hide category sections based on visible settings
            categories.forEach(category => {
                const section = document.getElementById('category-' + category.id);
                const visibleInCategory = category.settings.filter(setting => {
                    const item = document.querySelector('[data-key="' + setting.key + '"]');
                    return item && !item.classList.contains('hidden');
                }).length;
                
                if (visibleInCategory > 0 || !searchTerm) {
                    section.style.display = section.style.display === 'block' ? 'block' : 'none';
                } else {
                    section.style.display = 'none';
                }
            });
        }
        
        function findSettingByKey(key) {
            for (const category of categories) {
                const setting = category.settings.find(s => s.key === key);
                if (setting) return setting;
            }
            return null;
        }
        
        function selectCategory(categoryId) {
            // Update active state
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.closest('.category-item').classList.add('active');
            
            // Show/hide sections
            document.querySelectorAll('.category-section').forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById('category-' + categoryId).style.display = 'block';
        }
        
        function updateSetting(key, value) {
            currentConfig[key] = value;
            updateDependentSettings();
            saveSetting(key, value);
        }
        
        function updateArraySetting(key, option, checked) {
            if (!currentConfig[key]) currentConfig[key] = [];
            
            if (checked) {
                if (!currentConfig[key].includes(option)) {
                    currentConfig[key].push(option);
                }
            } else {
                currentConfig[key] = currentConfig[key].filter(item => item !== option);
            }
            
            updateDependentSettings();
            saveSetting(key, currentConfig[key]);
        }
        
        function updateArrayTextSetting(key, value) {
            const array = value.split('\\n').filter(line => line.trim() !== '');
            currentConfig[key] = array;
            updateDependentSettings();
            saveSetting(key, array);
        }
        
        function updateObjectSetting(key, value) {
            try {
                const parsed = JSON.parse(value);
                currentConfig[key] = parsed;
                updateDependentSettings();
                saveSetting(key, parsed);
            } catch (e) {
                // Invalid JSON, don't update
                vscode.postMessage({
                    command: 'showError',
                    message: 'Invalid JSON format'
                });
            }
        }
        
        function updateDependentSettings() {
            categories.forEach(category => {
                category.settings.forEach(setting => {
                    const element = document.querySelector('[data-key="' + setting.key + '"]');
                    if (!element || !setting.dependencies) return;
                    
                    const shouldEnable = setting.dependencies.every(dep => 
                        currentConfig[dep.key] === dep.value
                    );
                    
                    if (shouldEnable) {
                        element.classList.remove('disabled');
                        const inputs = element.querySelectorAll('input, select, textarea');
                        inputs.forEach(input => input.disabled = false);
                    } else {
                        element.classList.add('disabled');
                        const inputs = element.querySelectorAll('input, select, textarea');
                        inputs.forEach(input => input.disabled = true);
                    }
                });
            });
        }
        
        function saveSetting(key, value) {
            vscode.postMessage({
                command: 'updateSetting',
                key: key,
                value: value
            });
        }
        
        function exportSettings() {
            vscode.postMessage({
                command: 'exportSettings'
            });
        }
        
        function importSettings() {
            vscode.postMessage({
                command: 'importSettings'
            });
        }
        
        function detectArchetype() {
            vscode.postMessage({
                command: 'detectArchetype'
            });
        }
        
        function resetSettings() {
            if (confirm('Reset all settings to defaults? This cannot be undone.')) {
                vscode.postMessage({
                    command: 'resetSettings'
                });
            }
        }
        
        // Initialize
        updateDependentSettings();
    `;
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'updateSetting':
        await this.configManager.updateConfig({ [message.key]: message.value });
        break;

      case 'exportSettings':
        await this.exportSettings();
        break;

      case 'importSettings':
        await this.importSettings();
        break;

      case 'detectArchetype':
        await this.detectArchetype();
        break;

      case 'resetSettings':
        await this.resetSettings();
        break;

      case 'showError':
        vscode.window.showErrorMessage(message.message);
        break;
    }
  }

  private async exportSettings(): Promise<void> {
    const config = this.configManager.getConfig();
    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, '');

    try {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`xfidelity-settings-${timestamp}.json`),
        filters: { 'JSON Files': ['json'] }
      });

      if (uri) {
        const content = JSON.stringify(config, null, 2);
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
        vscode.window.showInformationMessage('Settings exported successfully');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }

  private async importSettings(): Promise<void> {
    try {
      const uri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: { 'JSON Files': ['json'] }
      });

      if (uri && uri[0]) {
        const content = await vscode.workspace.fs.readFile(uri[0]);
        const settings = JSON.parse(content.toString());

        // Validate settings
        const validKeys = Object.keys(this.configManager.getConfig());
        const validSettings: Partial<ExtensionConfig> = {};

        for (const [key, value] of Object.entries(settings)) {
          if (validKeys.includes(key)) {
            validSettings[key as keyof ExtensionConfig] = value as any;
          }
        }

        await this.configManager.updateConfig(validSettings);
        await this.updateContent();

        vscode.window.showInformationMessage('Settings imported successfully');
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Import failed: ${error}`);
    }
  }

  private async detectArchetype(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const detector = new DefaultDetectionService(workspaceFolder.uri.fsPath);
      const detections = await detector.detectArchetype();

      if (detections.length === 0) {
        vscode.window.showInformationMessage('No specific archetype detected');
        return;
      }

      const bestMatch = detections[0];
      let choice: string | undefined;
      if (isTestEnvironment()) {
        choice = 'Yes';
        console.log('[TEST] Auto-responding to archetype update dialog: Yes');
      } else {
        choice = await vscode.window.showInformationMessage(
          `Detected ${bestMatch.archetype} (${bestMatch.confidence}% confidence). Update archetype?`,
          'Yes',
          'No'
        );
      }

      if (choice === 'Yes') {
        await this.configManager.updateConfig({
          archetype: bestMatch.archetype
        });
        await this.updateContent();
        vscode.window.showInformationMessage(
          `Archetype updated to: ${bestMatch.archetype}`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Auto-detection failed: ${error}`);
    }
  }

  private async resetSettings(): Promise<void> {
    try {
      const workspaceConfig = vscode.workspace.getConfiguration('xfidelity');
      const defaultConfig = this.configManager.getConfig();

      // Reset all configuration values
      for (const key of Object.keys(defaultConfig)) {
        await workspaceConfig.update(
          key,
          undefined,
          vscode.ConfigurationTarget.Workspace
        );
      }

      await this.updateContent();
      vscode.window.showInformationMessage('Settings reset to defaults');
    } catch (error) {
      vscode.window.showErrorMessage(`Reset failed: ${error}`);
    }
  }

  private getNonce(): string {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  dispose(): void {
    this.panel?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
