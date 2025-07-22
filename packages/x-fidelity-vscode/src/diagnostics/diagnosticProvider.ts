import * as vscode from 'vscode';
import * as path from 'path';
import type { AnalysisResult } from '../analysis/types';
import { ConfigManager } from '../configuration/configManager';
import { createComponentLogger } from '../utils/globalLogger';
import type { ResultMetadata } from '@x-fidelity/types';
import { DiagnosticLocationExtractor } from '../utils/diagnosticLocationExtractor';
import { isTestEnvironment } from '../utils/testDetection';

// Extended interface for diagnostics with X-Fidelity metadata
interface ExtendedDiagnostic extends vscode.Diagnostic {
  issueId?: string;
  ruleId?: string;
  category?: string;
  documentation?: string;
}

// Internal interface for processing issues from analysis results
interface DiagnosticIssue {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  ruleId: string;
  issueId?: string;
  category?: string;
  documentation?: string;
  source?: string;
  code?: string;
  tags?: vscode.DiagnosticTag[];
}

// Internal issue metadata type for location resolution
interface IssueLocation {
  file: string;
  line?: number;
  column?: number;
  snippet?: string;
}

/**
 * Enhanced Diagnostic Provider implementing VS Code best practices
 * - Native integration with Problems panel
 * - Precise line/column navigation
 * - Comprehensive diagnostic information
 * - Performance optimized with batched updates
 */
export class DiagnosticProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationType?: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];
  private decorationUpdateDebouncer?: NodeJS.Timeout;
  private readonly DECORATION_UPDATE_DELAY = 100; // ms
  private lastUpdateTime = 0;
  private logger: any;
  private issueCount = 0;

  // Event emitter for diagnostic updates
  private readonly onDiagnosticsUpdated = new vscode.EventEmitter<{
    totalIssues: number;
    filesWithIssues: number;
  }>();
  readonly onDidDiagnosticsUpdate: vscode.Event<{
    totalIssues: number;
    filesWithIssues: number;
  }> = this.onDiagnosticsUpdated.event;

  constructor(private configManager: ConfigManager) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('xfidelity');
    this.logger = createComponentLogger('DiagnosticProvider');
    this.setupDecorations();
    this.setupEventListeners();
    this.disposables.push(this.diagnosticCollection);

    this.logger.info('Enhanced Diagnostic Provider initialized');
  }

  /**
   * Update diagnostics from analysis result
   * Converts X-Fidelity issues to VS Code diagnostics for Problems panel integration
   */
  public async updateDiagnostics(result: AnalysisResult): Promise<void> {
    const startTime = performance.now();

    try {
      // Clear existing diagnostics
      this.diagnosticCollection.clear();

      // Extract issues from result
      const issues = this.extractIssuesFromResult(result);
      this.logger.info('Extracted issues for diagnostics', {
        count: issues.length
      });

      // Convert to VS Code diagnostics and group by file
      const diagnosticsByFile = await this.convertToDiagnosticsMap(issues);

      // Log any issues that were dropped during conversion
      const totalProcessed = Array.from(diagnosticsByFile.values()).reduce(
        (sum, diags) => sum + diags.length,
        0
      );
      const droppedIssues = issues.length - totalProcessed;
      if (droppedIssues > 0) {
        this.logger.warn(
          `${droppedIssues} issues were dropped during diagnostic conversion`
        );
      }

      // Clear any existing diagnostics for files that no longer have issues
      this.diagnosticCollection.forEach((uri, _diagnostics) => {
        if (!diagnosticsByFile.has(uri)) {
          this.diagnosticCollection.set(uri, []);
        }
      });

      // Batch update diagnostics for all files
      for (const [fileUri, diagnostics] of diagnosticsByFile) {
        this.diagnosticCollection.set(fileUri, diagnostics);
      }

      this.issueCount = totalProcessed;
      this.lastUpdateTime = performance.now() - startTime;

      this.logger.info('Diagnostics updated successfully', {
        issueCount: this.issueCount,
        fileCount: diagnosticsByFile.size,
        updateTime: `${this.lastUpdateTime.toFixed(2)}ms`
      });

      // CRITICAL FIX: Ensure event is fired AFTER all diagnostics are set
      await this.waitForDiagnosticsToSettle();

      // NOTE: Duplicate notification removed to avoid showing two notifications
      // The ExtensionManager already shows a notification with "View Issues" and "View Dashboard" buttons

      // Emit diagnostic update event
      this.onDiagnosticsUpdated.fire({
        totalIssues: this.issueCount,
        filesWithIssues: diagnosticsByFile.size
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to update diagnostics', {
        error: errorMessage
      });

      // CRITICAL FIX: Fire event even on error to ensure tree view updates
      this.onDiagnosticsUpdated.fire({
        totalIssues: 0,
        filesWithIssues: 0
      });

      // Defensive error message handling for test environments
      try {
        const errorMessagePromise = vscode.window.showErrorMessage(
          `Failed to update diagnostics: ${errorMessage}`,
          'Show Output'
        );

        // Only call .then() if we get a thenable (not in all test environments)
        if (
          errorMessagePromise &&
          typeof errorMessagePromise.then === 'function'
        ) {
          errorMessagePromise.then(choice => {
            if (choice === 'Show Output') {
              vscode.commands.executeCommand(
                'workbench.action.output.toggleOutput'
              );
            }
          });
        }
      } catch (messageError) {
        // Ignore errors from showing error messages (can happen in tests)
        this.logger.debug(
          'Error showing error message (likely in test environment)',
          messageError
        );
      }
    }
  }

  /**
   * Wait for diagnostics to settle in VSCode's diagnostic collection
   */
  private async waitForDiagnosticsToSettle(): Promise<void> {
    // Skip delay in test environments to prevent test timeouts
    if (isTestEnvironment()) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      setTimeout(resolve, 50); // Small delay to ensure diagnostics are fully set
    });
  }

  /**
   * Extract issues from analysis result in a standardized format
   */
  private extractIssuesFromResult(result: AnalysisResult): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    try {
      // CRITICAL DEBUG: Log what we received
      this.logger.info('=== RECEIVED RESULT DEBUG ===');
      this.logger.info(`Result type: ${typeof result}`);
      this.logger.info(
        `Result keys: ${result ? Object.keys(result) : 'null/undefined'}`
      );
      this.logger.info(`Has metadata: ${'metadata' in result}`);
      this.logger.info(`Has XFI_RESULT: ${'XFI_RESULT' in result}`);
      this.logger.info(
        `Full result JSON: ${JSON.stringify(result).substring(0, 500)}...`
      );
      this.logger.info('=== END RECEIVED RESULT DEBUG ===');

      // Get XFI_RESULT from the result with more flexible handling
      let xfiResult;
      if ('metadata' in result && result.metadata?.XFI_RESULT) {
        xfiResult = result.metadata.XFI_RESULT;
        this.logger.debug('Found XFI_RESULT in result.metadata.XFI_RESULT');
      } else if ('XFI_RESULT' in result) {
        xfiResult = result.XFI_RESULT;
        this.logger.debug('Found XFI_RESULT in result.XFI_RESULT');
      } else if (result && 'issueDetails' in result) {
        xfiResult = result; // Direct use if it has issueDetails
        this.logger.debug('Using result directly as it has issueDetails');
      } else {
        // Last resort: deep search for issueDetails
        const found = this.deepSearchForIssueDetails(result);
        if (found) {
          xfiResult = { issueDetails: found };
          this.logger.debug('Found issueDetails via deep search');
        } else {
          xfiResult = { issueDetails: [] };
          this.logger.warn('No issueDetails found anywhere in result');
        }
      }

      if (!xfiResult?.issueDetails) {
        this.logger.warn('No issueDetails found in XFI_RESULT', {
          hasXfiResult: !!xfiResult,
          xfiResultKeys: xfiResult ? Object.keys(xfiResult) : 'null',
          hasIssueDetails: !!xfiResult?.issueDetails
        });
        return issues;
      }

      // DEBUG: Log the actual XFI_RESULT structure to see what we're getting
      this.logger.debug('=== XFI_RESULT CONTENT DEBUG ===');
      this.logger.debug(`XFI_RESULT keys: ${Object.keys(xfiResult)}`);
      this.logger.debug(
        `issueDetails length: ${xfiResult.issueDetails?.length || 0}`
      );
      this.logger.debug(`Full XFI_RESULT structure:`, xfiResult);

      if (xfiResult.issueDetails && xfiResult.issueDetails.length > 0) {
        const firstFileIssue = xfiResult.issueDetails[0];
        this.logger.debug(`First file issue structure:`, {
          filePath: firstFileIssue.filePath,
          errorsCount: firstFileIssue.errors?.length || 0,
          firstErrorKeys: firstFileIssue.errors?.[0]
            ? Object.keys(firstFileIssue.errors[0])
            : [],
          firstErrorSample: firstFileIssue.errors?.[0] || null
        });

        if (firstFileIssue.errors && firstFileIssue.errors.length > 0) {
          const firstError = firstFileIssue.errors[0];
          this.logger.debug(`First error detailed structure:`, {
            ruleFailure: firstError.ruleFailure,
            level: firstError.level,
            detailsKeys: firstError.details
              ? Object.keys(firstError.details)
              : [],
            detailsMessage: firstError.details?.message || 'NO DETAILS MESSAGE',
            detailsLineNumber:
              firstError.details?.lineNumber || 'NO LINE NUMBER',
            rawDetailsObject: firstError.details
          });
        }
      }
      this.logger.debug('=== END XFI_RESULT DEBUG ===');

      // Simple direct mapping: XFI_RESULT.issueDetails -> VSCode diagnostics
      for (const fileIssue of xfiResult.issueDetails) {
        const filePath = fileIssue.filePath;
        if (!filePath || !fileIssue.errors) {
          continue;
        }

        for (const error of fileIssue.errors) {
          // Use enhanced location extraction
          const locationResult =
            DiagnosticLocationExtractor.extractLocation(error);
          const location = DiagnosticLocationExtractor.validateLocation(
            locationResult.location
          );

          this.logger.debug('Location extraction result', {
            ruleFailure: error.ruleFailure,
            found: locationResult.found,
            confidence: locationResult.confidence,
            source: location.source,
            location: location
          });

          const rawMessage =
            error.details?.message ||
            error.message ||
            error.ruleFailure ||
            'Issue detected';

          const message = this.cleanMessage(rawMessage);

          const diagnosticIssue: DiagnosticIssue = {
            file: filePath,
            line: Math.max(0, location.startLine - 1), // Convert 1-based to 0-based for VS Code
            column: Math.max(0, location.startColumn - 1), // Convert 1-based to 0-based for VS Code
            endLine: Math.max(0, location.endLine - 1), // Convert 1-based to 0-based for VS Code
            endColumn: Math.max(0, location.endColumn - 1), // Convert 1-based to 0-based for VS Code
            message: message,
            severity: this.mapSeverity(error.level),
            ruleId: error.ruleFailure || 'unknown-rule',
            category: error.category,
            code: error.ruleFailure,
            source: 'X-Fidelity'
          };

          // Preserve original XFI level and location metadata for debugging
          (diagnosticIssue as any).originalLevel = error.level;
          (diagnosticIssue as any).locationSource = location.source;
          (diagnosticIssue as any).locationConfidence =
            locationResult.confidence;

          issues.push(diagnosticIssue);
        }
      }

      this.logger.debug(`Extracted ${issues.length} issues from XFI_RESULT`);
    } catch (error) {
      this.logger.error('Error extracting issues from XFI_RESULT:', error);
    }

    return issues;
  }

  /**
   * Deep search for issueDetails in complex result structures
   */
  private deepSearchForIssueDetails(obj: any): any[] | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    if (Array.isArray(obj.issueDetails)) {
      return obj.issueDetails;
    }

    for (const value of Object.values(obj)) {
      const found = this.deepSearchForIssueDetails(value);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Extract clean issue description from structured log messages
   */
  private cleanMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'Issue detected';
    }

    // Remove literal \n and split into lines
    const lines = message.replace(/\\n/g, '\n').split('\n');

    // Find the actual issue description (usually after the metadata lines)
    let issueDescription = '';
    let foundMetadataEnd = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip metadata lines (Rule:, Severity:, File:, Line:, etc.)
      if (trimmedLine.match(/^(Rule|Severity|File|Line|Column|Level):/i)) {
        continue;
      }

      // Skip empty lines before finding content
      if (!trimmedLine && !foundMetadataEnd) {
        foundMetadataEnd = true;
        continue;
      }

      // Take the first non-empty, non-metadata line as the issue description
      if (trimmedLine && foundMetadataEnd) {
        issueDescription = trimmedLine;
        break;
      }

      // If no metadata found, take the first non-empty line
      if (trimmedLine && !issueDescription) {
        issueDescription = trimmedLine;
        break;
      }
    }

    return issueDescription || message.split('\n')[0] || 'Issue detected';
  }

  /**
   * Convert diagnostic issues to VS Code diagnostics grouped by file
   */
  private async convertToDiagnosticsMap(
    issues: DiagnosticIssue[]
  ): Promise<Map<vscode.Uri, vscode.Diagnostic[]>> {
    const diagnosticsByFile = new Map<vscode.Uri, vscode.Diagnostic[]>();
    const failedIssues: DiagnosticIssue[] = [];

    for (const issue of issues) {
      try {
        // Resolve file path to URI
        const fileUri = await this.resolveFileUri(issue.file);
        if (!fileUri) {
          this.logger.warn('Could not resolve file URI, skipping issue', {
            file: issue.file,
            rule: issue.ruleId,
            message: issue.message.substring(0, 100)
          });
          failedIssues.push(issue);
          continue;
        }

        // Create VS Code diagnostic
        const diagnostic = this.createVSCodeDiagnostic(issue);

        // Group by file
        if (!diagnosticsByFile.has(fileUri)) {
          diagnosticsByFile.set(fileUri, []);
        }
        diagnosticsByFile.get(fileUri)!.push(diagnostic);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn('Error processing issue for diagnostics', {
          issue: issue.file,
          rule: issue.ruleId,
          error: errorMessage
        });
        failedIssues.push(issue);
      }
    }

    // Log summary of failed issues
    if (failedIssues.length > 0) {
      this.logger.warn(`Failed to process ${failedIssues.length} issues`, {
        failedFiles: [...new Set(failedIssues.map(i => i.file))],
        sampleFailures: failedIssues.slice(0, 3).map(i => ({
          file: i.file,
          rule: i.ruleId,
          message: i.message.substring(0, 50)
        }))
      });
    }

    return diagnosticsByFile;
  }

  /**
   * Create a VS Code diagnostic from a diagnostic issue
   * Ensures all coordinates are valid and ranges are properly constructed
   */
  private createVSCodeDiagnostic(issue: DiagnosticIssue): vscode.Diagnostic {
    // Ensure all coordinates are valid (non-negative)
    const startLine = Math.max(0, issue.line);
    const startColumn = Math.max(0, issue.column);

    // Calculate end position with proper fallbacks
    let endLine =
      issue.endLine !== undefined ? Math.max(0, issue.endLine) : startLine;
    let endColumn =
      issue.endColumn !== undefined
        ? Math.max(0, issue.endColumn)
        : startColumn + 1;

    // Validate range consistency
    if (endLine < startLine) {
      endLine = startLine;
    }

    if (endLine === startLine && endColumn <= startColumn) {
      endColumn = startColumn + 1; // Ensure range spans at least one character
    }

    const range = new vscode.Range(startLine, startColumn, endLine, endColumn);

    const diagnostic = new vscode.Diagnostic(
      range,
      issue.message,
      this.mapToVSCodeSeverity(issue.severity)
    );

    // Set diagnostic source and code
    diagnostic.source = issue.source || 'X-Fidelity';
    diagnostic.code = issue.code || issue.ruleId;

    // Add tags if present
    if (issue.tags) {
      diagnostic.tags = issue.tags;
    }

    // Add related information with rule details
    if (issue.ruleId && issue.category) {
      diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(vscode.Uri.parse('file:///rule-info'), range),
          `Rule: ${issue.ruleId} (Category: ${issue.category})`
        )
      ];
    }

    // ENHANCEMENT: Preserve file path for hover context and other metadata
    (diagnostic as any).filePath = issue.file;
    (diagnostic as any).category = issue.category;
    (diagnostic as any).fixable = (issue as any).fixable || false;
    (diagnostic as any).ruleId = issue.ruleId;
    (diagnostic as any).originalLevel = (issue as any).originalLevel;

    return diagnostic;
  }

  /**
   * Enhanced file URI resolution with better error handling
   */
  private async resolveFileUri(filePath: string): Promise<vscode.Uri | null> {
    try {
      const fs = require('fs');

      // CRITICAL FIX: Validate file path before processing
      if (!filePath || typeof filePath !== 'string') {
        this.logger.warn('Invalid file path provided', { filePath });
        return null;
      }

      // Handle special global check files (like REPO_GLOBAL_CHECK)
      if (
        filePath === 'REPO_GLOBAL_CHECK' ||
        filePath.endsWith('REPO_GLOBAL_CHECK')
      ) {
        // For global checks, find a suitable file to open (README, package.json, etc.)
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          this.logger.warn('No workspace folder available for global check');
          return null;
        }

        const workspaceRoot = workspaceFolder.uri.fsPath;

        // Try to find a suitable file to open for global checks
        const candidateFiles = [
          'package.json',
          'README.md',
          'tsconfig.json',
          'src/index.js',
          'src/index.ts',
          'index.js',
          'index.ts'
        ];

        for (const candidate of candidateFiles) {
          const candidatePath = path.resolve(workspaceRoot, candidate);
          try {
            if (fs.existsSync(candidatePath)) {
              this.logger.debug(
                `Using ${candidate} for REPO_GLOBAL_CHECK navigation`
              );
              return vscode.Uri.file(candidatePath);
            }
          } catch (error) {
            // Continue to next candidate
          }
        }

        // Fallback: return workspace folder URI (opens folder)
        this.logger.debug(
          'No suitable file found, using workspace folder for REPO_GLOBAL_CHECK'
        );
        return workspaceFolder.uri;
      }

      // Since XFI_RESULT contains absolute paths, use them directly
      if (path.isAbsolute(filePath)) {
        // Check if file exists before creating URI
        try {
          if (fs.existsSync(filePath)) {
            return vscode.Uri.file(filePath);
          } else {
            this.logger.warn('Absolute file path does not exist', { filePath });
            // CRITICAL FIX: Return URI anyway for navigation, but log warning
            return vscode.Uri.file(filePath);
          }
        } catch (fsError) {
          this.logger.warn('Cannot check file existence', {
            filePath,
            error: fsError
          });
          return vscode.Uri.file(filePath); // Return URI anyway for testing
        }
      }

      // Handle relative paths by resolving against workspace root (fallback)
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        this.logger.warn(
          'No workspace folder available for relative path resolution',
          {
            filePath
          }
        );
        return null;
      }

      const workspaceRoot = workspaceFolder.uri.fsPath;
      const absolutePath = path.resolve(workspaceRoot, filePath);
      this.logger.debug('Resolving relative path', {
        original: filePath,
        workspaceRoot,
        resolved: absolutePath
      });

      // Check if resolved file exists
      try {
        if (fs.existsSync(absolutePath)) {
          return vscode.Uri.file(absolutePath);
        } else {
          this.logger.warn('Resolved file path does not exist', {
            absolutePath
          });
          // CRITICAL FIX: Return URI anyway for navigation
          return vscode.Uri.file(absolutePath);
        }
      } catch (fsError) {
        this.logger.warn('Cannot check resolved file existence', {
          absolutePath,
          error: fsError
        });
        return vscode.Uri.file(absolutePath); // Return URI anyway for testing
      }
    } catch (error) {
      this.logger.warn('Failed to resolve file URI', { filePath, error });
      return null;
    }
  }

  /**
   * Map X-Fidelity severity to diagnostic severity
   */
  private mapSeverity(severity?: string): 'error' | 'warning' | 'info' {
    if (!severity) {
      return 'info';
    }

    const normalizedSeverity = severity.toLowerCase().trim();

    switch (normalizedSeverity) {
      // Error levels
      case 'error':
      case 'errors':
      case 'critical':
      case 'high':
      case 'fatality':
      case 'fatalities':
      case 'fatal':
      case 'fail':
      case 'failure':
        return 'error';

      // Warning levels
      case 'warning':
      case 'warnings':
      case 'warn':
      case 'medium':
      case 'moderate':
        return 'warning';

      // Info levels
      case 'info':
      case 'information':
      case 'informational':
      case 'low':
      case 'notice':
      case 'note':
      case 'hint':
      case 'suggestion':
      default:
        // Log unknown severity levels for debugging
        if (
          normalizedSeverity &&
          ![
            'info',
            'information',
            'informational',
            'low',
            'notice',
            'note',
            'hint',
            'suggestion'
          ].includes(normalizedSeverity)
        ) {
          this.logger.debug(
            `Unknown severity level mapped to 'info': ${severity}`
          );
        }
        return 'info';
    }
  }

  /**
   * Map X-Fidelity severity to VS Code diagnostic severity
   */
  private mapToVSCodeSeverity(
    severity: 'error' | 'warning' | 'info'
  ): vscode.DiagnosticSeverity {
    switch (severity) {
      case 'error':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
      default:
        return vscode.DiagnosticSeverity.Information;
    }
  }

  /**
   * Map issue tags to VS Code diagnostic tags
   */
  private mapDiagnosticTags(tags: string[]): vscode.DiagnosticTag[] {
    const vscTags: vscode.DiagnosticTag[] = [];

    for (const tag of tags) {
      switch (tag.toLowerCase()) {
        case 'deprecated':
          vscTags.push(vscode.DiagnosticTag.Deprecated);
          break;
        case 'unnecessary':
          vscTags.push(vscode.DiagnosticTag.Unnecessary);
          break;
      }
    }

    return vscTags;
  }

  /**
   * Clear all diagnostics with proper event firing
   */
  public clearDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.issueCount = 0;
    this.logger.info('Diagnostics cleared');

    // Emit diagnostic update event for clearing
    this.onDiagnosticsUpdated.fire({
      totalIssues: 0,
      filesWithIssues: 0
    });
  }

  /**
   * Get current diagnostics statistics
   */
  public getStats(): { issueCount: number; lastUpdateTime: number } {
    return {
      issueCount: this.issueCount,
      lastUpdateTime: this.lastUpdateTime
    };
  }

  /**
   * Open file at specific issue location
   */
  public async openIssueLocation(issue: DiagnosticIssue): Promise<void> {
    try {
      const fileUri = await this.resolveFileUri(issue.file);
      if (!fileUri) {
        throw new Error(`Cannot resolve file: ${issue.file}`);
      }

      // Create range using enhanced location information
      const startLine = issue.line;
      const startColumn = issue.column;
      const endLine = issue.endLine !== undefined ? issue.endLine : issue.line;
      const endColumn =
        issue.endColumn !== undefined ? issue.endColumn : issue.column + 1;

      const range = new vscode.Range(
        startLine,
        startColumn,
        endLine,
        Math.max(startColumn + 1, endColumn)
      );

      const options: vscode.TextDocumentShowOptions = {
        selection: range,
        viewColumn: vscode.ViewColumn.Active
      };

      await vscode.window.showTextDocument(fileUri, options);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to open issue location', {
        issue,
        error: errorMessage
      });

      vscode.window.showErrorMessage(
        `Failed to open ${issue.file}: ${errorMessage}`
      );
    }
  }

  /**
   * Export diagnostics to external format
   */
  public exportDiagnostics(): any[] {
    const exports: any[] = [];

    this.diagnosticCollection.forEach((uri, diagnostics) => {
      for (const diagnostic of diagnostics) {
        exports.push({
          file: uri.fsPath,
          line: diagnostic.range.start.line + 1, // Convert back to 1-based
          column: diagnostic.range.start.character + 1, // Convert back to 1-based
          endLine: diagnostic.range.end.line + 1, // Convert back to 1-based
          endColumn: diagnostic.range.end.character + 1, // Convert back to 1-based
          message: diagnostic.message,
          severity: this.mapFromVSCodeSeverity(diagnostic.severity),
          source: diagnostic.source,
          code: diagnostic.code
        });
      }
    });

    return exports;
  }

  /**
   * Map VS Code severity back to string
   */
  private mapFromVSCodeSeverity(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'info';
    }
  }

  private setupDecorations(): void {
    const config = this.configManager.getConfig();

    if (!config.showInlineDecorations) {
      return;
    }

    // Create decoration type for enhanced visual feedback
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        margin: '0 0 0 1em',
        fontStyle: 'italic',
        color: new vscode.ThemeColor('editorCodeLens.foreground')
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
    });
  }

  private setupEventListeners(): void {
    // Update decorations when active editor changes
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        this.updateDecorations();
      })
    );

    // Update decorations when visible editors change
    this.disposables.push(
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.updateDecorations();
      })
    );

    // Refresh decorations when configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.setupDecorations();
        this.updateDecorations();
      })
    );
  }

  // Add this new method:
  private scheduleDecorationUpdate(): void {
    if (this.decorationUpdateDebouncer) {
      clearTimeout(this.decorationUpdateDebouncer);
    }

    this.decorationUpdateDebouncer = setTimeout(() => {
      this.updateDecorations();
    }, this.DECORATION_UPDATE_DELAY);
  }

  // Optimize updateDecorations method:
  private updateDecorations(): void {
    const startTime = performance.now();
    const config = this.configManager.getConfig();

    if (!config.showInlineDecorations || !this.decorationType) {
      return;
    }

    const visibleEditors = vscode.window.visibleTextEditors;
    let totalDecorations = 0;

    for (const editor of visibleEditors) {
      const decorationStart = performance.now();

      const diagnostics = this.diagnosticCollection.get(editor.document.uri);
      if (!diagnostics || diagnostics.length === 0) {
        editor.setDecorations(this.decorationType, []);
        continue;
      }

      // Limit decorations for performance (max 100 per file)
      const maxDecorations = 100;
      const limitedDiagnostics = diagnostics.slice(0, maxDecorations);

      if (diagnostics.length > maxDecorations) {
        this.logger.warn('Too many diagnostics, limiting decorations', {
          file: editor.document.uri.fsPath,
          total: diagnostics.length,
          limited: maxDecorations
        });
      }

      const decorations: vscode.DecorationOptions[] = [];

      for (const diagnostic of limitedDiagnostics) {
        if (!this.shouldShowDecoration(diagnostic, config)) {
          continue;
        }

        const decoration: vscode.DecorationOptions = {
          range: diagnostic.range,
          renderOptions: {
            after: {
              contentText: this.getDecorationText(diagnostic),
              color: this.getDecorationColor(diagnostic)
            }
          },
          hoverMessage: this.getHoverMessage(diagnostic)
        };

        decorations.push(decoration);
      }

      editor.setDecorations(this.decorationType, decorations);
      totalDecorations += decorations.length;

      const decorationTime = performance.now() - decorationStart;
      if (decorationTime > 50) {
        this.logger.warn('Slow decoration update for file', {
          file: editor.document.uri.fsPath,
          decorationTime,
          decorationCount: decorations.length
        });
      }
    }

    const totalTime = performance.now() - startTime;
    this.logger.debug('Decorations updated', {
      totalTime,
      editorsProcessed: visibleEditors.length,
      totalDecorations
    });
  }

  private shouldShowDecoration(
    diagnostic: vscode.Diagnostic,
    config: any
  ): boolean {
    // Only filter decorations, not the diagnostics themselves
    const config2 = this.configManager.getConfig();
    if (!config2.showInlineDecorations) {
      return false;
    }
    const severityLevel = this.mapSeverityToLevel(diagnostic.severity);
    return config.highlightSeverity.includes(severityLevel);
  }

  private getDecorationText(diagnostic: vscode.Diagnostic): string {
    const ruleId = (diagnostic as any).ruleId;
    return ruleId ? ` [${ruleId}]` : '';
  }

  private getDecorationColor(diagnostic: vscode.Diagnostic): string {
    switch (diagnostic.severity) {
      case vscode.DiagnosticSeverity.Error:
        return '#ff6b6b';
      case vscode.DiagnosticSeverity.Warning:
        return '#ffa726';
      case vscode.DiagnosticSeverity.Information:
        return '#42a5f5';
      case vscode.DiagnosticSeverity.Hint:
        return '#66bb6a';
      default:
        return '#999999';
    }
  }

  private getHoverMessage(
    diagnostic: vscode.Diagnostic
  ): vscode.MarkdownString {
    const config = this.configManager.getConfig();
    const ruleId = (diagnostic as any).ruleId;
    const category = (diagnostic as any).category;
    const fixable = (diagnostic as any).fixable;
    const filePath = (diagnostic as any).filePath || '';

    const markdown = new vscode.MarkdownString();

    // ENHANCEMENT: Enable HTML support and make it trusted for better interactivity
    markdown.isTrusted = true;
    markdown.supportHtml = true;

    // Main message with enhanced styling
    markdown.appendMarkdown(`**X-Fidelity: ${diagnostic.message}**\n\n`);

    // Rule information
    if (ruleId) {
      markdown.appendMarkdown(`**Rule:** \`${ruleId}\`\n\n`);
    }

    if (category) {
      markdown.appendMarkdown(`**Category:** ${category}\n\n`);
    }

    // Severity
    const severityText = this.getSeverityText(diagnostic.severity);
    markdown.appendMarkdown(`**Severity:** ${severityText}\n\n`);

    // ENHANCEMENT: Add separator for actions section
    markdown.appendMarkdown(`---\n\n`);
    markdown.appendMarkdown(`**🛠️ Actions:**\n\n`);

    // Create diagnostic context for commands
    const diagnosticContext = {
      message: diagnostic.message,
      ruleId: ruleId,
      category: category,
      severity: this.mapFromVSCodeSeverity(diagnostic.severity),
      file: filePath,
      line: diagnostic.range.start.line + 1, // Convert to 1-based
      column: diagnostic.range.start.character + 1, // Convert to 1-based
      fixable: fixable || false,
      code: diagnostic.code
    };

    // ENHANCEMENT: Add Explain Issue action link
    markdown.appendMarkdown(
      `[🤔 Explain Issue](command:xfidelity.explainIssue?${encodeURIComponent(JSON.stringify(diagnosticContext))}) • `
    );

    // ENHANCEMENT: Add Fix Issue action link (always available)
    const fixLabel = fixable ? '✨ Fix Issue' : '✨ Fix Issue';
    markdown.appendMarkdown(
      `[${fixLabel}](command:xfidelity.fixIssue?${encodeURIComponent(JSON.stringify(diagnosticContext))}) • `
    );

    //Rule documentation link (if enabled)
    if (config.showRuleDocumentation && ruleId) {
      markdown.appendMarkdown(
        `[📖 View Documentation](command:xfidelity.showRuleDocumentation?${encodeURIComponent(JSON.stringify([ruleId]))})`
      );
    }

    markdown.appendMarkdown(`\n\n`);

    // ENHANCEMENT: Add footer with tip about hover persistence
    markdown.appendMarkdown(`---\n\n`);
    markdown.appendMarkdown(
      `💡 *Tip: This tooltip stays open when you hover over it for easy interaction*`
    );

    return markdown;
  }

  private getSeverityText(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return '🔴 Error';
      case vscode.DiagnosticSeverity.Warning:
        return '🟡 Warning';
      case vscode.DiagnosticSeverity.Information:
        return '🔵 Info';
      case vscode.DiagnosticSeverity.Hint:
        return '💡 Hint';
      default:
        return 'Unknown';
    }
  }

  private mapSeverityToLevel(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'hint';
    }
  }

  // Public API for other components
  getDiagnosticsForFile(uri: vscode.Uri): readonly vscode.Diagnostic[] {
    return this.diagnosticCollection.get(uri) || [];
  }

  getAllDiagnostics(): [vscode.Uri, vscode.Diagnostic[]][] {
    const result: [vscode.Uri, vscode.Diagnostic[]][] = [];
    this.diagnosticCollection.forEach((uri, diagnostics) => {
      result.push([uri, [...diagnostics]]);
    });
    return result;
  }

  getDiagnosticsSummary(): {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    hints: number;
  } {
    let total = 0,
      errors = 0,
      warnings = 0,
      info = 0,
      hints = 0;

    this.diagnosticCollection.forEach((uri, diagnostics) => {
      total += diagnostics.length;
      for (const diagnostic of diagnostics) {
        switch (diagnostic.severity) {
          case vscode.DiagnosticSeverity.Error:
            errors++;
            break;
          case vscode.DiagnosticSeverity.Warning:
            warnings++;
            break;
          case vscode.DiagnosticSeverity.Information:
            info++;
            break;
          case vscode.DiagnosticSeverity.Hint:
            hints++;
            break;
        }
      }
    });

    return { total, errors, warnings, info, hints };
  }

  dispose(): void {
    this.decorationType?.dispose();
    this.diagnosticCollection.dispose();
    this.onDiagnosticsUpdated.dispose();

    if (this.decorationUpdateDebouncer) {
      clearTimeout(this.decorationUpdateDebouncer);
    }

    for (const disposable of this.disposables) {
      try {
        disposable.dispose();
      } catch (error) {
        this.logger.warn(
          'Error disposing diagnostic provider resource:',
          error
        );
      }
    }

    this.disposables.length = 0;
    this.logger.info('Disposing Diagnostic Provider');
  }

  /**
   * Validation Methods for Diagnostic Accuracy
   * These methods ensure 100% accuracy in problems panel population and line number handling
   */

  /**
   * Validate that all diagnostics have correct coordinate conversion (1-based to 0-based)
   */
  public validateDiagnosticCoordinates(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    let isValid = true;

    for (const [uri, diagnostics] of this.diagnosticCollection) {
      for (const diagnostic of diagnostics) {
        // Validate line numbers are 0-based
        if (diagnostic.range.start.line < 0) {
          errors.push(
            `${uri.fsPath}: Start line ${diagnostic.range.start.line} is negative (should be 0-based)`
          );
          isValid = false;
        }

        if (diagnostic.range.end.line < 0) {
          errors.push(
            `${uri.fsPath}: End line ${diagnostic.range.end.line} is negative (should be 0-based)`
          );
          isValid = false;
        }

        // Validate column numbers are 0-based
        if (diagnostic.range.start.character < 0) {
          errors.push(
            `${uri.fsPath}: Start character ${diagnostic.range.start.character} is negative (should be 0-based)`
          );
          isValid = false;
        }

        if (diagnostic.range.end.character < 0) {
          errors.push(
            `${uri.fsPath}: End character ${diagnostic.range.end.character} is negative (should be 0-based)`
          );
          isValid = false;
        }

        // Validate range consistency
        if (diagnostic.range.end.line < diagnostic.range.start.line) {
          errors.push(
            `${uri.fsPath}: End line ${diagnostic.range.end.line} before start line ${diagnostic.range.start.line}`
          );
          isValid = false;
        }

        if (
          diagnostic.range.end.line === diagnostic.range.start.line &&
          diagnostic.range.end.character < diagnostic.range.start.character
        ) {
          errors.push(
            `${uri.fsPath}: End character ${diagnostic.range.end.character} before start character ${diagnostic.range.start.character} on same line`
          );
          isValid = false;
        }

        // Validate required properties
        if (!diagnostic.message) {
          errors.push(`${uri.fsPath}: Diagnostic missing message`);
          isValid = false;
        }

        if (!diagnostic.source) {
          errors.push(`${uri.fsPath}: Diagnostic missing source`);
          isValid = false;
        }

        if (diagnostic.source !== 'X-Fidelity') {
          errors.push(
            `${uri.fsPath}: Diagnostic has incorrect source: ${diagnostic.source} (expected 'X-Fidelity')`
          );
          isValid = false;
        }

        if (!diagnostic.code) {
          errors.push(`${uri.fsPath}: Diagnostic missing code (rule ID)`);
          isValid = false;
        }
      }
    }

    this.logger.info('Diagnostic coordinate validation completed', {
      isValid,
      errorCount: errors.length,
      totalDiagnostics: this.issueCount
    });

    return { isValid, errors };
  }

  /**
   * Validate that diagnostics can be navigated to (files exist and lines are in bounds)
   */
  public async validateDiagnosticNavigation(): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let isValid = true;

    for (const [uri, diagnostics] of this.diagnosticCollection) {
      try {
        // Check if file exists and can be opened
        const document = await vscode.workspace.openTextDocument(uri);

        for (const diagnostic of diagnostics) {
          const startLine = diagnostic.range.start.line;
          const endLine = diagnostic.range.end.line;

          // Validate line numbers are within document bounds
          if (startLine >= document.lineCount) {
            errors.push(
              `${uri.fsPath}:${startLine + 1}: Line ${startLine + 1} is beyond document end (${document.lineCount} lines)`
            );
            isValid = false;
          }

          if (endLine >= document.lineCount) {
            errors.push(
              `${uri.fsPath}:${endLine + 1}: End line ${endLine + 1} is beyond document end (${document.lineCount} lines)`
            );
            isValid = false;
          }

          // Validate column numbers are within line bounds
          if (startLine < document.lineCount) {
            const lineText = document.lineAt(startLine).text;
            const startChar = diagnostic.range.start.character;

            if (startChar > lineText.length) {
              errors.push(
                `${uri.fsPath}:${startLine + 1}:${startChar + 1}: Column ${startChar + 1} is beyond line end (${lineText.length} characters)`
              );
              isValid = false;
            }
          }

          if (endLine < document.lineCount && endLine === startLine) {
            const lineText = document.lineAt(endLine).text;
            const endChar = diagnostic.range.end.character;

            if (endChar > lineText.length) {
              errors.push(
                `${uri.fsPath}:${endLine + 1}:${endChar + 1}: End column ${endChar + 1} is beyond line end (${lineText.length} characters)`
              );
              isValid = false;
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push(
          `${uri.fsPath}: Cannot open file for validation: ${errorMessage}`
        );
        isValid = false;
      }
    }

    this.logger.info('Diagnostic navigation validation completed', {
      isValid,
      errorCount: errors.length,
      totalDiagnostics: this.issueCount
    });

    return { isValid, errors };
  }

  /**
   * Validate severity mapping consistency
   */
  public validateSeverityMapping(expectedCounts?: {
    errors: number;
    warnings: number;
    info: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = true;

    const summary = this.getDiagnosticsSummary();

    // Validate severity distribution makes sense
    if (
      summary.total !==
      summary.errors + summary.warnings + summary.info + summary.hints
    ) {
      errors.push(
        `Severity count mismatch: total ${summary.total} != errors ${summary.errors} + warnings ${summary.warnings} + info ${summary.info} + hints ${summary.hints}`
      );
      isValid = false;
    }

    // Validate against expected counts if provided
    if (expectedCounts) {
      if (summary.errors !== expectedCounts.errors) {
        errors.push(
          `Error count mismatch: expected ${expectedCounts.errors}, got ${summary.errors}`
        );
        isValid = false;
      }

      if (summary.warnings !== expectedCounts.warnings) {
        errors.push(
          `Warning count mismatch: expected ${expectedCounts.warnings}, got ${summary.warnings}`
        );
        isValid = false;
      }

      if (summary.info !== expectedCounts.info) {
        errors.push(
          `Info count mismatch: expected ${expectedCounts.info}, got ${summary.info}`
        );
        isValid = false;
      }
    }

    // Validate each diagnostic has a valid severity
    for (const [uri, diagnostics] of this.diagnosticCollection) {
      for (const diagnostic of diagnostics) {
        const validSeverities = [
          vscode.DiagnosticSeverity.Error,
          vscode.DiagnosticSeverity.Warning,
          vscode.DiagnosticSeverity.Information,
          vscode.DiagnosticSeverity.Hint
        ];

        if (!validSeverities.includes(diagnostic.severity)) {
          errors.push(
            `${uri.fsPath}: Invalid severity ${diagnostic.severity} for diagnostic "${diagnostic.message}"`
          );
          isValid = false;
        }
      }
    }

    this.logger.info('Severity mapping validation completed', {
      isValid,
      errorCount: errors.length,
      severitySummary: summary,
      expectedCounts
    });

    return { isValid, errors };
  }

  /**
   * Validate problems panel integration (checks if diagnostics are actually visible in problems panel)
   */
  public validateProblemsPanel(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    let isValid = true;

    // Check if diagnostics are registered with VS Code
    const registeredDiagnostics = vscode.languages.getDiagnostics();

    // Find X-Fidelity diagnostics in the global diagnostics
    let totalXFIDiagnostics = 0;
    let xfidelityFiles = 0;

    for (const [, diagnostics] of registeredDiagnostics) {
      const xfiDiagnostics = diagnostics.filter(d => d.source === 'X-Fidelity');
      if (xfiDiagnostics.length > 0) {
        totalXFIDiagnostics += xfiDiagnostics.length;
        xfidelityFiles++;
      }
    }

    // Validate that our diagnostics are actually registered
    if (totalXFIDiagnostics === 0 && this.issueCount > 0) {
      errors.push(
        `No X-Fidelity diagnostics found in problems panel, but ${this.issueCount} issues were processed`
      );
      isValid = false;
    }

    if (totalXFIDiagnostics !== this.issueCount) {
      errors.push(
        `Diagnostic count mismatch: problems panel has ${totalXFIDiagnostics}, but provider has ${this.issueCount}`
      );
      isValid = false;
    }

    // Validate that files match
    let ourFiles = 0;
    this.diagnosticCollection.forEach(() => {
      ourFiles++;
    });
    if (xfidelityFiles !== ourFiles) {
      errors.push(
        `File count mismatch: problems panel has ${xfidelityFiles} files, but provider has ${ourFiles} files`
      );
      isValid = false;
    }

    this.logger.info('Problems panel validation completed', {
      isValid,
      errorCount: errors.length,
      problemsPanelDiagnostics: totalXFIDiagnostics,
      problemsPanelFiles: xfidelityFiles,
      providerDiagnostics: this.issueCount,
      providerFiles: ourFiles
    });

    return { isValid, errors };
  }

  /**
   * Run comprehensive validation of all diagnostic aspects
   */
  public async runComprehensiveValidation(expectedCounts?: {
    errors: number;
    warnings: number;
    info: number;
  }): Promise<{
    isValid: boolean;
    coordinateValidation: { isValid: boolean; errors: string[] };
    navigationValidation: { isValid: boolean; errors: string[] };
    severityValidation: { isValid: boolean; errors: string[] };
    problemsPanelValidation: { isValid: boolean; errors: string[] };
    summary: string[];
  }> {
    this.logger.info('Starting comprehensive diagnostic validation');

    const coordinateValidation = this.validateDiagnosticCoordinates();
    const navigationValidation = await this.validateDiagnosticNavigation();
    const severityValidation = this.validateSeverityMapping(expectedCounts);
    const problemsPanelValidation = this.validateProblemsPanel();

    const isValid =
      coordinateValidation.isValid &&
      navigationValidation.isValid &&
      severityValidation.isValid &&
      problemsPanelValidation.isValid;

    const summary: string[] = [];

    if (coordinateValidation.isValid) {
      summary.push('✅ Coordinate conversion validation passed');
    } else {
      summary.push(
        `❌ Coordinate conversion validation failed (${coordinateValidation.errors.length} errors)`
      );
    }

    if (navigationValidation.isValid) {
      summary.push('✅ Navigation validation passed');
    } else {
      summary.push(
        `❌ Navigation validation failed (${navigationValidation.errors.length} errors)`
      );
    }

    if (severityValidation.isValid) {
      summary.push('✅ Severity mapping validation passed');
    } else {
      summary.push(
        `❌ Severity mapping validation failed (${severityValidation.errors.length} errors)`
      );
    }

    if (problemsPanelValidation.isValid) {
      summary.push('✅ Problems panel integration validation passed');
    } else {
      summary.push(
        `❌ Problems panel integration validation failed (${problemsPanelValidation.errors.length} errors)`
      );
    }

    this.logger.info('Comprehensive validation completed', {
      isValid,
      totalDiagnostics: this.issueCount,
      summary
    });

    return {
      isValid,
      coordinateValidation,
      navigationValidation,
      severityValidation,
      problemsPanelValidation,
      summary
    };
  }
}
