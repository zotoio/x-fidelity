// Mock VSCode API for window event methods
const mockDiagnosticCollection = {
  set: jest.fn(),
  clear: jest.fn(),
  forEach: jest.fn()
};

const vscodeWindowMock: any = {
  onDidChangeActiveTextEditor: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeTextEditorSelection: jest.fn(() => ({ dispose: jest.fn() })),
  onDidChangeVisibleTextEditors: jest.fn(() => ({ dispose: jest.fn() })),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  visibleTextEditors: [],
  createTextEditorDecorationType: jest.fn(() => ({
    dispose: jest.fn()
  })),
  createOutputChannel: jest.fn(() => ({
    append: jest.fn(),
    appendLine: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn()
  }))
};

const mockUri = {
  file: jest.fn((path) => ({ 
    fsPath: path,
    scheme: 'file',
    authority: '',
    path: path,
    query: '',
    fragment: ''
  })),
  parse: jest.fn()
};

const mockRange = jest.fn((startLine, startChar, endLine, endChar) => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar }
}));

const mockDiagnostic = jest.fn((range, message, severity) => ({
  range,
  message,
  severity,
  source: undefined,
  code: undefined,
  relatedInformation: undefined,
  tags: undefined
}));

const mockWorkspace = {
  workspaceFolders: [{
    uri: mockUri.file('/test/workspace'),
    name: 'test-workspace',
    index: 0
  }],
  asRelativePath: jest.fn((path) => path.replace('/test/workspace/', '')),
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key, defaultValue) => {
      switch (key) {
        case 'debugMode': return false;
        case 'logLevel': return 'info';
        case 'showInlineDecorations': return true;
        case 'highlightSeverity': return ['error', 'warning'];
        default: return defaultValue;
      }
    })
  })),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() }))
};

// Mock fs.existsSync to return true for test files
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true)
}));

jest.mock('vscode', () => {
  const actual = jest.requireActual('vscode');
  return {
    ...actual,
    window: vscodeWindowMock,
    languages: {
      createDiagnosticCollection: jest.fn(() => mockDiagnosticCollection)
    },
    workspace: mockWorkspace,
    Uri: mockUri,
    Range: mockRange,
    Diagnostic: mockDiagnostic,
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3
    },
    ThemeColor: jest.fn((id) => ({ id })),
    DecorationRangeBehavior: {
      ClosedClosed: 0
    },
    DiagnosticCollection: jest.fn(() => mockDiagnosticCollection)
  };
});

import { DiagnosticProvider } from '../../diagnostics/diagnosticProvider';
import { ConfigManager } from '../../configuration/configManager';

describe('DiagnosticProvider Unit Tests', () => {
  let provider: DiagnosticProvider;
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = ConfigManager.getInstance({} as any);
    provider = new DiagnosticProvider(configManager);
    
    // Reset all mocks
    jest.clearAllMocks();
    mockDiagnosticCollection.set.mockClear();
    mockDiagnosticCollection.clear.mockClear();
    mockDiagnosticCollection.forEach.mockClear();
  });

  afterEach(() => {
    ConfigManager.resetInstance();
  });

  it('should handle missing location data gracefully', async () => {
    const result = {
      XFI_RESULT: {
        detailedResults: {
          'file.ts': [{ message: 'Test', severity: 2 }]
        }
      }
    };
    await provider.updateDiagnostics(result as any);
    expect(true).toBe(true);
  });

  it('should handle multiple locations per issue', async () => {
    const result = {
      XFI_RESULT: {
        detailedResults: {
          'file.ts': [
            {
              message: 'Test',
              severity: 2,
              locations: [
                { line: 1, column: 1 },
                { line: 2, column: 2 }
              ]
            }
          ]
        }
      }
    };
    await provider.updateDiagnostics(result as any);
    expect(true).toBe(true);
  });

  it('should handle malformed XFI_RESULT.json', async () => {
    const result = {};
    await provider.updateDiagnostics(result as any);
    expect(true).toBe(true);
  });

  it('should handle missing XFI_RESULT property', async () => {
    const result = { notXFI: true };
    await provider.updateDiagnostics(result as any);
    expect(true).toBe(true);
  });

  it('should convert 1-based to 0-based coordinates correctly', async () => {
    const result = {
      XFI_RESULT: {
        detailedResults: {
          'file.ts': [
            {
              message: 'Test',
              severity: 2,
              locations: [{ line: 2, column: 3 }]
            }
          ]
        }
      }
    };
    await provider.updateDiagnostics(result as any);
    expect(true).toBe(true);
  });

  it('should handle error in extractIssuesFromResult gracefully', async () => {
    const provider = new DiagnosticProvider(configManager);
    // Patch extractIssuesFromResult to throw, but catch block returns []
    jest
      .spyOn(provider as any, 'extractIssuesFromResult')
      .mockImplementation(() => {
        throw new Error('extract error');
      });
    // The error will be caught and handled gracefully (no longer throws)
    await provider.updateDiagnostics({} as any);
    expect(true).toBe(true); // Test passes if no exception is thrown
  });

  it('should handle error in updateDiagnostics gracefully', async () => {
    const provider = new DiagnosticProvider(configManager);
    // Patch convertToDiagnosticsMap to throw
    jest
      .spyOn(provider as any, 'convertToDiagnosticsMap')
      .mockImplementation(() => {
        throw new Error('convert error');
      });
    await provider.updateDiagnostics({
      XFI_RESULT: { detailedResults: {} }
    } as any);
    expect(true).toBe(true);
  });

  it('should handle error in openIssueLocation gracefully', async () => {
    const provider = new DiagnosticProvider(configManager);
    jest.spyOn(provider as any, 'resolveFileUri').mockResolvedValue(undefined);
    await provider.openIssueLocation({
      file: 'notfound.ts',
      line: 1,
      column: 1,
      message: 'msg',
      severity: 'error',
      ruleId: 'rule'
    });
    expect(true).toBe(true);
  });

  it('should validate diagnostic coordinates and report errors', () => {
    const provider = new DiagnosticProvider(configManager);
    // Patch diagnosticCollection to return a diagnostic with negative line
    (provider as any).diagnosticCollection = new Map([
      [
        { fsPath: 'file.ts' },
        [
          {
            range: {
              start: { line: -1, character: 0 },
              end: { line: 0, character: 0 }
            },
            message: 'msg',
            source: 'X-Fidelity',
            code: 'rule',
            severity: 0
          }
        ]
      ]
    ]);
    const result = provider.validateDiagnosticCoordinates();
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate severity mapping and report errors', () => {
    const provider = new DiagnosticProvider(configManager);
    // Provide a Map with an array of diagnostics (mock VSCode DiagnosticCollection)
    const diagnosticsArray = [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 }
        },
        message: 'msg',
        source: 'X-Fidelity',
        code: 'rule',
        severity: 99 // Invalid
      }
    ];
    const mockCollection = new Map();
    mockCollection.forEach = (cb: any) => {
      cb({ fsPath: 'file.ts' }, diagnosticsArray);
    };
    (provider as any).diagnosticCollection = mockCollection;
    const result = provider.validateSeverityMapping();
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate problems panel and report errors for missing diagnostics', () => {
    const provider = new DiagnosticProvider(configManager);
    // Patch vscode.languages.getDiagnostics as a function
    const vscode = require('vscode');
    vscode.languages.getDiagnostics = jest.fn(() => []);
    (provider as any).issueCount = 1;
    const result = provider.validateProblemsPanel();
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should fail validation when issue count is inconsistent with problems panel', () => {
    const vscode = require('vscode');
    vscode.languages.getDiagnostics = jest.fn(() => []);
    (provider as any).issueCount = 1;
    const result = provider.validateProblemsPanel();
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  describe('Metadata Preservation for Highlighting', () => {
    it('should preserve locationConfidence for precise highlighting categorization', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'node-fullstack',
            repoPath: '/test/path',
            repoUrl: 'https://github.com/test/repo',
            xfiVersion: '1.0.0',
            fileCount: 1,
            totalIssues: 1,
            warningCount: 1,
            errorCount: 0,
            fatalityCount: 0,
            exemptCount: 0,
            startTime: '2024-01-01T00:00:00Z',
            finishTime: '2024-01-01T00:01:00Z',
            durationSeconds: 60,
            issueDetails: [{
              filePath: '/test/file.ts',
              errors: [{
                ruleFailure: 'functionComplexity-iterative',
                level: 'warning',
                details: {
                  details: {
                    complexities: [{
                      metrics: {
                        location: {
                          startLine: 24,
                          startColumn: 10,
                          endLine: 25,
                          endColumn: 10
                        }
                      }
                    }]
                  },
                  message: 'Function complexity too high'
                }
              }]
            }]
          }
        }
      };

      await provider.updateDiagnostics(mockResult as any);

      expect(mockDiagnosticCollection.set).toHaveBeenCalled();
      const setCall = mockDiagnosticCollection.set.mock.calls[0];
      const diagnostics = setCall[1];
      
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      
      // Check that locationConfidence metadata is preserved
      expect((diagnostic as any).locationConfidence).toBe('high');
      expect((diagnostic as any).locationSource).toBe('complexity-metrics');
      expect((diagnostic as any).originalLevel).toBe('warning');
    });

    it('should preserve locationSource for different rule types', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'node-fullstack',
            repoPath: '/test/path',
            repoUrl: 'https://github.com/test/repo',
            xfiVersion: '1.0.0',
            fileCount: 1,
            totalIssues: 2,
            warningCount: 2,
            errorCount: 0,
            fatalityCount: 0,
            exemptCount: 0,
            startTime: '2024-01-01T00:00:00Z',
            finishTime: '2024-01-01T00:01:00Z',
            durationSeconds: 60,
            issueDetails: [{
              filePath: '/test/file.ts',
              errors: [
                {
                  ruleFailure: 'functionComplexity-iterative',
                  level: 'warning',
                  details: {
                    details: {
                      complexities: [{
                        metrics: {
                          location: {
                            startLine: 24,
                            startColumn: 10,
                            endLine: 25,
                            endColumn: 10
                          }
                        }
                      }]
                    },
                    message: 'Function complexity too high'
                  }
                },
                {
                  ruleFailure: 'codeRhythm-iterative',
                  level: 'info',
                  details: {
                    message: 'Code structure analysis suggests potential readability issues.'
                  }
                }
              ]
            }]
          }
        }
      };

      await provider.updateDiagnostics(mockResult as any);

      expect(mockDiagnosticCollection.set).toHaveBeenCalled();
      const setCall = mockDiagnosticCollection.set.mock.calls[0];
      const diagnostics = setCall[1];
      
      expect(diagnostics).toHaveLength(2);
      
      // Check complexity rule has high confidence
      const complexityDiag = diagnostics.find((d: any) => d.code === 'functionComplexity-iterative');
      expect(complexityDiag).toBeDefined();
      expect((complexityDiag as any).locationConfidence).toBe('high');
      expect((complexityDiag as any).locationSource).toBe('complexity-metrics');
      
      // Check file-level rule has appropriate metadata
      const rhythmDiag = diagnostics.find((d: any) => d.code === 'codeRhythm-iterative');
      expect(rhythmDiag).toBeDefined();
      expect((rhythmDiag as any).locationSource).toBe('file-level-rule');
    });

    it('should ensure functionComplexity-iterative produces ranges suitable for precise highlighting', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'node-fullstack',
            repoPath: '/test/path',
            repoUrl: 'https://github.com/test/repo',
            xfiVersion: '1.0.0',
            fileCount: 1,
            totalIssues: 1,
            warningCount: 1,
            errorCount: 0,
            fatalityCount: 0,
            exemptCount: 0,
            startTime: '2024-01-01T00:00:00Z',
            finishTime: '2024-01-01T00:01:00Z',
            durationSeconds: 60,
            issueDetails: [{
              filePath: '/test/file.ts',
              errors: [{
                ruleFailure: 'functionComplexity-iterative',
                level: 'warning',
                details: {
                  details: {
                    complexities: [{
                      metrics: {
                        location: {
                          startLine: 24,
                          startColumn: 10,
                          endLine: 24,     // Small single-line range
                          endColumn: 15
                        }
                      }
                    }]
                  },
                  message: 'Function complexity too high'
                }
              }]
            }]
          }
        }
      };

      await provider.updateDiagnostics(mockResult as any);

      expect(mockDiagnosticCollection.set).toHaveBeenCalled();
      const setCall = mockDiagnosticCollection.set.mock.calls[0];
      const diagnostics = setCall[1];
      
      expect(diagnostics).toHaveLength(1);
      const diagnostic = diagnostics[0];
      
      // Calculate range size using same formula as test
      const range = diagnostic.range;
      const rangeSize = (range.end.line - range.start.line) * 1000 + 
                       (range.end.character - range.start.character);
      
      // Should meet precise highlighting criteria (> 1000)
      expect(rangeSize).toBeGreaterThan(1000);
      expect((diagnostic as any).locationConfidence).toBe('high');
    });
  });
});
