import * as vscode from 'vscode';
import { activate } from '../../extension';

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
  generateLogPrefix: jest.fn().mockReturnValue('test-prefix')
}));

describe('Extension Test Suite', () => {
    let mockDiagnosticCollection: any;
    let mockOutputChannel: any;
    let mockStatusBarItem: any;
    let mockExtensionContext: any;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Create mock objects
        mockDiagnosticCollection = {
            clear: jest.fn(),
            set: jest.fn(),
            dispose: jest.fn()
        };

        mockOutputChannel = {
            appendLine: jest.fn(),
            dispose: jest.fn()
        };

        mockStatusBarItem = {
            show: jest.fn(),
            dispose: jest.fn()
        };

        mockExtensionContext = {
            subscriptions: [],
            extensionPath: '/test/extension',
            asAbsolutePath: (path: string) => `/test/extension/${path}`,
            workspaceState: {
                get: jest.fn(),
                update: jest.fn()
            }
        };

        // Mock vscode namespace methods
        (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
        (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);
        (vscode.languages.createDiagnosticCollection as jest.Mock).mockReturnValue(mockDiagnosticCollection);
    });

    it('Extension should activate successfully with workspace folder', async () => {
        // Set up workspace folders properly
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        await activate(mockExtensionContext);

        // Verify basic setup
        expect(vscode.window.createOutputChannel).toHaveBeenCalled();
        expect(vscode.window.createStatusBarItem).toHaveBeenCalled();
        expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalled();
        expect(mockStatusBarItem.show).toHaveBeenCalled();
        expect(vscode.commands.registerCommand).toHaveBeenCalled();
    });

    it('Extension should handle no workspace folder', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: undefined,
            configurable: true
        });

        await activate(mockExtensionContext);

        // Verify error message is shown
        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('No workspace folder found. Please open a folder to use X-Fidelity.');
    });

    it('Extension should create required VSCode components', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        await activate(mockExtensionContext);

        // Verify all required components are created
        expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('X-Fidelity');
        expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(vscode.StatusBarAlignment.Right, 100);
        expect(vscode.languages.createDiagnosticCollection).toHaveBeenCalledWith('x-fidelity');
        
        // Verify status bar item is configured
        expect(mockStatusBarItem.show).toHaveBeenCalled();
        
        // Verify commands are registered
        expect(vscode.commands.registerCommand).toHaveBeenCalledWith('xfidelity.runAnalysis', expect.any(Function));
        
        // Verify event listeners are set up
        expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it('Extension should register subscriptions with context', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        await activate(mockExtensionContext);

        // Verify that subscriptions are added to context
        expect(mockExtensionContext.subscriptions.length).toBeGreaterThan(0);
    });

    it('Extension should handle deactivation', async () => {
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [{ uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }],
            configurable: true
        });

        await activate(mockExtensionContext);

        // Call deactivate
        const { deactivate } = require('../../extension');
        deactivate();

        // Deactivate function should complete without errors
        // (The actual cleanup is handled by VSCode disposing the subscriptions)
        expect(true).toBe(true); // Test passes if no errors are thrown
    });
});