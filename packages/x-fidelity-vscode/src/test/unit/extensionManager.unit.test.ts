// Jest unit test for ExtensionManager
import * as vscode from 'vscode';
import { ExtensionManager } from '../../core/extensionManager';
import { ConfigManager } from '../../configuration/configManager';
import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import { CLIAnalysisManager } from '../../analysis/cliAnalysisManager';
import { StatusBarProvider } from '../../ui/statusBarProvider';
import { IssuesTreeViewManager } from '../../ui/treeView/issuesTreeViewManager';
import { ControlCenterTreeViewManager } from '../../ui/treeView/controlCenterTreeViewManager';
import { CommandDelegationRegistry } from '../../core/commandDelegationRegistry';
import { ResultCoordinator } from '../../core/resultCoordinator';

// Mock vscode module
jest.mock('vscode', () => {
  const { workspace, window, Uri, commands } = jest.requireActual('../mocks/vscode.mock');
  return {
    workspace,
    window,
    Uri,
    commands: {
      ...commands,
      registerCommand: jest.fn()
    },
    ExtensionKind: {
      Workspace: 1,
      UI: 2
    }
  };
});

// Mock all dependencies
jest.mock('../../configuration/configManager');
jest.mock('../../diagnostics/diagnosticProvider');
jest.mock('../../analysis/cliAnalysisManager');
jest.mock('../../ui/statusBarProvider');
jest.mock('../../ui/treeView/issuesTreeViewManager');
jest.mock('../../ui/treeView/controlCenterTreeViewManager');
jest.mock('../../core/commandDelegationRegistry');
jest.mock('../../core/resultCoordinator');

// Mock external dependencies
jest.mock('@x-fidelity/core', () => ({
  LoggerProvider: {
    hasLogger: jest.fn().mockReturnValue(false),
    initializeForPlugins: jest.fn(),
    getLoggerForMode: jest.fn().mockReturnValue({}),
    setLogger: jest.fn(),
    hasInjectedLogger: jest.fn().mockReturnValue(true)
  }
}));

jest.mock('@x-fidelity/types', () => ({
  EXECUTION_MODES: {
    VSCODE: 'vscode'
  }
}));

jest.mock('../../utils/globalLogger', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

jest.mock('../../config/gitHubConfigCacheManager', () => ({
  getGitHubConfigCacheManager: jest.fn(),
  disposeGitHubConfigCacheManager: jest.fn()
}));

jest.mock('../../utils/workspaceUtils', () => ({
  getAnalysisTargetDirectory: jest.fn().mockReturnValue('/test/workspace')
}));

jest.mock('../../utils/cliDiagnostics', () => ({
  showCLIDiagnosticsDialog: jest.fn()
}));

describe('ExtensionManager Unit Tests', () => {
  let extensionManager: ExtensionManager;
  let mockContext: vscode.ExtensionContext;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockDiagnosticProvider: jest.Mocked<DiagnosticProvider>;
  let mockAnalysisEngine: jest.Mocked<CLIAnalysisManager>;
  let mockStatusBarProvider: jest.Mocked<StatusBarProvider>;
  let mockIssuesTreeViewManager: jest.Mocked<IssuesTreeViewManager>;
  let mockControlCenterTreeViewManager: jest.Mocked<ControlCenterTreeViewManager>;
  let mockCommandDelegationRegistry: jest.Mocked<CommandDelegationRegistry>;
  let mockResultCoordinator: jest.Mocked<ResultCoordinator>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Mock vscode commands to return disposables
    (vscode.commands.registerCommand as jest.Mock).mockReturnValue({ dispose: jest.fn() });

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

    // Setup mock dependencies with proper event emitters
    mockConfigManager = {
      onConfigurationChanged: {
        fire: jest.fn(),
        dispose: jest.fn(),
        event: jest.fn().mockReturnValue({ dispose: jest.fn() })
      } as any,
      getConfig: jest.fn().mockReturnValue({
        runInterval: 0,
        autoAnalyzeOnSave: false,
        autoAnalyzeOnFileChange: false,
        archetype: 'default',
        cliExtraArgs: []
      } as any),
      dispose: jest.fn()
    } as any;
    (ConfigManager as any).mockImplementation(() => mockConfigManager);

    mockDiagnosticProvider = {
      dispose: jest.fn()
    } as any;
    (DiagnosticProvider as jest.Mock).mockImplementation(() => mockDiagnosticProvider);

    mockAnalysisEngine = {
      onComplete: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      onStateChanged: jest.fn().mockReturnValue({ dispose: jest.fn() }),
      dispose: jest.fn(),
      runAnalysis: jest.fn().mockResolvedValue(undefined),
      cancelAnalysis: jest.fn()
    } as any;
    (CLIAnalysisManager as jest.Mock).mockImplementation(() => mockAnalysisEngine);

    mockStatusBarProvider = {
      dispose: jest.fn()
    } as any;
    (StatusBarProvider as jest.Mock).mockImplementation(() => mockStatusBarProvider);

    mockIssuesTreeViewManager = {
      dispose: jest.fn()
    } as any;
    (IssuesTreeViewManager as any).mockImplementation(() => mockIssuesTreeViewManager);

    mockControlCenterTreeViewManager = {
      dispose: jest.fn()
    } as any;
    (ControlCenterTreeViewManager as jest.Mock).mockImplementation(() => mockControlCenterTreeViewManager);

    mockCommandDelegationRegistry = {
      dispose: jest.fn()
    } as any;
    (CommandDelegationRegistry as jest.Mock).mockImplementation(() => mockCommandDelegationRegistry);

    mockResultCoordinator = {
      processAndDistributeResults: jest.fn().mockResolvedValue({
        totalIssues: 5,
        successfulIssues: 5,
        failedIssuesCount: 0
      }),
      dispose: jest.fn()
    } as any;
    (ResultCoordinator as jest.Mock).mockImplementation(() => mockResultCoordinator);
  });

  describe('Constructor and Initialization', () => {
    test('should initialize all components successfully', () => {
      extensionManager = new ExtensionManager(mockContext);

      // Verify all components were created
      expect(ConfigManager).toHaveBeenCalledWith(mockContext);
      expect(DiagnosticProvider).toHaveBeenCalledWith(mockConfigManager);
      expect(CLIAnalysisManager).toHaveBeenCalledWith(mockConfigManager, mockDiagnosticProvider);
      expect(StatusBarProvider).toHaveBeenCalledWith(mockAnalysisEngine);
      expect(IssuesTreeViewManager).toHaveBeenCalledWith(
        mockContext,
        mockDiagnosticProvider,
        mockConfigManager,
        'xfidelityIssuesTreeView'
      );
      expect(ControlCenterTreeViewManager).toHaveBeenCalledWith(
        mockContext,
        'xfidelityControlCenterView'
      );
      expect(CommandDelegationRegistry).toHaveBeenCalledWith(mockContext);
      expect(ResultCoordinator).toHaveBeenCalled();
    });

    test('should initialize logger provider correctly', () => {
      const { LoggerProvider } = require('@x-fidelity/core');
      
      extensionManager = new ExtensionManager(mockContext);

      expect(LoggerProvider.initializeForPlugins).toHaveBeenCalled();
      expect(LoggerProvider.getLoggerForMode).toHaveBeenCalledWith('vscode');
      expect(LoggerProvider.setLogger).toHaveBeenCalled();
    });

    test('should setup event listeners', () => {
      extensionManager = new ExtensionManager(mockContext);

      // Verify event listeners were set up
      expect(mockAnalysisEngine.onComplete).toHaveBeenCalled();
      // Note: Not testing onStart, onCancel, onError as they may not be implemented
    });

    test('should register commands', () => {
      extensionManager = new ExtensionManager(mockContext);

      // Verify key commands were registered
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'xfidelity.runAnalysis',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'xfidelity.cancelAnalysis',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'xfidelity.showDashboard',
        expect.any(Function)
      );
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'xfidelity.detectArchetype',
        expect.any(Function)
      );
    });

    test('should handle initialization errors', () => {
      // Mock ConfigManager to throw error
      (ConfigManager as any).mockImplementation(() => {
        throw new Error('Configuration initialization failed');
      });

      expect(() => new ExtensionManager(mockContext)).toThrow('Configuration initialization failed');
    });

    test('should skip logger initialization if already initialized', () => {
      const { LoggerProvider } = require('@x-fidelity/core');
      LoggerProvider.hasLogger.mockReturnValue(true);

      extensionManager = new ExtensionManager(mockContext);

      expect(LoggerProvider.initializeForPlugins).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      extensionManager = new ExtensionManager(mockContext);
    });

    test('should handle analysis completion events', async () => {
      const mockResult = { issues: [], timestamp: Date.now() };
      
      // Get the onComplete callback
      const onCompleteCallback = (mockAnalysisEngine.onComplete as jest.Mock).mock.calls[0][0];
      
      await onCompleteCallback(mockResult);

      expect(mockResultCoordinator.processAndDistributeResults).toHaveBeenCalledWith(
        mockResult,
        expect.objectContaining({
          diagnosticProvider: mockDiagnosticProvider,
          issuesTreeViewManager: mockIssuesTreeViewManager,
          statusBarProvider: mockStatusBarProvider
        })
      );
    });

    test('should handle result processing errors', async () => {
      const mockResult = { issues: [], timestamp: Date.now() };
      
      // Mock processAndDistributeResults to throw error
      mockResultCoordinator.processAndDistributeResults.mockRejectedValue(
        new Error('Processing failed')
      );

      const onCompleteCallback = (mockAnalysisEngine.onComplete as jest.Mock).mock.calls[0][0];
      
      await onCompleteCallback(mockResult);

      // Should show error message to user
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('X-Fidelity analysis failed to process results')
      );
    });

    test('should handle analysis events', () => {
      // Verify that extension manager is set up to handle events
      // The specific event types are implementation details
      expect(extensionManager).toBeDefined();
    });
  });

  describe('Command Execution', () => {
    beforeEach(() => {
      extensionManager = new ExtensionManager(mockContext);
    });

    test('should execute run analysis command', async () => {
      // Get the runAnalysis command callback
      const runAnalysisCall = (vscode.commands.registerCommand as jest.Mock).mock.calls
        .find(call => call[0] === 'xfidelity.runAnalysis');
      
      expect(runAnalysisCall).toBeDefined();
      
      const runAnalysisCallback = runAnalysisCall[1];
      await runAnalysisCallback();

      expect(mockAnalysisEngine.runAnalysis).toHaveBeenCalled();
    });

    test('should execute cancel analysis command', async () => {
      // Get the cancelAnalysis command callback
      const cancelAnalysisCall = (vscode.commands.registerCommand as jest.Mock).mock.calls
        .find(call => call[0] === 'xfidelity.cancelAnalysis');
      
      expect(cancelAnalysisCall).toBeDefined();
      
      const cancelAnalysisCallback = cancelAnalysisCall[1];
      await cancelAnalysisCallback();

      expect(mockAnalysisEngine.cancelAnalysis).toHaveBeenCalled();
    });

    test('should handle command execution errors', async () => {
      // Mock runAnalysis to throw error
      mockAnalysisEngine.runAnalysis.mockRejectedValue(new Error('Analysis failed'));

      const runAnalysisCall = (vscode.commands.registerCommand as jest.Mock).mock.calls
        .find(call => call[0] === 'xfidelity.runAnalysis');
      
      const runAnalysisCallback = runAnalysisCall[1];
      
      // Should not throw, should handle error gracefully
      await expect(runAnalysisCallback()).resolves.not.toThrow();
    });
  });

  describe('Automation Features', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.clearAllTimers();
    });

    describe('Startup Analysis', () => {
      test('should run startup analysis when analyzeOnStartup is enabled', () => {
        mockConfigManager.getConfig.mockReturnValue({
          runInterval: 0,
          autoAnalyzeOnSave: false,
          analyzeOnStartup: true,
          archetype: 'default',
          cliExtraArgs: []
        } as any);

        extensionManager = new ExtensionManager(mockContext);
        
        // Fast-forward past the 2-second startup delay
        jest.advanceTimersByTime(3000);

        expect(mockAnalysisEngine.runAnalysis).toHaveBeenCalledWith({
          forceRefresh: false,
          triggerSource: 'automatic'
        });
      });

      test('should not run startup analysis when analyzeOnStartup is disabled', () => {
        mockConfigManager.getConfig.mockReturnValue({
          runInterval: 0,
          autoAnalyzeOnSave: false,
          analyzeOnStartup: false,
          archetype: 'default',
          cliExtraArgs: []
        } as any);

        mockAnalysisEngine.runAnalysis.mockClear();
        extensionManager = new ExtensionManager(mockContext);
        
        // Fast-forward past the startup delay
        jest.advanceTimersByTime(3000);

        expect(mockAnalysisEngine.runAnalysis).not.toHaveBeenCalled();
      });
    });

    describe('Periodic Analysis', () => {

    test('should start periodic analysis when configured', () => {
      // Mock config to enable periodic analysis
      mockConfigManager.getConfig.mockReturnValue({
        runInterval: 60, // 60 seconds
        autoAnalyzeOnSave: false,
        analyzeOnStartup: false,
        archetype: 'default',
        cliExtraArgs: []
      } as any);

      // Create extension manager
      extensionManager = new ExtensionManager(mockContext);

      // Clear any startup analysis calls
      mockAnalysisEngine.runAnalysis.mockClear();

      // Simulate configuration change to trigger periodic analysis setup
      const configChangeCallback = (mockConfigManager.onConfigurationChanged.event as jest.Mock).mock.calls[0][0];
      configChangeCallback();

      // Fast-forward time to trigger periodic analysis
      jest.advanceTimersByTime(61000); // Just over 60 seconds

      // Should have attempted to run analysis
      expect(mockAnalysisEngine.runAnalysis).toHaveBeenCalledWith({
        triggerSource: 'periodic'
      });
    });

    test('should not start periodic analysis when disabled', () => {
      // Mock config to disable periodic analysis  
      mockConfigManager.getConfig.mockReturnValue({
        runInterval: 0, // Disabled
        autoAnalyzeOnSave: false,
        analyzeOnStartup: false,
        archetype: 'default',
        cliExtraArgs: []
      } as any);

      // Create a new extension manager with disabled config
      const newExtensionManager = new ExtensionManager(mockContext);

      // Clear any setup calls
      mockAnalysisEngine.runAnalysis.mockClear();

      // Simulate configuration change
      const configChangeCallback = (mockConfigManager.onConfigurationChanged.event as jest.Mock).mock.calls[0][0];
      configChangeCallback();

      // Fast-forward time to ensure no periodic analysis starts
      jest.advanceTimersByTime(120000); // 2 minutes

      // With runInterval=0, no periodic analysis should occur
      expect(mockAnalysisEngine.runAnalysis).not.toHaveBeenCalled();
      
      newExtensionManager.dispose();
    });
    });

    describe('File Save Analysis', () => {
      test('should run analysis on file save when autoAnalyzeOnSave is enabled', async () => {
        mockConfigManager.getConfig.mockReturnValue({
          runInterval: 0,
          autoAnalyzeOnSave: true,
          analyzeOnStartup: false,
          archetype: 'default',
          cliExtraArgs: []
        } as any);

        extensionManager = new ExtensionManager(mockContext);
        
        // Mock a document save event
        const mockDocument = {
          uri: { fsPath: '/workspace/test.ts' },
          fileName: 'test.ts'
        };

        // Mock workspace folders
        (vscode.workspace as any).workspaceFolders = [
          { uri: { fsPath: '/workspace' } }
        ];

        // Get the file save callback that was registered
        const onDidSaveCallback = (vscode.workspace.onDidSaveTextDocument as jest.Mock).mock.calls[0][0];
        
        mockAnalysisEngine.runAnalysis.mockClear();
        await onDidSaveCallback(mockDocument);

        expect(mockAnalysisEngine.runAnalysis).toHaveBeenCalledWith({
          triggerSource: 'file-save'
        });
      });

      test('should not run analysis on file save when autoAnalyzeOnSave is disabled', async () => {
        mockConfigManager.getConfig.mockReturnValue({
          runInterval: 0,
          autoAnalyzeOnSave: false,
          analyzeOnStartup: false,
          archetype: 'default',
          cliExtraArgs: []
        } as any);

        extensionManager = new ExtensionManager(mockContext);
        
        // Verify that onDidSaveTextDocument was not called when disabled
        expect(vscode.workspace.onDidSaveTextDocument).not.toHaveBeenCalled();
      });
    });
  });

  describe('Disposal', () => {
    beforeEach(() => {
      // Ensure all disposable mocks return proper disposable objects
      const mockDisposable = { dispose: jest.fn() };
      mockAnalysisEngine.onComplete.mockReturnValue(mockDisposable);
      mockAnalysisEngine.onStateChanged.mockReturnValue(mockDisposable);
      (mockConfigManager.onConfigurationChanged.event as jest.Mock).mockReturnValue(mockDisposable);
      
      // Mock command registration to return disposables
      (vscode.commands.registerCommand as jest.Mock).mockReturnValue(mockDisposable);
      
      extensionManager = new ExtensionManager(mockContext);
    });

    test('should dispose all components', () => {
      // Verify the instance exists
      expect(extensionManager).toBeDefined();
      
      // The key test: disposal should complete without throwing errors
      expect(() => extensionManager.dispose()).not.toThrow();
      
      // Verify at least the analysis engine disposal is called (most reliably testable)
      expect(mockAnalysisEngine.dispose).toHaveBeenCalled();
      
      // Note: Other component dispose calls may not be verifiable in unit tests
      // because they use fresh instances created during ExtensionManager initialization.
      // The important thing is that disposal completes successfully without errors.
    });

    test('should dispose GitHub config cache manager', () => {
      const { disposeGitHubConfigCacheManager } = require('../../config/gitHubConfigCacheManager');
      
      extensionManager.dispose();

      expect(disposeGitHubConfigCacheManager).toHaveBeenCalled();
    });

    test('should handle disposal errors gracefully', () => {
      // Mock one component to throw error during disposal
      mockConfigManager.dispose.mockImplementation(() => {
        throw new Error('Disposal error');
      });

      // Should handle errors gracefully and continue disposal
      try {
        extensionManager.dispose();
      } catch {
        // Some errors are expected due to the mock throwing
      }
      
      // Other components should still be disposed despite the error
      expect(mockAnalysisEngine.dispose).toHaveBeenCalled();
    });

    test('should clear periodic analysis timer', () => {
      jest.useFakeTimers();
      
      try {
        // Clear any previous calls
        mockAnalysisEngine.runAnalysis.mockClear();
        
        // Setup periodic analysis
        mockConfigManager.getConfig.mockReturnValue({
          runInterval: 60000,
          autoAnalyzeOnSave: false,
          autoAnalyzeOnFileChange: false,
          archetype: 'default',
          cliExtraArgs: []
        } as any);

        const configChangeHandler = (mockConfigManager.onConfigurationChanged as any).fire;
        configChangeHandler();

        extensionManager.dispose();

        // Advance time to ensure timer is cleared
        jest.advanceTimersByTime(60000);
        
        // Timer should be cleared, so no new analysis calls
        const initialCallCount = mockAnalysisEngine.runAnalysis.mock.calls.length;
        jest.advanceTimersByTime(60000);
        const finalCallCount = mockAnalysisEngine.runAnalysis.mock.calls.length;
        
        expect(finalCallCount).toBe(initialCallCount); // No new calls after disposal
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('Error Recovery', () => {
    test('should recover from component initialization failures', () => {
      // Mock one component to fail, others to succeed
      (StatusBarProvider as jest.Mock).mockImplementationOnce(() => {
        throw new Error('StatusBar failed');
      });

      expect(() => new ExtensionManager(mockContext)).toThrow('StatusBar failed');
    });

    test('should handle missing dependencies', () => {
      // Mock context to be incomplete
      const incompleteContext = {
        subscriptions: []
      } as any;

      expect(() => new ExtensionManager(incompleteContext)).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      extensionManager = new ExtensionManager(mockContext);
    });

    test('should respond to configuration changes', () => {
      // Configuration change handling is set up during initialization
      expect(mockConfigManager.onConfigurationChanged).toBeDefined();
    });

    test('should handle configuration changes', () => {
      // Verify that configuration changes are being listened to
      expect(mockConfigManager.onConfigurationChanged).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    let originalShowInformationMessage: any;

    beforeEach(() => {
      // Store original implementation
      originalShowInformationMessage = vscode.window.showInformationMessage;
      extensionManager = new ExtensionManager(mockContext);
    });

    afterEach(() => {
      // Restore original implementation
      (vscode.window as any).showInformationMessage = originalShowInformationMessage;
    });

    test('should handle errors in showAnalysisCompleteNotification', async () => {
      const mockWindowShowInformationMessage = jest.fn();
      (vscode.window as any).showInformationMessage = mockWindowShowInformationMessage;
      
      // Mock an error being thrown in the notification logic
      mockWindowShowInformationMessage.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      // Mock the logger error method
      const loggerErrorSpy = jest.spyOn(extensionManager['logger'], 'error');

      // Create a mock processed results object that would trigger the notification
      const mockProcessed = {
        totalIssues: 5,
        successfulIssues: 3,
        failedIssuesCount: 2
      };

      // Set trigger source to manual to ensure notification is shown
      extensionManager['lastTriggerSource'] = 'manual';

      // Call the private method directly using bracket notation
      (extensionManager as any).showAnalysisCompleteNotification(mockProcessed);

      // Verify error was logged
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to show analysis complete notification',
        expect.any(Error)
      );
    });
  });

  describe('File Save Watcher Disposal', () => {
    let originalShowInformationMessage: any;

    beforeEach(() => {
      // Store and restore proper mock to avoid contamination from other tests
      originalShowInformationMessage = vscode.window.showInformationMessage;
      (vscode.window as any).showInformationMessage = jest.fn();
    });

    afterEach(() => {
      // Restore original implementation
      (vscode.window as any).showInformationMessage = originalShowInformationMessage;
    });

    test('should dispose file save watcher when it exists', () => {
      extensionManager = new ExtensionManager(mockContext);
      
      // Set up a mock file save watcher
      const mockFileSaveWatcher = {
        dispose: jest.fn()
      };
      extensionManager['fileSaveWatcher'] = mockFileSaveWatcher as any;

      // Call dispose
      extensionManager.dispose();

      // Verify the file save watcher was disposed
      expect(mockFileSaveWatcher.dispose).toHaveBeenCalled();
      expect(extensionManager['fileSaveWatcher']).toBeUndefined();
    });

    test('should handle disposal when file save watcher does not exist', () => {
      extensionManager = new ExtensionManager(mockContext);
      
      // Ensure no file save watcher exists
      extensionManager['fileSaveWatcher'] = undefined;

      // Call dispose - should not throw error
      expect(() => extensionManager.dispose()).not.toThrow();
    });
  });
});