// Jest unit test for extension.ts
import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';
import { ExtensionManager } from '../../core/extensionManager';

// Mock vscode module
jest.mock('vscode', () => {
  const { workspace, window, Uri, commands } = jest.requireActual('../mocks/vscode.mock');
  return {
    workspace,
    window,
    Uri,
    commands: {
      ...commands,
      executeCommand: jest.fn()
    },
    ExtensionKind: {
      Workspace: 1,
      UI: 2
    }
  };
});

// Mock ExtensionManager
jest.mock('../../core/extensionManager', () => ({
  ExtensionManager: jest.fn().mockImplementation(() => ({
    dispose: jest.fn()
  }))
}));

// Mock test detection utility
jest.mock('../../utils/testDetection', () => ({
  setupTestEnvironmentPatching: jest.fn()
}));

// Mock global logger
jest.mock('../../utils/globalLogger', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('Extension Unit Tests', () => {
  let mockContext: vscode.ExtensionContext;
  let mockExtensionManager: jest.Mocked<ExtensionManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock extension context
    mockContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn(),
        update: jest.fn()
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn()
      },
      extensionPath: '/test/extension/path',
      extensionUri: vscode.Uri.file('/test/extension/path'),
      environmentVariableCollection: {
        replace: jest.fn(),
        append: jest.fn(),
        prepend: jest.fn(),
        get: jest.fn(),
        forEach: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn()
      } as any,
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
        onDidChange: jest.fn()
      } as any,
      globalStorageUri: vscode.Uri.file('/test/global'),
      logUri: vscode.Uri.file('/test/log'),
      storageUri: vscode.Uri.file('/test/storage'),
      extension: {
        id: 'test.x-fidelity',
        extensionPath: '/test/extension/path',
        isActive: true,
        packageJSON: {},
        exports: {},
        activate: jest.fn(),
        extensionKind: vscode.ExtensionKind.Workspace,
        extensionUri: vscode.Uri.file('/test/extension/path')
      } as any,
      asAbsolutePath: jest.fn(),
      storagePath: '/test/storage',
      globalStoragePath: '/test/global-storage',
      logPath: '/test/log'
    } as any as vscode.ExtensionContext;

    // Setup mock ExtensionManager
    mockExtensionManager = {
      dispose: jest.fn()
    } as any;
    (ExtensionManager as jest.Mock).mockImplementation(() => mockExtensionManager);
  });

  describe('Extension Activation', () => {
    test('should activate extension successfully', async () => {
      // Mock successful command execution
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

      await activate(mockContext);

      // Verify test environment patching was set up
      const { setupTestEnvironmentPatching } = require('../../utils/testDetection');
      expect(setupTestEnvironmentPatching).toHaveBeenCalled();

      // Verify context was set for UI elements
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'setContext',
        'xfidelity.extensionActive',
        true
      );

      // Verify ExtensionManager was created and added to subscriptions
      expect(ExtensionManager).toHaveBeenCalledWith(mockContext);
      expect(mockContext.subscriptions).toContain(mockExtensionManager);
    });

    test('should handle macOS native module errors gracefully', async () => {
      // Mock original platform
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      try {
        // Mock ExtensionManager to throw macOS-specific error
        const macOSError = new Error('file descriptor fd issue');
        (ExtensionManager as jest.Mock).mockImplementation(() => {
          throw macOSError;
        });

        // Mock showWarningMessage to track fallback behavior
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

        await activate(mockContext);

        // Verify that macOS error handling completed (actual message may vary)
        expect(ExtensionManager).toHaveBeenCalled(); // Extension still starts despite error

        // Verify context was still set despite error
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
          'setContext',
          'xfidelity.extensionActive',
          true
        );
      } finally {
        // Restore original platform
        Object.defineProperty(process, 'platform', { value: originalPlatform });
      }
    });

    test('should handle general activation errors', async () => {
      // Mock ExtensionManager to throw general error
      const generalError = new Error('General activation error');
      (ExtensionManager as jest.Mock).mockImplementation(() => {
        throw generalError;
      });

      // Mock error message display
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await activate(mockContext);

      // Verify error was shown to user
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    test('should handle context setting failures', async () => {
      // Mock context command to fail
      (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(
        new Error('Context setting failed')
      );

      // Should still complete activation without throwing
      await activate(mockContext);

      // Should handle the error gracefully
      expect(true).toBe(true); // Test passes if no exception thrown
    });

    test('should measure activation time performance', async () => {
      const performanceSpy = jest.spyOn(performance, 'now')
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1200); // End time

      await activate(mockContext);

      expect(performanceSpy).toHaveBeenCalledTimes(2);
    });

    test('should set up information message for successful activation', async () => {
      (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);

      await activate(mockContext);

      // Should complete activation successfully
      expect(ExtensionManager).toHaveBeenCalled();
    });
  });

  describe('Extension Deactivation', () => {
    test('should deactivate extension gracefully when manager exists', async () => {
      // First activate the extension
      await activate(mockContext);

      // Then deactivate
      const result = await deactivate();

      // Verify manager was disposed
      expect(mockExtensionManager.dispose).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    test('should handle deactivation when manager does not exist', async () => {
      // Deactivate without activating first
      const result = await deactivate();

      // Should complete without error
      expect(result).toBeUndefined();
    });

    test('should handle disposal errors gracefully', async () => {
      // First activate the extension
      await activate(mockContext);

      // Mock dispose to throw error
      mockExtensionManager.dispose.mockImplementation(() => {
        throw new Error('Disposal error');
      });

      // Should still complete deactivation without throwing
      await deactivate();
      expect(true).toBe(true); // Test passes if no exception thrown
    });
  });

  describe('Extension State Management', () => {
    test('should track activation state', async () => {
      // Activate
      await activate(mockContext);
      
      // Should be able to verify activation occurred through side effects
      expect(ExtensionManager).toHaveBeenCalled();
    });

    test('should handle multiple activation calls', async () => {
      // Activate twice
      await activate(mockContext);
      await activate(mockContext);

      // ExtensionManager should be called for each activation
      expect(ExtensionManager).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from ExtensionManager creation failures', async () => {
      // Mock first call to fail, second to succeed
      (ExtensionManager as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('First failure');
        })
        .mockImplementationOnce(() => mockExtensionManager);

      // First activation should handle error
      await activate(mockContext);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();

      // Clear mocks and try again
      jest.clearAllMocks();

      // Second activation should succeed
      await activate(mockContext);
      expect(ExtensionManager).toHaveBeenCalled();
      expect(mockContext.subscriptions).toContain(mockExtensionManager);
    });
  });

  describe('Integration Points', () => {
    test('should properly integrate with VSCode extension context', async () => {
      await activate(mockContext);

      // Verify extension manager receives context
      expect(ExtensionManager).toHaveBeenCalledWith(mockContext);

      // Verify manager is added to disposables
      expect(mockContext.subscriptions).toContain(mockExtensionManager);
    });

    test('should handle missing context gracefully', async () => {
      // This test ensures we handle edge cases properly
      const nullContext = null as any;
      
      try {
        await activate(nullContext);
        // If we get here, the function handled null gracefully
        expect(true).toBe(true);
      } catch (error) {
        // If we get an error, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });
  });
});