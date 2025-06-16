import * as vscode from 'vscode';
import type { AnalysisState } from '../analysis/analysisManager';
import type { DiagnosticProvider } from '../diagnostics/diagnosticProvider';
import { ConfigManager } from '../configuration/configManager';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  
  constructor(
    private configManager: ConfigManager,
    private diagnosticProvider: DiagnosticProvider
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    
    this.setupStatusBar();
    this.setupEventListeners();
  }
  
  private setupStatusBar(): void {
    const config = this.configManager.getConfig();
    
    if (!config.statusBarVisibility) {
      this.statusBarItem.hide();
      return;
    }
    
    this.statusBarItem.text = '$(search) X-Fidelity';
    this.statusBarItem.tooltip = 'X-Fidelity Analysis Status';
    this.statusBarItem.command = 'xfidelity.runAnalysis';
    this.statusBarItem.show();
    
    this.updateStatusBar();
  }
  
  private setupEventListeners(): void {
    // Update when configuration changes
    this.disposables.push(
      this.configManager.onConfigurationChanged.event(() => {
        this.setupStatusBar();
      })
    );
  }
  
  updateAnalysisState(state: AnalysisState): void {
    const config = this.configManager.getConfig();
    
    if (!config.statusBarVisibility) {
      return;
    }
    
    switch (state.status) {
      case 'idle':
        this.statusBarItem.text = '$(search) X-Fidelity';
        this.statusBarItem.tooltip = 'X-Fidelity: Ready';
        this.statusBarItem.backgroundColor = undefined;
        break;
        
      case 'analyzing':
        const progress = state.progress ? ` ${state.progress}%` : '';
        this.statusBarItem.text = `$(sync~spin) X-Fidelity${progress}`;
        this.statusBarItem.tooltip = state.currentFile 
          ? `X-Fidelity: Analyzing ${state.currentFile}` 
          : 'X-Fidelity: Analysis in progress...';
        this.statusBarItem.backgroundColor = undefined;
        break;
        
      case 'complete':
        this.updateStatusBar();
        break;
        
      case 'error':
        this.statusBarItem.text = '$(error) X-Fidelity';
        this.statusBarItem.tooltip = `X-Fidelity: Error - ${state.error?.message || 'Unknown error'}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;
    }
  }
  
  private updateStatusBar(): void {
    const summary = this.diagnosticProvider.getDiagnosticsSummary();
    const config = this.configManager.getConfig();
    
    if (!config.statusBarVisibility) {
      this.statusBarItem.hide();
      return;
    }
    
    // Show issue counts
    if (summary.total === 0) {
      this.statusBarItem.text = '$(check) X-Fidelity';
      this.statusBarItem.tooltip = 'X-Fidelity: No issues found';
      this.statusBarItem.backgroundColor = undefined;
    } else {
      const issueText = this.formatIssueSummary(summary);
      this.statusBarItem.text = `$(warning) ${issueText}`;
      this.statusBarItem.tooltip = this.formatTooltip(summary);
      
      // Color based on severity
      if (summary.errors > 0) {
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      } else if (summary.warnings > 0) {
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      } else {
        this.statusBarItem.backgroundColor = undefined;
      }
    }
    
    this.statusBarItem.show();
  }
  
  private formatIssueSummary(summary: { total: number; errors: number; warnings: number; info: number; hints: number }): string {
    const parts: string[] = [];
    
    if (summary.errors > 0) {
      parts.push(`${summary.errors}E`);
    }
    
    if (summary.warnings > 0) {
      parts.push(`${summary.warnings}W`);
    }
    
    if (summary.info > 0) {
      parts.push(`${summary.info}I`);
    }
    
    if (summary.hints > 0) {
      parts.push(`${summary.hints}H`);
    }
    
    return parts.length > 0 ? parts.join(' ') : `${summary.total}`;
  }
  
  private formatTooltip(summary: { total: number; errors: number; warnings: number; info: number; hints: number }): string {
    const lines: string[] = ['X-Fidelity Issues:'];
    
    if (summary.errors > 0) {
      lines.push(`🔴 Errors: ${summary.errors}`);
    }
    
    if (summary.warnings > 0) {
      lines.push(`🟡 Warnings: ${summary.warnings}`);
    }
    
    if (summary.info > 0) {
      lines.push(`🔵 Info: ${summary.info}`);
    }
    
    if (summary.hints > 0) {
      lines.push(`💡 Hints: ${summary.hints}`);
    }
    
    lines.push('');
    lines.push('Click to run analysis');
    
    return lines.join('\n');
  }
  
  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
} 