// Unit tests for ControlCenterTreeProvider
jest.mock('vscode', () => ({
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  TreeItem: class MockTreeItem {
    id?: string;
    tooltip?: string;
    description?: string;
    contextValue?: string;
    iconPath?: any;
    command?: any;
    constructor(public label: string, public collapsibleState?: number) {}
  },
  ThemeIcon: class MockThemeIcon {
    constructor(public id: string, public color?: any) {}
  },
  EventEmitter: class MockEventEmitter {
    private listeners: Array<(e: any) => void> = [];
    fire = jest.fn((e: any) => {
      this.listeners.forEach(l => l(e));
    });
    event = jest.fn((listener: (e: any) => void) => {
      this.listeners.push(listener);
      return { dispose: jest.fn() };
    });
    dispose = jest.fn();
  }
}));

import {
  ControlCenterTreeProvider,
  ControlCenterTreeItem
} from '../../ui/treeView/controlCenterTreeProvider';

describe('ControlCenterTreeProvider', () => {
  let provider: ControlCenterTreeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new ControlCenterTreeProvider();
  });

  describe('constructor', () => {
    it('should initialize with default session state', () => {
      const state = provider.getSessionState();
      
      expect(state.sessionActive).toBe(true);
      expect(state.diagnosticsEnabled).toBe(true);
      expect(state.autorunEnabled).toBe(true);
    });

    it('should build tree data on initialization', async () => {
      const children = await provider.getChildren();
      
      // Should have main sections
      expect(children.length).toBeGreaterThan(0);
      expect(children.some(c => c.id === 'quick-actions')).toBe(true);
      expect(children.some(c => c.id === 'reports')).toBe(true);
      expect(children.some(c => c.id === 'advanced')).toBe(true);
    });
  });

  describe('getSessionState', () => {
    it('should return a copy of session state', () => {
      const state1 = provider.getSessionState();
      const state2 = provider.getSessionState();
      
      // Should be equal but not the same object
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });

  describe('toggleSessionActive', () => {
    it('should toggle session active state from true to false', () => {
      expect(provider.isSessionActive()).toBe(true);
      
      const newState = provider.toggleSessionActive();
      
      expect(newState).toBe(false);
      expect(provider.isSessionActive()).toBe(false);
    });

    it('should toggle session active state from false to true', () => {
      provider.toggleSessionActive(); // false
      
      const newState = provider.toggleSessionActive();
      
      expect(newState).toBe(true);
      expect(provider.isSessionActive()).toBe(true);
    });

    it('should keep legacy properties in sync', () => {
      provider.toggleSessionActive();
      
      const state = provider.getSessionState();
      expect(state.sessionActive).toBe(false);
      expect(state.diagnosticsEnabled).toBe(false);
      expect(state.autorunEnabled).toBe(false);
    });

    it('should fire state changed event', () => {
      const listener = jest.fn();
      provider.onStateChanged(listener);
      
      provider.toggleSessionActive();
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        sessionActive: false
      }));
    });
  });

  describe('isSessionActive', () => {
    it('should return true when session is active', () => {
      expect(provider.isSessionActive()).toBe(true);
    });

    it('should return false when session is inactive', () => {
      provider.toggleSessionActive();
      expect(provider.isSessionActive()).toBe(false);
    });
  });

  describe('deprecated toggle methods', () => {
    describe('toggleDiagnostics', () => {
      it('should redirect to toggleSessionActive', () => {
        const originalState = provider.isSessionActive();
        provider.toggleDiagnostics();
        expect(provider.isSessionActive()).toBe(!originalState);
      });
    });

    describe('toggleAutorun', () => {
      it('should redirect to toggleSessionActive', () => {
        const originalState = provider.isSessionActive();
        provider.toggleAutorun();
        expect(provider.isSessionActive()).toBe(!originalState);
      });
    });

    describe('isDiagnosticsEnabled', () => {
      it('should return session active state', () => {
        expect(provider.isDiagnosticsEnabled()).toBe(true);
        provider.toggleSessionActive();
        expect(provider.isDiagnosticsEnabled()).toBe(false);
      });
    });

    describe('isAutorunEnabled', () => {
      it('should return session active state', () => {
        expect(provider.isAutorunEnabled()).toBe(true);
        provider.toggleSessionActive();
        expect(provider.isAutorunEnabled()).toBe(false);
      });
    });
  });

  describe('refresh', () => {
    it('should rebuild tree data and fire change event', () => {
      provider.refresh();
      
      // Tree should still have expected structure after refresh
      provider.getChildren().then(children => {
        expect(children.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTreeItem', () => {
    it('should return TreeItem with correct properties', () => {
      const element: ControlCenterTreeItem = {
        id: 'test-item',
        label: 'Test Label',
        tooltip: 'Test tooltip',
        description: 'Test description',
        contextValue: 'testContext',
        collapsibleState: 0 // None
      };

      const treeItem = provider.getTreeItem(element);
      
      expect(treeItem.label).toBe('Test Label');
      expect(treeItem.id).toBe('test-item');
      expect(treeItem.tooltip).toBe('Test tooltip');
      expect(treeItem.description).toBe('Test description');
      expect(treeItem.contextValue).toBe('testContext');
    });

    it('should handle elements with icons', () => {
      const mockIcon = { id: 'play' };
      const element: ControlCenterTreeItem = {
        id: 'test-item',
        label: 'Test Label',
        iconPath: mockIcon as any
      };

      const treeItem = provider.getTreeItem(element);
      expect(treeItem.iconPath).toBe(mockIcon);
    });

    it('should handle elements with commands', () => {
      const mockCommand = {
        command: 'xfidelity.runAnalysis',
        title: 'Run Analysis'
      };
      const element: ControlCenterTreeItem = {
        id: 'test-item',
        label: 'Test Label',
        command: mockCommand
      };

      const treeItem = provider.getTreeItem(element);
      expect(treeItem.command).toBe(mockCommand);
    });
  });

  describe('getChildren', () => {
    it('should return root level items when no element provided', async () => {
      const children = await provider.getChildren();
      
      expect(children.length).toBeGreaterThan(0);
      expect(children.some(c => c.id === 'quick-actions')).toBe(true);
      expect(children.some(c => c.id === 'reports')).toBe(true);
      expect(children.some(c => c.id === 'advanced')).toBe(true);
    });

    it('should return children of a group element', async () => {
      const rootChildren = await provider.getChildren();
      const quickActions = rootChildren.find(c => c.id === 'quick-actions');
      
      expect(quickActions).toBeDefined();
      expect(quickActions?.children).toBeDefined();
      
      const quickActionsChildren = await provider.getChildren(quickActions);
      expect(quickActionsChildren.length).toBeGreaterThan(0);
      expect(quickActionsChildren.some(c => c.id === 'run-analysis')).toBe(true);
      expect(quickActionsChildren.some(c => c.id === 'open-settings')).toBe(true);
      expect(quickActionsChildren.some(c => c.id === 'toggle-session')).toBe(true);
    });

    it('should return empty array for leaf nodes', async () => {
      const rootChildren = await provider.getChildren();
      const quickActions = rootChildren.find(c => c.id === 'quick-actions');
      const quickActionsChildren = await provider.getChildren(quickActions);
      const runAnalysis = quickActionsChildren.find(c => c.id === 'run-analysis');
      
      const leafChildren = await provider.getChildren(runAnalysis);
      expect(leafChildren).toEqual([]);
    });

    it('should return reports section children', async () => {
      const rootChildren = await provider.getChildren();
      const reports = rootChildren.find(c => c.id === 'reports');
      
      expect(reports).toBeDefined();
      
      const reportsChildren = await provider.getChildren(reports);
      expect(reportsChildren.some(c => c.id === 'dashboard')).toBe(true);
      expect(reportsChildren.some(c => c.id === 'report-history')).toBe(true);
      expect(reportsChildren.some(c => c.id === 'export-report')).toBe(true);
    });

    it('should return advanced section children', async () => {
      const rootChildren = await provider.getChildren();
      const advanced = rootChildren.find(c => c.id === 'advanced');
      
      expect(advanced).toBeDefined();
      
      const advancedChildren = await provider.getChildren(advanced);
      expect(advancedChildren.some(c => c.id === 'reset-config')).toBe(true);
      expect(advancedChildren.some(c => c.id === 'reset-settings')).toBe(true);
    });
  });

  describe('session toggle updates tree data', () => {
    it('should update toggle-session item description when session is toggled', async () => {
      // Initially active
      let rootChildren = await provider.getChildren();
      let quickActions = rootChildren.find(c => c.id === 'quick-actions');
      let children = await provider.getChildren(quickActions);
      let toggleSession = children.find(c => c.id === 'toggle-session');
      
      expect(toggleSession?.description).toBe('On');
      
      // Toggle to inactive
      provider.toggleSessionActive();
      
      rootChildren = await provider.getChildren();
      quickActions = rootChildren.find(c => c.id === 'quick-actions');
      children = await provider.getChildren(quickActions);
      toggleSession = children.find(c => c.id === 'toggle-session');
      
      expect(toggleSession?.description).toBe('Off');
    });

    it('should update toggle-session tooltip when session is toggled', async () => {
      // Initially active - tooltip should say "click to pause"
      let rootChildren = await provider.getChildren();
      let quickActions = rootChildren.find(c => c.id === 'quick-actions');
      let children = await provider.getChildren(quickActions);
      let toggleSession = children.find(c => c.id === 'toggle-session');
      
      expect(toggleSession?.tooltip).toContain('pause');
      
      // Toggle to inactive - tooltip should say "click to resume"
      provider.toggleSessionActive();
      
      rootChildren = await provider.getChildren();
      quickActions = rootChildren.find(c => c.id === 'quick-actions');
      children = await provider.getChildren(quickActions);
      toggleSession = children.find(c => c.id === 'toggle-session');
      
      expect(toggleSession?.tooltip).toContain('resume');
    });
  });

  describe('onStateChanged event', () => {
    it('should fire event when session state changes', () => {
      const listener = jest.fn();
      provider.onStateChanged(listener);
      
      provider.toggleSessionActive();
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        sessionActive: false,
        diagnosticsEnabled: false,
        autorunEnabled: false
      }));
    });

    it('should fire event with correct state after multiple toggles', () => {
      const listener = jest.fn();
      provider.onStateChanged(listener);
      
      provider.toggleSessionActive(); // false
      provider.toggleSessionActive(); // true
      provider.toggleSessionActive(); // false
      
      expect(listener).toHaveBeenCalledTimes(3);
      expect(listener.mock.calls[2][0]).toEqual(expect.objectContaining({
        sessionActive: false
      }));
    });
  });

  describe('tree item commands', () => {
    it('should have correct command for run-analysis', async () => {
      const rootChildren = await provider.getChildren();
      const quickActions = rootChildren.find(c => c.id === 'quick-actions');
      const children = await provider.getChildren(quickActions);
      const runAnalysis = children.find(c => c.id === 'run-analysis');
      
      expect(runAnalysis?.command).toEqual({
        command: 'xfidelity.runAnalysis',
        title: 'Run Analysis'
      });
    });

    it('should have correct command for open-settings', async () => {
      const rootChildren = await provider.getChildren();
      const quickActions = rootChildren.find(c => c.id === 'quick-actions');
      const children = await provider.getChildren(quickActions);
      const openSettings = children.find(c => c.id === 'open-settings');
      
      expect(openSettings?.command).toEqual({
        command: 'xfidelity.openSettings',
        title: 'Open Settings'
      });
    });

    it('should have correct command for toggle-session', async () => {
      const rootChildren = await provider.getChildren();
      const quickActions = rootChildren.find(c => c.id === 'quick-actions');
      const children = await provider.getChildren(quickActions);
      const toggleSession = children.find(c => c.id === 'toggle-session');
      
      expect(toggleSession?.command).toEqual({
        command: 'xfidelity.toggleSession',
        title: 'Toggle Session'
      });
    });

    it('should have correct command for dashboard', async () => {
      const rootChildren = await provider.getChildren();
      const reports = rootChildren.find(c => c.id === 'reports');
      const children = await provider.getChildren(reports);
      const dashboard = children.find(c => c.id === 'dashboard');
      
      expect(dashboard?.command).toEqual({
        command: 'xfidelity.showDashboard',
        title: 'Show Dashboard'
      });
    });
  });
});
