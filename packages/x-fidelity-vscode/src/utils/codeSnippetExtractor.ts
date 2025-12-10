import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Options for extracting code snippets
 */
export interface CodeSnippetOptions {
  /** Number of context lines to include before and after the target lines */
  contextLines?: number;
  /** Whether to highlight the target range in the output */
  highlightRange?: boolean;
  /** Maximum number of characters to include */
  maxLength?: number;
}

/**
 * Code Snippet Extractor
 *
 * Provides utilities for extracting code snippets from files for use in
 * AI prompts and issue context.
 */
export class CodeSnippetExtractor {
  private static readonly DEFAULT_CONTEXT_LINES = 3;
  private static readonly DEFAULT_MAX_LENGTH = 2000;

  /**
   * Extract a code snippet from a file
   *
   * @param filePath - Absolute path to the file
   * @param startLine - Starting line number (1-based)
   * @param endLine - Ending line number (1-based)
   * @param options - Extraction options
   * @returns The extracted code snippet
   */
  static async extractSnippet(
    filePath: string,
    startLine: number,
    endLine: number,
    options: CodeSnippetOptions = {}
  ): Promise<string> {
    const contextLines = options.contextLines ?? this.DEFAULT_CONTEXT_LINES;
    const maxLength = options.maxLength ?? this.DEFAULT_MAX_LENGTH;

    try {
      // Try to get content from open editor first
      const document = await this.getDocument(filePath);

      if (document) {
        return this.extractFromDocument(
          document,
          startLine,
          endLine,
          contextLines,
          maxLength
        );
      }

      // Fallback to reading file directly
      return await this.extractFromFile(
        filePath,
        startLine,
        endLine,
        contextLines,
        maxLength
      );
    } catch (error) {
      // Return empty string if extraction fails
      return '';
    }
  }

  /**
   * Get a VSCode document for the given file path
   */
  private static async getDocument(
    filePath: string
  ): Promise<vscode.TextDocument | null> {
    try {
      const uri = vscode.Uri.file(filePath);

      // Check if document is already open
      const openDocument = vscode.workspace.textDocuments.find(
        doc => doc.uri.fsPath === uri.fsPath
      );

      if (openDocument) {
        return openDocument;
      }

      // Try to open the document
      return await vscode.workspace.openTextDocument(uri);
    } catch {
      return null;
    }
  }

  /**
   * Extract snippet from a VSCode document
   */
  private static extractFromDocument(
    document: vscode.TextDocument,
    startLine: number,
    endLine: number,
    contextLines: number,
    maxLength: number
  ): string {
    const totalLines = document.lineCount;

    // Calculate range with context (convert to 0-based indexing)
    const contextStart = Math.max(0, startLine - 1 - contextLines);
    const contextEnd = Math.min(totalLines - 1, endLine - 1 + contextLines);

    const lines: string[] = [];

    for (let i = contextStart; i <= contextEnd; i++) {
      const line = document.lineAt(i);
      const lineNum = i + 1; // 1-based line number
      const prefix = this.getLinePrefix(
        lineNum,
        startLine,
        endLine,
        contextEnd + 1
      );
      lines.push(`${prefix}${line.text}`);
    }

    const snippet = lines.join('\n');

    // Truncate if too long
    if (snippet.length > maxLength) {
      return snippet.substring(0, maxLength) + '\n... (truncated)';
    }

    return snippet;
  }

  /**
   * Extract snippet from a file on disk
   */
  private static async extractFromFile(
    filePath: string,
    startLine: number,
    endLine: number,
    contextLines: number,
    maxLength: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf-8', (err, content) => {
        if (err) {
          reject(err);
          return;
        }

        const allLines = content.split('\n');
        const totalLines = allLines.length;

        // Calculate range with context (convert to 0-based indexing)
        const contextStart = Math.max(0, startLine - 1 - contextLines);
        const contextEnd = Math.min(totalLines - 1, endLine - 1 + contextLines);

        const lines: string[] = [];

        for (let i = contextStart; i <= contextEnd; i++) {
          const lineNum = i + 1; // 1-based line number
          const prefix = this.getLinePrefix(
            lineNum,
            startLine,
            endLine,
            contextEnd + 1
          );
          lines.push(`${prefix}${allLines[i] || ''}`);
        }

        let snippet = lines.join('\n');

        // Truncate if too long
        if (snippet.length > maxLength) {
          snippet = snippet.substring(0, maxLength) + '\n... (truncated)';
        }

        resolve(snippet);
      });
    });
  }

  /**
   * Get line prefix for display (shows line numbers and highlights target lines)
   */
  private static getLinePrefix(
    lineNum: number,
    startLine: number,
    endLine: number,
    maxLineNum: number
  ): string {
    const width = String(maxLineNum).length;
    const paddedNum = String(lineNum).padStart(width, ' ');

    // Mark lines within the target range
    const isTargetLine = lineNum >= startLine && lineNum <= endLine;
    const marker = isTargetLine ? '>' : ' ';

    return `${paddedNum}${marker}| `;
  }

  /**
   * Extract a snippet around a specific position
   *
   * @param filePath - Absolute path to the file
   * @param line - Line number (1-based)
   * @param column - Column number (1-based)
   * @param options - Extraction options
   * @returns The extracted code snippet
   */
  static async extractSnippetAtPosition(
    filePath: string,
    line: number,
    column: number,
    options: CodeSnippetOptions = {}
  ): Promise<string> {
    return this.extractSnippet(filePath, line, line, options);
  }

  /**
   * Get a minimal snippet for display in UI elements
   *
   * @param filePath - Absolute path to the file
   * @param line - Line number (1-based)
   * @returns Single line of code
   */
  static async getSingleLine(filePath: string, line: number): Promise<string> {
    try {
      const document = await this.getDocument(filePath);

      if (document && line > 0 && line <= document.lineCount) {
        return document.lineAt(line - 1).text.trim();
      }

      // Fallback to file reading
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      if (line > 0 && line <= lines.length) {
        return lines[line - 1].trim();
      }

      return '';
    } catch {
      return '';
    }
  }
}
