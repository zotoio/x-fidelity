import * as vscode from 'vscode';
import * as path from 'path';
import {
  IssuesTreeProvider,
  type GroupingMode,
  type IssueTreeItem
} from './issuesTreeProvider';
import type { ProcessedIssue } from '../../types/issues';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import { ConfigManager } from '../../configuration/configManager';
import { createComponentLogger } from '../../utils/globalLogger';
import { getWorkspaceFolder } from '../../utils/workspaceUtils';
import { REPO_GLOBAL_CHECK } from '@x-fidelity/core';

const logger = createComponentLogger('IssuesTreeView');

export class IssuesTreeViewManager implements vscode.Disposable {
  private static commandsRegistered = false;
  private static globalDisposables: vscode.Disposable[] = [];
  private static activeInstance: IssuesTreeViewManager | null = null;

  private disposables: vscode.Disposable[] = [];
  private treeDataProvider: IssuesTreeProvider;
  private treeView: vscode.TreeView<IssueTreeItem>;
  private currentIssues: ProcessedIssue[] = [];

  constructor(
    private context: vscode.ExtensionContext,
    private diagnosticProvider: DiagnosticProvider,
    private configManager: ConfigManager,
    private viewId?: string
  ) {
    // Set this as the active instance
    IssuesTreeViewManager.activeInstance = this;

    // Initialize tree data provider
    this.treeDataProvider = new IssuesTreeProvider();

    // Create tree view
    this.treeView = vscode.window.createTreeView(
      this.viewId || 'xfidelityIssuesTreeView',
      {
        treeDataProvider: this.treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false
      }
    );

    // Set initial title
    this.updateTreeViewTitle();

    // Register commands
    this.registerCommands();

    // Set up event listeners
    this.setupEventListeners();

    // Load initial data
    this.refreshIssues();

    // Register debug command for manual refresh
    if (!IssuesTreeViewManager.commandsRegistered) {
      this.context.subscriptions.push(
        vscode.commands.registerCommand('xfidelity.debugRefreshTree', () => {
          logger.info('🔍 Manual tree refresh triggered');
          console.log('[DEBUG] Manual tree refresh triggered');
          if (IssuesTreeViewManager.activeInstance) {
            IssuesTreeViewManager.activeInstance.refreshIssues();
          }
        })
      );
    }

    // Add tree view to disposables
    this.disposables.push(this.treeView);

    // Debug logging for tree view creation
    logger.info(
      `IssuesTreeViewManager created for view: ${this.viewId || 'xfidelityIssuesTreeView'}`
    );
  }

  private registerCommands(): void {
    // Only register commands once globally, not per instance
    if (!IssuesTreeViewManager.commandsRegistered) {
      IssuesTreeViewManager.commandsRegistered = true;

      // Refresh command - delegate to active instance
      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand('xfidelity.refreshIssuesTree', () => {
          // Find the active tree view and refresh it
          if (IssuesTreeViewManager.activeInstance) {
            IssuesTreeViewManager.activeInstance.refreshIssues();
          }
        })
      );

      // Grouping commands - delegate to active instance
      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.issuesTreeGroupBySeverity',
          () => {
            if (IssuesTreeViewManager.activeInstance) {
              IssuesTreeViewManager.activeInstance.setGroupingMode('severity');
            }
          }
        )
      );

      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.issuesTreeGroupByRule',
          () => {
            if (IssuesTreeViewManager.activeInstance) {
              IssuesTreeViewManager.activeInstance.setGroupingMode('rule');
            }
          }
        )
      );

      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.issuesTreeGroupByFile',
          () => {
            if (IssuesTreeViewManager.activeInstance) {
              IssuesTreeViewManager.activeInstance.setGroupingMode('file');
            }
          }
        )
      );

      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.issuesTreeGroupByCategory',
          () => {
            if (IssuesTreeViewManager.activeInstance) {
              IssuesTreeViewManager.activeInstance.setGroupingMode('category');
            }
          }
        )
      );

      // Issue action commands - delegate to active instance
      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.goToIssue',
          async (issue: ProcessedIssue | IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.goToIssue(issue);
            }
          }
        )
      );

      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.showIssueRuleInfo',
          async (item: IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.showIssueRuleInfo(
                item
              );
            }
          }
        )
      );

      // ENHANCEMENT: Register tree-specific versions of the commands
      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.explainIssueFromTree',
          async (item: IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.explainIssue(item);
            }
          }
        )
      );

      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.fixIssueFromTree',
          async (item: IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.fixIssue(item);
            }
          }
        )
      );

      // ENHANCEMENT: Register fixAllIssues command for group items
      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.fixAllIssues',
          async (item: IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.fixAllIssues(item);
            }
          }
        )
      );
    }
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

    // CRITICAL FIX: Listen for diagnostic updates to refresh tree view automatically
    this.disposables.push(
      this.diagnosticProvider.onDidDiagnosticsUpdate(updateInfo => {
        try {
          logger.info(
            `🔄 Tree view received diagnostic update: ${updateInfo.totalIssues} issues across ${updateInfo.filesWithIssues} files`
          );
          //console.log(`[IssuesTreeViewManager] Diagnostic update received:`, updateInfo);
          this.refreshIssues();
        } catch (error) {
          logger.error('Failed to handle diagnostic update in tree view', error);
          // Try to refresh anyway after a short delay
          setTimeout(() => {
            try {
              this.refreshIssues();
            } catch (retryError) {
              logger.error('Failed to refresh tree view on retry', retryError);
            }
          }, 1000);
        }
      })
    );
  }

  private refreshIssues(): void {
    try {
      const diagnostics = this.diagnosticProvider.getAllDiagnostics();
      this.currentIssues = this.processDiagnostics(diagnostics);

      this.treeDataProvider.setIssues(this.currentIssues);
      this.updateTreeViewTitle();

      // Enhanced debugging
      logger.info(
        `Tree view updated with ${this.currentIssues.length} issues from ${diagnostics.length} diagnostic files`
      );

      // Debug diagnostic data
      for (const [uri, diags] of diagnostics) {
        logger.debug(`File ${uri.fsPath}: ${diags.length} diagnostics`);
      }

      // Debug processed issues
      if (this.currentIssues.length > 0) {
        logger.debug(
          'Sample processed issues:',
          this.currentIssues.slice(0, 3).map(issue => ({
            file: issue.file,
            rule: issue.rule,
            message: issue.message,
            line: issue.line
          }))
        );
      } else {
        logger.warn('No issues were processed from diagnostics', {
          diagnosticsCount: diagnostics.length,
          totalDiagnostics: diagnostics.reduce(
            (sum, [, diags]) => sum + diags.length,
            0
          )
        });
      }
    } catch (error) {
      logger.error('Failed to refresh issues tree view', error);
      vscode.window.showErrorMessage(
        'Failed to refresh X-Fidelity issues tree view'
      );
    }
  }

  private processDiagnostics(
    diagnostics: [vscode.Uri, vscode.Diagnostic[]][]
  ): ProcessedIssue[] {
    const issues: ProcessedIssue[] = [];

    for (const [uri, diags] of diagnostics) {
      logger.debug(`Processing ${diags.length} diagnostics for ${uri.fsPath}`);

      for (const diag of diags) {
        logger.debug(
          `Diagnostic: source='${diag.source}', message='${diag.message.substring(0, 50)}...'`
        );

        // Filter for X-Fidelity diagnostics
        if (diag.source !== 'X-Fidelity') {
          continue;
        }

        logger.info(
          `✅ Processing diagnostic: ${diag.message.substring(0, 50)}...`
        );

        // Use simple VSCode range data (convert back to 1-based for display)
        let line = diag.range.start.line + 1;
        let column = diag.range.start.character + 1;

        // Check if this issue was originally marked as exempt
        const originalLevel = (diag as any).originalLevel || null;
        const isExempted = originalLevel === 'exempt';

        // For exempted issues, adjust severity display
        let displaySeverity = this.mapSeverityToString(diag.severity);
        if (isExempted) {
          displaySeverity = 'exempt';
        }

        issues.push({
          id: `${uri.fsPath}-${diag.code}-${diag.range.start.line}`,
          file: vscode.workspace.asRelativePath(uri),
          rule: String(diag.code || 'unknown'),
          severity: displaySeverity,
          message: diag.message,
          line: line,
          column: column,
          category: (diag as any).category || 'general',
          fixable: (diag as any).fixable || false,
          exempted: isExempted,
          dateFound: Date.now()
        });
      }
    }

    logger.debug(`Processed ${issues.length} issues for tree view`);
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

    vscode.window.showInformationMessage(
      `X-Fidelity issues grouped by ${mode}`
    );
  }

  private updateTreeViewTitle(): void {
    const stats = this.treeDataProvider.getStatistics();
    const mode = this.treeDataProvider.getGroupingMode();

    let title = 'X-Fidelity Issues';

    logger.info(`📊 Tree view statistics: ${JSON.stringify(stats)}`);
    //console.log(`[IssuesTreeViewManager] Tree statistics:`, stats);

    // Show issue counts in title
    if (stats.total > 0) {
      const counts: string[] = [];
      if (stats.error > 0) {
        counts.push(`${stats.error}E`);
      }
      if (stats.warning > 0) {
        counts.push(`${stats.warning}W`);
      }
      if (stats.info > 0) {
        counts.push(`${stats.info}I`);
      }
      if (stats.exempt > 0) {
        counts.push(`${stats.exempt}X`);
      }
      if (stats.hint > 0) {
        counts.push(`${stats.hint}H`);
      }

      const countString =
        counts.length > 0 ? ` (${counts.join(' ')})` : ` (${stats.total})`;
      //title += countString;
    }

    // Add grouping mode indicator
    const modeIndicator = mode.charAt(0).toUpperCase() + mode.slice(1);
    title += ` • ${modeIndicator}`;

    this.treeView.title = title;

    logger.info(
      `📝 Tree view title updated: '${title}' (current issues: ${this.currentIssues.length})`
    );
    //console.log(`[IssuesTreeViewManager] Title updated: ${title}`);
  }

  private async goToIssue(
    issueOrItem: ProcessedIssue | IssueTreeItem
  ): Promise<void> {
    try {
      // Handle undefined/null parameters
      if (!issueOrItem) {
        logger.warn('goToIssue called with undefined/null parameter');
        vscode.window.showWarningMessage(
          'No issue data available for navigation'
        );
        return;
      }

      let issue: ProcessedIssue;

      if ('issue' in issueOrItem && issueOrItem.issue) {
        issue = issueOrItem.issue;
      } else if ('id' in issueOrItem && 'file' in issueOrItem) {
        issue = issueOrItem as ProcessedIssue;
      } else {
        logger.warn('Invalid issue data for navigation', { issueOrItem });
        vscode.window.showWarningMessage('Invalid issue data for navigation');
        return;
      }

      // Validate issue data
      if (!issue.file || !issue.line) {
        logger.warn('Issue missing required file or line data', { issue });
        vscode.window.showWarningMessage(
          'Issue missing required file or line data'
        );
        return;
      }

      // Get the workspace folder
      const workspaceFolder = getWorkspaceFolder();
      if (!workspaceFolder) {
        vscode.window.showWarningMessage('No workspace folder found');
        return;
      }

      // Resolve file path
      let filePath: string;
      if (path.isAbsolute(issue.file)) {
        filePath = issue.file;
      } else {
        filePath = vscode.Uri.file(
          path.join(workspaceFolder.uri.fsPath, issue.file)
        ).fsPath;
      }

      const uri = vscode.Uri.file(filePath);

      // Open the document
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // Navigate to the issue location
      if (issue.file === REPO_GLOBAL_CHECK) {
        // If the file is REPO_GLOBAL_CHECK, open the markdown report
        const markdownUri = vscode.Uri.file(
          path.join(workspaceFolder.uri.fsPath, '.xfiResults', 'XFI_RESULT.md')
        );

        try {
          const markdownDocument =
            await vscode.workspace.openTextDocument(markdownUri);
          await vscode.window.showTextDocument(markdownDocument);
          logger.debug('Navigated to global check report', {
            file: issue.file
          });
        } catch (error) {
          logger.warn(
            'Failed to open global check report, trying to show error details',
            { error }
          );
          vscode.window.showWarningMessage(
            `Global check report not found. Issue: ${issue.message}`
          );
        }
      } else if (issue.line) {
        // Issue line/column are 1-based from XFI core, convert to 0-based for VSCode
        const line = Math.max(0, issue.line - 1);
        const column = Math.max(0, (issue.column || 1) - 1);

        let startPos = new vscode.Position(line, column);
        let endPos = startPos;

        // If we have enhanced range data, use it for more precise selection
        if (issue.range) {
          const startLine = Math.max(0, issue.range.start.line - 1); // Convert 1-based to 0-based
          const startCol = Math.max(0, issue.range.start.column - 1); // Convert 1-based to 0-based
          const endLine = Math.max(0, issue.range.end.line - 1); // Convert 1-based to 0-based
          const endCol = Math.max(0, issue.range.end.column - 1); // Convert 1-based to 0-based

          startPos = new vscode.Position(startLine, startCol);
          endPos = new vscode.Position(endLine, endCol);
        }

        const range = new vscode.Range(startPos, endPos);

        editor.selection = new vscode.Selection(startPos, endPos);
        editor.revealRange(
          range,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        );

        // Highlight the range briefly
        const decorationType = vscode.window.createTextEditorDecorationType({
          backgroundColor: new vscode.ThemeColor(
            'editor.findMatchHighlightBackground'
          ),
          isWholeLine:
            startPos.line === endPos.line &&
            startPos.character === endPos.character
        });

        editor.setDecorations(decorationType, [range]);

        setTimeout(() => {
          decorationType.dispose();
        }, 2000);

        logger.debug('Navigated to issue', {
          file: issue.file,
          xfiLine: issue.line,
          xfiColumn: issue.column,
          vscodeRange: { startPos, endPos },
          hasEnhancedRange: !!issue.range
        });
      }
    } catch (error) {
      logger.error('Failed to navigate to issue', {
        error,
        issue: issueOrItem
      });
      vscode.window.showErrorMessage(`Failed to navigate to issue: ${error}`);
    }
  }

  private async showIssueRuleInfo(item: IssueTreeItem): Promise<void> {
    if (!item || !item.issue) {
      vscode.window.showWarningMessage('No issue data available for rule info');
      return;
    }

    try {
      // Use the existing rule documentation command
      await vscode.commands.executeCommand(
        'xfidelity.showRuleDocumentation',
        item.issue.rule
      );
    } catch (error) {
      logger.error('Failed to show rule info', error);
      vscode.window.showErrorMessage(
        `Failed to show rule information: ${error}`
      );
    }
  }

  private async explainIssue(item: IssueTreeItem): Promise<void> {
    if (!item || !item.issue) {
      vscode.window.showWarningMessage('No issue data available to explain');
      return;
    }

    try {
      vscode.window.showInformationMessage(
        `Explain Issue: ${item.issue.rule} - This feature will provide detailed explanations about the issue.`
      );
    } catch (error) {
      logger.error('Failed to explain issue', error);
      vscode.window.showErrorMessage(`Failed to explain issue: ${error}`);
    }
  }

  private async fixIssue(item: IssueTreeItem): Promise<void> {
    if (!item || !item.issue) {
      vscode.window.showWarningMessage('No issue data available to fix');
      return;
    }

    try {
      vscode.window.showInformationMessage(
        `✨ Fix Issue: ${item.issue.rule} - This feature will provide automated fixes for the issue.`
      );
    } catch (error) {
      logger.error('Failed to fix issue', error);
      vscode.window.showErrorMessage(`Failed to fix issue: ${error}`);
    }
  }

  private async fixAllIssues(item: IssueTreeItem): Promise<void> {
    if (!item || (!item.groupKey && !item.count)) {
      vscode.window.showWarningMessage('No group data available to fix all issues');
      return;
    }

    try {
      // Find all child issues for this group
      const groupIssues = this.getChildIssuesForGroup(item);
      
      if (groupIssues.length === 0) {
        vscode.window.showInformationMessage('No issues found in this group');
        return;
      }

      const totalCount = groupIssues.length;

      // Show confirmation dialog - ignore fixable flag and ask about ALL issues
      const action = await vscode.window.showInformationMessage(
        `✨ Fix All Issues in "${item.label}"?\n\nThis will attempt to fix all ${totalCount} issue${totalCount !== 1 ? 's' : ''} in this group.\n\nNote: Some issues may not have automated fixes available, but the system will attempt to fix them anyway.`,
        { modal: true },
        'Fix All',
        'Cancel'
      );

      if (action === 'Fix All') {
        // Pass ALL issues in the group to the fix command (not just fixable ones)
        vscode.window.showInformationMessage(
          `✨ Attempting to fix all ${totalCount} issue${totalCount !== 1 ? 's' : ''} in group "${item.label}" - This feature will provide automated fixes for all issues in the group.`
        );
        
        // TODO: Here you would call the actual fix implementation with all groupIssues
        // For now, we're just showing the message as per the existing pattern
        logger.info(`Attempting to fix all ${totalCount} issues in group: ${item.label}`, {
          groupKey: item.groupKey,
          issueIds: groupIssues.map(issue => issue.id)
        });
      }
    } catch (error) {
      logger.error('Failed to fix all issues', error);
      vscode.window.showErrorMessage(`Failed to fix all issues: ${error}`);
    }
  }

  private getChildIssuesForGroup(groupItem: IssueTreeItem): ProcessedIssue[] {
    if (!groupItem.groupKey) {
      return [];
    }

    // Filter current issues based on the group type and key
    const groupKey = groupItem.groupKey;
    const groupId = groupItem.id;

    if (groupId.startsWith('severity-')) {
      return this.currentIssues.filter(issue => issue.severity === groupKey);
    } else if (groupId.startsWith('rule-')) {
      return this.currentIssues.filter(issue => issue.rule === groupKey);
    } else if (groupId.startsWith('file-')) {
      return this.currentIssues.filter(issue => issue.file === groupKey);
    } else if (groupId.startsWith('category-')) {
      return this.currentIssues.filter(issue => (issue.category || 'General') === groupKey);
    }

    return [];
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
    // Clear active instance if this is the active one
    if (IssuesTreeViewManager.activeInstance === this) {
      IssuesTreeViewManager.activeInstance = null;
    }

    this.disposables.forEach(d => d.dispose());
  }

  static disposeGlobalCommands(): void {
    IssuesTreeViewManager.globalDisposables.forEach(d => d.dispose());
    IssuesTreeViewManager.globalDisposables = [];
    IssuesTreeViewManager.commandsRegistered = false;
  }
}
