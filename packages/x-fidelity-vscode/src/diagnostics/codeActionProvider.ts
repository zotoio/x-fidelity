/**
 * Code Action Provider for X-Fidelity diagnostics
 * Provides quick fix suggestions via the lightbulb icon
 */

import * as vscode from 'vscode';

export class XFidelityCodeActionProvider implements vscode.CodeActionProvider {
  /**
   * Provide code actions for X-Fidelity diagnostics
   * These appear as "Quick Fix" suggestions in the lightbulb menu
   */
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Find X-Fidelity diagnostics in the given range
    const xfiDiagnostics = context.diagnostics.filter(
      d => d.source === 'X-Fidelity'
    );

    if (xfiDiagnostics.length === 0) {
      return undefined;
    }

    for (const diagnostic of xfiDiagnostics) {
      const xfiData = (diagnostic as any).xfidelity || {};

      // Add "Explain Issue" action
      const explainAction = new vscode.CodeAction(
        `💡 X-Fidelity: Explain "${xfiData.ruleId || 'Issue'}"`,
        vscode.CodeActionKind.QuickFix
      );
      explainAction.command = {
        title: 'Explain Issue',
        command: 'xfidelity.explainIssue',
        arguments: [
          {
            ...xfiData,
            message: diagnostic.message,
            code: diagnostic.code
          }
        ]
      };
      explainAction.diagnostics = [diagnostic];
      actions.push(explainAction);

      // Add "Fix Issue" action if fixable
      if (xfiData.fixable) {
        const fixAction = new vscode.CodeAction(
          `✨ X-Fidelity: Fix "${xfiData.ruleId || 'Issue'}"`,
          vscode.CodeActionKind.QuickFix
        );
        fixAction.command = {
          title: 'Fix Issue',
          command: 'xfidelity.fixIssue',
          arguments: [
            {
              ...xfiData,
              message: diagnostic.message,
              code: diagnostic.code
            }
          ]
        };
        fixAction.diagnostics = [diagnostic];
        fixAction.isPreferred = true; // Shows as primary quick fix
        actions.push(fixAction);
      }

      // Add "View Rule Documentation" action if available
      if (xfiData.ruleDocUrl) {
        const docAction = new vscode.CodeAction(
          `📚 View Documentation for "${xfiData.ruleId}"`,
          vscode.CodeActionKind.QuickFix
        );
        docAction.command = {
          title: 'View Documentation',
          command: 'vscode.open',
          arguments: [vscode.Uri.parse(xfiData.ruleDocUrl)]
        };
        docAction.diagnostics = [diagnostic];
        actions.push(docAction);
      }
    }

    return actions.length > 0 ? actions : undefined;
  }

  /**
   * Optional: Resolve code action to provide additional information
   * This can be used to delay expensive operations until the user hovers over the action
   */
  resolveCodeAction?(
    codeAction: vscode.CodeAction,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeAction> {
    // Currently not needed, but can be implemented for lazy loading of action details
    return codeAction;
  }
}
