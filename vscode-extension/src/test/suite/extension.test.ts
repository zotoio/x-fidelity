import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as extension from '../../extension';

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

describe('Extension Test Suite', () => {
  let sandbox: sinon.SinonSandbox;
  // Use a simpler type declaration
  let mockWorkspaceFolders: any[];
  let mockOutputChannel: any;
  let mockDiagnosticCollection: any;
  let mockStatusBarItem: any;
  let mockContext: vscode.ExtensionContext;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    // Mock workspace folders
    mockWorkspaceFolders = [{ uri: { fsPath: '/test/workspace' } }];
    sandbox.stub(vscode.workspace, 'workspaceFolders').value(mockWorkspaceFolders);
    
    // Mock configuration
    sandbox.stub(vscode.workspace, 'getConfiguration').returns({
      get: sandbox.stub().callsFake((key, defaultValue) => {
        const config: Record<string, any> = {
          'runInterval': 300,
          'archetype': 'node-fullstack',
          'configServer': '',
          'localConfigPath': ''
        };
        return config[key] || defaultValue;
      })
    } as any);
    
    // Mock output channel
    mockOutputChannel = {
      appendLine: sandbox.stub(),
      dispose: sandbox.stub()
    };
    sandbox.stub(vscode.window, 'createOutputChannel').returns(mockOutputChannel);
    
    // Mock diagnostic collection
    mockDiagnosticCollection = {
      set: sandbox.stub(),
      clear: sandbox.stub(),
      dispose: sandbox.stub()
    };
    sandbox.stub(vscode.languages, 'createDiagnosticCollection').returns(mockDiagnosticCollection);
    
    // Mock status bar item
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      command: '',
      show: sandbox.stub(),
      dispose: sandbox.stub()
    };
    sandbox.stub(vscode.window, 'createStatusBarItem').returns(mockStatusBarItem);
    
    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension',
      extensionUri: vscode.Uri.file('/test/extension'),
      asAbsolutePath: (path) => `/test/extension/${path}`,
      storagePath: '/test/storage',
      storageUri: vscode.Uri.file('/test/storage'),
      globalStoragePath: '/test/global-storage',
      globalStorageUri: vscode.Uri.file('/test/global-storage'),
      logPath: '/test/log',
      logUri: vscode.Uri.file('/test/log'),
      extensionMode: vscode.ExtensionMode.Test,
      environmentVariableCollection: {} as any,
      secrets: {} as any,
      workspaceState: {} as any,
      globalState: {} as any
    };
    
    // Mock window.withProgress
    sandbox.stub(vscode.window, 'withProgress').callsFake((options, task) => {
      return task({
        report: sandbox.stub()
      });
    });
    
    // Mock window.showErrorMessage and showWarningMessage
    sandbox.stub(vscode.window, 'showErrorMessage').returns(Promise.resolve(undefined));
    sandbox.stub(vscode.window, 'showWarningMessage').returns(Promise.resolve(undefined));
    
    // Mock commands.registerCommand
    sandbox.stub(vscode.commands, 'registerCommand').callsFake((command, callback) => {
      return { dispose: sandbox.stub() };
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  test('Extension should activate successfully', async () => {
    await extension.activate(mockContext);
    
    assert.strictEqual(mockContext.subscriptions.length, 3);
    assert.strictEqual(mockStatusBarItem.text, '$(zap) X-Fidelity');
    assert.strictEqual(mockStatusBarItem.command, 'xfidelity.runAnalysis');
    assert(mockStatusBarItem.show.called);
  });

  test('Extension should deactivate successfully', async () => {
    await extension.deactivate();
    
    assert(mockDiagnosticCollection.dispose.called);
    assert(mockOutputChannel.dispose.called);
    assert(mockStatusBarItem.dispose.called);
  });

  test('runAnalysis should handle workspace without folders', async () => {
    // Remove workspace folders
    sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);
    
    // Get private runAnalysis function
    const runAnalysis = (extension as any).runAnalysis;
    
    await runAnalysis();
    
    assert(vscode.window.showWarningMessage.calledWith('X-Fidelity: No workspace folder open.'));
  });

  test('runAnalysis should process results correctly', async () => {
    // Get private runAnalysis function
    const runAnalysis = (extension as any).runAnalysis;
    
    await runAnalysis();
    
    // Check diagnostic collection was updated
    assert(mockDiagnosticCollection.clear.called);
    assert(mockDiagnosticCollection.set.called);
    
    // Check output channel was updated
    assert(mockOutputChannel.appendLine.calledWith('Starting analysis run...'));
    assert(mockOutputChannel.appendLine.calledWith('Analysis complete. Found 2 issues.'));
  });

  test('displayDiagnostics should handle global issues', async () => {
    // Get private displayDiagnostics function
    const displayDiagnostics = (extension as any).displayDiagnostics;
    
    const results = {
      XFI_RESULT: {
        totalIssues: 1,
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
          }
        ]
      }
    };
    
    displayDiagnostics(results, '/test/workspace');
    
    // Check output channel was updated with global issues
    assert(mockOutputChannel.appendLine.calledWith('--- Global Repository Issues (1) ---'));
    assert(mockOutputChannel.appendLine.calledWith('WARNING: global-rule - Global issue detected'));
  });

  test('displayDiagnostics should handle file-specific issues', async () => {
    // Get private displayDiagnostics function
    const displayDiagnostics = (extension as any).displayDiagnostics;
    
    const results = {
      XFI_RESULT: {
        totalIssues: 1,
        issueDetails: [
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
    };
    
    displayDiagnostics(results, '/test/workspace');
    
    // Check diagnostic collection was updated
    assert(mockDiagnosticCollection.set.called);
  });

  test('mapSeverity should map severity levels correctly', async () => {
    // Get private mapSeverity function
    const mapSeverity = (extension as any).mapSeverity;
    
    assert.strictEqual(mapSeverity('error'), vscode.DiagnosticSeverity.Error);
    assert.strictEqual(mapSeverity('fatality'), vscode.DiagnosticSeverity.Error);
    assert.strictEqual(mapSeverity('warning'), vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(mapSeverity('exempt'), vscode.DiagnosticSeverity.Information);
    assert.strictEqual(mapSeverity(undefined), vscode.DiagnosticSeverity.Information);
  });
});
