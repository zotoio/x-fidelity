import assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { activate } from '../../extension';

// Mock the x-fidelity imports
jest.mock('x-fidelity', () => ({
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

suite('Extension Test Suite', () => {
    let mockDiagnosticCollection: any;
    let mockOutputChannel: any;
    let mockStatusBarItem: any;
    let mockExtensionContext: any;

    setup(() => {
        // Create mock objects
        mockDiagnosticCollection = {
            clear: sinon.spy(),
            set: sinon.spy(),
            dispose: sinon.spy()
        };

        mockOutputChannel = {
            appendLine: sinon.spy(),
            dispose: sinon.spy()
        };

        mockStatusBarItem = {
            show: sinon.spy(),
            dispose: sinon.spy()
        };

        mockExtensionContext = {
            subscriptions: [],
            extensionPath: '/test/extension',
            asAbsolutePath: (path: string) => `/test/extension/${path}`,
            workspaceState: {
                get: sinon.stub(),
                update: sinon.stub()
            }
        };

        // Mock vscode namespace
        sinon.stub(vscode.window, 'createOutputChannel').returns(mockOutputChannel);
        sinon.stub(vscode.window, 'createStatusBarItem').returns(mockStatusBarItem);
        sinon.stub(vscode.languages, 'createDiagnosticCollection').returns(mockDiagnosticCollection);
    });

    teardown(() => {
        sinon.restore();
    });

    test('Extension should activate successfully', async () => {
        const mockTaskExecution = {
            task: {} as vscode.Task,
            terminate: () => Promise.resolve()
        };
        sinon.stub(vscode.tasks, 'executeTask').returns(Promise.resolve(mockTaskExecution));

        await activate(mockExtensionContext);

        assert.ok(mockStatusBarItem.show.called);
    });

    test('Extension should dispose resources on deactivation', async () => {
        await activate(mockExtensionContext);

        // Call deactivate
        const deactivate = require('../../extension').deactivate;
        await deactivate();

        assert.ok(mockDiagnosticCollection.dispose.called);
        assert.ok(mockOutputChannel.dispose.called);
        assert.ok(mockStatusBarItem.dispose.called);
    });

    test('Extension should handle no workspace folder', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value(undefined);
        const showWarningMessage = sinon.stub(vscode.window, 'showWarningMessage');

        await activate(mockExtensionContext);

        assert.ok(showWarningMessage.calledWith('X-Fidelity: No workspace folder open.'));
    });

    test('Extension should analyze workspace', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }
        ]);

        await activate(mockExtensionContext);

        assert.ok(mockDiagnosticCollection.clear.called);
        assert.ok(mockDiagnosticCollection.set.called);

        // Check output channel messages
        assert.ok(mockOutputChannel.appendLine.called);
        const calls = mockOutputChannel.appendLine.getCalls();
        assert.ok(calls.some((call: any) => call.args[0] === 'Starting analysis run...'));
        assert.ok(calls.some((call: any) => call.args[0] === 'Analysis complete. Found 2 issues.'));
    });

    test('Extension should handle global issues', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }
        ]);

        await activate(mockExtensionContext);

        const calls = mockOutputChannel.appendLine.getCalls();
        assert.ok(calls.some((call: any) => call.args[0] === '--- Global Repository Issues (1) ---'));
        assert.ok(calls.some((call: any) => call.args[0] === 'WARNING: global-rule - Global issue detected'));
    });

    test('Extension should update diagnostics', async () => {
        sinon.stub(vscode.workspace, 'workspaceFolders').value([
            { uri: vscode.Uri.file('/test/workspace'), name: 'test', index: 0 }
        ]);

        await activate(mockExtensionContext);

        assert.ok(mockDiagnosticCollection.set.called);
    });
});
