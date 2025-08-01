// Jest unit test for XFidelityCodeActionProvider
import * as vscode from 'vscode';
import { XFidelityCodeActionProvider } from '../../diagnostics/codeActionProvider';

// Mock vscode module
jest.mock('vscode', () => {
  const { workspace, window, Uri, commands } = jest.requireActual('../mocks/vscode.mock');
  return {
    workspace,
    window,
    Uri,
    commands,
    CodeActionKind: {
      QuickFix: 'quickfix',
      Source: 'source',
      Empty: ''
    },
    EndOfLine: {
      LF: '\n',
      CRLF: '\r\n'
    },
    CodeActionTriggerKind: {
      Invoke: 1,
      Automatic: 2
    },
    CodeAction: jest.fn().mockImplementation((title, kind) => ({
      title,
      kind,
      edit: undefined,
      command: undefined,
      diagnostics: []
    })),
    WorkspaceEdit: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
      delete: jest.fn(),
      size: 0,
      entries: jest.fn()
    })),
    TextEdit: {
      replace: jest.fn().mockImplementation((range, newText) => ({
        range,
        newText
      }))
    },
    Range: jest.fn().mockImplementation((start, end) => ({
      start,
      end,
      isEmpty: false,
      isSingleLine: true,
      contains: jest.fn(),
      isEqual: jest.fn(),
      intersection: jest.fn(),
      union: jest.fn(),
      with: jest.fn()
    })),
    Position: jest.fn().mockImplementation((line, character) => ({
      line,
      character,
      isAfter: jest.fn(),
      isAfterOrEqual: jest.fn(),
      isBefore: jest.fn(),
      isBeforeOrEqual: jest.fn(),
      isEqual: jest.fn(),
      compareTo: jest.fn(),
      translate: jest.fn(),
      with: jest.fn()
    })),
    DiagnosticSeverity: {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3
    }
  };
});

describe('XFidelityCodeActionProvider Unit Tests', () => {
  let codeActionProvider: XFidelityCodeActionProvider;
  let mockDocument: vscode.TextDocument;
  let mockRange: vscode.Range;
  let mockContext: vscode.CodeActionContext;
  let mockToken: vscode.CancellationToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    codeActionProvider = new XFidelityCodeActionProvider();

    // Setup mock document
    mockDocument = {
      uri: vscode.Uri.file('/test/file.ts'),
      fileName: '/test/file.ts',
      isUntitled: false,
      languageId: 'typescript',
      version: 1,
      isDirty: false,
      isClosed: false,
      eol: vscode.EndOfLine.LF,
      lineCount: 10,
      save: jest.fn(),
      getText: jest.fn().mockReturnValue('test content'),
      getWordRangeAtPosition: jest.fn(),
      lineAt: jest.fn(),
      offsetAt: jest.fn(),
      positionAt: jest.fn(),
      validateRange: jest.fn(),
      validatePosition: jest.fn()
    } as any;

    // Setup mock range
    mockRange = new vscode.Range(
      new vscode.Position(0, 0),
      new vscode.Position(0, 10)
    );

    // Setup mock cancellation token
    mockToken = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn()
    } as any;
  });

  describe('Code Action Kind Support', () => {
    test('should provide correct code action kinds', () => {
      expect(XFidelityCodeActionProvider.providedCodeActionKinds).toEqual([
        vscode.CodeActionKind.QuickFix,
        vscode.CodeActionKind.Source
      ]);
    });
  });

  describe('Code Action Provision', () => {
    test('should return empty array when no X-Fidelity diagnostics', () => {
      // Setup context with non-X-Fidelity diagnostics
      const otherDiagnostic = {
        range: mockRange,
        message: 'Some other error',
        severity: vscode.DiagnosticSeverity.Error,
        source: 'TypeScript'
      } as vscode.Diagnostic;

      mockContext = {
        diagnostics: [otherDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      );

      expect(result).toEqual([]);
    });

    test('should provide actions for X-Fidelity diagnostics', () => {
      // Setup X-Fidelity diagnostic
      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'X-Fidelity rule violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'test-rule',
        fixable: true
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      expect(result).toHaveLength(2); // Quick fix + Learn more
      expect(result[0].title).toContain('Fix test-rule');
      expect(result[1].title).toContain('Learn more');
    });

    test('should provide only learn more action for non-fixable issues', () => {
      // Setup non-fixable X-Fidelity diagnostic
      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'X-Fidelity rule violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'test-rule',
        fixable: false
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      expect(result).toHaveLength(1); // Only learn more
      expect(result[0].title).toContain('Learn more');
    });

    test('should handle diagnostics without rule ID', () => {
      // Setup X-Fidelity diagnostic without rule ID
      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'X-Fidelity rule violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity'
        // No ruleId property
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      expect(result).toEqual([]); // No actions without rule ID
    });

    test('should handle multiple X-Fidelity diagnostics', () => {
      // Setup multiple X-Fidelity diagnostics
      const diagnostic1 = {
        range: mockRange,
        message: 'First violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'rule-1',
        fixable: true
      } as any;

      const diagnostic2 = {
        range: mockRange,
        message: 'Second violation',
        severity: vscode.DiagnosticSeverity.Error,
        source: 'X-Fidelity',
        ruleId: 'rule-2',
        fixable: false
      } as any;

      mockContext = {
        diagnostics: [diagnostic1, diagnostic2],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      expect(result).toHaveLength(3); // Fix + Learn more for rule-1, Learn more for rule-2
      
      // Check actions for first diagnostic
      const rule1Actions = result.filter(action => action.title.includes('rule-1'));
      expect(rule1Actions).toHaveLength(2);
      
      // Check actions for second diagnostic
      const rule2Actions = result.filter(action => action.title.includes('rule-2'));
      expect(rule2Actions).toHaveLength(1);
    });
  });

  describe('Quick Fix Action Creation', () => {
    test('should create quick fix action with correct properties', () => {
      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'Test violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'test-rule',
        fixable: true
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      const quickFixAction = result.find(action => action.title.includes('Fix'));
      
      expect(quickFixAction).toBeDefined();
      expect(quickFixAction!.title).toBe('Fix test-rule');
      expect(quickFixAction!.kind).toBe(vscode.CodeActionKind.QuickFix);
      expect(quickFixAction!.command).toBeDefined();
              expect(quickFixAction!.command!.command).toBe('xfidelity.applyQuickFix');
              expect(quickFixAction!.command!.arguments).toEqual([mockDocument.uri, xfidelityDiagnostic.range, 'test-rule']);
    });

    test('should handle different rule IDs correctly', () => {
      const diagnostic = {
        range: mockRange,
        message: 'Complex rule violation',
        severity: vscode.DiagnosticSeverity.Error,
        source: 'X-Fidelity',
        ruleId: 'complex-naming-rule-123',
        fixable: true
      } as any;

      mockContext = {
        diagnostics: [diagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      const quickFixAction = result.find(action => action.title.includes('Fix'));
      
      expect(quickFixAction!.title).toBe('Fix complex-naming-rule-123');
    });
  });

  describe('Learn More Action Creation', () => {
    test('should create learn more action with correct properties', () => {
      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'Test violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'test-rule',
        fixable: false
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      const learnMoreAction = result.find(action => action.title.includes('Learn more'));
      
      expect(learnMoreAction).toBeDefined();
      expect(learnMoreAction!.title).toBe('Learn more about test-rule');
      expect(learnMoreAction!.kind).toBe(vscode.CodeActionKind.Empty);
      expect(learnMoreAction!.command).toBeDefined();
      expect(learnMoreAction!.command!.command).toBe('xfidelity.showRuleDocumentation');
      expect(learnMoreAction!.command!.arguments).toEqual(['test-rule']);
    });

    test('should handle special characters in rule IDs', () => {
      const diagnostic = {
        range: mockRange,
        message: 'Special rule violation',
        severity: vscode.DiagnosticSeverity.Information,
        source: 'X-Fidelity',
        ruleId: 'rule-with-special-chars_123',
        fixable: false
      } as any;

      mockContext = {
        diagnostics: [diagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      const learnMoreAction = result.find(action => action.title.includes('Learn more'));
      
      expect(learnMoreAction!.title).toBe('Learn more about rule-with-special-chars_123');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty diagnostic array', () => {
      mockContext = {
        diagnostics: [],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      );

      expect(result).toEqual([]);
    });

    test('should handle diagnostics with undefined properties', () => {
      const incompleteDiagnostic = {
        range: mockRange,
        message: 'Incomplete diagnostic',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity'
        // Missing ruleId and fixable properties
      } as any;

      mockContext = {
        diagnostics: [incompleteDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      );

      expect(result).toEqual([]);
    });

    test('should handle mixed diagnostic sources', () => {
      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'X-Fidelity violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'xfi-rule',
        fixable: true
      } as any;

      const eslintDiagnostic = {
        range: mockRange,
        message: 'ESLint violation',
        severity: vscode.DiagnosticSeverity.Error,
        source: 'ESLint',
        ruleId: 'eslint-rule'
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic, eslintDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

              // Should only process X-Fidelity diagnostic
      expect(result).toHaveLength(2); // Fix + Learn more for X-Fidelity only
      expect(result.every(action => action.title.includes('xfi-rule'))).toBe(true);
    });

    test('should handle cancellation token', () => {
      const cancelledToken = {
        isCancellationRequested: true,
        onCancellationRequested: jest.fn()
      } as any;

      const xfidelityDiagnostic = {
        range: mockRange,
        message: 'Test violation',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'test-rule',
        fixable: true
      } as any;

      mockContext = {
        diagnostics: [xfidelityDiagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      // Should still process even with cancelled token (VSCode handles cancellation)
      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        cancelledToken
      );

      expect(result).toBeDefined();
    });
  });

  describe('Action Command Configuration', () => {
    test('should configure fix action command correctly', () => {
      const diagnostic = {
        range: mockRange,
        message: 'Fixable issue',
        severity: vscode.DiagnosticSeverity.Warning,
        source: 'X-Fidelity',
        ruleId: 'fixable-rule',
        fixable: true
      } as any;

      mockContext = {
        diagnostics: [diagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      const fixAction = result.find(action => action.title.includes('Fix'));
      
      expect(fixAction!.command).toEqual({
        command: 'xfidelity.applyQuickFix',
        title: 'Apply Quick Fix',
        arguments: [mockDocument.uri, diagnostic.range, 'fixable-rule']
      });
    });

    test('should configure learn more action command correctly', () => {
      const diagnostic = {
        range: mockRange,
        message: 'Educational issue',
        severity: vscode.DiagnosticSeverity.Information,
        source: 'X-Fidelity',
        ruleId: 'educational-rule',
        fixable: false
      } as any;

      mockContext = {
        diagnostics: [diagnostic],
        only: undefined,
        triggerKind: vscode.CodeActionTriggerKind.Invoke
      } as any;

      const result = codeActionProvider.provideCodeActions(
        mockDocument,
        mockRange,
        mockContext,
        mockToken
      ) as vscode.CodeAction[];

      const learnMoreAction = result.find(action => action.title.includes('Learn more'));
      
      expect(learnMoreAction!.command).toEqual({
        command: 'xfidelity.showRuleDocumentation',
        title: 'Show Rule Documentation',
        arguments: ['educational-rule']
      });
    });
  });
});