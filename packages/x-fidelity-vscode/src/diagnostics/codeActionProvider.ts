import * as vscode from 'vscode';

export class XFidelityCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Source
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    // Filter for X-Fidelity diagnostics
    const xfidelityDiagnostics = context.diagnostics.filter(
      diagnostic => diagnostic.source === 'X-Fidelity'
    );

    if (xfidelityDiagnostics.length === 0) {
      return actions;
    }

    for (const diagnostic of xfidelityDiagnostics) {
      const ruleId = (diagnostic as any).ruleId;
      const isFixable = (diagnostic as any).fixable;

      // Add quick fix if available
      if (isFixable && ruleId) {
        actions.push(this.createQuickFixAction(document, diagnostic, ruleId));
      }

      // Add "Learn More" action
      if (ruleId) {
        actions.push(this.createLearnMoreAction(ruleId));
      }
    }

    return actions;
  }

  private createQuickFixAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Fix ${ruleId}`,
      vscode.CodeActionKind.QuickFix
    );

    action.diagnostics = [diagnostic];
    // 🎯 REMOVED: isPreferred = true causes auto-application when clicking problems
    // action.isPreferred = true;

    // Create the fix based on rule type
    const fix = this.createFix(document, diagnostic, ruleId);
    if (fix) {
      action.edit = fix;
    } else {
      // Fallback to command if we can't create a direct edit
      action.command = {
        command: 'xfidelity.applyQuickFix',
        title: 'Apply Quick Fix',
        arguments: [document.uri, diagnostic.range, ruleId]
      };
    }

    return action;
  }

  private createLearnMoreAction(ruleId: string): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Learn more about ${ruleId}`,
      vscode.CodeActionKind.Empty
    );

    action.command = {
      command: 'xfidelity.showRuleDocumentation',
      title: 'Show Rule Documentation',
      arguments: [ruleId]
    };

    return action;
  }

  private createFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.WorkspaceEdit | null {
    // Simple fixes for common rule patterns
    switch (ruleId) {
      case 'missing-import':
        return this.createMissingImportFix(document, diagnostic);

      case 'unused-import':
        return this.createUnusedImportFix(document, diagnostic);

      case 'prefer-const':
        return this.createPreferConstFix(document, diagnostic);

      case 'semicolon-missing':
        return this.createSemicolonFix(document, diagnostic);

      default:
        return null;
    }
  }

  private createMissingImportFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();

    // Extract the missing import name from the diagnostic message
    const importMatch = diagnostic.message.match(/['"`]([^'"`]+)['"`]/);
    if (!importMatch) {
      return null;
    }

    const importName = importMatch[1];
    const importPath = this.resolveImportPath(importName);
    const importStatement = `import ${importName} from '${importPath}';\n`;

    // Insert at the top of the file (after any existing imports)
    const firstLine = document.lineAt(0);
    edit.insert(document.uri, firstLine.range.start, importStatement);

    return edit;
  }

  private createUnusedImportFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();

    // Remove the entire line containing the unused import
    const line = document.lineAt(diagnostic.range.start.line);
    const lineRange = new vscode.Range(
      line.range.start,
      line.rangeIncludingLineBreak.end
    );

    edit.delete(document.uri, lineRange);
    return edit;
  }

  private createPreferConstFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();
    const text = document.getText(diagnostic.range);

    if (text.startsWith('let ')) {
      const newText = text.replace('let ', 'const ');
      edit.replace(document.uri, diagnostic.range, newText);
      return edit;
    }

    return null;
  }

  private createSemicolonFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit | null {
    const edit = new vscode.WorkspaceEdit();

    // Add semicolon at the end of the line
    const lineEnd = diagnostic.range.end;
    edit.insert(document.uri, lineEnd, ';');

    return edit;
  }

  private resolveImportPath(importName: string): string {
    // Simple heuristic for common import paths
    const commonPaths: Record<string, string> = {
      react: 'react',
      useState: 'react',
      useEffect: 'react',
      Component: 'react',
      express: 'express',
      lodash: 'lodash',
      moment: 'moment',
      axios: 'axios'
    };

    return commonPaths[importName] || `./${importName.toLowerCase()}`;
  }
}
