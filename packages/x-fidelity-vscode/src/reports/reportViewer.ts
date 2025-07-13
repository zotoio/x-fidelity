import * as vscode from 'vscode';
import * as path from 'path';
import type { ResultMetadata } from '@x-fidelity/types';
import { ConfigManager } from '../configuration/configManager';
import { REPO_GLOBAL_CHECK } from '@x-fidelity/core';

export interface ReportViewerOptions {
  reportData: ResultMetadata;
  reportPath?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export class ReportViewer implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager
  ) {}

  async showReport(options: ReportViewerOptions): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      await this.updateContent(options);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'xfidelityReport',
      'X-Fidelity Analysis Report',
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

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.panel = undefined;
      },
      null,
      this.disposables
    );

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      message => this.handleWebviewMessage(message),
      undefined,
      this.disposables
    );

    await this.updateContent(options);
  }

  private async updateContent(options: ReportViewerOptions): Promise<void> {
    if (!this.panel) {
      return;
    }

    const html = await this.generateWebviewHTML(options);
    this.panel.webview.html = html;
  }

  private async generateWebviewHTML(
    options: ReportViewerOptions
  ): Promise<string> {
    const data = options.reportData.XFI_RESULT;
    const theme = options.theme || 'auto';
    const nonce = this.getNonce();

    // Get VS Code theme colors
    const isDark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;
    const themeClass = theme === 'auto' ? (isDark ? 'dark' : 'light') : theme;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>X-Fidelity Analysis Report</title>
    ${this.getStyles(isDark)}
</head>
<body class="${themeClass}">
    <div class="container">
        <div class="sidebar">
            <div class="filter-section">
                <h3>🔍 Search & Filter</h3>
                
                <div class="filter-group">
                    <input type="text" id="searchInput" class="search-bar" placeholder="Search issues, files, rules...">
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Severity</label>
                    <div class="filter-checkboxes">
                        <div class="checkbox-item">
                            <input type="checkbox" id="filterError" checked>
                            <label for="filterError">🔴 Errors (${data.errorCount})</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="filterWarning" checked>
                            <label for="filterWarning">🟡 Warnings (${data.warningCount})</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="filterInfo" checked>
                            <label for="filterInfo">🔵 Info</label>
                        </div>
                        <div class="checkbox-item">
                            <input type="checkbox" id="filterHint" checked>
                            <label for="filterHint">💡 Hints</label>
                        </div>
                    </div>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Group By</label>
                    <select id="groupBySelect" class="filter-select">
                        <option value="file">File</option>
                        <option value="severity">Severity</option>
                        <option value="rule">Rule</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label class="filter-label">Sort By</label>
                    <select id="sortBySelect" class="filter-select">
                        <option value="file">File Name</option>
                        <option value="severity">Severity</option>
                        <option value="rule">Rule</option>
                        <option value="line">Line Number</option>
                    </select>
                </div>
            </div>
        </div>
        
        <div class="main-content">
            <div class="header">
                <h1>📊 X-Fidelity Analysis Report</h1>
                <div class="header-info">
                    <div class="header-info-item">
                        <strong>Repository:</strong> ${data.repoPath}
                    </div>
                    <div class="header-info-item">
                        <strong>Archetype:</strong> ${data.archetype}
                    </div>
                    <div class="header-info-item">
                        <strong>Files Analyzed:</strong> ${data.fileCount}
                    </div>
                    <div class="header-info-item">
                        <strong>Duration:</strong> ${data.durationSeconds.toFixed(2)}s
                    </div>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value ${data.totalIssues === 0 ? 'success' : 'info'}">${data.totalIssues}</div>
                    <div class="metric-label">Total Issues</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value error">${data.errorCount}</div>
                    <div class="metric-label">Errors</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value warning">${data.warningCount}</div>
                    <div class="metric-label">Warnings</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value error">${data.fatalityCount}</div>
                    <div class="metric-label">Fatal</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value success">${data.exemptCount}</div>
                    <div class="metric-label">Exempt</div>
                </div>
            </div>
            
            <div class="issues-section">
                <h2>📋 Issues</h2>
                <div id="issuesContainer">
                    ${this.generateIssuesHTML(data)}
                </div>
            </div>
        </div>
    </div>
    
    <script nonce="${nonce}">
        ${this.getJavaScript(data)}
    </script>
</body>
</html>`;
  }

  private getStyles(isDark: boolean): string {
    return `<style>
        :root {
            --bg-primary: ${isDark ? '#1e1e1e' : '#ffffff'};
            --bg-secondary: ${isDark ? '#252526' : '#f3f3f3'};
            --text-primary: ${isDark ? '#cccccc' : '#333333'};
            --text-secondary: ${isDark ? '#969696' : '#666666'};
            --border-color: ${isDark ? '#3c3c3c' : '#e0e0e0'};
            --accent-color: #007acc;
            --error-color: #f85149;
            --warning-color: #d18616;
            --success-color: #238636;
            --info-color: #58a6ff;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            overflow-x: hidden;
        }
        
        .container {
            display: flex;
            height: 100vh;
        }
        
        .sidebar {
            width: 280px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            padding: 20px;
            overflow-y: auto;
        }
        
        .main-content {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid var(--border-color);
        }
        
        .header h1 {
            font-size: 2em;
            margin-bottom: 10px;
            color: var(--accent-color);
        }
        
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin-top: 15px;
        }
        
        .header-info-item {
            background: var(--bg-secondary);
            padding: 10px;
            border-radius: 6px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        
        .metric-card {
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            transition: transform 0.2s;
        }
        
        .metric-card:hover {
            transform: translateY(-2px);
        }
        
        .metric-value {
            font-size: 2em;
            font-weight: bold;
        }
        
        .metric-value.error { color: var(--error-color); }
        .metric-value.warning { color: var(--warning-color); }
        .metric-value.success { color: var(--success-color); }
        .metric-value.info { color: var(--info-color); }
        
        .metric-label {
            color: var(--text-secondary);
            margin-top: 5px;
            font-size: 0.9em;
        }
        
        .filter-section {
            margin-bottom: 20px;
        }
        
        .filter-section h3 {
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        
        .filter-group {
            margin-bottom: 15px;
        }
        
        .filter-label {
            display: block;
            margin-bottom: 5px;
            font-size: 0.9em;
            color: var(--text-secondary);
        }
        
        .filter-input, .filter-select, .search-bar {
            width: 100%;
            padding: 8px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--bg-primary);
            color: var(--text-primary);
        }
        
        .search-bar {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 1em;
        }
        
        .filter-checkboxes {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }
        
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .issues-section {
            margin-top: 30px;
        }
        
        .issues-section h2 {
            margin-bottom: 20px;
            font-size: 1.5em;
        }
        
        .file-group {
            margin-bottom: 25px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .file-header {
            background: var(--bg-secondary);
            padding: 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        }
        
        .file-header:hover {
            background: var(--border-color);
        }
        
        .file-name {
            font-family: 'Monaco', 'Consolas', monospace;
            font-weight: 500;
        }
        
        .issue-count {
            background: var(--accent-color);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8em;
        }
        
        .issues-list {
            display: none;
        }
        
        .issues-list.expanded {
            display: block;
        }
        
        .issue-item {
            padding: 15px;
            border-top: 1px solid var(--border-color);
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .issue-item:hover {
            background: var(--bg-secondary);
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 8px;
        }
        
        .issue-severity {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .issue-severity.error { background: var(--error-color); color: white; }
        .issue-severity.warning { background: var(--warning-color); color: white; }
        .issue-severity.info { background: var(--info-color); color: white; }
        .issue-severity.hint { background: var(--text-secondary); color: white; }
        
        .issue-rule {
            font-family: 'Monaco', 'Consolas', monospace;
            background: var(--bg-secondary);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.85em;
        }
        
        .issue-location {
            margin-left: auto;
            font-size: 0.8em;
            color: var(--text-secondary);
        }
        
        .issue-message {
            margin-bottom: 8px;
        }
        
        .issue-actions {
            display: flex;
            gap: 8px;
        }
        
        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
            transition: background-color 0.2s;
        }
        
        .btn-primary {
            background: var(--accent-color);
            color: white;
        }
        
        .btn-secondary {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        
        .btn:hover {
            opacity: 0.8;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }
        
        .expand-arrow {
            transition: transform 0.2s;
        }
        
        .expand-arrow.expanded {
            transform: rotate(90deg);
        }
        
        @media (max-width: 1024px) {
            .container {
                flex-direction: column;
            }
            
            .sidebar {
                width: 100%;
                max-height: 300px;
            }
            
            .metrics-grid {
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            }
        }
    </style>`;
  }

  private getJavaScript(data: any): string {
    return `
        const vscode = acquireVsCodeApi();
        
        // Data store
        const analysisData = ${JSON.stringify(data)};
        let filteredData = [...analysisData.issueDetails];
        
        // DOM elements
        const searchInput = document.getElementById('searchInput');
        const filterError = document.getElementById('filterError');
        const filterWarning = document.getElementById('filterWarning');
        const filterInfo = document.getElementById('filterInfo');
        const filterHint = document.getElementById('filterHint');
        const groupBySelect = document.getElementById('groupBySelect');
        const sortBySelect = document.getElementById('sortBySelect');
        const issuesContainer = document.getElementById('issuesContainer');
        
        // Event listeners
        searchInput.addEventListener('input', applyFilters);
        filterError.addEventListener('change', applyFilters);
        filterWarning.addEventListener('change', applyFilters);
        filterInfo.addEventListener('change', applyFilters);
        filterHint.addEventListener('change', applyFilters);
        groupBySelect.addEventListener('change', applyFilters);
        sortBySelect.addEventListener('change', applyFilters);
        
        function applyFilters() {
            const searchTerm = searchInput.value.toLowerCase();
            const showError = filterError.checked;
            const showWarning = filterWarning.checked;
            const showInfo = filterInfo.checked;
            const showHint = filterHint.checked;
            
            filteredData = analysisData.issueDetails.filter(detail => {
                // Filter by search term
                if (searchTerm) {
                    const matches = detail.filePath.toLowerCase().includes(searchTerm) ||
                                  detail.errors.some(error => 
                                      error.ruleFailure.toLowerCase().includes(searchTerm) ||
                                      (error.details?.message || '').toLowerCase().includes(searchTerm)
                                  );
                    if (!matches) return false;
                }
                
                // Filter by severity
                const hasVisibleErrors = detail.errors.some(error => {
                    const level = error.level || 'hint';
                    return (level === 'error' && showError) ||
                           (level === 'warning' && showWarning) ||
                           (level === 'info' && showInfo) ||
                           (level === 'hint' && showHint);
                });
                
                return hasVisibleErrors;
            }).map(detail => ({
                ...detail,
                errors: detail.errors.filter(error => {
                    const level = error.level || 'hint';
                    return (level === 'error' && showError) ||
                           (level === 'warning' && showWarning) ||
                           (level === 'info' && showInfo) ||
                           (level === 'hint' && showHint);
                })
            }));
            
            renderIssues();
        }
        
        function renderIssues() {
            if (filteredData.length === 0) {
                issuesContainer.innerHTML = '<div class="empty-state">No issues match your current filters.</div>';
                return;
            }
            
            const groupBy = groupBySelect.value;
            const sortBy = sortBySelect.value;
            
            let groupedData = groupData(filteredData, groupBy);
            groupedData = sortGroups(groupedData, sortBy);
            
            issuesContainer.innerHTML = generateGroupsHTML(groupedData);
            attachEventListeners();
        }
        
        function groupData(data, groupBy) {
            const groups = {};
            
            data.forEach(detail => {
                detail.errors.forEach(error => {
                    let groupKey;
                    switch (groupBy) {
                        case 'severity':
                            groupKey = error.level || 'hint';
                            break;
                        case 'rule':
                            groupKey = error.ruleFailure;
                            break;
                        case 'file':
                        default:
                            groupKey = detail.filePath;
                            break;
                    }
                    
                    if (!groups[groupKey]) {
                        groups[groupKey] = [];
                    }
                    
                    groups[groupKey].push({
                        ...error,
                        filePath: detail.filePath
                    });
                });
            });
            
            return groups;
        }
        
        function sortGroups(groups, sortBy) {
            const sortedGroups = {};
            const sortedKeys = Object.keys(groups).sort((a, b) => {
                switch (sortBy) {
                    case 'severity':
                        const severityOrder = { error: 0, warning: 1, info: 2, hint: 3 };
                        return (severityOrder[a] || 3) - (severityOrder[b] || 3);
                    case 'file':
                    case 'rule':
                    default:
                        return a.localeCompare(b);
                }
            });
            
            sortedKeys.forEach(key => {
                sortedGroups[key] = groups[key].sort((a, b) => {
                    if (a.details?.lineNumber && b.details?.lineNumber) {
                        return a.details.lineNumber - b.details.lineNumber;
                    }
                    return a.ruleFailure.localeCompare(b.ruleFailure);
                });
            });
            
            return sortedGroups;
        }
        
        function generateGroupsHTML(groups) {
            return Object.entries(groups).map(([groupName, issues]) => {
                const issueCount = issues.length;
                const groupId = 'group-' + groupName.replace(/[^a-zA-Z0-9]/g, '-');
                
                return \`
                    <div class="file-group">
                        <div class="file-header" onclick="toggleGroup('\${groupId}')">
                            <div>
                                <span class="expand-arrow" id="arrow-\${groupId}">▶</span>
                                <span class="file-name">\${groupName}</span>
                            </div>
                            <span class="issue-count">\${issueCount}</span>
                        </div>
                        <div class="issues-list" id="\${groupId}">
                            \${issues.map(generateIssueHTML).join('')}
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function generateIssueHTML(issue) {
            const line = issue.details?.lineNumber || '';
            const column = issue.details?.columnNumber || '';
            const location = line ? \`Line \${line}\${column ? \`:\${column}\` : ''}\` : '';
            
            return \`
                <div class="issue-item" onclick="navigateToIssue('\${issue.filePath}', \${line || 1}, \${column || 1}, \${issue.details?.range})">
                    <div class="issue-header">
                        <span class="issue-severity \${issue.level || 'hint'}">\${(issue.level || 'hint').toUpperCase()}</span>
                        <span class="issue-rule">\${issue.ruleFailure}</span>
                        \${location ? \`<span class="issue-location">\${location}</span>\` : ''}
                    </div>
                    <div class="issue-message">\${issue.details?.message || issue.ruleFailure}</div>
                    <div class="issue-actions">
                        <button class="btn btn-primary" onclick="event.stopPropagation(); navigateToIssue('\${issue.filePath}', \${line || 1}, \${column || 1}, \${issue.details?.range})">
                            Go to Issue
                        </button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation(); showRuleInfo('\${issue.ruleFailure}')">
                            Rule Info
                        </button>
                    </div>
                </div>
            \`;
        }
        
        function toggleGroup(groupId) {
            const group = document.getElementById(groupId);
            const arrow = document.getElementById('arrow-' + groupId);
            
            if (group.classList.contains('expanded')) {
                group.classList.remove('expanded');
                arrow.classList.remove('expanded');
            } else {
                group.classList.add('expanded');
                arrow.classList.add('expanded');
            }
        }
        
        function attachEventListeners() {
            // File headers are handled by onclick in HTML
            // Issue items are handled by onclick in HTML
        }
        
        function navigateToIssue(filePath, lineNumber, columnNumber, rangeJson) {
            // Parse range safely, handling null/undefined
            let range = null;
            if (rangeJson && rangeJson !== 'null') {
                try {
                    range = typeof rangeJson === 'string' ? JSON.parse(rangeJson) : rangeJson;
                } catch (e) {
                    console.warn('Failed to parse range:', rangeJson);
                }
            }
            
            vscode.postMessage({
                command: 'navigateToIssue',
                filePath: filePath,
                lineNumber: lineNumber,
                columnNumber: columnNumber,
                range: range
            });
        }
        
        function showRuleInfo(ruleId) {
            vscode.postMessage({
                command: 'showRuleInfo',
                ruleId: ruleId
            });
        }
        
        // Initialize
        applyFilters();
    `;
  }

  private generateIssuesHTML(data: any): string {
    if (data.issueDetails.length === 0) {
      return '<div class="empty-state">🎉 No issues found! Your code looks great.</div>';
    }

    return data.issueDetails
      .map((detail: any) => {
        const issueCount = detail.errors.length;
        const groupId = `group-${detail.filePath.replace(/[^a-zA-Z0-9]/g, '-')}`;

        return `
        <div class="file-group">
          <div class="file-header" onclick="toggleGroup('${groupId}')">
            <div>
              <span class="expand-arrow" id="arrow-${groupId}">▶</span>
              <span class="file-name">${detail.filePath}</span>
            </div>
            <span class="issue-count">${issueCount}</span>
          </div>
          <div class="issues-list" id="${groupId}">
            ${detail.errors.map((error: any) => this.generateIssueItemHTML(error, detail.filePath)).join('')}
          </div>
        </div>
      `;
      })
      .join('');
  }

  private generateIssueItemHTML(error: any, filePath: string): string {
    const line = error.details?.lineNumber || '';
    const column = error.details?.columnNumber || '';
    const location = line ? `Line ${line}${column ? `:${column}` : ''}` : '';

    // Safely serialize range object to avoid toJSON errors
    const rangeJson = error.details?.range
      ? JSON.stringify(error.details.range)
      : 'null';

    return `
      <div class="issue-item" onclick="navigateToIssue('${filePath}', ${line || 1}, ${column || 1}, ${rangeJson})">
        <div class="issue-header">
          <span class="issue-severity ${error.level || 'hint'}">${(error.level || 'hint').toUpperCase()}</span>
          <span class="issue-rule">${error.ruleFailure}</span>
          ${location ? `<span class="issue-location">${location}</span>` : ''}
        </div>
        <div class="issue-message">${error.details?.message || error.ruleFailure}</div>
        <div class="issue-actions">
          <button class="btn btn-primary" onclick="event.stopPropagation(); navigateToIssue('${filePath}', ${line || 1}, ${column || 1}, ${rangeJson})">
            Go to Issue
          </button>
          <button class="btn btn-secondary" onclick="event.stopPropagation(); showRuleInfo('${error.ruleFailure}')">
            Rule Info
          </button>
        </div>
      </div>
    `;
  }

  private async handleWebviewMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'navigateToIssue':
        await this.navigateToIssue(
          message.filePath,
          message.lineNumber,
          message.columnNumber,
          message.range
        );
        break;

      case 'showRuleInfo':
        await this.showRuleInfo(message.ruleId);
        break;
    }
  }

  private async navigateToIssue(
    filePath: string,
    lineNumber: number,
    columnNumber?: number,
    range?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    }
  ): Promise<void> {
    try {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        return;
      }

      let fileUri: vscode.Uri;

      // Handle special case for global repository checks
      if (filePath === REPO_GLOBAL_CHECK) {
        fileUri = vscode.Uri.file(
          path.join(workspaceFolder.uri.fsPath, '.xfiResults', 'XFI_RESULT.md')
        );

        try {
          const document = await vscode.workspace.openTextDocument(fileUri);
          await vscode.window.showTextDocument(document);
          return;
        } catch (error) {
          vscode.window.showWarningMessage(
            `Global check report not found. Details: ${filePath}`
          );
          return;
        }
      }

      // Handle absolute paths
      if (path.isAbsolute(filePath)) {
        fileUri = vscode.Uri.file(filePath);
      } else {
        // Handle relative paths
        fileUri = vscode.Uri.file(
          path.join(workspaceFolder.uri.fsPath, filePath)
        );
      }

      const document = await vscode.workspace.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(document);

      // Enhanced navigation with precise positioning
      if (range) {
        // Use enhanced range data for precise selection
        const startPos = new vscode.Position(
          Math.max(0, range.start.line - 1), // Convert to 0-based
          Math.max(0, range.start.column - 1) // Convert to 0-based
        );
        const endPos = new vscode.Position(
          Math.max(0, range.end.line - 1), // Convert to 0-based
          Math.max(0, range.end.column - 1) // Convert to 0-based
        );

        const selection = new vscode.Selection(startPos, endPos);
        editor.selection = selection;
        editor.revealRange(
          selection,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );
      } else if (columnNumber && columnNumber > 0) {
        // Use line and column for precise positioning
        const position = new vscode.Position(
          Math.max(0, lineNumber - 1), // Convert to 0-based
          Math.max(0, columnNumber - 1) // Convert to 0-based
        );
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );
      } else if (lineNumber > 0) {
        // Fallback to line-only navigation
        const position = new vscode.Position(Math.max(0, lineNumber - 1), 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  private async showRuleInfo(ruleId: string): Promise<void> {
    const url = `https://github.com/zotoio/x-fidelity/blob/main/docs/rules/${ruleId}.md`;
    await vscode.env.openExternal(vscode.Uri.parse(url));
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
