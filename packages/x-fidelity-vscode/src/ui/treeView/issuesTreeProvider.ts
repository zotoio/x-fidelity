import * as vscode from 'vscode';
import * as path from 'path';
import type { ProcessedIssue } from '../../types/issues';

export type GroupingMode = 'severity' | 'rule' | 'file' | 'category';

export interface IssueTreeItem {
  readonly id: string;
  readonly label: string;
  readonly tooltip?: string | vscode.MarkdownString;
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

// Virtual tree node for efficient rendering
interface VirtualTreeNode {
  id: string;
  parent?: VirtualTreeNode;
  children: VirtualTreeNode[];
  data: IssueTreeItem;
  visible: boolean;
  expanded: boolean;
}

export class IssuesTreeProvider
  implements vscode.TreeDataProvider<IssueTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    IssueTreeItem | undefined | null
  > = new vscode.EventEmitter<IssueTreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<IssueTreeItem | undefined | null> =
    this._onDidChangeTreeData.event;

  private issues: ProcessedIssue[] = [];
  private groupingMode: GroupingMode = 'severity';
  private virtualTree: VirtualTreeNode[] = [];
  private nodeMap = new Map<string, VirtualTreeNode>();

  // Performance optimization flags
  private updatePending = false;
  private lastUpdateTime = 0;
  private readonly UPDATE_DEBOUNCE_MS = 100;

  constructor() {
    this.rebuildTree();
  }

  refresh(): void {
    // Debounce updates to prevent excessive rebuilds
    if (this.updatePending) {
      return;
    }

    this.updatePending = true;
    const now = Date.now();

    if (now - this.lastUpdateTime < this.UPDATE_DEBOUNCE_MS) {
      setTimeout(() => {
        this.performRefresh();
      }, this.UPDATE_DEBOUNCE_MS);
    } else {
      this.performRefresh();
    }
  }

  private performRefresh(): void {
    //console.log(`[IssuesTreeProvider] performRefresh called with ${this.issues.length} issues`);
    this.updatePending = false;
    this.lastUpdateTime = Date.now();
    this.rebuildTree();
    //console.log(`[IssuesTreeProvider] Tree rebuilt, firing onDidChangeTreeData event`);
    this._onDidChangeTreeData.fire(null);
  }

  setIssues(issues: ProcessedIssue[]): void {
    //console.log(`[IssuesTreeProvider] setIssues called with ${issues.length} issues`);

    // Quick check if issues actually changed
    if (
      this.issues.length === issues.length &&
      this.issues.every((issue, index) => issue.id === issues[index]?.id)
    ) {
      //console.log(`[IssuesTreeProvider] No changes detected, skipping update`);
      return; // No changes, skip update
    }

    this.issues = issues;
    //console.log(`[IssuesTreeProvider] Issues updated, calling refresh()`);
    this.refresh();
  }

  setGroupingMode(mode: GroupingMode): void {
    if (this.groupingMode === mode) {
      return; // No change, skip update
    }

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
      // Root level - return visible top-level nodes
      const rootNodes = this.virtualTree
        .filter(node => node.visible)
        .map(node => node.data);
      //console.log(`[IssuesTreeProvider] getChildren(root): returning ${rootNodes.length} root nodes`);
      //console.log(`[IssuesTreeProvider] Virtual tree has ${this.virtualTree.length} total nodes`);
      return Promise.resolve(rootNodes);
    }

    // Find node in virtual tree and return visible children
    const node = this.nodeMap.get(element.id);
    if (node && node.expanded) {
      const children = node.children
        .filter(child => child.visible)
        .map(child => child.data);
      //console.log(`[IssuesTreeProvider] getChildren(${element.id}): returning ${children.length} children`);
      return Promise.resolve(children);
    }

    //console.log(`[IssuesTreeProvider] getChildren(${element.id}): no expanded node found, returning empty array`);
    return Promise.resolve([]);
  }

  private rebuildTree(): void {
    //console.log(`[IssuesTreeProvider] rebuildTree called with ${this.issues.length} issues`);

    // Clear existing tree
    this.virtualTree = [];
    this.nodeMap.clear();

    if (this.issues.length === 0) {
      //console.log(`[IssuesTreeProvider] No issues, creating 'no-issues' node`);
      const noIssuesNode = this.createVirtualNode({
        id: 'no-issues',
        label: '✅ No issues found',
        tooltip: 'Great! Your code looks good. Click to run analysis again.',
        iconPath: new vscode.ThemeIcon('check-all'),
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        command: {
          command: 'xfidelity.runAnalysis',
          title: 'Run Analysis'
        }
      });
      this.virtualTree.push(noIssuesNode);
      //console.log(`[IssuesTreeProvider] Added no-issues node to virtual tree`);
      return;
    }

    // Build tree based on grouping mode
    switch (this.groupingMode) {
      case 'severity':
        this.buildSeverityTree();
        break;
      case 'rule':
        this.buildRuleTree();
        break;
      case 'file':
        this.buildFileTree();
        break;
      case 'category':
        this.buildCategoryTree();
        break;
    }
  }

  private createVirtualNode(
    data: IssueTreeItem,
    parent?: VirtualTreeNode
  ): VirtualTreeNode {
    const node: VirtualTreeNode = {
      id: data.id,
      parent,
      children: [],
      data,
      visible: true,
      expanded:
        data.collapsibleState === vscode.TreeItemCollapsibleState.Expanded
    };

    this.nodeMap.set(data.id, node);
    return node;
  }

  private buildSeverityTree(): void {
    const severityGroups = this.groupBy(this.issues, issue => issue.severity);
    const severityOrder = ['error', 'warning', 'info', 'hint', 'exempt'];

    for (const severity of severityOrder) {
      if (!severityGroups[severity]?.length) {
        continue;
      }

      const issues = severityGroups[severity];
      const groupNode = this.createVirtualNode({
        id: `severity-${severity}`,
        label: severity.toUpperCase(),
        description: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        tooltip: `${severity.toUpperCase()}: ${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: this.getSeverityIcon(severity),
        contextValue: 'issueGroup',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        groupKey: severity,
        count: issues.length
      });

      this.addIssueChildren(groupNode, issues);
      this.virtualTree.push(groupNode);
    }
  }

  private buildRuleTree(): void {
    const ruleGroups = this.groupBy(this.issues, issue => issue.rule);
    const sortedRules = Object.keys(ruleGroups).sort();

    for (const rule of sortedRules) {
      const issues = ruleGroups[rule];
      const groupNode = this.createVirtualNode({
        id: `rule-${rule}`,
        label: rule,
        description: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        tooltip: `Rule: ${rule}\\n${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: new vscode.ThemeIcon('symbol-method'),
        contextValue: 'issueGroup',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        groupKey: rule,
        count: issues.length
      });

      this.addIssueChildren(groupNode, issues);
      this.virtualTree.push(groupNode);
    }
  }

  private buildFileTree(): void {
    const fileGroups = this.groupBy(this.issues, issue => issue.file);
    const sortedFiles = Object.keys(fileGroups).sort();

    for (const file of sortedFiles) {
      const issues = fileGroups[file];
      const groupNode = this.createVirtualNode({
        id: `file-${file}`,
        label: path.basename(file),
        description: path.dirname(file),
        tooltip: `File: ${file}\\n${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: vscode.ThemeIcon.File,
        contextValue: 'issueGroup',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        groupKey: file,
        count: issues.length
      });

      this.addIssueChildren(groupNode, issues);
      this.virtualTree.push(groupNode);
    }
  }

  private buildCategoryTree(): void {
    const categoryGroups = this.groupBy(
      this.issues,
      issue => issue.category || 'General'
    );
    const sortedCategories = Object.keys(categoryGroups).sort();

    for (const category of sortedCategories) {
      const issues = categoryGroups[category];
      const groupNode = this.createVirtualNode({
        id: `category-${category}`,
        label: category,
        description: `${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        tooltip: `Category: ${category}\\n${issues.length} issue${issues.length !== 1 ? 's' : ''}`,
        iconPath: new vscode.ThemeIcon('symbol-class'),
        contextValue: 'issueGroup',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        groupKey: category,
        count: issues.length
      });

      this.addIssueChildren(groupNode, issues);
      this.virtualTree.push(groupNode);
    }
  }

  private addIssueChildren(
    parentNode: VirtualTreeNode,
    issues: ProcessedIssue[]
  ): void {
    // Sort issues efficiently
    const sortedIssues = issues.sort((a, b) => {
      const fileCompare = a.file.localeCompare(b.file);
      return fileCompare !== 0 ? fileCompare : (a.line || 0) - (b.line || 0);
    });

    for (const issue of sortedIssues) {
      const icon = this.getSeverityIcon(issue.severity);
      const location = issue.line ? `:${issue.line}` : '';
      const fileName =
        this.groupingMode === 'file' ? '' : ` in ${path.basename(issue.file)}`;

      const issueNode = this.createVirtualNode(
        {
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
        },
        parentNode
      );

      parentNode.children.push(issueNode);
    }
  }

  private buildIssueTooltip(issue: ProcessedIssue): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    
    // ENHANCEMENT: Enable HTML support and make it trusted for better interactivity
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Title with rule and severity
    const severityIcon = this.getSeverityIcon(issue.severity);
    const severityEmoji = this.getSeverityEmoji(issue.severity);
    markdown.appendMarkdown(`**${severityEmoji} ${issue.rule}**\n\n`);

    // Issue message (main content)
    markdown.appendMarkdown(`${issue.message}\n\n`);

    // Details section
    markdown.appendMarkdown(`---\n\n`);

    // File location
    const fileName = path.basename(issue.file);
    const location = issue.line
      ? `:${issue.line}${issue.column ? `:${issue.column}` : ''}`
      : '';
    markdown.appendMarkdown(`**📁 File:** \`${fileName}${location}\`\n\n`);

    // Severity
    markdown.appendMarkdown(
      `**🔥 Severity:** ${issue.severity.toUpperCase()}\n\n`
    );

    // Category (if not general)
    if (issue.category && issue.category !== 'general') {
      markdown.appendMarkdown(`**🏷️ Category:** ${issue.category}\n\n`);
    }

    // Status indicators
    const statusItems: string[] = [];
    if (issue.fixable) {
      statusItems.push('💡 **Fixable**');
    }
    if (issue.exempted) {
      statusItems.push('⚠️ **Exempted**');
    }

    if (statusItems.length > 0) {
      markdown.appendMarkdown(`${statusItems.join(' • ')}\n\n`);
    }

    // ENHANCEMENT: Add actions section with command links
    markdown.appendMarkdown(`---\n\n`);
    markdown.appendMarkdown(`**🛠️ Actions:**\n\n`);

    // Create issue context for commands
    const issueContext = {
      message: issue.message,
      ruleId: issue.rule,
      category: issue.category,
      severity: issue.severity,
      file: issue.file,
      line: issue.line || 1,
      column: issue.column || 1,
      fixable: issue.fixable || false,
      exempted: issue.exempted || false
    };

    // ENHANCEMENT: Add Explain Issue action link
    markdown.appendMarkdown(
      `[🤔 Explain Issue](command:xfidelity.explainIssue?${encodeURIComponent(JSON.stringify(issueContext))}) • `
    );

    // ENHANCEMENT: Add Fix Issue action link (always available)
    const fixLabel = '✨ Fix Issue';
    markdown.appendMarkdown(
      `[${fixLabel}](command:xfidelity.fixIssue?${encodeURIComponent(JSON.stringify(issueContext))}) • `
    );

    // Navigate to issue action
    markdown.appendMarkdown(
      `[📍 Go To Issue](command:xfidelity.goToIssue?${encodeURIComponent(JSON.stringify(issueContext))})`
    );

    markdown.appendMarkdown(`\n\n`);

    // ENHANCEMENT: Add footer with tip about hover persistence
    markdown.appendMarkdown(`---\n\n`);
    markdown.appendMarkdown(
      `💡 *Tip: This tooltip stays open when you hover over it for easy interaction*`
    );

    return markdown;
  }

  private getSeverityIcon(severity: string): vscode.ThemeIcon {
    switch (severity) {
      case 'error':
        return new vscode.ThemeIcon(
          'error',
          new vscode.ThemeColor('list.errorForeground')
        );
      case 'warning':
        return new vscode.ThemeIcon(
          'warning',
          new vscode.ThemeColor('list.warningForeground')
        );
      case 'info':
        return new vscode.ThemeIcon(
          'info',
          new vscode.ThemeColor('list.warningForeground')
        );
      case 'hint':
        return new vscode.ThemeIcon(
          'lightbulb',
          new vscode.ThemeColor('editorLightBulb.foreground')
        );
      case 'exempt':
        return new vscode.ThemeIcon(
          'shield',
          new vscode.ThemeColor('charts.purple')
        );
      default:
        return new vscode.ThemeIcon('circle-outline');
    }
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'hint':
        return '💡';
      case 'exempt':
        return '🛡️';
      default:
        return '●';
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

  // Optimized methods for external access
  findIssueById(id: string): ProcessedIssue | undefined {
    return this.issues.find(issue => issue.id === id);
  }

  getStatistics() {
    const stats = {
      total: this.issues.length,
      error: 0,
      warning: 0,
      info: 0,
      hint: 0,
      exempt: 0,
      fixable: 0,
      exempted: 0
    };

    for (const issue of this.issues) {
      switch (issue.severity) {
        case 'error':
          stats.error++;
          break;
        case 'warning':
          stats.warning++;
          break;
        case 'info':
          stats.info++;
          break;
        case 'hint':
          stats.hint++;
          break;
        case 'exempt':
          stats.exempt++;
          break;
      }

      if (issue.fixable) {
        stats.fixable++;
      }
      if (issue.exempted) {
        stats.exempted++;
      }
    }

    return stats;
  }

  // Filter issues for large datasets
  setFilter(predicate: (issue: ProcessedIssue) => boolean): void {
    for (const node of this.nodeMap.values()) {
      if (node.data.issue) {
        node.visible = predicate(node.data.issue);
      }
    }
    this._onDidChangeTreeData.fire(null);
  }

  clearFilter(): void {
    for (const node of this.nodeMap.values()) {
      node.visible = true;
    }
    this._onDidChangeTreeData.fire(null);
  }
}
