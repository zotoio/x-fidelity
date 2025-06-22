import * as vscode from 'vscode';
import { IssuesTreeProvider, type GroupingMode, type IssueTreeItem } from './issuesTreeProvider';
import type { ProcessedIssue } from '../panels/issueDetailsPanel';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import { ConfigManager } from '../../configuration/configManager';
import { logger } from '../../utils/logger';

export class IssuesTreeViewManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private treeDataProvider: IssuesTreeProvider;
  private treeView: vscode.TreeView<IssueTreeItem>;
  private currentIssues: ProcessedIssue[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private diagnosticProvider: DiagnosticProvider,
    private configManager: ConfigManager
  ) {
    // Initialize tree data provider
    this.treeDataProvider = new IssuesTreeProvider();
    
    // Create tree view
    this.treeView = vscode.window.createTreeView('xfidelityIssuesTreeView', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
      canSelectMany: false
    });

    // Set initial title
    this.updateTreeViewTitle();

    // Register commands
    this.registerCommands();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load initial data
    this.refreshIssues();

    // Add tree view to disposables
    this.disposables.push(this.treeView);
  }

  private registerCommands(): void {
    // Refresh command
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.refreshIssuesTree', () => {
        this.refreshIssues();
      })
    );

    // Grouping commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.issuesTreeGroupBySeverity', () => {
        this.setGroupingMode('severity');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.issuesTreeGroupByRule', () => {
        this.setGroupingMode('rule');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.issuesTreeGroupByFile', () => {
        this.setGroupingMode('file');
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.issuesTreeGroupByCategory', () => {
        this.setGroupingMode('category');
      })
    );

    // Issue action commands
    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.goToIssue', async (issue: ProcessedIssue | IssueTreeItem) => {
        await this.goToIssue(issue);
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.addIssueExemption', async (item: IssueTreeItem) => {
        await this.addIssueExemption(item);
      })
    );

    this.disposables.push(
      vscode.commands.registerCommand('xfidelity.showIssueRuleInfo', async (item: IssueTreeItem) => {
        await this.showIssueRuleInfo(item);
      })
    );
  }

  private setupEventListeners(): void {
    // Listen for tree view selection changes
    this.disposables.push(
      this.treeView.onDidChangeSelection(e => {
        if (e.selection.length > 0) {
          const selected = e.selection[0];
          if (selected.issue) {
            // Auto-navigate to selected issue
            this.goToIssue(selected.issue);
          }
        }
      })
    );

    // Listen for tree view visibility changes
    this.disposables.push(
      this.treeView.onDidChangeVisibility(e => {
        if (e.visible) {
          // Refresh when tree view becomes visible
          this.refreshIssues();
        }
      })
    );

    // Listen for configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.refreshIssues();
      })
    );
  }

  private refreshIssues(): void {
    try {
      const diagnostics = this.diagnosticProvider.getAllDiagnostics();
      this.currentIssues = this.processDiagnostics(diagnostics);
      
      this.treeDataProvider.setIssues(this.currentIssues);
      this.updateTreeViewTitle();
      
      logger.debug(`Tree view updated with ${this.currentIssues.length} issues`);
    } catch (error) {
      logger.error('Failed to refresh issues tree view', error);
      vscode.window.showErrorMessage('Failed to refresh X-Fidelity issues tree view');
    }
  }

  private processDiagnostics(diagnostics: [vscode.Uri, vscode.Diagnostic[]][]): ProcessedIssue[] {
    const issues: ProcessedIssue[] = [];
    
    for (const [uri, diags] of diagnostics) {
      for (const diag of diags) {
        if (diag.source !== 'X-Fidelity') continue;
        
        // Extract enhanced position data if available
        const enhancedPos = (diag as any).enhancedPosition;
        let range = null;
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
          else if (enhancedPos.matches && enhancedPos.matches.length > 0 && enhancedPos.matches[0].range) {
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

  private setGroupingMode(mode: GroupingMode): void {
    this.treeDataProvider.setGroupingMode(mode);
    this.updateTreeViewTitle();
    
    vscode.window.showInformationMessage(`X-Fidelity issues grouped by ${mode}`);
  }

  private updateTreeViewTitle(): void {
    const stats = this.treeDataProvider.getStatistics();
    const mode = this.treeDataProvider.getGroupingMode();
    
    let title = 'X-Fidelity Issues';
    
    if (stats.total > 0) {
      const errorCount = stats.error > 0 ? `${stats.error}E` : '';
      const warningCount = stats.warning > 0 ? `${stats.warning}W` : '';
      const counts = [errorCount, warningCount].filter(c => c).join(' ');
      
      title += ` (${stats.total}${counts ? ` - ${counts}` : ''})`;
    }
    
    // Add grouping mode indicator
    const modeIndicator = mode.charAt(0).toUpperCase() + mode.slice(1);
    title += ` • ${modeIndicator}`;
    
    this.treeView.title = title;
  }

  private async goToIssue(issueOrItem: ProcessedIssue | IssueTreeItem): Promise<void> {
    try {
      let issue: ProcessedIssue;
      
      if ('issue' in issueOrItem && issueOrItem.issue) {
        issue = issueOrItem.issue;
      } else if ('id' in issueOrItem && 'file' in issueOrItem) {
        issue = issueOrItem as ProcessedIssue;
      } else {
        logger.warn('Invalid issue data for navigation');
        return;
      }

      // Get the workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder found');
        return;
      }

      // Resolve file path
      let filePath: string;
      if (vscode.Uri.file(issue.file).scheme === 'file') {
        filePath = issue.file;
      } else {
        filePath = vscode.Uri.joinPath(workspaceFolder.uri, issue.file).fsPath;
      }

      const uri = vscode.Uri.file(filePath);
      
      // Open the document
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);
      
      // Navigate to the issue location
      if (issue.line) {
        const line = Math.max(0, issue.line - 1); // Convert to 0-based
        const column = Math.max(0, (issue.column || 1) - 1); // Convert to 0-based
        
        const position = new vscode.Position(line, column);
        const range = new vscode.Range(position, position);
        
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        
        // Highlight the line briefly
        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
          isWholeLine: true
        });
        
        editor.setDecorations(decorationType, [range]);
        
        setTimeout(() => {
          decorationType.dispose();
        }, 2000);
      }
    } catch (error) {
      logger.error('Failed to navigate to issue', { error, issue: issueOrItem });
      vscode.window.showErrorMessage(`Failed to navigate to issue: ${error}`);
    }
  }

  private async addIssueExemption(item: IssueTreeItem): Promise<void> {
    if (!item.issue) {
      vscode.window.showWarningMessage('No issue data available for exemption');
      return;
    }

    try {
      // Use the existing exemption command
      await vscode.commands.executeCommand('xfidelity.addExemption', {
        file: item.issue.file,
        rule: item.issue.rule,
        line: item.issue.line
      });
    } catch (error) {
      logger.error('Failed to add exemption', error);
      vscode.window.showErrorMessage(`Failed to add exemption: ${error}`);
    }
  }

  private async showIssueRuleInfo(item: IssueTreeItem): Promise<void> {
    if (!item.issue) {
      vscode.window.showWarningMessage('No issue data available for rule info');
      return;
    }

    try {
      // Use the existing rule documentation command
      await vscode.commands.executeCommand('xfidelity.showRuleDocumentation', item.issue.rule);
    } catch (error) {
      logger.error('Failed to show rule info', error);
      vscode.window.showErrorMessage(`Failed to show rule information: ${error}`);
    }
  }

  // Public methods for external use
  public getTreeView(): vscode.TreeView<IssueTreeItem> {
    return this.treeView;
  }

  public getCurrentIssues(): ProcessedIssue[] {
    return [...this.currentIssues]; // Return copy
  }

  public getStatistics() {
    return this.treeDataProvider.getStatistics();
  }

  public reveal(item: IssueTreeItem): void {
    this.treeView.reveal(item, { expand: true, focus: true, select: true });
  }

  public refresh(): void {
    this.refreshIssues();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
} 