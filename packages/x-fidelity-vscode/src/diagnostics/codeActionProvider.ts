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
      
      // Add exemption action
      if (ruleId) {
        actions.push(this.createExemptionAction(document, diagnostic, ruleId));
      }
      
      // Add quick fix if available
      if (isFixable) {
        actions.push(this.createQuickFixAction(document, diagnostic, ruleId));
      }
      
      // Add "Learn More" action
      if (ruleId) {
        actions.push(this.createLearnMoreAction(ruleId));
      }
    }
    
    // Add bulk actions if multiple diagnostics
    if (xfidelityDiagnostics.length > 1) {
      actions.push(this.createBulkExemptionAction(document, xfidelityDiagnostics));
    }
    
    return actions;
  }
  
  private createExemptionAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
    ruleId: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Add exemption for ${ruleId}`,
      vscode.CodeActionKind.QuickFix
    );
    
    action.diagnostics = [diagnostic];
    action.command = {
      command: 'xfidelity.addExemption',
      title: 'Add Exemption',
      arguments: [document.uri, diagnostic.range, ruleId]
    };
    
    return action;
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
    action.isPreferred = true;
    
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
  
  private createBulkExemptionAction(
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Add exemptions for ${diagnostics.length} issues`,
      vscode.CodeActionKind.Source
    );
    
    action.command = {
      command: 'xfidelity.addBulkExemptions',
      title: 'Add Bulk Exemptions',
      arguments: [document.uri, diagnostics]
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
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // Extract the missing import from the diagnostic message
    const message = diagnostic.message;
    const importMatch = message.match(/Missing import for ['"]([^'"]+)['"]/);
    
    if (importMatch) {
      const importName = importMatch[1];
      const importStatement = `import { ${importName} } from '${this.guessImportPath(importName)}';\n`;
      
      // Insert at the top of the file after existing imports
      const insertPosition = this.findImportInsertPosition(document);
      edit.insert(document.uri, insertPosition, importStatement);
    }
    
    return edit;
  }
  
  private createUnusedImportFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // Find and remove the unused import line
    const lineRange = new vscode.Range(
      diagnostic.range.start.line,
      0,
      diagnostic.range.start.line + 1,
      0
    );
    
    edit.delete(document.uri, lineRange);
    return edit;
  }
  
  private createPreferConstFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // Replace 'let' with 'const'
    const text = document.getText(diagnostic.range);
    const fixedText = text.replace(/\blet\b/, 'const');
    
    edit.replace(document.uri, diagnostic.range, fixedText);
    return edit;
  }
  
  private createSemicolonFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.WorkspaceEdit {
    const edit = new vscode.WorkspaceEdit();
    
    // Add semicolon at the end of the line
    const line = document.lineAt(diagnostic.range.end.line);
    const endPosition = new vscode.Position(line.range.end.line, line.range.end.character);
    
    edit.insert(document.uri, endPosition, ';');
    return edit;
  }
  
  private findImportInsertPosition(document: vscode.TextDocument): vscode.Position {
    // Find the last import statement or the beginning of the file
    let insertLine = 0;
    
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const text = line.text.trim();
      
      if (text.startsWith('import ') || text.startsWith('const ') && text.includes('require(')) {
        insertLine = i + 1;
      } else if (text.length > 0 && !text.startsWith('//') && !text.startsWith('/*')) {
        break;
      }
    }
    
    return new vscode.Position(insertLine, 0);
  }
  
  private guessImportPath(importName: string): string {
    // Simple heuristics for common import patterns
    const commonPaths: Record<string, string> = {
      'React': 'react',
      'useState': 'react',
      'useEffect': 'react',
      'Component': 'react',
      'express': 'express',
      'fs': 'fs',
      'path': 'path',
      'lodash': 'lodash',
      '_': 'lodash'
    };
    
    return commonPaths[importName] || `./${importName.toLowerCase()}`;
  }
}

// Command handlers for the code actions
export async function handleAddExemption(
  uri: vscode.Uri,
  range: vscode.Range,
  ruleId: string
): Promise<void> {
  try {
    // const document = await vscode.workspace.openTextDocument(uri);
    // const line = document.lineAt(range.start.line);
    
    // Choose exemption type
    const exemptionType = await vscode.window.showQuickPick([
      { label: 'Line exemption', value: 'line', description: 'Exempt only this line' },
      { label: 'File exemption', value: 'file', description: 'Exempt this rule for the entire file' },
      { label: 'Next line exemption', value: 'next-line', description: 'Exempt the next line' }
    ], {
      placeHolder: `Select exemption type for rule: ${ruleId}`
    });
    
    if (!exemptionType) {
      return;
    }
    
    const reason = await vscode.window.showInputBox({
      prompt: 'Enter exemption reason (optional)',
      placeHolder: 'Why is this exemption needed?'
    });
    
    const exemptionComment = createExemptionComment(ruleId, exemptionType.value, reason);
    
    const edit = new vscode.WorkspaceEdit();
    const insertPosition = new vscode.Position(range.start.line, 0);
    
    edit.insert(uri, insertPosition, exemptionComment + '\n');
    
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage(`Exemption added for rule: ${ruleId}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to add exemption: ${errorMessage}`);
  }
}

export async function handleBulkExemptions(
  uri: vscode.Uri,
  diagnostics: vscode.Diagnostic[]
): Promise<void> {
  const ruleIds = [...new Set(diagnostics.map(d => (d as any).ruleId).filter(Boolean))];
  
  const choice = await vscode.window.showQuickPick([
    { label: 'Add file exemptions', value: 'file' },
    { label: 'Add individual line exemptions', value: 'line' }
  ], {
    placeHolder: `Add exemptions for ${ruleIds.length} rules`
  });
  
  if (!choice) {
    return;
  }
  
  const reason = await vscode.window.showInputBox({
    prompt: 'Enter exemption reason (optional)',
    placeHolder: 'Why are these exemptions needed?'
  });
  
  try {
    const edit = new vscode.WorkspaceEdit();
    
    if (choice.value === 'file') {
      // Add file-level exemptions at the top
      let exemptionComments = '';
      for (const ruleId of ruleIds) {
        exemptionComments += createExemptionComment(ruleId, 'file', reason) + '\n';
      }
      
      edit.insert(uri, new vscode.Position(0, 0), exemptionComments + '\n');
    } else {
      // Add line exemptions for each diagnostic
      for (const diagnostic of diagnostics) {
        const ruleId = (diagnostic as any).ruleId;
        if (ruleId) {
          const exemptionComment = createExemptionComment(ruleId, 'line', reason);
          const insertPosition = new vscode.Position(diagnostic.range.start.line, 0);
          edit.insert(uri, insertPosition, exemptionComment + '\n');
        }
      }
    }
    
    await vscode.workspace.applyEdit(edit);
    vscode.window.showInformationMessage(`Bulk exemptions added for ${ruleIds.length} rules`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Failed to add bulk exemptions: ${errorMessage}`);
  }
}

function createExemptionComment(ruleId: string, type: string, reason?: string): string {
  const reasonPart = reason ? ` - ${reason}` : '';
  
  switch (type) {
    case 'file':
      return `// xfi-file-exempt: ${ruleId}${reasonPart}`;
    case 'next-line':
      return `// xfi-next-line-exempt: ${ruleId}${reasonPart}`;
    case 'line':
    default:
      return `// xfi-line-exempt: ${ruleId}${reasonPart}`;
  }
} 
