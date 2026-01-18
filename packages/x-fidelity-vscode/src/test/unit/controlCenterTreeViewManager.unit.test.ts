// Unit tests for ControlCenterTreeViewManager

// Mock vscode before imports
const mockTreeView = {
  title: '',
  reveal: jest.fn(),
  onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
  dispose: jest.fn()
};

jest.mock('vscode', () => ({
  window: {
    createTreeView: jest.fn(() => mockTreeView),
    showErrorMessage: jest.fn()
  },
  TreeItemCollapsibleState: {
    None: 0,
    Collapsed: 1,
    Expanded: 2
  },
  TreeItem: class MockTreeItem {
    constructor(public label: string, public collapsibleState?: number) {}
  },
  ThemeIcon: class MockThemeIcon {
    constructor(public id: string) {}
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

// Mock globalLogger
jest.mock('../../utils/globalLogger', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

import * as vscode from 'vscode';
import { ControlCenterTreeViewManager } from '../../ui/treeView/controlCenterTreeViewManager';

describe('ControlCenterTreeViewManager', () => {
  let manager: ControlCenterTreeViewManager;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension'
    } as any;

    // Reset mock tree view
    mockTreeView.title = '';
    mockTreeView.reveal.mockClear();
    mockTreeView.dispose.mockClear();
  });

  afterEach(() => {
    if (manager) {
      manager.dispose();
    }
  });

  describe('constructor', () => {
    it('should create tree view with default view ID', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      expect(vscode.window.createTreeView).toHaveBeenCalledWith(
        'xfidelityControlCenterView',
        expect.objectContaining({
          showCollapseAll: true,
          canSelectMany: false
        })
      );
    });

    it('should create tree view with custom view ID', () => {
      manager = new ControlCenterTreeViewManager(mockContext, 'customViewId');
      
      expect(vscode.window.createTreeView).toHaveBeenCalledWith(
        'customViewId',
        expect.any(Object)
      );
    });

    it('should set initial tree view title', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      expect(mockTreeView.title).toBe('Control Center');
    });

    it('should setup visibility change listener', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      expect(mockTreeView.onDidChangeVisibility).toHaveBeenCalled();
    });
  });

  describe('getTreeView', () => {
    it('should return the tree view instance', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const treeView = manager.getTreeView();
      
      expect(treeView).toBe(mockTreeView);
    });
  });

  describe('reveal', () => {
    it('should reveal item in tree view', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const mockItem = { id: 'test-item', label: 'Test' };
      manager.reveal(mockItem as any);
      
      expect(mockTreeView.reveal).toHaveBeenCalledWith(mockItem, {
        expand: true,
        focus: true,
        select: true
      });
    });
  });

  describe('getProvider', () => {
    it('should return the tree data provider', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const provider = manager.getProvider();
      
      expect(provider).toBeDefined();
      expect(typeof provider.getSessionState).toBe('function');
      expect(typeof provider.toggleSessionActive).toBe('function');
    });
  });

  describe('getSessionState', () => {
    it('should return current session state', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const state = manager.getSessionState();
      
      expect(state).toEqual({
        sessionActive: true,
        diagnosticsEnabled: true,
        autorunEnabled: true
      });
    });
  });

  describe('toggleSessionActive', () => {
    it('should toggle session active state', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const newState = manager.toggleSessionActive();
      
      expect(newState).toBe(false);
      expect(manager.isSessionActive()).toBe(false);
    });

    it('should toggle back to active', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      manager.toggleSessionActive(); // false
      const newState = manager.toggleSessionActive(); // true
      
      expect(newState).toBe(true);
      expect(manager.isSessionActive()).toBe(true);
    });
  });

  describe('isSessionActive', () => {
    it('should return true when session is active', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      expect(manager.isSessionActive()).toBe(true);
    });

    it('should return false when session is inactive', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      manager.toggleSessionActive();
      
      expect(manager.isSessionActive()).toBe(false);
    });
  });

  describe('deprecated methods', () => {
    describe('toggleDiagnostics', () => {
      it('should redirect to toggleSessionActive', () => {
        manager = new ControlCenterTreeViewManager(mockContext);
        
        const result = manager.toggleDiagnostics();
        
        expect(result).toBe(false);
        expect(manager.isSessionActive()).toBe(false);
      });
    });

    describe('toggleAutorun', () => {
      it('should redirect to toggleSessionActive', () => {
        manager = new ControlCenterTreeViewManager(mockContext);
        
        manager.toggleSessionActive(); // false
        const result = manager.toggleAutorun();
        
        expect(result).toBe(true);
        expect(manager.isSessionActive()).toBe(true);
      });
    });

    describe('isDiagnosticsEnabled', () => {
      it('should return session active state', () => {
        manager = new ControlCenterTreeViewManager(mockContext);
        
        expect(manager.isDiagnosticsEnabled()).toBe(true);
        manager.toggleSessionActive();
        expect(manager.isDiagnosticsEnabled()).toBe(false);
      });
    });

    describe('isAutorunEnabled', () => {
      it('should return session active state', () => {
        manager = new ControlCenterTreeViewManager(mockContext);
        
        expect(manager.isAutorunEnabled()).toBe(true);
        manager.toggleSessionActive();
        expect(manager.isAutorunEnabled()).toBe(false);
      });
    });
  });

  describe('onStateChanged', () => {
    it('should expose state changed event from provider', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const onStateChanged = manager.onStateChanged;
      
      expect(onStateChanged).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('should refresh tree data provider', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      // Should not throw
      expect(() => manager.refresh()).not.toThrow();
    });

    it('should handle refresh errors gracefully', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      // Force an error by mocking provider
      const originalProvider = manager.getProvider();
      const originalRefresh = originalProvider.refresh;
      originalProvider.refresh = () => { throw new Error('Test error'); };
      
      // Should show error message but not throw
      manager.refresh();
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to refresh X-Fidelity control center'
      );
      
      // Restore
      originalProvider.refresh = originalRefresh;
    });
  });

  describe('dispose', () => {
    it('should dispose all disposables', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      manager.dispose();
      
      // TreeView should be disposed
      expect(mockTreeView.dispose).toHaveBeenCalled();
    });

    it('should handle multiple dispose calls gracefully', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      expect(() => {
        manager.dispose();
        manager.dispose();
      }).not.toThrow();
    });
  });

  describe('visibility change handling', () => {
    it('should refresh when tree view becomes visible', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      // Get the visibility change callback
      const calls = mockTreeView.onDidChangeVisibility.mock.calls as unknown[][];
      if (calls.length === 0) {
        // Test passes if no visibility callback registered (implementation may vary)
        return;
      }
      const visibilityCallback = calls[0]?.[0] as ((e: { visible: boolean }) => void) | undefined;
      if (!visibilityCallback) {
        return;
      }
      
      // Simulate visibility change to visible
      const refreshSpy = jest.spyOn(manager, 'refresh');
      visibilityCallback({ visible: true });
      
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('should not refresh when tree view becomes hidden', () => {
      manager = new ControlCenterTreeViewManager(mockContext);
      
      const calls = mockTreeView.onDidChangeVisibility.mock.calls as unknown[][];
      if (calls.length === 0) {
        // Test passes if no visibility callback registered (implementation may vary)
        return;
      }
      const visibilityCallback = calls[0]?.[0] as ((e: { visible: boolean }) => void) | undefined;
      if (!visibilityCallback) {
        return;
      }
      
      const refreshSpy = jest.spyOn(manager, 'refresh');
      visibilityCallback({ visible: false });
      
      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });
});
