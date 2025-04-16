// This file is used to setup the Jest testing environment
// It will be executed before each test file

// Set up any global mocks or configurations here
jest.mock('vscode', () => {
  return {
    window: {
      createOutputChannel: jest.fn(() => ({
        appendLine: jest.fn(),
        dispose: jest.fn()
      })),
      createStatusBarItem: jest.fn(() => ({
        text: '',
        tooltip: '',
        command: '',
        show: jest.fn(),
        dispose: jest.fn()
      })),
      showErrorMessage: jest.fn(),
      showWarningMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      withProgress: jest.fn()
    },
    workspace: {
      getConfiguration: jest.fn(),
      workspaceFolders: undefined,
      onDidChangeConfiguration: jest.fn()
    },
    languages: {
      createDiagnosticCollection: jest.fn(() => ({
        set: jest.fn(),
        clear: jest.fn(),
        dispose: jest.fn()
      }))
    },
    commands: {
      registerCommand: jest.fn(),
      executeCommand: jest.fn()
    },
    Uri: {
      file: jest.fn(path => ({ fsPath: path })),
      parse: jest.fn(uri => uri)
    },
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3
    },
    Range: jest.fn(),
    Diagnostic: jest.fn(),
    StatusBarAlignment: {
      Left: 1,
      Right: 2
    },
    ProgressLocation: {
      Notification: 1
    },
    ExtensionMode: {
      Test: 2
    }
  };
}, { virtual: true });

// Mock the x-fidelity module
jest.mock('x-fidelity', () => ({
  analyzeCodebase: jest.fn(),
  options: {},
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  },
  setLogLevel: jest.fn(),
  setLogPrefix: jest.fn(),
  generateLogPrefix: jest.fn()
}));
