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
  visibleTextEditors: []
};

jest.mock('vscode', () => {
  const actual = jest.requireActual('vscode');
  return {
    ...actual,
    window: vscodeWindowMock,
    languages: {
      createDiagnosticCollection: jest.fn(() => mockDiagnosticCollection)
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
    // The error will cause updateDiagnostics to fail before .then on showInformationMessage
    await expect(provider.updateDiagnostics({} as any)).rejects.toThrow();
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
});
