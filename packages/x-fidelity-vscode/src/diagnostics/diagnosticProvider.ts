import * as vscode from 'vscode';
import type { AnalysisResult } from '../analysis/types';
import { ConfigManager } from '../configuration/configManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import type { ResultMetadata } from '@x-fidelity/types';

export interface DiagnosticIssue {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  ruleId: string;
  category?: string;
  code?: string;
  source?: string;
  tags?: vscode.DiagnosticTag[];
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
  private logger: VSCodeLogger;
  private issueCount = 0;

  constructor(private configManager: ConfigManager) {
    this.logger = new VSCodeLogger('DiagnosticProvider');
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection('x-fidelity');
    this.setupDecorations();
    this.setupEventListeners();
    this.disposables.push(this.diagnosticCollection);

    this.logger.info('Enhanced Diagnostic Provider initialized');
  }

  /**
   * Update diagnostics from analysis result
   * Converts X-Fidelity issues to VS Code diagnostics for Problems panel integration
   */
  public async updateDiagnostics(
    result: AnalysisResult | ResultMetadata
  ): Promise<void> {
    const startTime = performance.now();

    try {
      // Clear existing diagnostics
      this.diagnosticCollection.clear();

      // Extract issues from result
      const issues = this.extractIssuesFromResult(result);
      this.logger.info('Extracted issues for diagnostics', {
        count: issues.length
      });

      if (issues.length === 0) {
        this.issueCount = 0;
        this.lastUpdateTime = performance.now() - startTime;
        return;
      }

      // Convert to VS Code diagnostics and group by file
      const diagnosticsByFile = await this.convertToDiagnosticsMap(issues);

      // Batch update diagnostics for all files
      for (const [fileUri, diagnostics] of diagnosticsByFile) {
        this.diagnosticCollection.set(fileUri, diagnostics);
      }

      this.issueCount = issues.length;
      this.lastUpdateTime = performance.now() - startTime;

      this.logger.info('Diagnostics updated successfully', {
        issueCount: this.issueCount,
        fileCount: diagnosticsByFile.size,
        updateTime: `${this.lastUpdateTime.toFixed(2)}ms`
      });

      // Show success notification with action to view results
      vscode.window
        .showInformationMessage(
          `X-Fidelity: ${this.issueCount} issues found across ${diagnosticsByFile.size} files`,
          'View Problems',
          'Focus Editor'
        )
        .then(choice => {
          if (choice === 'View Problems') {
            vscode.commands.executeCommand(
              'workbench.panel.markers.view.focus'
            );
          } else if (choice === 'Focus Editor' && diagnosticsByFile.size > 0) {
            // Open first file with issues
            const firstFile = Array.from(diagnosticsByFile.keys())[0];
            vscode.window.showTextDocument(firstFile);
          }
        });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to update diagnostics', {
        error: errorMessage
      });

      vscode.window
        .showErrorMessage(
          `Failed to update diagnostics: ${errorMessage}`,
          'Show Output'
        )
        .then(choice => {
          if (choice === 'Show Output') {
            vscode.commands.executeCommand(
              'workbench.action.output.toggleOutput'
            );
          }
        });
    }
  }

  /**
   * Extract issues from analysis result in a standardized format
   */
  private extractIssuesFromResult(
    result: AnalysisResult | ResultMetadata
  ): DiagnosticIssue[] {
    const issues: DiagnosticIssue[] = [];

    try {
      // Handle different result formats
      const xfiResult = 'XFI_RESULT' in result ? result.XFI_RESULT : result;

      if (!xfiResult || typeof xfiResult !== 'object') {
        this.logger.warn('No detailed results found in analysis result');
        return issues;
      }

      // Check for detailedResults property with proper type checking
      const detailedResults =
        (xfiResult as any).detailedResults || (xfiResult as any).issueDetails;
      if (!detailedResults) {
        this.logger.warn(
          'No detailed results or issue details found in analysis result'
        );
        return issues;
      }

      // Process each file's results
      for (const [filePath, fileResults] of Object.entries(detailedResults)) {
        if (!fileResults || typeof fileResults !== 'object') {
          continue;
        }

        // Handle both detailedResults format and issueDetails format
        const issuesArray =
          (fileResults as any).issues ||
          (fileResults as any).errors ||
          (Array.isArray(fileResults) ? fileResults : []);
        if (!Array.isArray(issuesArray)) {
          continue;
        }

        for (const issue of issuesArray) {
          // Extract location information from multiple possible formats
          const locationInfo = this.extractLocationInfo(issue);

          // Create multiple diagnostics for complex issues with multiple locations
          if (locationInfo.locations && locationInfo.locations.length > 0) {
            // Handle multiple locations (e.g., function complexity with multiple functions)
            for (const location of locationInfo.locations) {
              const diagnosticIssue: DiagnosticIssue = {
                file: filePath,
                line: location.line,
                column: location.column,
                endLine: location.endLine,
                endColumn: location.endColumn,
                message: this.formatComplexMessage(issue, location),
                severity: this.mapSeverity(issue.level || issue.severity),
                ruleId: issue.ruleFailure || issue.ruleId || 'unknown-rule',
                category: issue.category,
                code: issue.code,
                source: 'X-Fidelity'
              };

              // Add diagnostic tags for deprecated code, etc.
              if (issue.tags) {
                diagnosticIssue.tags = this.mapDiagnosticTags(issue.tags);
              }

              issues.push(diagnosticIssue);
            }
          } else {
            // Handle simple single location
            const diagnosticIssue: DiagnosticIssue = {
              file: filePath,
              line: locationInfo.line,
              column: locationInfo.column,
              endLine: locationInfo.endLine,
              endColumn: locationInfo.endColumn,
              message:
                issue.details?.message || issue.message || 'Unknown issue',
              severity: this.mapSeverity(issue.level || issue.severity),
              ruleId: issue.ruleFailure || issue.ruleId || 'unknown-rule',
              category: issue.category,
              code: issue.code,
              source: 'X-Fidelity'
            };

            // Add diagnostic tags for deprecated code, etc.
            if (issue.tags) {
              diagnosticIssue.tags = this.mapDiagnosticTags(issue.tags);
            }

            issues.push(diagnosticIssue);
          }
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('Error extracting issues from result', {
        error: errorMessage
      });
    }

    return issues;
  }

  /**
   * Extract location information from various X-Fidelity issue formats
   */
  private extractLocationInfo(issue: any): {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
    locations?: Array<{
      line: number;
      column: number;
      endLine?: number;
      endColumn?: number;
      context?: any;
    }>;
  } {
    // Default location (0-based for VSCode)
    let line = 0;
    let column = 0;
    let endLine: number | undefined;
    let endColumn: number | undefined;
    const locations: Array<{
      line: number;
      column: number;
      endLine?: number;
      endColumn?: number;
      context?: any;
    }> = [];

    // Check for simple lineNumber format
    if (issue.lineNumber && typeof issue.lineNumber === 'number') {
      line = Math.max(0, issue.lineNumber - 1); // Convert to 0-based
      column = Math.max(0, (issue.column || 1) - 1); // Convert to 0-based
    }

    // Check for details array with line information (e.g., sensitive logging)
    if (issue.details && Array.isArray(issue.details)) {
      for (const detail of issue.details) {
        if (detail.lineNumber && typeof detail.lineNumber === 'number') {
          locations.push({
            line: Math.max(0, detail.lineNumber - 1), // Convert to 0-based
            column: 0, // No column info in simple format
            context: detail
          });
        }
      }
    }

    // Check for AST-based location information (e.g., function complexity)
    if (
      issue.details &&
      issue.details.complexities &&
      Array.isArray(issue.details.complexities)
    ) {
      for (const complexity of issue.details.complexities) {
        if (complexity.metrics && complexity.metrics.location) {
          const loc = complexity.metrics.location;
          locations.push({
            line: Math.max(0, (loc.startLine || 1) - 1), // Convert to 0-based
            column: Math.max(0, (loc.startColumn || 1) - 1), // Convert to 0-based
            endLine: loc.endLine ? Math.max(0, loc.endLine - 1) : undefined, // Convert to 0-based
            endColumn: loc.endColumn
              ? Math.max(0, loc.endColumn - 1)
              : undefined, // Convert to 0-based
            context: complexity
          });
        }
      }
    }

    // Check for direct location object
    if (issue.location) {
      const loc = issue.location;
      line = Math.max(0, (loc.startLine || loc.line || 1) - 1); // Convert to 0-based
      column = Math.max(0, (loc.startColumn || loc.column || 1) - 1); // Convert to 0-based
      endLine = loc.endLine ? Math.max(0, loc.endLine - 1) : undefined; // Convert to 0-based
      endColumn = loc.endColumn ? Math.max(0, loc.endColumn - 1) : undefined; // Convert to 0-based
    }

    // If we have multiple locations, use the first one as primary and return all
    if (locations.length > 0) {
      const primaryLocation = locations[0];
      return {
        line: primaryLocation.line,
        column: primaryLocation.column,
        endLine: primaryLocation.endLine,
        endColumn: primaryLocation.endColumn,
        locations
      };
    }

    return { line, column, endLine, endColumn };
  }

  /**
   * Format message for complex issues with specific location context
   */
  private formatComplexMessage(issue: any, location: any): string {
    const baseMessage =
      issue.details?.message || issue.message || 'Unknown issue';

    // Add context for function complexity issues
    if (location.context && location.context.metrics) {
      const metrics = location.context.metrics;
      const functionName =
        metrics.name !== 'anonymous' ? metrics.name : 'anonymous function';

      let complexityInfo = `${functionName}`;
      if (metrics.cyclomaticComplexity) {
        complexityInfo += ` (Cyclomatic: ${metrics.cyclomaticComplexity}`;
      }
      if (metrics.cognitiveComplexity) {
        complexityInfo += `, Cognitive: ${metrics.cognitiveComplexity}`;
      }
      if (metrics.nestingDepth) {
        complexityInfo += `, Nesting: ${metrics.nestingDepth}`;
      }
      complexityInfo += ')';

      return `${baseMessage} - ${complexityInfo}`;
    }

    // Add context for pattern matching issues
    if (location.context && location.context.match) {
      return `${baseMessage} - Found: ${location.context.match}`;
    }

    return baseMessage;
  }

  /**
   * Convert diagnostic issues to VS Code diagnostics grouped by file
   */
  private async convertToDiagnosticsMap(
    issues: DiagnosticIssue[]
  ): Promise<Map<vscode.Uri, vscode.Diagnostic[]>> {
    const diagnosticsByFile = new Map<vscode.Uri, vscode.Diagnostic[]>();

    for (const issue of issues) {
      try {
        // Resolve file path to URI
        const fileUri = await this.resolveFileUri(issue.file);
        if (!fileUri) {
          this.logger.warn('Could not resolve file URI', { file: issue.file });
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
          error: errorMessage
        });
      }
    }

    return diagnosticsByFile;
  }

  /**
   * Create a VS Code diagnostic from a diagnostic issue
   */
  private createVSCodeDiagnostic(issue: DiagnosticIssue): vscode.Diagnostic {
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
      Math.max(startColumn + 1, endColumn) // Ensure range spans at least one character
    );

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

    return diagnostic;
  }

  /**
   * Resolve file path to VS Code URI
   */
  private async resolveFileUri(filePath: string): Promise<vscode.Uri | null> {
    try {
      // Handle absolute paths
      if (require('path').isAbsolute(filePath)) {
        return vscode.Uri.file(filePath);
      }

      // Handle relative paths - resolve against workspace root
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        const absolutePath = require('path').resolve(
          workspaceFolder.uri.fsPath,
          filePath
        );
        return vscode.Uri.file(absolutePath);
      }

      // Fallback: try to parse as URI
      return vscode.Uri.parse(filePath);
    } catch (error) {
      this.logger.warn('Failed to resolve file URI', { filePath, error });
      return null;
    }
  }

  /**
   * Map X-Fidelity severity to diagnostic severity
   */
  private mapSeverity(severity?: string): 'error' | 'warning' | 'info' {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'critical':
      case 'high':
        return 'error';
      case 'warning':
      case 'medium':
        return 'warning';
      case 'info':
      case 'low':
      default:
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
   * Clear all diagnostics
   */
  public clearDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.issueCount = 0;
    this.logger.info('Diagnostics cleared');
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

    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // Main message
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

    // Rule documentation link (if enabled)
    if (config.showRuleDocumentation && ruleId) {
      markdown.appendMarkdown(
        `[View Rule Documentation](command:xfidelity.showRuleDocumentation?${encodeURIComponent(JSON.stringify([ruleId]))})\n\n`
      );
    }

    // Quick actions
    if ((diagnostic as any).fixable) {
      markdown.appendMarkdown(`💡 **Quick Fix Available**\n\n`);
    }

    // Exemption option
    markdown.appendMarkdown(
      `[Add Exemption](command:xfidelity.addExemption?${encodeURIComponent(JSON.stringify([ruleId, diagnostic.range]))})`
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
    if (this.decorationUpdateDebouncer) {
      clearTimeout(this.decorationUpdateDebouncer);
    }
    this.diagnosticCollection.dispose();
    this.decorationType?.dispose();
    this.disposables.forEach(d => d.dispose());
    this.disposables.length = 0;
    this.logger.info('Disposing Diagnostic Provider');
  }
}
