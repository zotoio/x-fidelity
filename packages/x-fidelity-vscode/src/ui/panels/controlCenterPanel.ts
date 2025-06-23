import * as vscode from 'vscode';
import { ConfigManager } from '../../configuration/configManager';
import { AnalysisManager } from '../../analysis/analysisManager';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';

export interface ControlCenterData {
  lastAnalysis?: Date;
  issueCount: {
    errors: number;
    warnings: number;
    info: number;
    hints: number;
  };
  wasmStatus: 'ready' | 'loading' | 'error' | 'unavailable';
  pluginStatus: {
    loaded: number;
    total: number;
    failed: string[];
  };
  analysisStatus: 'idle' | 'running' | 'completed' | 'failed';
}

export class ControlCenterPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  
  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private analysisManager: AnalysisManager,
    private diagnosticProvider: DiagnosticProvider
  ) {}
  
  async show(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      await this.updateContent();
      return;
    }
    
    this.panel = vscode.window.createWebviewPanel(
      'xfidelityControlCenter',
      '🎛️ X-Fidelity Control Center',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'resources')]
      }
    );
    
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    }, null, this.disposables);
    
    this.panel.webview.onDidReceiveMessage(
      message => this.handleMessage(message),
      undefined,
      this.disposables
    );
    
    await this.updateContent();
  }
  
  private async updateContent(): Promise<void> {
    if (!this.panel) {return;}
    
    const data = await this.collectControlCenterData();
    this.panel.webview.html = this.generateHTML(data);
  }
  
  private async collectControlCenterData(): Promise<ControlCenterData> {
    const summary = this.diagnosticProvider.getDiagnosticsSummary();
    
    // Check if analysis is currently running
    const isAnalysisRunning = this.analysisManager.isAnalysisRunning;
    
    return {
      lastAnalysis: undefined, // TODO: Track last analysis time
      issueCount: {
        errors: summary.errors,
        warnings: summary.warnings,
        info: summary.info,
        hints: summary.hints
      },
      wasmStatus: 'ready', // TODO: Check actual WASM status
      pluginStatus: {
        loaded: 5, // TODO: Get actual plugin count
        total: 5,
        failed: []
      },
      analysisStatus: isAnalysisRunning ? 'running' : 'idle'
    };
  }
  
  private generateHTML(data: ControlCenterData): string {
    const nonce = this.getNonce();
    const isDark = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>X-Fidelity Control Center</title>
    ${this.getStyles(isDark)}
</head>
<body class="${isDark ? 'dark' : 'light'}">
    <div class="control-center">
        <header class="header">
            <h1>🎛️ X-Fidelity Control Center</h1>
            <div class="status-indicator ${data.analysisStatus}">
                ${data.analysisStatus === 'running' ? '⚡ Analyzing...' : '✅ Ready'}
            </div>
        </header>
        
        <div class="main-content">
            <!-- Quick Actions Section -->
            <section class="section">
                <h2>🚀 Quick Actions</h2>
                <div class="action-grid">
                    ${data.analysisStatus === 'running' ? `
                    <button class="action-btn danger" onclick="cancelAnalysis()">
                        <span class="icon">🛑</span>
                        <span class="text">Cancel Analysis</span>
                    </button>
                    ` : `
                    <button class="action-btn primary" onclick="runAnalysis()">
                        <span class="icon">🔍</span>
                        <span class="text">Run Analysis</span>
                    </button>
                    `}
                    <button class="action-btn" onclick="openSettings()">
                        <span class="icon">⚙️</span>
                        <span class="text">Settings</span>
                    </button>
                    <button class="action-btn" onclick="testExtension()">
                        <span class="icon">🧪</span>
                        <span class="text">Test Extension</span>
                    </button>
                    <button class="action-btn" onclick="showLogs()">
                        <span class="icon">📝</span>
                        <span class="text">View Logs</span>
                    </button>
                </div>
            </section>
            
            <!-- Panel Launcher Section -->
            <section class="section">
                <h2>📊 Panel Launcher</h2>
                <div class="panel-grid">
                    <button class="panel-btn" onclick="openIssueExplorer()">
                        <span class="icon">📋</span>
                        <span class="text">Issue Explorer</span>
                        <span class="badge">${data.issueCount.errors + data.issueCount.warnings}</span>
                    </button>
                    <button class="panel-btn" onclick="openDashboard()">
                        <span class="icon">📈</span>
                        <span class="text">Dashboard</span>
                    </button>
                    <button class="panel-btn" onclick="openReports()">
                        <span class="icon">📄</span>
                        <span class="text">Reports</span>
                    </button>
                    <button class="panel-btn" onclick="openAdvancedSettings()">
                        <span class="icon">🔧</span>
                        <span class="text">Advanced Settings</span>
                    </button>
                </div>
            </section>
            
            <!-- Status Overview Section -->
            <section class="section">
                <h2>📊 Status Overview</h2>
                <div class="status-grid">
                    <div class="status-item">
                        <span class="label">Last Analysis</span>
                        <span class="value">${data.lastAnalysis ? this.formatTime(data.lastAnalysis) : 'Never'}</span>
                    </div>
                    <div class="status-item">
                        <span class="label">Issues Found</span>
                        <span class="value">
                            <span class="error">${data.issueCount.errors} errors</span>,
                            <span class="warning">${data.issueCount.warnings} warnings</span>
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="label">WASM Status</span>
                        <span class="value status-${data.wasmStatus}">
                            ${data.wasmStatus === 'ready' ? '✅ Ready' : 
                              data.wasmStatus === 'loading' ? '⏳ Loading' : 
                              data.wasmStatus === 'error' ? '❌ Error' : '⚠️ Unavailable'}
                        </span>
                    </div>
                    <div class="status-item">
                        <span class="label">Plugins</span>
                        <span class="value">${data.pluginStatus.loaded}/${data.pluginStatus.total} loaded</span>
                    </div>
                </div>
            </section>
            
            <!-- Development Tools Section -->
            <section class="section">
                <h2>🔧 Development Tools</h2>
                <div class="dev-tools">
                    <button class="tool-btn" onclick="showDebugInfo()">
                        <span class="icon">🐛</span>
                        <span class="text">Debug Info</span>
                    </button>
                    <button class="tool-btn" onclick="runTests()">
                        <span class="icon">🧪</span>
                        <span class="text">Run Tests</span>
                    </button>
                    <button class="tool-btn" onclick="reloadExtension()">
                        <span class="icon">🔄</span>
                        <span class="text">Reload Extension</span>
                    </button>
                    <button class="tool-btn" onclick="exportLogs()">
                        <span class="icon">💾</span>
                        <span class="text">Export Logs</span>
                    </button>
                </div>
            </section>
        </div>
    </div>
    
    <script nonce="${nonce}">
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }
  
  private getStyles(isDark: boolean): string {
    return `<style>
        :root {
            --bg-primary: ${isDark ? '#1e1e1e' : '#ffffff'};
            --bg-secondary: ${isDark ? '#252526' : '#f8f9fa'};
            --bg-tertiary: ${isDark ? '#2d2d30' : '#e9ecef'};
            --text-primary: ${isDark ? '#cccccc' : '#212529'};
            --text-secondary: ${isDark ? '#969696' : '#6c757d'};
            --border-color: ${isDark ? '#3c3c3c' : '#dee2e6'};
            --accent-color: #007acc;
            --success-color: #28a745;
            --warning-color: #ffc107;
            --error-color: #dc3545;
            --info-color: #17a2b8;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
        }
        
        .control-center {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            border-bottom: 2px solid var(--border-color);
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 1.8em;
            color: var(--accent-color);
        }
        
        .status-indicator {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 500;
        }
        
        .status-indicator.running {
            background: var(--warning-color);
            color: black;
        }
        
        .status-indicator.idle {
            background: var(--success-color);
            color: white;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h2 {
            font-size: 1.3em;
            margin-bottom: 20px;
            color: var(--accent-color);
        }
        
        .action-grid, .panel-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .action-btn, .panel-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 20px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
        }
        
        .action-btn:hover, .panel-btn:hover {
            border-color: var(--accent-color);
            background: var(--bg-tertiary);
            transform: translateY(-2px);
        }
        
        .action-btn.primary {
            background: var(--accent-color);
            color: white;
        }
        
        .action-btn.danger {
            background: var(--error-color);
            color: white;
        }
        
        .action-btn.primary:hover, .action-btn.danger:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .action-btn .icon, .panel-btn .icon {
            font-size: 2em;
        }
        
        .action-btn .text, .panel-btn .text {
            font-weight: 500;
            text-align: center;
        }
        
        .panel-btn {
            position: relative;
        }
        
        .badge {
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--error-color);
            color: white;
            border-radius: 10px;
            padding: 2px 8px;
            font-size: 0.8em;
            font-weight: bold;
        }
        
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: var(--bg-secondary);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        
        .status-item .label {
            font-weight: 500;
            color: var(--text-secondary);
        }
        
        .status-item .value {
            font-weight: 600;
        }
        
        .error { color: var(--error-color); }
        .warning { color: var(--warning-color); }
        .status-ready { color: var(--success-color); }
        .status-error { color: var(--error-color); }
        .status-loading { color: var(--warning-color); }
        .status-unavailable { color: var(--text-secondary); }
        
        .dev-tools {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
        }
        
        .tool-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .tool-btn:hover {
            border-color: var(--accent-color);
            background: var(--bg-tertiary);
        }
        
        .tool-btn .icon {
            font-size: 1.2em;
        }
        
        @media (max-width: 768px) {
            .action-grid, .panel-grid {
                grid-template-columns: 1fr 1fr;
            }
            
            .status-grid {
                grid-template-columns: 1fr;
            }
            
            .dev-tools {
                grid-template-columns: 1fr 1fr;
            }
        }
    </style>`;
  }
  
  private getJavaScript(): string {
    return `
        const vscode = acquireVsCodeApi();
        
        function runAnalysis() {
            vscode.postMessage({ command: 'runAnalysis' });
        }
        
        function openSettings() {
            vscode.postMessage({ command: 'openSettings' });
        }
        
        function testExtension() {
            vscode.postMessage({ command: 'testExtension' });
        }
        
        function showLogs() {
            vscode.postMessage({ command: 'showLogs' });
        }
        
        function openIssueExplorer() {
            vscode.postMessage({ command: 'openIssueExplorer' });
        }
        
        function openDashboard() {
            vscode.postMessage({ command: 'openDashboard' });
        }
        
        function openReports() {
            vscode.postMessage({ command: 'openReports' });
        }
        
        function openAdvancedSettings() {
            vscode.postMessage({ command: 'openAdvancedSettings' });
        }
        
        function showDebugInfo() {
            vscode.postMessage({ command: 'showDebugInfo' });
        }
        
        function runTests() {
            vscode.postMessage({ command: 'runTests' });
        }
        
        function reloadExtension() {
            vscode.postMessage({ command: 'reloadExtension' });
        }
        
        function exportLogs() {
            vscode.postMessage({ command: 'exportLogs' });
        }
        
        function cancelAnalysis() {
            vscode.postMessage({ command: 'cancelAnalysis' });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            vscode.postMessage({ command: 'refresh' });
        }, 30000);
    `;
  }
  
  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'runAnalysis':
        await vscode.commands.executeCommand('xfidelity.runAnalysis');
        break;

      case 'cancelAnalysis':
        await vscode.commands.executeCommand('xfidelity.cancelAnalysis');
        break;
        
      case 'openSettings':
        await vscode.commands.executeCommand('xfidelity.openSettings');
        break;
        
      case 'testExtension':
        await vscode.commands.executeCommand('xfidelity.test');
        break;
        
      case 'showLogs':
        await vscode.commands.executeCommand('workbench.action.output.show');
        break;
        
      case 'openIssueExplorer':
        await vscode.commands.executeCommand('xfidelity.showIssueExplorer');
        break;
        
      case 'openDashboard':
        await vscode.commands.executeCommand('xfidelity.showDashboard');
        break;
        
      case 'openReports':
        await vscode.commands.executeCommand('xfidelity.openReports');
        break;
        
      case 'openAdvancedSettings':
        await vscode.commands.executeCommand('xfidelity.showAdvancedSettings');
        break;
        
      case 'showDebugInfo':
        await this.showDebugInfo();
        break;
        
      case 'runTests':
        await vscode.commands.executeCommand('workbench.action.tasks.runTask', '🧪 Run Tests');
        break;
        
      case 'reloadExtension':
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
        break;
        
      case 'exportLogs':
        await this.exportLogs();
        break;
        
      case 'refresh':
        await this.updateContent();
        break;
    }
  }
  
  private async showDebugInfo(): Promise<void> {
    const data = await this.collectControlCenterData();
    const debugInfo = {
      'Extension Version': this.context.extension.packageJSON.version,
      'VSCode Version': vscode.version,
      'Workspace': vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'No workspace',
      'WASM Status': data.wasmStatus,
      'Plugins Loaded': `${data.pluginStatus.loaded}/${data.pluginStatus.total}`,
      'Last Analysis': data.lastAnalysis?.toISOString() || 'Never',
      'Issues': `${data.issueCount.errors} errors, ${data.issueCount.warnings} warnings`
    };
    
    const formatted = Object.entries(debugInfo)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
    
    await vscode.window.showInformationMessage(
      'Debug information copied to clipboard',
      { modal: false }
    );
    
    await vscode.env.clipboard.writeText(formatted);
  }
  
  private async exportLogs(): Promise<void> {
    // TODO: Implement log export functionality
    await vscode.window.showInformationMessage('Log export functionality coming soon!');
  }
  
  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) {return 'Just now';}
    if (minutes < 60) {return `${minutes} min ago`;}
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {return `${hours} hour${hours > 1 ? 's' : ''} ago`;}
    
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
  
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
