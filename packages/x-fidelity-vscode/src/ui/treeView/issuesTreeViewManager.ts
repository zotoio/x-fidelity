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
import { logger } from '../../utils/logger';
import { getWorkspaceFolder } from '../../utils/workspaceUtils';

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
    logger.info(`IssuesTreeViewManager created for view: ${this.viewId || 'xfidelityIssuesTreeView'}`);
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
          'xfidelity.addIssueExemption',
          async (item: IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.addIssueExemption(item);
            }
          }
        )
      );

      IssuesTreeViewManager.globalDisposables.push(
        vscode.commands.registerCommand(
          'xfidelity.showIssueRuleInfo',
          async (item: IssueTreeItem) => {
            if (IssuesTreeViewManager.activeInstance) {
              await IssuesTreeViewManager.activeInstance.showIssueRuleInfo(item);
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
        logger.info(
          `🔄 Tree view received diagnostic update: ${updateInfo.totalIssues} issues across ${updateInfo.filesWithIssues} files`
        );
        //console.log(`[IssuesTreeViewManager] Diagnostic update received:`, updateInfo);
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
        logger.debug('Sample processed issues:', 
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
          totalDiagnostics: diagnostics.reduce((sum, [, diags]) => sum + diags.length, 0)
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
        logger.debug(`Diagnostic: source='${diag.source}', message='${diag.message.substring(0, 50)}...'`);
        //console.log(`[DEBUG] Found diagnostic: source='${diag.source}', message='${diag.message.substring(0, 50)}...'`);
        
        // TEMPORARILY ACCEPT ALL DIAGNOSTICS FOR DEBUGGING
        // TODO: Re-enable proper filtering once we identify the issue
        // if (diag.source !== 'X-Fidelity') {
        //   logger.warn(`🚫 Skipping diagnostic with source: '${diag.source}' (not X-Fidelity related)`);
        //   continue;
        // }
        
        logger.info(`✅ Processing diagnostic: ${diag.message.substring(0, 50)}...`);

        // Extract enhanced position data if available - use original XFI core data (1-based)
        const enhancedPos = (diag as any).enhancedPosition;
        let range:
          | {
              start: { line: number; column: number };
              end: { line: number; column: number };
            }
          | undefined = undefined;
        let line = diag.range.start.line + 1; // Convert VSCode 0-based back to 1-based for display
        let column = diag.range.start.character + 1; // Convert VSCode 0-based back to 1-based for display

        if (enhancedPos) {
          // Use original XFI core range data (1-based) for accurate display
          if (enhancedPos.originalRange) {
            range = enhancedPos.originalRange;
            line = enhancedPos.originalRange.start.line;
            column = enhancedPos.originalRange.start.column;
          }
          // Use original position data for more accurate positioning
          else if (enhancedPos.originalPosition) {
            line = enhancedPos.originalPosition.line;
            column = enhancedPos.originalPosition.column;
          }
          // Use first match range if available (original XFI core data)
          else if (
            enhancedPos.originalMatches &&
            enhancedPos.originalMatches.length > 0 &&
            enhancedPos.originalMatches[0].range
          ) {
            range = enhancedPos.originalMatches[0].range;
            line = enhancedPos.originalMatches[0].range.start.line;
            column = enhancedPos.originalMatches[0].range.start.column;
          }
          // Fallback to legacy fields (original 1-based values)
          else if ((diag as any).lineNumber) {
            line = (diag as any).lineNumber;
            column = (diag as any).columnNumber || 1;
          }
        }

        issues.push({
          id: `${uri.fsPath}-${diag.code}-${diag.range.start.line}`,
          file: vscode.workspace.asRelativePath(uri),
          rule: String(diag.code || 'unknown'),
          severity: this.mapSeverityToString(diag.severity),
          message: diag.message,
          line: line, // 1-based line number from XFI core
          column: column, // 1-based column number from XFI core
          range: range, // Original XFI core range data (1-based)
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

    // Removed bracketed issue count format for cleaner UI
    // if (stats.total > 0) {
    //   const errorCount = stats.error > 0 ? `${stats.error}E` : '';
    //   const warningCount = stats.warning > 0 ? `${stats.warning}W` : '';
    //   const counts = [errorCount, warningCount].filter(c => c).join(' ');
    //   title += ` (${stats.total}${counts ? ` - ${counts}` : ''})`;
    // }

    // Add grouping mode indicator
    const modeIndicator = mode.charAt(0).toUpperCase() + mode.slice(1);
    title += ` • ${modeIndicator}`;

    this.treeView.title = title;
    
    logger.info(`📝 Tree view title updated: '${title}' (current issues: ${this.currentIssues.length})`);
    //console.log(`[IssuesTreeViewManager] Title updated: ${title}`);
  }

  private async goToIssue(
    issueOrItem: ProcessedIssue | IssueTreeItem
  ): Promise<void> {
    try {
      // Handle undefined/null parameters
      if (!issueOrItem) {
        logger.warn('goToIssue called with undefined/null parameter');
        vscode.window.showWarningMessage('No issue data available for navigation');
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
        vscode.window.showWarningMessage('Issue missing required file or line data');
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
      if (vscode.Uri.file(issue.file).scheme === 'file') {
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
      if (issue.line) {
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
