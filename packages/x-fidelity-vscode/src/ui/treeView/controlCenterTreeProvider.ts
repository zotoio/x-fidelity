import * as vscode from 'vscode';

export interface ControlCenterTreeItem {
  readonly id: string;
  readonly label: string;
  readonly tooltip?: string;
  readonly description?: string;
  readonly contextValue?: string;
  readonly collapsibleState?: vscode.TreeItemCollapsibleState;
  readonly iconPath?: vscode.ThemeIcon;
  readonly command?: vscode.Command;
  readonly children?: ControlCenterTreeItem[];
}

/**
 * Session state for toggleable features in the control center
 * Note: sessionActive controls both diagnostics and autorun as a single toggle
 */
export interface ControlCenterSessionState {
  /** Combined session active state - controls both diagnostics and autorun */
  sessionActive: boolean;
  /** @deprecated Use sessionActive instead */
  diagnosticsEnabled: boolean;
  /** @deprecated Use sessionActive instead */
  autorunEnabled: boolean;
}

export class ControlCenterTreeProvider
  implements vscode.TreeDataProvider<ControlCenterTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ControlCenterTreeItem | undefined | null
  > = new vscode.EventEmitter<ControlCenterTreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<
    ControlCenterTreeItem | undefined | null
  > = this._onDidChangeTreeData.event;

  private treeData: ControlCenterTreeItem[] = [];

  // Session state for toggles (defaults to active/enabled)
  // This is in-memory only, so it resets to true on IDE restart
  private sessionState: ControlCenterSessionState = {
    sessionActive: true,
    diagnosticsEnabled: true, // Derived from sessionActive for backward compatibility
    autorunEnabled: true // Derived from sessionActive for backward compatibility
  };

  // Event emitter for state changes
  private _onStateChanged =
    new vscode.EventEmitter<ControlCenterSessionState>();
  readonly onStateChanged: vscode.Event<ControlCenterSessionState> =
    this._onStateChanged.event;

  constructor() {
    this.buildTreeData();
  }

  /**
   * Get current session state
   */
  getSessionState(): ControlCenterSessionState {
    return { ...this.sessionState };
  }

  /**
   * Toggle session active state (controls both diagnostics and autorun)
   * Returns the new state (true = active, false = inactive)
   */
  toggleSessionActive(): boolean {
    this.sessionState.sessionActive = !this.sessionState.sessionActive;
    // Keep legacy properties in sync
    this.sessionState.diagnosticsEnabled = this.sessionState.sessionActive;
    this.sessionState.autorunEnabled = this.sessionState.sessionActive;
    this._onStateChanged.fire(this.getSessionState());
    this.refresh();
    return this.sessionState.sessionActive;
  }

  /**
   * Check if session is active (both diagnostics and autorun enabled)
   */
  isSessionActive(): boolean {
    return this.sessionState.sessionActive;
  }

  /**
   * Toggle diagnostics (squiggly lines) enabled/disabled for current session
   * @deprecated Use toggleSessionActive instead
   */
  toggleDiagnostics(): boolean {
    return this.toggleSessionActive();
  }

  /**
   * Toggle autorun enabled/disabled for current session
   * @deprecated Use toggleSessionActive instead
   */
  toggleAutorun(): boolean {
    return this.toggleSessionActive();
  }

  /**
   * Check if diagnostics are enabled
   * @deprecated Use isSessionActive instead
   */
  isDiagnosticsEnabled(): boolean {
    return this.sessionState.sessionActive;
  }

  /**
   * Check if autorun is enabled
   * @deprecated Use isSessionActive instead
   */
  isAutorunEnabled(): boolean {
    return this.sessionState.sessionActive;
  }

  refresh(): void {
    this.buildTreeData();
    this._onDidChangeTreeData.fire(null);
  }

  getTreeItem(element: ControlCenterTreeItem): vscode.TreeItem {
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

  getChildren(
    element?: ControlCenterTreeItem
  ): Thenable<ControlCenterTreeItem[]> {
    if (!element) {
      // Root level
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
    this.treeData = [
      // Quick Actions Section
      {
        id: 'quick-actions',
        label: 'Quick Actions',
        iconPath: new vscode.ThemeIcon('zap'),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: [
          {
            id: 'run-analysis',
            label: 'Run Analysis',
            tooltip: 'Run X-Fidelity analysis on current workspace',
            iconPath: new vscode.ThemeIcon('play'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.runAnalysis',
              title: 'Run Analysis'
            }
          },
          {
            id: 'open-settings',
            label: 'Settings',
            tooltip: 'Open X-Fidelity settings',
            iconPath: new vscode.ThemeIcon('settings-gear'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.openSettings',
              title: 'Open Settings'
            }
          },
          {
            id: 'toggle-session',
            label: 'Session Active',
            tooltip: this.sessionState.sessionActive
              ? 'Click to pause X-Fidelity for this session (disables diagnostics and autorun)'
              : 'Click to resume X-Fidelity for this session (enables diagnostics and autorun)',
            description: this.sessionState.sessionActive ? 'On' : 'Off',
            iconPath: new vscode.ThemeIcon(
              this.sessionState.sessionActive ? 'check' : 'circle-slash'
            ),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.toggleSession',
              title: 'Toggle Session'
            }
          }
        ]
      },

      // Reports Section
      {
        id: 'reports',
        label: 'Reports & Analysis',
        iconPath: new vscode.ThemeIcon('graph'),
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        children: [
          {
            id: 'dashboard',
            label: 'Dashboard',
            tooltip: 'View analysis dashboard',
            iconPath: new vscode.ThemeIcon('dashboard'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.showDashboard',
              title: 'Show Dashboard'
            }
          },
          {
            id: 'report-history',
            label: 'Report History',
            tooltip: 'View historical analysis reports',
            iconPath: new vscode.ThemeIcon('history'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.showReportHistory',
              title: 'Show Report History'
            }
          },
          {
            id: 'export-report',
            label: 'Export Report',
            tooltip: 'Export current analysis report',
            iconPath: new vscode.ThemeIcon('export'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.exportReport',
              title: 'Export Report'
            }
          }
        ]
      },

      // Advanced Section (formerly Configuration)
      {
        id: 'advanced',
        label: 'Advanced',
        iconPath: new vscode.ThemeIcon('tools'),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        children: [
          {
            id: 'reset-config',
            label: 'Reset Configuration',
            tooltip: 'Reset X-Fidelity configuration to defaults',
            iconPath: new vscode.ThemeIcon('refresh'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.resetConfiguration',
              title: 'Reset Configuration'
            }
          },
          {
            id: 'reset-settings',
            label: 'Reset All Settings',
            tooltip: 'Reset all X-Fidelity settings to defaults (user & workspace)',
            iconPath: new vscode.ThemeIcon('clear-all'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.resetToDefaults',
              title: 'Reset All Settings'
            }
          }
        ]
      }
    ];
  }
}
