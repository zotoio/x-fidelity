// Mock implementation of VSCode API for unit tests
// This allows unit tests to run without requiring the actual VSCode environment

export const Uri = {
  parse: jest.fn((uri: string) => ({ toString: () => uri })),
  file: jest.fn((path: string) => ({ toString: () => `file://${path}` }))
};

export const Range = jest.fn();
export const Position = jest.fn();
export const Location = jest.fn();

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3
};

export const ExtensionMode = {
  Production: 1,
  Development: 2,
  Test: 3
};

export const window = {
  showInformationMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  createOutputChannel: jest.fn(() => ({
    appendLine: jest.fn(),
    show: jest.fn(),
    dispose: jest.fn()
  })),
  createTreeView: jest.fn(() => ({
    dispose: jest.fn()
  })),
  createStatusBarItem: jest.fn(() => ({
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
    text: '',
    tooltip: '',
    command: ''
  }))
};

// Mock configuration store
const mockConfigStore = {
  // Default values matching ConfigManager defaults
  archetype: 'node-fullstack',
  configServer: '',
  localConfigPath: '',
  runInterval: 0,
  autoAnalyzeOnSave: false,
  autoAnalyzeOnFileChange: false,
  generateReports: false,
  maxFileSize: 524288,
  analysisTimeout: 45000,
  excludePatterns: [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '.xfiResults/**'
  ],
  includePatterns: [],
  maxConcurrentAnalysis: 1,
  openaiEnabled: false,
  telemetryCollector: '',
  telemetryEnabled: false,
  reportOutputDir: '',
  reportFormats: ['json'],
  showReportAfterAnalysis: false,
  reportRetentionDays: 30,
  showInlineDecorations: false,
  highlightSeverity: ['error'],
  statusBarVisibility: true,
  problemsPanelGrouping: 'file',
  showRuleDocumentation: false,
  debugMode: false,
  customPlugins: [],
  ruleOverrides: {},
  cacheResults: true,
  cacheTTL: 10,
  analysisEngine: 'cli',
  cliSource: 'bundled',
  cliBinaryPath: '',
  cliTimeout: 60000,
  cliExtraArgs: []
};

// Store initial values for reset
const initialConfigStore = { ...mockConfigStore };

// Reset function for tests
export const resetMockConfigStore = () => {
  Object.assign(mockConfigStore, initialConfigStore);
  mockConfigChangeListeners.length = 0; // Clear listeners

  // Reset the mock configuration object
  mockConfigObject.get.mockClear();
  mockConfigObject.update.mockClear();
  mockConfigObject.has.mockClear();
};

// Mock configuration change listeners
const mockConfigChangeListeners: Array<(e: any) => void> = [];

// Create a single mock configuration object that persists across calls
const createMockConfigObject = () => ({
  get: jest.fn((key: string, defaultValue?: any) => {
    return mockConfigStore[key as keyof typeof mockConfigStore] ?? defaultValue;
  }),
  update: jest.fn().mockImplementation(async (key: string, value: any) => {
    // Update the mock store
    (mockConfigStore as any)[key] = value;

    // Trigger configuration change event
    const changeEvent = {
      affectsConfiguration: jest.fn((configKey: string) => {
        return configKey === 'xfidelity' || configKey.startsWith('xfidelity.');
      })
    };

    // Call all registered listeners
    mockConfigChangeListeners.forEach(listener => listener(changeEvent));

    return Promise.resolve();
  }),
  has: jest.fn((key: string) => key in mockConfigStore)
});

// Store the mock config object to ensure it's reused
const mockConfigObject = createMockConfigObject();

export const workspace = {
  getConfiguration: jest.fn((_section?: string) => {
    return mockConfigObject;
  }),
  workspaceFolders: [],
  onDidSaveTextDocument: jest.fn(),
  onDidChangeWorkspaceFolders: jest.fn(),
  onDidChangeConfiguration: jest.fn((listener: (e: any) => void) => {
    mockConfigChangeListeners.push(listener);
    return {
      dispose: jest.fn(() => {
        const index = mockConfigChangeListeners.indexOf(listener);
        if (index > -1) {
          mockConfigChangeListeners.splice(index, 1);
        }
      })
    };
  })
};

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
  getCommands: jest.fn(() => Promise.resolve([]))
};

export const languages = {
  createDiagnosticCollection: jest.fn(() => ({
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn()
  }))
};

export const extensions = {
  getExtension: jest.fn()
};

export const env = {
  openExternal: jest.fn()
};

export const EventEmitter = jest.fn(() => ({
  event: jest.fn(),
  fire: jest.fn(),
  dispose: jest.fn()
}));

export const Disposable = jest.fn(() => ({
  dispose: jest.fn()
}));

// Mock commonly used VSCode types
export interface ExtensionContext {
  subscriptions: any[];
  extensionMode: number;
  extensionUri: any;
  extensionPath: string;
  extension: any;
  languageModelAccessInformation: any;
  environmentVariableCollection: any;
  secrets: any;
  storageUri: any;
  storagePath: string;
  globalStorageUri: any;
  globalStoragePath: string;
  logUri: any;
  logPath: string;
  asAbsolutePath: (relativePath: string) => string;
  globalState: {
    get: jest.Mock;
    update: jest.Mock;
    keys: jest.Mock;
    setKeysForSync: jest.Mock;
  };
  workspaceState: {
    get: jest.Mock;
    update: jest.Mock;
    keys: jest.Mock;
  };
}

export const mockExtensionContext: ExtensionContext = {
  subscriptions: [],
  extensionMode: ExtensionMode.Test,
  extensionUri: Uri.parse('file:///test/extension'),
  extensionPath: '/test/extension',
  extension: {
    id: 'test.extension',
    packageJSON: {},
    extensionPath: '/test/extension',
    isActive: true,
    exports: {},
    activate: jest.fn()
  },
  languageModelAccessInformation: {
    onDidChange: jest.fn(),
    canSendRequest: jest.fn()
  },
  environmentVariableCollection: {
    persistent: false,
    description: 'Test environment variables',
    replace: jest.fn(),
    append: jest.fn(),
    prepend: jest.fn(),
    get: jest.fn(),
    forEach: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn()
  },
  secrets: {
    get: jest.fn(),
    store: jest.fn(),
    delete: jest.fn(),
    onDidChange: jest.fn()
  },
  storageUri: Uri.parse('file:///test/storage'),
  storagePath: '/test/storage',
  globalStorageUri: Uri.parse('file:///test/global-storage'),
  globalStoragePath: '/test/global-storage',
  logUri: Uri.parse('file:///test/logs'),
  logPath: '/test/logs',
  asAbsolutePath: jest.fn(
    (relativePath: string) => `/test/extension/${relativePath}`
  ),
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => []),
    setKeysForSync: jest.fn()
  },
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => [])
  }
};

// Export default mock
const vscode = {
  Uri,
  Range,
  Position,
  Location,
  DiagnosticSeverity,
  ConfigurationTarget,
  ExtensionMode,
  window,
  workspace,
  commands,
  languages,
  extensions,
  env,
  EventEmitter,
  Disposable
};

export default vscode;
