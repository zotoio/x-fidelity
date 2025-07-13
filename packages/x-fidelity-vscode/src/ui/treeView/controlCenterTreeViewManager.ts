import * as vscode from 'vscode';
import {
  ControlCenterTreeProvider,
  type ControlCenterTreeItem
} from './controlCenterTreeProvider';
import { logger } from '../../utils/logger';

export class ControlCenterTreeViewManager implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  private treeDataProvider: ControlCenterTreeProvider;
  private treeView: vscode.TreeView<ControlCenterTreeItem>;

  constructor(
    private context: vscode.ExtensionContext,
    private viewId?: string
  ) {
    // Initialize tree data provider
    this.treeDataProvider = new ControlCenterTreeProvider();

    // Create tree view
    this.treeView = vscode.window.createTreeView(
      this.viewId || 'xfidelityControlCenterView',
      {
        treeDataProvider: this.treeDataProvider,
        showCollapseAll: true,
        canSelectMany: false
      }
    );

    // Set initial title
    this.treeView.title = 'Control Center';

    // Set up event listeners
    this.setupEventListeners();

    // Add tree view to disposables
    this.disposables.push(this.treeView);

    // Debug logging for tree view creation
    logger.info(
      `ControlCenterTreeViewManager created for view: ${this.viewId || 'xfidelityControlCenterView'}`
    );
  }

  private setupEventListeners(): void {
    // Listen for tree view visibility changes
    this.disposables.push(
      this.treeView.onDidChangeVisibility(e => {
        if (e.visible) {
          // Refresh when tree view becomes visible
          this.refresh();
        }
      })
    );
  }

  public refresh(): void {
    try {
      this.treeDataProvider.refresh();
      logger.debug('Control center tree view refreshed');
    } catch (error) {
      logger.error('Failed to refresh control center tree view', error);
      vscode.window.showErrorMessage(
        'Failed to refresh X-Fidelity control center'
      );
    }
  }

  // Public methods for external use
  public getTreeView(): vscode.TreeView<ControlCenterTreeItem> {
    return this.treeView;
  }

  public reveal(item: ControlCenterTreeItem): void {
    this.treeView.reveal(item, { expand: true, focus: true, select: true });
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
