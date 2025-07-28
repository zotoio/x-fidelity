import * as vscode from 'vscode';

/**
 * Options for safe document opening
 */
export interface SafeDocumentOptions {
  /** Timeout in milliseconds (default: platform-specific) */
  timeout?: number;
  /** Skip problematic file types (default: true) */
  skipProblematicFiles?: boolean;
  /** Context description for error messages */
  context?: string;
}

/**
 * File types that are commonly problematic on Windows or in VS Code
 */
const PROBLEMATIC_FILE_PATTERNS = [
  '.xfidelity-cache.json',
  '.git/',
  'node_modules/',
  '.turbo/',
  '.vscode-test/',
  '.lock',
  '.log',
  '.tmp',
  '.temp',
  'package-lock.json',
  'yarn.lock'
];

/**
 * Check if a file path contains problematic patterns
 */
function isProblematicFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  return PROBLEMATIC_FILE_PATTERNS.some(
    pattern => lowerPath.includes(pattern) || lowerPath.endsWith(pattern)
  );
}

/**
 * Safely open a VS Code text document with timeout protection and Windows-specific handling
 *
 * @param uri The URI of the document to open
 * @param options Configuration options for opening behavior
 * @returns Promise resolving to the opened document
 * @throws Error if document cannot be opened within timeout or is problematic
 */
export async function safeOpenTextDocument(
  uri: vscode.Uri,
  options: SafeDocumentOptions = {}
): Promise<vscode.TextDocument> {
  const {
    timeout = process.platform === 'win32' ? 15000 : 8000, // Platform-specific defaults
    skipProblematicFiles = true,
    context = 'document opening'
  } = options;

  // Skip problematic files if enabled
  if (skipProblematicFiles && isProblematicFile(uri.fsPath)) {
    throw new Error(`Skipping problematic file type: ${uri.fsPath}`);
  }

  // Check file size if possible (avoid huge files)
  try {
    const fs = await import('fs');
    const stats = await fs.promises.stat(uri.fsPath);
    if (stats.size > 50 * 1024 * 1024) {
      // 50MB limit
      throw new Error(
        `File too large (${Math.round(stats.size / 1024 / 1024)}MB): ${uri.fsPath}`
      );
    }
  } catch {
    // Size check failed - continue anyway as file might be virtual or remote
  }

  // Create timeout-protected document opening
  const documentPromise = vscode.workspace.openTextDocument(uri);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `Document open timeout in ${context} (${timeout}ms): ${uri.fsPath}`
          )
        ),
      timeout
    )
  );

  try {
    return await Promise.race([documentPromise, timeoutPromise]);
  } catch (error) {
    // Enhance error message with context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to open document for ${context}: ${errorMessage}`);
  }
}

/**
 * Safely open a text document with automatic retry and fallback
 *
 * @param uri The URI of the document to open
 * @param options Configuration options
 * @returns Promise resolving to document or null if all attempts fail
 */
export async function safeOpenTextDocumentWithRetry(
  uri: vscode.Uri,
  options: SafeDocumentOptions = {}
): Promise<vscode.TextDocument | null> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const attemptOptions = {
        ...options,
        timeout: (options.timeout || 8000) * attempt, // Increase timeout on retry
        context: `${options.context || 'document opening'} (attempt ${attempt}/${maxRetries})`
      };

      return await safeOpenTextDocument(uri, attemptOptions);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry for certain error types
      if (
        lastError.message.includes('Skipping problematic file') ||
        lastError.message.includes('File too large')
      ) {
        break;
      }

      // Wait before retry (except last attempt)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  // All attempts failed
  return null;
}

/**
 * Check if a file can be safely opened without actually opening it
 */
export function canSafelyOpenFile(uri: vscode.Uri): boolean {
  return !isProblematicFile(uri.fsPath);
}

/**
 * Get a list of problematic file patterns for external use
 */
export function getProblematicFilePatterns(): readonly string[] {
  return [...PROBLEMATIC_FILE_PATTERNS];
}
