import * as vscode from 'vscode';
import { CLIAnalysisManager } from '../analysis/cliAnalysisManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import type { AnalysisResult } from '../analysis/types';
import type { IAnalysisEngine } from '../analysis/analysisEngineInterface';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;
  private currentState: SimpleAnalysisState = 'idle';
  private lastResult: AnalysisResult | null = null;

  constructor(private analysisEngine: IAnalysisEngine) {
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
    // Listen to analysis state changes (compatible interface)
    if ('onDidAnalysisStateChange' in this.analysisEngine) {
      // Extension analysis manager
      this.disposables.push(
        (this.analysisEngine as any).onDidAnalysisStateChange(
          (state: SimpleAnalysisState) => {
            this.currentState = state;
            this.updateDisplay();
          }
        )
      );
    } else {
      // CLI analysis manager
      this.disposables.push(
        this.analysisEngine.onStateChanged((state: SimpleAnalysisState) => {
          this.currentState = state;
          this.updateDisplay();
        })
      );
    }

    // Listen to analysis completion (compatible interface)
    if ('onDidAnalysisComplete' in this.analysisEngine) {
      // Extension analysis manager
      this.disposables.push(
        (this.analysisEngine as any).onDidAnalysisComplete(
          (result: AnalysisResult) => {
            this.lastResult = result;
            this.updateDisplay();
          }
        )
      );
    } else {
      // CLI analysis manager
      this.disposables.push(
        this.analysisEngine.onComplete((result: AnalysisResult) => {
          this.lastResult = result;
          this.updateDisplay();
        })
      );
    }
  }

  private updateDisplay(): void {
    try {
      // Determine analysis mode for display
      const isCliMode = this.analysisEngine instanceof CLIAnalysisManager;
      const modeIndicator = isCliMode ? ' (CLI)' : '';

      switch (this.currentState) {
        case 'idle':
          this.statusBarItem.text = `$(zap) X-Fidelity${modeIndicator}`;
          this.statusBarItem.tooltip = `X-Fidelity${modeIndicator} - Click to run analysis`;
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = undefined;
          break;

        case 'analyzing':
          this.statusBarItem.text = `$(sync~spin) X-Fidelity${modeIndicator}`;
          this.statusBarItem.tooltip = `X-Fidelity${modeIndicator} - Analysis in progress...`;
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

            this.statusBarItem.text = `${icon} X-Fidelity${modeIndicator} (${issueCount})`;
            this.statusBarItem.tooltip = `X-Fidelity${modeIndicator} - Found ${issueCount} issues`;
            this.statusBarItem.backgroundColor = color;
          } else {
            this.statusBarItem.text = `$(check) X-Fidelity${modeIndicator}`;
            this.statusBarItem.tooltip = `X-Fidelity${modeIndicator} - Analysis complete`;
            this.statusBarItem.backgroundColor = undefined;
          }
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          break;

        case 'error':
          this.statusBarItem.text = `$(error) X-Fidelity${modeIndicator}`;
          this.statusBarItem.tooltip = `X-Fidelity${modeIndicator} - Analysis failed`;
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.errorBackground'
          );
          break;

        default:
          this.statusBarItem.text = `$(zap) X-Fidelity${modeIndicator}`;
          this.statusBarItem.tooltip = `X-Fidelity${modeIndicator}`;
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
