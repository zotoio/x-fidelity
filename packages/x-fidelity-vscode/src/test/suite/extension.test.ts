import * as vscode from 'vscode';
import { activate, deactivate } from '../../extension';

// Mock the @x-fidelity/core imports
jest.mock('@x-fidelity/core', () => ({
  analyzeCodebase: jest.fn().mockResolvedValue({
    XFI_RESULT: {
      totalIssues: 2,
      issueDetails: [
        {
          filePath: 'REPO_GLOBAL_CHECK',
          errors: [
            {
              ruleFailure: 'global-rule',
              level: 'warning',
              details: { message: 'Global issue detected' }
            }
          ]
        },
        {
          filePath: '/test/file.ts',
          errors: [
            {
              ruleFailure: 'file-rule',
              level: 'error',
              details: { message: 'File issue detected', lineNumber: 10 }
            }
          ]
        }
      ]
    }
  }),
  options: {},
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  setLogLevel: jest.fn(),
  setLogPrefix: jest.fn(),
  generateLogPrefix: jest.fn().mockReturnValue('test-prefix'),
  LoggerFactory: {
    hasProvider: jest.fn().mockReturnValue(false),
    setProvider: jest.fn(),
    createLogger: jest.fn().mockReturnValue({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
      isLevelEnabled: jest.fn().mockReturnValue(true),
      child: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      })
    })
  },
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }),
  createComponentLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn()
}));

describe('Extension Test Suite', () => {
    let mockOutputChannel: any;
    let mockExtensionContext: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock timers to prevent hanging processes
        jest.useFakeTimers();

        // Create mock objects
        mockOutputChannel = {
            appendLine: jest.fn(),
            dispose: jest.fn(),
            show: jest.fn(),
            hide: jest.fn(),
            clear: jest.fn()
        };

        mockExtensionContext = {
            subscriptions: [],
            extensionPath: '/test/extension',
            asAbsolutePath: (path: string) => `/test/extension/${path}`,
            workspaceState: {
                get: jest.fn(),
                update: jest.fn()
            },
            extension: {
                packageJSON: {
                    version: '1.0.0',
                    name: 'x-fidelity-vscode'
                }
            }
        };

        // Mock vscode namespace methods
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Show Details');
        (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);
        (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(undefined);
        (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue({
            text: '',
            tooltip: '',
            command: '',
            backgroundColor: undefined,
            show: jest.fn(),
            dispose: jest.fn(),
            hide: jest.fn(),
        });
        (vscode.languages.createDiagnosticCollection as jest.Mock).mockReturnValue({
            set: jest.fn(),
            clear: jest.fn(),
            dispose: jest.fn(),
            delete: jest.fn(),
            get: jest.fn(),
            forEach: jest.fn(),
        });
        
        // Mock workspace configuration
        const mockConfig = {
            get: jest.fn((key: string, defaultValue?: any) => {
                const configValues: Record<string, any> = {
                    'enableDiagnosticLogging': true,
                    'enablePerformanceLogging': false,
                    'enableTelemetry': false,
                    'debugMode': false
                };
                return configValues[key] ?? defaultValue;
            }),
            update: jest.fn(),
            has: jest.fn(() => true)
        };
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    });

    afterEach(() => {
        // Deactivate extension first
        deactivate();
        
        // Then dispose logger to clean up any timers
        // disposeLogger();
        
        // Clean up timers
        jest.clearAllTimers();
        jest.useRealTimers();
        
        // Clear any remaining mocks
        jest.clearAllMocks();
        
        // Reset workspace configuration mock
        (vscode.workspace.getConfiguration as jest.Mock).mockReset();
    });

    it('Extension should activate successfully with workspace folder', async () => {
        // Set up workspace folders properly
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        // Mock fs operations for archetype detection
        const fs = require('fs/promises');
        (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({
            name: 'test-project',
            dependencies: { react: '^18.0.0' }
        }));
        (fs.access as jest.Mock).mockResolvedValue(undefined);

        activate(mockExtensionContext);

        // Fast-forward timers and wait for async initialization
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Verify basic setup
        // Note: With simplified logger, no output channel is created
        expect(vscode.commands.registerCommand).toHaveBeenCalled();
        expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        expect(vscode.workspace.onDidSaveTextDocument).toHaveBeenCalled();
        expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
        expect(vscode.workspace.onDidChangeWorkspaceFolders).toHaveBeenCalled();
    });

    it('Extension should handle no workspace folder', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: undefined,
            configurable: true
        });

        activate(mockExtensionContext);

        // Fast-forward timers for async initialization
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Verify warning message is shown (not error, since it's handled gracefully)
        expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('X-Fidelity: No workspace folder found');
    });

    it('Extension should register multiple commands', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        activate(mockExtensionContext);

        // Fast-forward timers and wait for async initialization
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Verify commands are registered
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('xfidelity.runAnalysis', expect.any(Function));
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('xfidelity.openSettings', expect.any(Function));
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('xfidelity.openReports', expect.any(Function));
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('xfidelity.detectArchetype', expect.any(Function));
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('xfidelity.resetConfiguration', expect.any(Function));
    });

    it('Extension should register subscriptions with context', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        activate(mockExtensionContext);

        // Fast-forward timers and wait for async initialization
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // Verify that subscriptions are added to context
        expect(mockExtensionContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('Extension should handle deactivation', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        activate(mockExtensionContext);
        
        // Call deactivate
        deactivate();

        // Deactivate function should complete without errors
        expect(true).toBe(true); // Test passes if no errors are thrown
    });

    it('Extension should handle activation errors gracefully', async () => {
        // Mock an error during initialization
        (vscode.window.createOutputChannel as jest.Mock).mockImplementation(() => {
            throw new Error('Mock initialization error');
        });

        // Set up workspace folders properly
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        activate(mockExtensionContext);

        // Fast-forward timers and wait for async initialization
        jest.advanceTimersByTime(1000);
        await Promise.resolve();

        // With the new logger system, the extension should gracefully handle
        // OutputChannel creation errors and continue working with a fallback logger
        // Verify that basic setup still happens
        expect(vscode.commands.registerCommand).toHaveBeenCalled();
        expect(mockExtensionContext.subscriptions.length).toBeGreaterThan(0);
        
        // No error message should be shown because the logger gracefully handles the fallback
        expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });
});