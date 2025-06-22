// Mock implementation of the VSCode API for Jest testing
import { jest } from '@jest/globals';

export const window = {
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    dispose: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    clear: jest.fn(),
  })),
  createStatusBarItem: jest.fn(() => ({
    text: '',
    tooltip: '',
    command: '',
    backgroundColor: undefined,
    show: jest.fn(),
    dispose: jest.fn(),
    hide: jest.fn(),
  })),
  createTextEditorDecorationType: jest.fn(() => ({ dispose: jest.fn() })),
  showErrorMessage: jest.fn(() => Promise.resolve('Show Details')),
  showWarningMessage: jest.fn(() => Promise.resolve(undefined)),
  showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
  showQuickPick: jest.fn(),
  showInputBox: jest.fn(),
  withProgress: jest.fn((options: any, task: any) => task({ report: jest.fn() })),
  createWebviewPanel: jest.fn(),
  showTextDocument: jest.fn(),
  activeTextEditor: undefined,
  visibleTextEditors: [],
  onDidChangeActiveTextEditor: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeVisibleTextEditors: jest.fn(() => ({ dispose: jest.fn() })),
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeWorkspaceFolders: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  onDidSaveTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  workspaceFolders: [],
  getWorkspaceFolder: jest.fn(),
  findFiles: jest.fn(),
  openTextDocument: jest.fn(),
  saveAll: jest.fn(),
  applyEdit: jest.fn(),
};

export const languages = {
  createDiagnosticCollection: jest.fn(() => ({
    set: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    forEach: jest.fn(),
  })),
  registerCodeActionsProvider: jest.fn(() => ({ dispose: jest.fn() })),
  registerCompletionItemProvider: jest.fn(),
  registerHoverProvider: jest.fn(),
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  registerTextEditorCommand: jest.fn(),
};

export const tasks = {
  executeTask: jest.fn(),
  onDidStartTask: jest.fn(),
  onDidEndTask: jest.fn(),
};

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path, scheme: 'file', path })),
  parse: jest.fn((uri: string) => ({ fsPath: uri, scheme: 'file', path: uri })),
  joinPath: jest.fn(),
};

export const Range = jest.fn();
export const Position = jest.fn();
export const Location = jest.fn();
export const Diagnostic = jest.fn();
export const CodeAction = jest.fn();
export const WorkspaceEdit = jest.fn(() => ({
  insert: jest.fn(),
  replace: jest.fn(),
  delete: jest.fn(),
}));
export const MarkdownString = jest.fn(() => ({
  appendMarkdown: jest.fn(),
  isTrusted: false,
}));
export const ThemeColor = jest.fn();
export const ThemeIcon = jest.fn();
export const DecorationRangeBehavior = {
  ClosedClosed: 3,
};

// EventEmitter mock
export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];
  
  get event() {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
  }
  
  fire(data: T) {
    this.listeners.forEach(listener => listener(data));
  }
  
  dispose() {
    this.listeners = [];
  }
}

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const StatusBarAlignment = {
  Left: 1,
  Right: 2,
};

export const ProgressLocation = {
  Notification: 1,
  SourceControl: 2,
  Window: 10,
};

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3,
};

export const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

export const CodeActionKind = {
  Empty: '',
  QuickFix: 'quickfix',
  Refactor: 'refactor',
  RefactorExtract: 'refactor.extract',
  RefactorInline: 'refactor.inline',
  RefactorRewrite: 'refactor.rewrite',
  Source: 'source',
  SourceOrganizeImports: 'source.organizeImports',
  SourceFixAll: 'source.fixAll',
};

export const extensions = {
  getExtension: jest.fn(),
  all: [],
};

export const env = {
  clipboard: {
    writeText: jest.fn(),
    readText: jest.fn(),
  },
  openExternal: jest.fn(),
  machineId: 'test-machine-id',
  sessionId: 'test-session-id',
};

// Export everything as default as well for compatibility
export default {
  window,
  workspace,
  languages,
  commands,
  tasks,
  Uri,
  Range,
  Position,
  Location,
  Diagnostic,
  CodeAction,
  WorkspaceEdit,
  MarkdownString,
  ThemeColor,
  ThemeIcon,
  DecorationRangeBehavior,
  EventEmitter,
  DiagnosticSeverity,
  StatusBarAlignment,
  ProgressLocation,
  ExtensionMode,
  ViewColumn,
  ConfigurationTarget,
  CodeActionKind,
  extensions,
  env,
}; 