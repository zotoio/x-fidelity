import * as vscode from 'vscode';
import { AnalysisManager } from '../analysis/analysisManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import type { AnalysisResult } from '../analysis/types';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;
  private currentState: SimpleAnalysisState = 'idle';
  private lastResult: AnalysisResult | null = null;

  constructor(private analysisManager: AnalysisManager) {
    this.logger = new VSCodeLogger('StatusBar');

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    // Use lightning (zap) icon
    this.statusBarItem.text = '$(zap) X-Fidelity';
    this.statusBarItem.tooltip = 'X-Fidelity - Click to run analysis';
    this.statusBarItem.command = 'xfidelity.runAnalysis';
    this.statusBarItem.show();

    this.setupEventListeners();
    this.updateDisplay();
  }

  private setupEventListeners(): void {
    // Listen to analysis state changes
    this.disposables.push(
      this.analysisManager.onDidAnalysisStateChange(
        (state: SimpleAnalysisState) => {
          this.currentState = state;
          this.updateDisplay();
        }
      )
    );

    // Listen to analysis completion
    this.disposables.push(
      this.analysisManager.onDidAnalysisComplete((result: AnalysisResult) => {
        this.lastResult = result;
        this.updateDisplay();
      })
    );
  }

  private updateDisplay(): void {
    try {
      switch (this.currentState) {
        case 'idle':
          this.statusBarItem.text = '$(zap) X-Fidelity';
          this.statusBarItem.tooltip = 'X-Fidelity - Click to run analysis';
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = undefined;
          break;

        case 'analyzing':
          this.statusBarItem.text = '$(sync~spin) X-Fidelity';
          this.statusBarItem.tooltip = 'X-Fidelity - Analysis in progress...';
          this.statusBarItem.command = 'xfidelity.cancelAnalysis';
          this.statusBarItem.backgroundColor = undefined;
          break;

        case 'complete':
          if (this.lastResult) {
            const issueCount = this.lastResult.summary.totalIssues;
            const icon = issueCount > 0 ? '$(warning)' : '$(check)';
            const color =
              issueCount > 0
                ? new vscode.ThemeColor('statusBarItem.warningBackground')
                : undefined;

            this.statusBarItem.text = `${icon} X-Fidelity (${issueCount})`;
            this.statusBarItem.tooltip = `X-Fidelity - Found ${issueCount} issues`;
            this.statusBarItem.backgroundColor = color;
          } else {
            this.statusBarItem.text = '$(check) X-Fidelity';
            this.statusBarItem.tooltip = 'X-Fidelity - Analysis complete';
            this.statusBarItem.backgroundColor = undefined;
          }
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          break;

        case 'error':
          this.statusBarItem.text = '$(error) X-Fidelity';
          this.statusBarItem.tooltip = 'X-Fidelity - Analysis failed';
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.errorBackground'
          );
          break;

        default:
          this.statusBarItem.text = '$(zap) X-Fidelity';
          this.statusBarItem.tooltip = 'X-Fidelity';
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = undefined;
      }
    } catch (error) {
      this.logger.error('Failed to update status bar display:', error);
    }
  }

  dispose(): void {
    this.statusBarItem?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
