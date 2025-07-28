import * as vscode from 'vscode';
import { safeOpenTextDocument } from './safeDocumentOpening';

/**
 * Configuration for range validation behavior
 */
export interface RangeValidationOptions {
  /** Preserve zero-width ranges at valid positions (default: true) */
  preserveZeroWidth?: boolean;
  /** Maximum number of characters to expand for zero-width ranges (default: 1) */
  maxExpansion?: number;
  /** Fallback expansion when document is not available (default: 1) */
  fallbackExpansion?: number;
}

/**
 * Result of range validation
 */
export interface ValidatedRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  wasAdjusted: boolean;
  reason?: string;
}

/**
 * Safely validates and adjusts a range to ensure it's valid in VS Code.
 * This function addresses the issue where expanding zero-width ranges
 * can create invalid ranges that exceed line boundaries.
 *
 * @param startLine 0-based start line
 * @param startColumn 0-based start column
 * @param endLine 0-based end line
 * @param endColumn 0-based end column
 * @param document Optional VS Code document for precise validation
 * @param options Configuration options for validation behavior
 * @returns Validated and potentially adjusted range
 */
export function validateRange(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
  document?: vscode.TextDocument,
  options: RangeValidationOptions = {}
): ValidatedRange {
  const {
    preserveZeroWidth = true,
    maxExpansion = 1,
    fallbackExpansion = 1
  } = options;

  // Ensure non-negative coordinates
  const safeStartLine = Math.max(0, startLine);
  let safeStartColumn = Math.max(0, startColumn);
  let safeEndLine = Math.max(0, endLine);
  let safeEndColumn = Math.max(0, endColumn);

  let wasAdjusted = false;
  let reason: string | undefined;

  // Check if we have a zero-width range on the same line
  const isZeroWidth =
    safeEndLine === safeStartLine && safeEndColumn <= safeStartColumn;

  if (isZeroWidth) {
    if (document) {
      // We have document access - can do precise validation
      if (safeStartLine < document.lineCount) {
        const lineText = document.lineAt(safeStartLine).text;

        if (safeStartColumn <= lineText.length) {
          if (preserveZeroWidth && safeStartColumn < lineText.length) {
            // Zero-width range at valid position - preserve it
            safeEndColumn = safeStartColumn;
            reason = 'preserved-zero-width-valid-position';
          } else {
            // Expand safely within line bounds
            const maxSafeEndColumn = lineText.length;
            safeEndColumn = Math.min(
              safeStartColumn + maxExpansion,
              maxSafeEndColumn
            );

            if (
              safeEndColumn === safeStartColumn &&
              maxSafeEndColumn > safeStartColumn
            ) {
              safeEndColumn = safeStartColumn + 1;
            }

            wasAdjusted = safeEndColumn !== endColumn;
            reason = wasAdjusted
              ? 'expanded-within-line-bounds'
              : 'no-adjustment-needed';
          }
        } else {
          // Start column is beyond line end - adjust to line end
          safeStartColumn = Math.max(0, lineText.length - 1);
          safeEndColumn = lineText.length;
          wasAdjusted = true;
          reason = 'adjusted-start-beyond-line-end';
        }
      } else {
        // Line is beyond document - this will be caught by other validation
        safeEndColumn = safeStartColumn + fallbackExpansion;
        wasAdjusted = true;
        reason = 'line-beyond-document-fallback';
      }
    } else {
      // No document access - use conservative fallback
      if (preserveZeroWidth) {
        // Keep zero-width range if positions seem reasonable
        if (safeStartColumn === safeEndColumn && safeStartColumn >= 0) {
          reason = 'preserved-zero-width-no-document';
        } else {
          safeEndColumn = safeStartColumn + fallbackExpansion;
          wasAdjusted = true;
          reason = 'fallback-expansion-no-document';
        }
      } else {
        safeEndColumn = safeStartColumn + fallbackExpansion;
        wasAdjusted = safeEndColumn !== endColumn;
        reason = wasAdjusted
          ? 'fallback-expansion-no-document'
          : 'no-adjustment-needed';
      }
    }
  }

  return {
    startLine: safeStartLine,
    startColumn: safeStartColumn,
    endLine: safeEndLine,
    endColumn: safeEndColumn,
    wasAdjusted:
      wasAdjusted ||
      safeStartLine !== startLine ||
      safeStartColumn !== startColumn ||
      safeEndLine !== endLine,
    reason
  };
}

/**
 * Async version that can open documents for validation.
 * Use this when you have a file URI and want the most accurate validation.
 *
 * @param startLine 0-based start line
 * @param startColumn 0-based start column
 * @param endLine 0-based end line
 * @param endColumn 0-based end column
 * @param fileUri URI of the file to validate against
 * @param options Configuration options for validation behavior
 * @returns Promise resolving to validated range
 */
export async function validateRangeWithDocument(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
  fileUri: vscode.Uri,
  options: RangeValidationOptions = {}
): Promise<ValidatedRange> {
  try {
    const document = await safeOpenTextDocument(fileUri, {
      context: 'range validation',
      timeout: process.platform === 'win32' ? 10000 : 5000
    });
    return validateRange(
      startLine,
      startColumn,
      endLine,
      endColumn,
      document,
      options
    );
  } catch {
    // Document couldn't be opened - fall back to no-document validation
    return validateRange(
      startLine,
      startColumn,
      endLine,
      endColumn,
      undefined,
      options
    );
  }
}

/**
 * Creates a VS Code Range from validated coordinates
 *
 * @param validatedRange Result from validateRange or validateRangeWithDocument
 * @returns VS Code Range object
 */
export function createVSCodeRange(
  validatedRange: ValidatedRange
): vscode.Range {
  return new vscode.Range(
    validatedRange.startLine,
    validatedRange.startColumn,
    validatedRange.endLine,
    validatedRange.endColumn
  );
}
