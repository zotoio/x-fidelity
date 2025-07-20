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

  constructor() {
    this.buildTreeData();
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
            id: 'control-center',
            label: 'Control Center',
            tooltip: 'Open X-Fidelity Control Center',
            iconPath: new vscode.ThemeIcon('dashboard'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.showControlCenter',
              title: 'Show Control Center'
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

      // Configuration Section
      {
        id: 'configuration',
        label: 'Configuration',
        iconPath: new vscode.ThemeIcon('tools'),
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        children: [
          {
            id: 'detect-archetype',
            label: 'Detect Archetype',
            tooltip: 'Auto-detect project archetype',
            iconPath: new vscode.ThemeIcon('search'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.detectArchetype',
              title: 'Detect Archetype'
            }
          },
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
          },
          {
            id: 'advanced-settings',
            label: 'Advanced Settings',
            tooltip: 'Open advanced configuration options',
            iconPath: new vscode.ThemeIcon('settings'),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
              command: 'xfidelity.showSettingsUI',
              title: 'Show Advanced Settings'
            }
          }
        ]
      }
    ];
  }
}
