import * as vscode from 'vscode';
import * as path from 'path';
import type { ResultMetadata } from '@x-fidelity/types';
import { ConfigManager } from '../../configuration/configManager';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import { logger } from '../../utils/logger';

export interface IssueFilter {
  severity: string[];
  files: string[];
  rules: string[];
  searchText: string;
  showExempted: boolean;
  showFixed: boolean;
}

export interface IssueSortOptions {
  field: 'file' | 'severity' | 'rule' | 'line' | 'date';
  direction: 'asc' | 'desc';
}

export interface ProcessedIssue {
  id: string;
  file: string;
  rule: string;
  severity: string;
  message: string;
  line?: number;
  column?: number;
  range?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  category: string;
  fixable: boolean;
  exempted: boolean;
  dateFound: number;
}

export class IssueDetailsPanel implements vscode.Disposable {
  private panel?: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private issues: ProcessedIssue[] = [];
  private filteredIssues: ProcessedIssue[] = [];
  private currentFilter: IssueFilter = {
    severity: ['error', 'warning', 'info', 'hint'],
    files: [],
    rules: [],
    searchText: '',
    showExempted: false,
    showFixed: true
  };
  private currentSort: IssueSortOptions = {
    field: 'severity',
    direction: 'desc'
  };

  constructor(
    private context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private diagnosticProvider: DiagnosticProvider
  ) {}

  async show(initialData?: ResultMetadata): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      if (initialData) {
        this.loadIssues(initialData);
      }
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'xfidelityIssueDetails',
      'X-Fidelity Issue Explorer',
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

    if (initialData) {
      this.loadIssues(initialData);
    } else {
      this.loadCurrentIssues();
    }
  }

  private loadIssues(data: ResultMetadata): void {
    this.issues = this.processIssues(data);
    this.applyFiltersAndSort();
    this.updateContent();
  }

  private loadCurrentIssues(): void {
    const diagnostics = this.diagnosticProvider.getAllDiagnostics();
    this.issues = this.processDiagnostics(diagnostics);
    this.applyFiltersAndSort();
    this.updateContent();
  }

  private processIssues(data: ResultMetadata): ProcessedIssue[] {
    const issues: ProcessedIssue[] = [];

    for (const detail of data.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        issues.push({
          id: `${detail.filePath}-${error.ruleFailure}-${error.details?.lineNumber || 0}`,
          file: detail.filePath,
          rule: error.ruleFailure,
          severity: error.level || 'hint',
          message: error.details?.message || error.ruleFailure,
          line: error.details?.lineNumber,
          column: error.details?.columnNumber,
          category: (error as any).category || 'general',
          fixable: (error as any).fixable || false,
          exempted: false, // Would be determined from exemption tracking
          dateFound: Date.now()
        });
      }
    }

    return issues;
  }

  private processDiagnostics(
    diagnostics: [vscode.Uri, vscode.Diagnostic[]][]
  ): ProcessedIssue[] {
    const issues: ProcessedIssue[] = [];

    for (const [uri, diags] of diagnostics) {
      for (const diag of diags) {
        if (diag.source !== 'X-Fidelity') {
          continue;
        }

        // Extract enhanced position data if available
        const enhancedPos = (diag as any).enhancedPosition;
        let range:
          | {
              start: { line: number; column: number };
              end: { line: number; column: number };
            }
          | undefined = undefined;
        let column = diag.range.start.character + 1; // Convert to 1-based

        if (enhancedPos) {
          // Use enhanced range if available
          if (enhancedPos.range) {
            range = enhancedPos.range;
          }
          // Use enhanced position data for more accurate column
          if (enhancedPos.position && enhancedPos.position.column) {
            column = enhancedPos.position.column;
          }
          // Use first match range if available
          else if (
            enhancedPos.matches &&
            enhancedPos.matches.length > 0 &&
            enhancedPos.matches[0].range
          ) {
            range = enhancedPos.matches[0].range;
            column = enhancedPos.matches[0].range.start.column;
          }
        }

        issues.push({
          id: `${uri.fsPath}-${diag.code}-${diag.range.start.line}`,
          file: vscode.workspace.asRelativePath(uri),
          rule: String(diag.code || 'unknown'),
          severity: this.mapSeverityToString(diag.severity),
          message: diag.message,
          line: diag.range.start.line + 1, // Convert to 1-based
          column: column,
          range: range, // Enhanced range data
          category: (diag as any).category || 'general',
          fixable: (diag as any).fixable || false,
          exempted: false,
          dateFound: Date.now()
        });
      }
    }

    return issues;
  }

  private mapSeverityToString(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'hint';
    }
  }

  private applyFiltersAndSort(): void {
    let filtered = [...this.issues];

    // Apply filters
    if (this.currentFilter.severity.length < 4) {
      filtered = filtered.filter(issue =>
        this.currentFilter.severity.includes(issue.severity)
      );
    }

    if (this.currentFilter.files.length > 0) {
      filtered = filtered.filter(issue =>
        this.currentFilter.files.includes(issue.file)
      );
    }

    if (this.currentFilter.rules.length > 0) {
      filtered = filtered.filter(issue =>
        this.currentFilter.rules.includes(issue.rule)
      );
    }

    if (this.currentFilter.searchText) {
      const searchLower = this.currentFilter.searchText.toLowerCase();
      filtered = filtered.filter(
        issue =>
          issue.file.toLowerCase().includes(searchLower) ||
          issue.rule.toLowerCase().includes(searchLower) ||
          issue.message.toLowerCase().includes(searchLower)
      );
    }

    if (!this.currentFilter.showExempted) {
      filtered = filtered.filter(issue => !issue.exempted);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.currentSort.field) {
        case 'file':
          comparison = a.file.localeCompare(b.file);
          break;
        case 'severity':
          const severityOrder = { error: 0, warning: 1, info: 2, hint: 3 };
          comparison =
            (severityOrder[a.severity as keyof typeof severityOrder] || 3) -
            (severityOrder[b.severity as keyof typeof severityOrder] || 3);
          break;
        case 'rule':
          comparison = a.rule.localeCompare(b.rule);
          break;
        case 'line':
          comparison = (a.line || 0) - (b.line || 0);
          break;
        case 'date':
          comparison = a.dateFound - b.dateFound;
          break;
      }

      return this.currentSort.direction === 'desc' ? -comparison : comparison;
    });

    this.filteredIssues = filtered;
  }

  private updateContent(): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.html = this.generateHTML();
  }

  private generateHTML(): string {
    const nonce = this.getNonce();
    const isDark =
      vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

    const allFiles = [...new Set(this.issues.map(i => i.file))].sort();
    const allRules = [...new Set(this.issues.map(i => i.rule))].sort();
    const stats = this.calculateStats();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>X-Fidelity Issue Explorer</title>
    ${this.getStyles(isDark)}
</head>
<body class="${isDark ? 'dark' : 'light'}">
    <div class="issue-explorer">
        <header class="explorer-header">
            <h1>X-Fidelity Issue Explorer</h1>
            <div class="stats-bar">
                <span class="stat">📊 ${this.filteredIssues.length} of ${this.issues.length} issues</span>
                <span class="stat error">🔴 ${stats.errors}</span>
                <span class="stat warning">🟡 ${stats.warnings}</span>
                <span class="stat info">🔵 ${stats.info}</span>
                <span class="stat hint">💡 ${stats.hints}</span>
            </div>
        </header>
        
        <div class="explorer-content">
            <aside class="filters-panel">
                <div class="filter-section">
                    <h3>🔍 Search & Filter</h3>
                    
                    <div class="filter-group">
                        <input type="text" id="searchInput" 
                               placeholder="Search issues..." 
                               value="${this.currentFilter.searchText}"
                               class="search-input">
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Severity</label>
                        <div class="checkbox-group">
                            ${['error', 'warning', 'info', 'hint']
                              .map(
                                severity => `
                                <label class="checkbox-item">
                                    <input type="checkbox" value="${severity}" 
                                           ${this.currentFilter.severity.includes(severity) ? 'checked' : ''}
                                           onchange="updateSeverityFilter('${severity}', this.checked)">
                                    <span class="severity-label ${severity}">${severity.toUpperCase()}</span>
                                </label>
                            `
                              )
                              .join('')}
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Files (${allFiles.length})</label>
                        <div class="multi-select">
                            <input type="text" id="fileSearch" placeholder="Search files..." class="filter-search">
                            <div class="options-list" id="filesList">
                                ${allFiles
                                  .slice(0, 10)
                                  .map(
                                    file => `
                                    <label class="option-item">
                                        <input type="checkbox" value="${file}" 
                                               ${this.currentFilter.files.includes(file) ? 'checked' : ''}
                                               onchange="updateFileFilter('${file}', this.checked)">
                                        <span class="option-text">${file}</span>
                                    </label>
                                `
                                  )
                                  .join('')}
                                ${allFiles.length > 10 ? `<div class="more-items">... ${allFiles.length - 10} more</div>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="filter-label">Rules (${allRules.length})</label>
                        <div class="multi-select">
                            <input type="text" id="ruleSearch" placeholder="Search rules..." class="filter-search">
                            <div class="options-list" id="rulesList">
                                ${allRules
                                  .slice(0, 10)
                                  .map(
                                    rule => `
                                    <label class="option-item">
                                        <input type="checkbox" value="${rule}" 
                                               ${this.currentFilter.rules.includes(rule) ? 'checked' : ''}
                                               onchange="updateRuleFilter('${rule}', this.checked)">
                                        <span class="option-text">${rule}</span>
                                    </label>
                                `
                                  )
                                  .join('')}
                                ${allRules.length > 10 ? `<div class="more-items">... ${allRules.length - 10} more</div>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <label class="checkbox-item">
                            <input type="checkbox" id="showExempted" 
                                   ${this.currentFilter.showExempted ? 'checked' : ''}
                                   onchange="updateShowExempted(this.checked)">
                            <span>Show Exempted</span>
                        </label>
                    </div>
                    
                    <div class="filter-actions">
                        <button class="btn btn-secondary" onclick="clearFilters()">Clear All</button>
                        <button class="btn btn-primary" onclick="bulkOperations()">Bulk Actions</button>
                    </div>
                </div>
            </aside>
            
            <main class="issues-panel">
                <div class="panel-header">
                    <div class="sort-controls">
                        <label>Sort by:</label>
                        <select id="sortField" onchange="updateSort()">
                            <option value="severity" ${this.currentSort.field === 'severity' ? 'selected' : ''}>Severity</option>
                            <option value="file" ${this.currentSort.field === 'file' ? 'selected' : ''}>File</option>
                            <option value="rule" ${this.currentSort.field === 'rule' ? 'selected' : ''}>Rule</option>
                            <option value="line" ${this.currentSort.field === 'line' ? 'selected' : ''}>Line</option>
                            <option value="date" ${this.currentSort.field === 'date' ? 'selected' : ''}>Date</option>
                        </select>
                        <button class="sort-direction" onclick="toggleSortDirection()">
                            ${this.currentSort.direction === 'asc' ? '↑' : '↓'}
                        </button>
                    </div>
                    
                    <div class="view-controls">
                        <button class="view-btn ${this.currentSort.field === 'file' ? 'active' : ''}" onclick="groupByFile()">Group by File</button>
                        <button class="view-btn" onclick="exportIssues()">Export</button>
                    </div>
                </div>
                
                <div class="issues-list">
                    ${
                      this.filteredIssues.length === 0
                        ? '<div class="empty-state">No issues match your current filters</div>'
                        : this.renderIssuesList()
                    }
                </div>
            </main>
        </div>
    </div>
    
    <script nonce="${nonce}">
        ${this.getJavaScript()}
    </script>
</body>
</html>`;
  }

  private renderIssuesList(): string {
    const groupByFile = this.currentSort.field === 'file';

    if (groupByFile) {
      const groupedIssues = this.groupIssuesByFile();
      return Object.entries(groupedIssues)
        .map(([file, issues]) => this.renderFileGroup(file, issues))
        .join('');
    } else {
      return this.filteredIssues
        .map(issue => this.renderIssueItem(issue))
        .join('');
    }
  }

  private groupIssuesByFile(): Record<string, ProcessedIssue[]> {
    const grouped: Record<string, ProcessedIssue[]> = {};
    for (const issue of this.filteredIssues) {
      if (!grouped[issue.file]) {
        grouped[issue.file] = [];
      }
      grouped[issue.file].push(issue);
    }
    return grouped;
  }

  private renderFileGroup(file: string, issues: ProcessedIssue[]): string {
    const stats = {
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      hints: issues.filter(i => i.severity === 'hint').length
    };

    return `
        <div class="file-group">
            <div class="file-header" onclick="toggleFileGroup('${file}')">
                <div class="file-info">
                    <span class="file-name">📁 ${file}</span>
                    <span class="issue-count">${issues.length} issues</span>
                </div>
                <div class="file-stats">
                    ${stats.errors > 0 ? `<span class="stat error">${stats.errors}</span>` : ''}
                    ${stats.warnings > 0 ? `<span class="stat warning">${stats.warnings}</span>` : ''}
                    ${stats.info > 0 ? `<span class="stat info">${stats.info}</span>` : ''}
                    ${stats.hints > 0 ? `<span class="stat hint">${stats.hints}</span>` : ''}
                </div>
                <span class="expand-arrow">▼</span>
            </div>
            <div class="file-issues" id="issues-${file.replace(/[^a-zA-Z0-9]/g, '-')}">
                ${issues.map(issue => this.renderIssueItem(issue, true)).join('')}
            </div>
        </div>
    `;
  }

  private renderIssueItem(issue: ProcessedIssue, inGroup = false): string {
    return `
        <div class="issue-item ${issue.severity} ${issue.exempted ? 'exempted' : ''}" 
             data-issue-id="${issue.id}">
            <div class="issue-header">
                <input type="checkbox" class="issue-checkbox" value="${issue.id}">
                <span class="severity-badge ${issue.severity}">${issue.severity.toUpperCase()}</span>
                ${!inGroup ? `<span class="file-name">📁 ${issue.file}</span>` : ''}
                <span class="rule-name">⚙️ ${issue.rule}</span>
                ${issue.line ? `<span class="location">📍 ${issue.line}:${issue.column || 1}</span>` : ''}
                ${issue.fixable ? '<span class="fixable-badge">🔧 Fixable</span>' : ''}
                ${issue.exempted ? '<span class="exempted-badge">🚫 Exempted</span>' : ''}
            </div>
            <div class="issue-message">${issue.message}</div>
            <div class="issue-actions">
                <button class="action-btn primary" onclick="navigateToIssue('${issue.file}', ${issue.line || 1}, ${issue.column || 0}, ${issue.range || null})">
                    Go to Issue
                </button>
                ${
                  issue.fixable
                    ? `
                    <button class="action-btn secondary" onclick="quickFix('${issue.id}')">
                        Quick Fix
                    </button>
                `
                    : ''
                }
                <button class="action-btn secondary" onclick="addExemption('${issue.id}')">
                    Add Exemption
                </button>
                <button class="action-btn secondary" onclick="showRuleInfo('${issue.rule}')">
                    Rule Info
                </button>
            </div>
        </div>
    `;
  }

  private calculateStats() {
    return {
      errors: this.filteredIssues.filter(i => i.severity === 'error').length,
      warnings: this.filteredIssues.filter(i => i.severity === 'warning')
        .length,
      info: this.filteredIssues.filter(i => i.severity === 'info').length,
      hints: this.filteredIssues.filter(i => i.severity === 'hint').length
    };
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
            height: 100vh;
            overflow: hidden;
        }
        
        .issue-explorer {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        .explorer-header {
            background: var(--bg-secondary);
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .explorer-header h1 {
            font-size: 1.4em;
            color: var(--accent-color);
        }
        
        .stats-bar {
            display: flex;
            gap: 15px;
            font-size: 0.9em;
        }
        
        .stat {
            padding: 4px 8px;
            border-radius: 4px;
            background: var(--bg-tertiary);
        }
        
        .stat.error { color: var(--error-color); }
        .stat.warning { color: var(--warning-color); }
        .stat.info { color: var(--info-color); }
        .stat.hint { color: var(--text-secondary); }
        
        .explorer-content {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .filters-panel {
            width: 300px;
            background: var(--bg-secondary);
            border-right: 1px solid var(--border-color);
            overflow-y: auto;
            padding: 20px;
        }
        
        .filter-section h3 {
            margin-bottom: 20px;
            color: var(--accent-color);
        }
        
        .filter-group {
            margin-bottom: 20px;
        }
        
        .filter-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: var(--text-secondary);
        }
        
        .search-input, .filter-search {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            background: var(--bg-primary);
            color: var(--text-primary);
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
        
        .severity-label {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .severity-label.error { background: var(--error-color); color: white; }
        .severity-label.warning { background: var(--warning-color); color: black; }
        .severity-label.info { background: var(--info-color); color: white; }
        .severity-label.hint { background: var(--text-secondary); color: white; }
        
        .multi-select {
            border: 1px solid var(--border-color);
            border-radius: 6px;
            overflow: hidden;
        }
        
        .options-list {
            max-height: 150px;
            overflow-y: auto;
        }
        
        .option-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-color);
            cursor: pointer;
        }
        
        .option-item:hover {
            background: var(--bg-tertiary);
        }
        
        .option-text {
            font-size: 0.9em;
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .more-items {
            padding: 8px 12px;
            text-align: center;
            font-style: italic;
            color: var(--text-secondary);
        }
        
        .filter-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9em;
            flex: 1;
        }
        
        .btn-primary { background: var(--accent-color); color: white; }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
        
        .issues-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .panel-header {
            padding: 15px 20px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .sort-controls {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .sort-controls select {
            padding: 6px 10px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--bg-primary);
            color: var(--text-primary);
        }
        
        .sort-direction {
            width: 30px;
            height: 30px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--bg-primary);
            color: var(--text-primary);
            cursor: pointer;
        }
        
        .view-controls {
            display: flex;
            gap: 10px;
        }
        
        .view-btn {
            padding: 6px 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: var(--bg-primary);
            color: var(--text-primary);
            cursor: pointer;
        }
        
        .view-btn.active {
            background: var(--accent-color);
            color: white;
        }
        
        .issues-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--text-secondary);
            font-size: 1.1em;
        }
        
        .file-group {
            margin-bottom: 15px;
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
        }
        
        .file-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .file-name {
            font-weight: 500;
        }
        
        .issue-count {
            background: var(--accent-color);
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
        }
        
        .file-stats {
            display: flex;
            gap: 8px;
        }
        
        .file-issues {
            padding: 0;
        }
        
        .issue-item {
            padding: 15px;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.2s;
        }
        
        .issue-item:hover {
            background: var(--bg-tertiary);
        }
        
        .issue-item.exempted {
            opacity: 0.7;
            background: var(--bg-tertiary);
        }
        
        .issue-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
            flex-wrap: wrap;
        }
        
        .severity-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: 500;
        }
        
        .severity-badge.error { background: var(--error-color); color: white; }
        .severity-badge.warning { background: var(--warning-color); color: black; }
        .severity-badge.info { background: var(--info-color); color: white; }
        .severity-badge.hint { background: var(--text-secondary); color: white; }
        
        .rule-name, .location {
            font-family: 'Monaco', 'Consolas', monospace;
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
        }
        
        .fixable-badge, .exempted-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
        }
        
        .fixable-badge { background: var(--success-color); color: white; }
        .exempted-badge { background: var(--text-secondary); color: white; }
        
        .issue-message {
            margin-bottom: 10px;
            line-height: 1.5;
        }
        
        .issue-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .action-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
        }
        
        .action-btn.primary { background: var(--accent-color); color: white; }
        .action-btn.secondary { background: var(--bg-tertiary); color: var(--text-primary); }
        
        @media (max-width: 1024px) {
            .explorer-content {
                flex-direction: column;
            }
            
            .filters-panel {
                width: 100%;
                max-height: 300px;
            }
        }
    </style>`;
  }

  private getJavaScript(): string {
    return `
        const vscode = acquireVsCodeApi();
        let currentFilter = ${JSON.stringify(this.currentFilter)};
        let currentSort = ${JSON.stringify(this.currentSort)};
        
        function updateSeverityFilter(severity, checked) {
            if (checked) {
                if (!currentFilter.severity.includes(severity)) {
                    currentFilter.severity.push(severity);
                }
            } else {
                currentFilter.severity = currentFilter.severity.filter(s => s !== severity);
            }
            applyFilters();
        }
        
        function updateFileFilter(file, checked) {
            if (checked) {
                if (!currentFilter.files.includes(file)) {
                    currentFilter.files.push(file);
                }
            } else {
                currentFilter.files = currentFilter.files.filter(f => f !== file);
            }
            applyFilters();
        }
        
        function updateRuleFilter(rule, checked) {
            if (checked) {
                if (!currentFilter.rules.includes(rule)) {
                    currentFilter.rules.push(rule);
                }
            } else {
                currentFilter.rules = currentFilter.rules.filter(r => r !== rule);
            }
            applyFilters();
        }
        
        function updateShowExempted(checked) {
            currentFilter.showExempted = checked;
            applyFilters();
        }
        
        // Search input handlers
        document.getElementById('searchInput').addEventListener('input', function(e) {
            currentFilter.searchText = e.target.value;
            applyFilters();
        });
        
        function applyFilters() {
            vscode.postMessage({
                command: 'updateFilters',
                filter: currentFilter
            });
        }
        
        function updateSort() {
            const sortField = document.getElementById('sortField').value;
            currentSort.field = sortField;
            vscode.postMessage({
                command: 'updateSort',
                sort: currentSort
            });
        }
        
        function toggleSortDirection() {
            currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            vscode.postMessage({
                command: 'updateSort',
                sort: currentSort
            });
        }
        
        function clearFilters() {
            currentFilter = {
                severity: ['error', 'warning', 'info', 'hint'],
                files: [],
                rules: [],
                searchText: '',
                showExempted: false,
                showFixed: true
            };
            document.getElementById('searchInput').value = '';
            applyFilters();
        }
        
        function groupByFile() {
            currentSort.field = 'file';
            updateSort();
        }
        
        function bulkOperations() {
            const selectedIssues = Array.from(document.querySelectorAll('.issue-checkbox:checked'))
                .map(cb => cb.value);
            
            if (selectedIssues.length === 0) {
                alert('Please select issues first');
                return;
            }
            
            vscode.postMessage({
                command: 'bulkOperations',
                issueIds: selectedIssues
            });
        }
        
        function exportIssues() {
            vscode.postMessage({
                command: 'exportIssues'
            });
        }
        
        function navigateToIssue(file, line, column, range) {
            vscode.postMessage({
                command: 'navigateToIssue',
                file: file,
                line: line,
                column: column,
                range: range
            });
        }
        
        function quickFix(issueId) {
            vscode.postMessage({
                command: 'quickFix',
                issueId: issueId
            });
        }
        
        function addExemption(issueId) {
            vscode.postMessage({
                command: 'addExemption',
                issueId: issueId
            });
        }
        
        function showRuleInfo(ruleId) {
            vscode.postMessage({
                command: 'showRuleInfo',
                ruleId: ruleId
            });
        }
        
        function toggleFileGroup(file) {
            const groupId = 'issues-' + file.replace(/[^a-zA-Z0-9]/g, '-');
            const group = document.getElementById(groupId);
            const arrow = event.target.closest('.file-header').querySelector('.expand-arrow');
            
            if (group.style.display === 'none') {
                group.style.display = 'block';
                arrow.textContent = '▼';
            } else {
                group.style.display = 'none';
                arrow.textContent = '▶';
            }
        }
    `;
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'updateFilters':
        this.currentFilter = message.filter;
        this.applyFiltersAndSort();
        this.updateContent();
        break;

      case 'updateSort':
        this.currentSort = message.sort;
        this.applyFiltersAndSort();
        this.updateContent();
        break;

      case 'navigateToIssue':
        await this.navigateToIssue(
          message.file,
          message.line,
          message.column,
          message.range
        );
        break;

      case 'bulkOperations':
        await this.showBulkOperations(message.issueIds);
        break;

      case 'exportIssues':
        await this.exportIssues();
        break;

      case 'quickFix':
        await this.quickFix(message.issueId);
        break;

      case 'addExemption':
        await this.addExemption(message.issueId);
        break;

      case 'showRuleInfo':
        await this.showRuleInfo(message.ruleId);
        break;
    }
  }

  private async navigateToIssue(
    file: string,
    line: number,
    column?: number,
    range?: {
      start: { line: number; column: number };
      end: { line: number; column: number };
    }
  ): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    try {
      let fileUri: vscode.Uri;

      // Handle absolute vs relative paths
      if (file.startsWith('/') || file.includes(':')) {
        fileUri = vscode.Uri.file(file);
      } else {
        fileUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, file));
      }

      const document = await vscode.workspace.openTextDocument(fileUri);
      const editor = await vscode.window.showTextDocument(document);

      // Enhanced navigation with precise positioning
      // Note: line/column parameters are 1-based from XFI core, range is also 1-based
      if (range) {
        // Use enhanced range data for precise selection (convert 1-based to 0-based)
        const startPos = new vscode.Position(
          Math.max(0, range.start.line - 1), // Convert XFI 1-based to VSCode 0-based
          Math.max(0, range.start.column - 1) // Convert XFI 1-based to VSCode 0-based
        );
        const endPos = new vscode.Position(
          Math.max(0, range.end.line - 1), // Convert XFI 1-based to VSCode 0-based
          Math.max(0, range.end.column - 1) // Convert XFI 1-based to VSCode 0-based
        );

        const selection = new vscode.Selection(startPos, endPos);
        editor.selection = selection;
        editor.revealRange(
          selection,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );

        logger.debug('Navigated to issue with XFI range', {
          file,
          xfiRange: range,
          vscodeSelection: { startPos, endPos }
        });
      } else if (column !== undefined && column > 0) {
        // Use line and column for precise positioning (convert 1-based to 0-based)
        const position = new vscode.Position(
          Math.max(0, line - 1), // Convert XFI 1-based to VSCode 0-based
          Math.max(0, column - 1) // Convert XFI 1-based to VSCode 0-based
        );
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );

        logger.debug('Navigated to issue with XFI line and column', {
          file,
          xfiLine: line,
          xfiColumn: column,
          vscodePosition: position
        });
      } else {
        // Fallback to line-only navigation (convert 1-based to 0-based)
        const position = new vscode.Position(Math.max(0, line - 1), 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );

        logger.debug('Navigated to issue with XFI line only', {
          file,
          xfiLine: line,
          vscodePosition: position
        });
      }
    } catch (error) {
      logger.error('Failed to navigate to issue', {
        file,
        line,
        column,
        range,
        error
      });
      vscode.window.showErrorMessage(`Failed to navigate to issue: ${error}`);
    }
  }

  private async showBulkOperations(issueIds: string[]): Promise<void> {
    const action = await vscode.window.showQuickPick(
      [
        { label: 'Add Exemptions', value: 'exempt' },
        { label: 'Export Selected', value: 'export' },
        { label: 'Apply Quick Fixes', value: 'fix' }
      ],
      {
        placeHolder: `Select action for ${issueIds.length} issues`
      }
    );

    if (!action) {
      return;
    }

    switch (action.value) {
      case 'exempt':
        // Handle bulk exemptions
        vscode.window.showInformationMessage(
          `Adding exemptions for ${issueIds.length} issues`
        );
        break;
      case 'export':
        // Export selected issues
        vscode.window.showInformationMessage(
          `Exporting ${issueIds.length} issues`
        );
        break;
      case 'fix':
        // Apply fixes where possible
        vscode.window.showInformationMessage(
          `Applying fixes for ${issueIds.length} issues`
        );
        break;
    }
  }

  private async exportIssues(): Promise<void> {
    vscode.commands.executeCommand('xfidelity.exportReport');
  }

  private async quickFix(issueId: string): Promise<void> {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue) {
      return;
    }

    // This would integrate with the CodeActionProvider
    vscode.window.showInformationMessage(
      `Quick fix for ${issue.rule} - ${issue.message}`
    );
  }

  private async addExemption(issueId: string): Promise<void> {
    const issue = this.issues.find(i => i.id === issueId);
    if (!issue) {
      return;
    }

    vscode.commands.executeCommand(
      'xfidelity.addExemption',
      vscode.Uri.file(issue.file),
      new vscode.Range(issue.line || 1, 0, issue.line || 1, 0),
      issue.rule
    );
  }

  private async showRuleInfo(ruleId: string): Promise<void> {
    vscode.commands.executeCommand('xfidelity.showRuleDocumentation', ruleId);
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
