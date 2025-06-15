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
    show: jest.fn(),
    dispose: jest.fn(),
    hide: jest.fn(),
  })),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  withProgress: jest.fn(),
  createWebviewPanel: jest.fn(),
  showTextDocument: jest.fn(),
  activeTextEditor: undefined,
  visibleTextEditors: [],
};

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(),
  })),
  onDidChangeConfiguration: jest.fn(),
  onDidChangeWorkspaceFolders: jest.fn(),
  onDidChangeTextDocument: jest.fn(),
  workspaceFolders: [],
  getWorkspaceFolder: jest.fn(),
  findFiles: jest.fn(),
  openTextDocument: jest.fn(),
  saveAll: jest.fn(),
};

export const languages = {
  createDiagnosticCollection: jest.fn(() => ({
    set: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    delete: jest.fn(),
  })),
  registerCodeActionsProvider: jest.fn(),
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
  EventEmitter,
  DiagnosticSeverity,
  StatusBarAlignment,
  ProgressLocation,
  ExtensionMode,
  ViewColumn,
  ConfigurationTarget,
  extensions,
  env,
}; 