import * as vscode from 'vscode';
import type { AnalysisResult } from '../analysis/analysisManager';
import { ConfigManager } from '../configuration/configManager';

export class DiagnosticProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private decorationType?: vscode.TextEditorDecorationType;
  private disposables: vscode.Disposable[] = [];
  
  constructor(private configManager: ConfigManager) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('x-fidelity');
    this.setupDecorations();
    this.setupEventListeners();
  }
  
  updateDiagnostics(result: AnalysisResult): void {
    this.clearDiagnostics();
    
    // Always update diagnostics regardless of decoration settings
    // This ensures Problems panel shows all issues even if inline decorations are disabled
    for (const [filePath, diagnostics] of result.diagnostics) {
      const fileUri = this.getFileUri(filePath);
      if (fileUri) {
        this.diagnosticCollection.set(fileUri, diagnostics);
      }
    }
    
    // Update decorations for visible editors (respects showInlineDecorations setting)
    this.updateDecorations();
  }
  
  clearDiagnostics(): void {
    this.diagnosticCollection.clear();
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
        color: new vscode.ThemeColor('editorCodeLens.foreground'),
      },
      rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
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
  
  private updateDecorations(): void {
    const config = this.configManager.getConfig();
    
    if (!config.showInlineDecorations || !this.decorationType) {
      return;
    }
    
    for (const editor of vscode.window.visibleTextEditors) {
      const diagnostics = this.diagnosticCollection.get(editor.document.uri);
      if (!diagnostics || diagnostics.length === 0) {
        editor.setDecorations(this.decorationType, []);
        continue;
      }
      
      const decorations: vscode.DecorationOptions[] = [];
      
      for (const diagnostic of diagnostics) {
        // Only show decorations for configured severity levels
        if (!this.shouldShowDecoration(diagnostic, config)) {
          continue;
        }
        
        const decoration: vscode.DecorationOptions = {
          range: diagnostic.range,
          renderOptions: {
            after: {
              contentText: this.getDecorationText(diagnostic),
              color: this.getDecorationColor(diagnostic),
            }
          },
          hoverMessage: this.getHoverMessage(diagnostic)
        };
        
        decorations.push(decoration);
      }
      
      editor.setDecorations(this.decorationType, decorations);
    }
  }
  
  private shouldShowDecoration(diagnostic: vscode.Diagnostic, config: any): boolean {
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
  
  private getHoverMessage(diagnostic: vscode.Diagnostic): vscode.MarkdownString {
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
      markdown.appendMarkdown(`[View Rule Documentation](command:xfidelity.showRuleDocumentation?${encodeURIComponent(JSON.stringify([ruleId]))})\n\n`);
    }
    
    // Quick actions
    if ((diagnostic as any).fixable) {
      markdown.appendMarkdown(`💡 **Quick Fix Available**\n\n`);
    }
    
    // Exemption option
    markdown.appendMarkdown(`[Add Exemption](command:xfidelity.addExemption?${encodeURIComponent(JSON.stringify([ruleId, diagnostic.range]))})`);
    
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
  
  private getFileUri(filePath: string): vscode.Uri | null {
    try {
      // Handle absolute paths
      if (filePath.startsWith('/') || filePath.includes(':')) {
        return vscode.Uri.file(filePath);
      }
      
      // Handle relative paths
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        return vscode.Uri.joinPath(workspaceFolder.uri, filePath);
      }
      
      return null;
    } catch {
      return null;
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
  
  getDiagnosticsSummary(): { total: number; errors: number; warnings: number; info: number; hints: number } {
    let total = 0, errors = 0, warnings = 0, info = 0, hints = 0;
    
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
    this.diagnosticCollection.dispose();
    this.decorationType?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
} 
