/**
 * Unit tests for CodeSnippetExtractor
 * Tests code snippet extraction from files for AI context
 */

// Mock file content
const mockFileContent = `line 1: import React from 'react';
line 2: 
line 3: function Component() {
line 4:   const [state, setState] = useState(0);
line 5:   
line 6:   return (
line 7:     <div>
line 8:       <button onClick={() => setState(s => s + 1)}>
line 9:         Count: {state}
line 10:       </button>
line 11:     </div>
line 12:   );
line 13: }
line 14: 
line 15: export default Component;`;

// Track open documents
const openDocuments: Map<string, any> = new Map();

// Mock vscode document
const createMockDocument = (content: string) => ({
  lineCount: content.split('\n').length,
  lineAt: (line: number) => ({
    text: content.split('\n')[line] || ''
  })
});

// Mock vscode
const mockVscode = {
  Uri: {
    file: jest.fn((path: string) => ({ fsPath: path }))
  },
  workspace: {
    textDocuments: [] as any[],
    openTextDocument: jest.fn(async (uri: any) => {
      const doc = openDocuments.get(uri.fsPath);
      if (doc) {return doc;}
      throw new Error('Document not found');
    })
  }
};

jest.mock('vscode', () => mockVscode);

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  },
  readFile: jest.fn()
}));

import { CodeSnippetExtractor } from '../../utils/codeSnippetExtractor';
import * as fs from 'fs';

describe('CodeSnippetExtractor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    openDocuments.clear();
    mockVscode.workspace.textDocuments = [];
  });

  describe('extractSnippet', () => {
    it('should extract snippet from open document', async () => {
      const doc = createMockDocument(mockFileContent);
      mockVscode.workspace.textDocuments = [
        {
          uri: { fsPath: '/test/file.tsx' },
          ...doc
        }
      ];

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/file.tsx',
        4, // target line
        4, // end line
        { contextLines: 2 }
      );

      expect(result).toBeDefined();
      expect(result).toContain('line 4');
    });

    it('should extract snippet from file when document not open', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/other-file.tsx',
        4,
        4,
        { contextLines: 2 }
      );

      expect(result).toBeDefined();
      expect(result).toContain('line 4');
    });

    it('should include context lines before and after target', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/file.tsx',
        5,
        5,
        { contextLines: 2 }
      );

      // Should include lines 3-7 (2 before, target, 2 after)
      expect(result).toContain('line 3');
      expect(result).toContain('line 5');
      expect(result).toContain('line 7');
    });

    it('should handle range at start of file', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/file.tsx',
        1,
        1,
        { contextLines: 3 }
      );

      expect(result).toBeDefined();
      expect(result).toContain('line 1');
    });

    it('should handle range at end of file', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/file.tsx',
        15,
        15,
        { contextLines: 3 }
      );

      expect(result).toBeDefined();
      expect(result).toContain('line 15');
    });

    it('should truncate output when exceeding maxLength', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/file.tsx',
        1,
        15,
        { maxLength: 100 }
      );

      expect(result.length).toBeLessThanOrEqual(120); // 100 + truncation message
      expect(result).toContain('truncated');
    });

    it('should return empty string on read error', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(new Error('File not found'), '');
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/nonexistent/file.tsx',
        1,
        5
      );

      expect(result).toBe('');
    });

    it('should mark target lines with > prefix', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippet(
        '/test/file.tsx',
        5,
        5,
        { contextLines: 2 }
      );

      // Line 5 should be marked, others should not
      const lines = result.split('\n');
      const targetLine = lines.find((l) => l.includes('line 5'));
      expect(targetLine).toContain('>');
    });
  });

  describe('extractSnippetAtPosition', () => {
    it('should extract single line snippet at position', async () => {
      (fs.readFile as unknown as jest.Mock).mockImplementation(
        (
          _path: string,
          _encoding: string,
          callback: (err: Error | null, data: string) => void
        ) => {
          callback(null, mockFileContent);
        }
      );

      const result = await CodeSnippetExtractor.extractSnippetAtPosition(
        '/test/file.tsx',
        5,
        10,
        { contextLines: 1 }
      );

      expect(result).toBeDefined();
      expect(result).toContain('line 5');
    });
  });

  describe('getSingleLine', () => {
    it('should get single line from open document', async () => {
      const doc = createMockDocument(mockFileContent);
      mockVscode.workspace.textDocuments = [
        {
          uri: { fsPath: '/test/file.tsx' },
          ...doc
        }
      ];

      const result = await CodeSnippetExtractor.getSingleLine(
        '/test/file.tsx',
        4
      );

      expect(result).toContain('line 4');
    });

    it('should get single line from file on disk', async () => {
      (fs.promises.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      const result = await CodeSnippetExtractor.getSingleLine(
        '/test/other.tsx',
        4
      );

      expect(result).toContain('line 4');
    });

    it('should return empty string for invalid line number', async () => {
      const doc = createMockDocument(mockFileContent);
      mockVscode.workspace.textDocuments = [
        {
          uri: { fsPath: '/test/file.tsx' },
          ...doc
        }
      ];

      const result = await CodeSnippetExtractor.getSingleLine(
        '/test/file.tsx',
        999
      );

      expect(result).toBe('');
    });

    it('should return empty string on error', async () => {
      (fs.promises.readFile as jest.Mock).mockRejectedValue(
        new Error('Read error')
      );

      const result = await CodeSnippetExtractor.getSingleLine(
        '/nonexistent.tsx',
        1
      );

      expect(result).toBe('');
    });
  });
});
