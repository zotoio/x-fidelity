/**
 * Unit tests for XFidelityCodeActionProvider
 * Tests the code action provider that provides quick fix suggestions
 */

// Mock vscode constructors and enums
class MockCodeAction {
  title: string;
  kind: any;
  command?: any;
  diagnostics?: any[];
  isPreferred?: boolean;

  constructor(title: string, kind: any) {
    this.title = title;
    this.kind = kind;
  }
}

class MockRange {
  start: { line: number; character: number };
  end: { line: number; character: number };

  constructor(
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number
  ) {
    this.start = { line: startLine, character: startChar };
    this.end = { line: endLine, character: endChar };
  }
}

const mockUri = {
  file: jest.fn((path) => ({
    fsPath: path,
    scheme: 'file',
    authority: '',
    path: path,
    query: '',
    fragment: ''
  })),
  parse: jest.fn((url) => ({
    scheme: 'https',
    authority: 'example.com',
    path: url,
    query: '',
    fragment: ''
  }))
};

jest.mock('vscode', () => ({
  CodeAction: MockCodeAction,
  CodeActionKind: {
    QuickFix: 'quickfix',
    Source: 'source',
    Empty: ''
  },
  Range: MockRange,
  Uri: mockUri
}));

import { XFidelityCodeActionProvider } from '../../diagnostics/codeActionProvider';

describe('XFidelityCodeActionProvider', () => {
  let provider: XFidelityCodeActionProvider;
  let mockDocument: any;
  let mockRange: any;
  let mockToken: any;

  beforeEach(() => {
    provider = new XFidelityCodeActionProvider();
    mockDocument = {
      uri: { fsPath: '/test/file.ts' },
      getText: jest.fn(() => 'const test = 1;'),
      lineAt: jest.fn(() => ({ text: 'const test = 1;' }))
    };
    mockRange = new MockRange(0, 0, 0, 10);
    mockToken = { isCancellationRequested: false };
  });

  describe('provideCodeActions', () => {
    it('should return undefined when no X-Fidelity diagnostics exist', () => {
      const context = {
        diagnostics: [
          { source: 'eslint', message: 'Some error', range: mockRange }
        ]
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeUndefined();
    });

    it('should return undefined when diagnostics array is empty', () => {
      const context = {
        diagnostics: []
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeUndefined();
    });

    it('should create Explain Issue action for X-Fidelity diagnostic', () => {
      const diagnostic = {
        source: 'X-Fidelity',
        message: 'Test error message',
        code: 'TEST_RULE',
        range: mockRange,
        xfidelity: {
          ruleId: 'test-rule',
          fixable: false
        }
      };

      const context = {
        diagnostics: [diagnostic]
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result![0].title).toContain('Explain');
      expect(result![0].title).toContain('test-rule');
      expect(result![0].command).toBeDefined();
      expect(result![0].command?.command).toBe('xfidelity.explainIssue');
    });

    it('should create Fix Issue action when diagnostic is fixable', () => {
      const diagnostic = {
        source: 'X-Fidelity',
        message: 'Fixable error',
        code: 'FIXABLE_RULE',
        range: mockRange,
        xfidelity: {
          ruleId: 'fixable-rule',
          fixable: true
        }
      };

      const context = {
        diagnostics: [diagnostic]
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(2); // Explain + Fix

      const fixAction = result!.find((a) => a.title.includes('Fix'));
      expect(fixAction).toBeDefined();
      expect(fixAction!.command?.command).toBe('xfidelity.fixIssue');
      expect(fixAction!.isPreferred).toBe(true);
    });

    it('should create View Documentation action when ruleDocUrl is provided', () => {
      const diagnostic = {
        source: 'X-Fidelity',
        message: 'Error with docs',
        code: 'DOC_RULE',
        range: mockRange,
        xfidelity: {
          ruleId: 'doc-rule',
          fixable: false,
          ruleDocUrl: 'https://example.com/docs/doc-rule'
        }
      };

      const context = {
        diagnostics: [diagnostic]
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(2); // Explain + Doc

      const docAction = result!.find((a) => a.title.includes('Documentation'));
      expect(docAction).toBeDefined();
      expect(docAction!.command?.command).toBe('vscode.open');
    });

    it('should handle multiple X-Fidelity diagnostics', () => {
      const diagnostics = [
        {
          source: 'X-Fidelity',
          message: 'Error 1',
          range: mockRange,
          xfidelity: { ruleId: 'rule-1', fixable: false }
        },
        {
          source: 'X-Fidelity',
          message: 'Error 2',
          range: mockRange,
          xfidelity: { ruleId: 'rule-2', fixable: true }
        }
      ];

      const context = { diagnostics };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeDefined();
      // rule-1: Explain (1 action), rule-2: Explain + Fix (2 actions) = 3 total
      expect(result).toHaveLength(3);
    });

    it('should handle diagnostic without xfidelity metadata', () => {
      const diagnostic = {
        source: 'X-Fidelity',
        message: 'Error without metadata',
        code: 'NO_META',
        range: mockRange
        // No xfidelity property
      };

      const context = {
        diagnostics: [diagnostic]
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      // Should fallback to 'Issue' when ruleId not present
      expect(result![0].title).toContain('Issue');
    });

    it('should pass diagnostic message and code in command arguments', () => {
      const diagnostic = {
        source: 'X-Fidelity',
        message: 'Specific error message',
        code: 'ERROR_CODE',
        range: mockRange,
        xfidelity: {
          ruleId: 'test-rule',
          category: 'quality'
        }
      };

      const context = {
        diagnostics: [diagnostic]
      };

      const result = provider.provideCodeActions(
        mockDocument,
        mockRange,
        context as any,
        mockToken
      );

      expect(result).toBeDefined();
      const action = result![0];
      expect(action.command?.arguments).toBeDefined();
      expect(action.command?.arguments?.[0]).toEqual(
        expect.objectContaining({
          ruleId: 'test-rule',
          category: 'quality',
          message: 'Specific error message',
          code: 'ERROR_CODE'
        })
      );
    });
  });

  describe('resolveCodeAction', () => {
    it('should return the code action unchanged', () => {
      const codeAction = new MockCodeAction('Test', 'quickfix');

      const result = provider.resolveCodeAction?.(codeAction as any, mockToken);

      expect(result).toBe(codeAction);
    });
  });
});
