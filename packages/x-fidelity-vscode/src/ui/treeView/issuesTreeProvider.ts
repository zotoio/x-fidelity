import * as vscode from 'vscode';
import * as path from 'path';
import type { ProcessedIssue } from '../panels/issueDetailsPanel';

export type GroupingMode = 'severity' | 'rule' | 'file' | 'category';

export interface IssueTreeItem {
  readonly id: string;
  readonly label: string;
  readonly tooltip?: string;
  readonly description?: string;
  readonly contextValue?: string;
  readonly collapsibleState?: vscode.TreeItemCollapsibleState;
  readonly iconPath?: vscode.ThemeIcon;
  readonly command?: vscode.Command;
  readonly children?: IssueTreeItem[];
  readonly issue?: ProcessedIssue;
  readonly groupKey?: string;
  readonly count?: number;
}

export class IssuesTreeProvider implements vscode.TreeDataProvider<IssueTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<IssueTreeItem | undefined | null | void> = new vscode.EventEmitter<IssueTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<IssueTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  private issues: ProcessedIssue[] = [];
  private groupingMode: GroupingMode = 'severity';
  private treeData: IssueTreeItem[] = [];

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.buildTreeData();
    this._onDidChangeTreeData.fire();
  }

  setIssues(issues: ProcessedIssue[]): void {
    this.issues = issues;
    this.refresh();
  }

  setGroupingMode(mode: GroupingMode): void {
    this.groupingMode = mode;
    this.refresh();
  }

  getGroupingMode(): GroupingMode {
    return this.groupingMode;
  }

  getTreeItem(element: IssueTreeItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState);
    
    item.id = element.id;
    item.tooltip = element.tooltip;
    item.description = element.description;
    item.contextValue = element.contextValue;
    if (element.iconPath) {
      item.iconPath = element.iconPath;
    }
    item.command = element.command;

    return item;
  }

  getChildren(element?: IssueTreeItem): Thenable<IssueTreeItem[]> {
    if (!element) {
      // Root level - return top-level groups or issues
      return Promise.resolve(this.treeData);
    } else if (element.children) {
      // Return children of a group
      return Promise.resolve(element.children);
    } else {
      // Leaf node - no children
      return Promise.resolve([]);
    }
  }

  private buildTreeData(): void {
    if (this.issues.length === 0) {
      this.treeData = [{
        id: 'no-issues',
        label: '✅ No issues found',
        tooltip: 'Great! Your code looks good. Click to run analysis again.',
        iconPath: new vscode.ThemeIcon('check-all'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
          command: 'xfidelity.runAnalysis',
          title: 'Run Analysis'
        }
      }];
      return;
    }

    switch (this.groupingMode) {
      case 'severity':
        this.treeData = this.buildSeverityTree();
        break;
      case 'rule':
        this.treeData = this.buildRuleTree();
        break;
      case 'file':
        this.treeData = this.buildFileTree();
        break;
      case 'category':
        this.treeData = this.buildCategoryTree();
        break;
      default:
        this.treeData = this.buildSeverityTree();
    }
  }

  private buildSeverityTree(): IssueTreeItem[] {
    const severityGroups = this.groupBy(this.issues, issue => issue.severity);
    const severityOrder = ['error', 'warning', 'info', 'hint'];
    
    return severityOrder
      .filter(severity => severityGroups[severity]?.length > 0)
      .map(severity => {
        const issues = severityGroups[severity];
        const icon = this.getSeverityIcon(severity);
        
        return {
          id: `severity-${severity}`,
          label: severity.toUpperCase(),
          description: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
          tooltip: `${severity.toUpperCase()}: ${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
          iconPath: icon,
          collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
          children: this.buildIssueItems(issues),
          groupKey: severity,
          count: issues.length
        };
      });
  }

  private buildRuleTree(): IssueTreeItem[] {
    const ruleGroups = this.groupBy(this.issues, issue => issue.rule);
    
    return Object.entries(ruleGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rule, issues]) => ({
        id: `rule-${rule}`,
        label: rule,
        description: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        tooltip: `Rule: ${rule}\n${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: new vscode.ThemeIcon('symbol-method'),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: this.buildIssueItems(issues),
        groupKey: rule,
        count: issues.length
      }));
  }

  private buildFileTree(): IssueTreeItem[] {
    const fileGroups = this.groupBy(this.issues, issue => issue.file);
    
    return Object.entries(fileGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([file, issues]) => ({
        id: `file-${file}`,
        label: path.basename(file),
        description: path.dirname(file),
        tooltip: `File: ${file}\n${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: vscode.ThemeIcon.File,
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: this.buildIssueItems(issues),
        groupKey: file,
        count: issues.length
      }));
  }

  private buildCategoryTree(): IssueTreeItem[] {
    const categoryGroups = this.groupBy(this.issues, issue => issue.category || 'General');
    
    return Object.entries(categoryGroups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, issues]) => ({
        id: `category-${category}`,
        label: category,
        description: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        tooltip: `Category: ${category}\n${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: new vscode.ThemeIcon('symbol-class'),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: this.buildIssueItems(issues),
        groupKey: category,
        count: issues.length
      }));
  }

  private buildIssueItems(issues: ProcessedIssue[]): IssueTreeItem[] {
    return issues
      .sort((a, b) => {
        // Sort by file first, then by line number
        const fileCompare = a.file.localeCompare(b.file);
        if (fileCompare !== 0) return fileCompare;
        
        return (a.line || 0) - (b.line || 0);
      })
      .map(issue => {
        const icon = this.getSeverityIcon(issue.severity);
        const location = issue.line ? `:${issue.line}` : '';
        const fileName = this.groupingMode === 'file' ? '' : ` in ${path.basename(issue.file)}`;
        
        return {
          id: issue.id,
          label: issue.message,
          description: `${issue.rule}${fileName}${location}`,
          tooltip: this.buildIssueTooltip(issue),
          iconPath: icon,
          contextValue: 'issue',
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          command: {
            command: 'xfidelity.goToIssue',
            title: 'Go to Issue',
            arguments: [issue]
          },
          issue: issue
        };
      });
  }

  private buildIssueTooltip(issue: ProcessedIssue): string {
    const parts = [
      `Rule: ${issue.rule}`,
      `Severity: ${issue.severity.toUpperCase()}`,
      `File: ${issue.file}`
    ];
    
    if (issue.line) {
      parts.push(`Line: ${issue.line}${issue.column ? `, Column: ${issue.column}` : ''}`);
    }
    
    if (issue.category && issue.category !== 'general') {
      parts.push(`Category: ${issue.category}`);
    }
    
    if (issue.fixable) {
      parts.push('✓ Fixable');
    }
    
    if (issue.exempted) {
      parts.push('⚠ Exempted');
    }
    
    parts.push('', issue.message);
    
    return parts.join('\n');
  }

  private getSeverityIcon(severity: string): vscode.ThemeIcon {
    switch (severity.toLowerCase()) {
      case 'error':
        return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
      case 'warning':
        return new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
      case 'info':
        return new vscode.ThemeIcon('info', new vscode.ThemeColor('notificationsInfoIcon.foreground'));
      case 'hint':
        return new vscode.ThemeIcon('lightbulb', new vscode.ThemeColor('editorLightBulb.foreground'));
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }

  private groupBy<T, K extends string | number>(
    array: T[],
    keyGetter: (item: T) => K
  ): Record<K, T[]> {
    const result = {} as Record<K, T[]>;
    
    for (const item of array) {
      const key = keyGetter(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
    }
    
    return result;
  }

  // Method to find issue by ID (useful for commands)
  findIssueById(id: string): ProcessedIssue | undefined {
    return this.issues.find(issue => issue.id === id);
  }

  // Method to get statistics
  getStatistics() {
    const stats = {
      total: this.issues.length,
      error: 0,
      warning: 0,
      info: 0,
      hint: 0,
      fixable: 0,
      exempted: 0
    };

    for (const issue of this.issues) {
      switch (issue.severity) {
        case 'error': stats.error++; break;
        case 'warning': stats.warning++; break;
        case 'info': stats.info++; break;
        case 'hint': stats.hint++; break;
      }
      
      if (issue.fixable) stats.fixable++;
      if (issue.exempted) stats.exempted++;
    }

    return stats;
  }
} 