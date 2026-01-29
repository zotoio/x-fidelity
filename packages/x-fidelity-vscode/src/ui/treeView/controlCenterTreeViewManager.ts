import * as vscode from 'vscode';

import {
  ControlCenterTreeProvider,
  type ControlCenterTreeItem,
  type ControlCenterSessionState
} from './controlCenterTreeProvider';

import { createComponentLogger } from '../../utils/globalLogger';

const logger = createComponentLogger('ControlCenter');

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

  /**
   * Get the tree data provider for accessing toggle state and methods
   */
  public getProvider(): ControlCenterTreeProvider {
    return this.treeDataProvider;
  }

  /**
   * Get current session state for toggles
   */
  public getSessionState(): ControlCenterSessionState {
    return this.treeDataProvider.getSessionState();
  }

  /**
   * Event for when session state changes (diagnostics/autorun toggles)
   */
  public get onStateChanged(): vscode.Event<ControlCenterSessionState> {
    return this.treeDataProvider.onStateChanged;
  }

  /**
   * Toggle session active state (controls both diagnostics and autorun)
   * Returns the new state (true = active, false = inactive)
   */
  public toggleSessionActive(): boolean {
    return this.treeDataProvider.toggleSessionActive();
  }

  /**
   * Check if session is active (both diagnostics and autorun enabled)
   */
  public isSessionActive(): boolean {
    return this.treeDataProvider.isSessionActive();
  }

  /**
   * Toggle diagnostics display for current session
   * @deprecated Use toggleSessionActive instead
   */
  public toggleDiagnostics(): boolean {
    return this.treeDataProvider.toggleDiagnostics();
  }

  /**
   * Toggle autorun for current session
   * @deprecated Use toggleSessionActive instead
   */
  public toggleAutorun(): boolean {
    return this.treeDataProvider.toggleAutorun();
  }

  /**
   * Check if diagnostics are currently enabled
   * @deprecated Use isSessionActive instead
   */
  public isDiagnosticsEnabled(): boolean {
    return this.treeDataProvider.isDiagnosticsEnabled();
  }

  /**
   * Check if autorun is currently enabled
   * @deprecated Use isSessionActive instead
   */
  public isAutorunEnabled(): boolean {
    return this.treeDataProvider.isAutorunEnabled();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
