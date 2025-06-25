import * as vscode from 'vscode';
import { AnalysisManager } from '../analysis/analysisManager';
import { VSCodeLogger } from '../utils/vscodeLogger';
import type {
  AnalysisState,
  AnalysisResult,
  AnalysisStateType
} from '../analysis/types';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private logger: VSCodeLogger;
  private currentState: AnalysisStateType = 'idle';
  private lastResult: AnalysisResult | null = null;

  constructor(private analysisManager: AnalysisManager) {
    this.logger = new VSCodeLogger('StatusBar');

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    // Use lightning (zap) icon instead of check
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
      this.analysisManager.onDidAnalysisStateChange((state: AnalysisState) => {
        this.currentState = this.mapAnalysisStateToStateType(state);
        this.updateDisplay();
      })
    );

    // Listen to analysis completion
    this.disposables.push(
      this.analysisManager.onDidAnalysisComplete((result: AnalysisResult) => {
        this.lastResult = result;
        this.updateDisplay();
      })
    );
  }

  private mapAnalysisStateToStateType(state: AnalysisState): AnalysisStateType {
    switch (state.status) {
      case 'idle':
        return 'idle';
      case 'analyzing':
        return 'running';
      case 'complete':
        return 'completed';
      case 'error':
        return 'error';
      default:
        return 'idle';
    }
  }

  private updateDisplay(): void {
    try {
      switch (this.currentState) {
        case 'idle':
          this.updateIdleState();
          break;
        case 'running':
          this.updateRunningState();
          break;
        case 'cancelling':
          this.updateCancellingState();
          break;
        case 'completed':
          this.updateCompletedState();
          break;
        case 'error':
          this.updateErrorState();
          break;
        default:
          this.logger.warn('Unknown analysis state', {
            state: this.currentState
          });
          this.updateIdleState();
      }
    } catch (error) {
      this.logger.error('Error updating status bar display', { error });
      this.statusBarItem.text = '$(zap) X-Fidelity (Error)';
      this.statusBarItem.tooltip = 'X-Fidelity - Error updating display';
    }
  }

  private updateIdleState(): void {
    this.statusBarItem.text = '$(zap) X-Fidelity';
    this.statusBarItem.tooltip = 'X-Fidelity - Click to run analysis';
    this.statusBarItem.command = 'xfidelity.runAnalysis';
    this.statusBarItem.backgroundColor = undefined;
  }

  private updateRunningState(): void {
    this.statusBarItem.text = '$(loading~spin) X-Fidelity';
    this.statusBarItem.tooltip =
      'X-Fidelity - Analysis running... Click to cancel';
    this.statusBarItem.command = 'xfidelity.cancelAnalysis';
    this.statusBarItem.backgroundColor = undefined;
  }

  private updateCancellingState(): void {
    this.statusBarItem.text = '$(loading~spin) Cancelling...';
    this.statusBarItem.tooltip = 'X-Fidelity - Cancelling analysis...';
    this.statusBarItem.command = undefined;
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.warningBackground'
    );
  }

  private updateCompletedState(): void {
    if (this.lastResult) {
      const issueCount = this.lastResult.summary.totalIssues;
      const iconAndText =
        issueCount > 0
          ? `$(warning) X-Fi: ${issueCount} issues`
          : '$(check) X-Fi: No issues';

      this.statusBarItem.text = iconAndText;
      this.statusBarItem.tooltip = this.buildCompletedTooltip();
      this.statusBarItem.command = 'xfidelity.showControlCenter';

      // Color coding based on issue severity
      if (issueCount === 0) {
        this.statusBarItem.backgroundColor = undefined;
      } else if (this.hasHighSeverityIssues()) {
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.errorBackground'
        );
      } else {
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
      }
    } else {
      this.statusBarItem.text = '$(check) X-Fidelity';
      this.statusBarItem.tooltip = 'X-Fidelity - Analysis completed';
      this.statusBarItem.command = 'xfidelity.runAnalysis';
      this.statusBarItem.backgroundColor = undefined;
    }
  }

  private updateErrorState(): void {
    this.statusBarItem.text = '$(error) X-Fidelity';
    this.statusBarItem.tooltip = 'X-Fidelity - Analysis failed. Click to retry';
    this.statusBarItem.command = 'xfidelity.runAnalysis';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor(
      'statusBarItem.errorBackground'
    );
  }

  private buildCompletedTooltip(): string {
    if (!this.lastResult) {
      return 'X-Fidelity - Analysis completed';
    }

    const summary = this.lastResult.summary;
    const details = [
      `Total Issues: ${summary.totalIssues}`,
      `Files Analyzed: ${summary.filesAnalyzed}`,
      `Duration: ${summary.analysisTimeMs ? Math.round(summary.analysisTimeMs / 1000) : 'N/A'}s`
    ];

    if (summary.issuesByLevel) {
      const levels = Object.entries(summary.issuesByLevel)
        .filter(([_, count]) => (count as number) > 0)
        .map(([level, count]) => `${level}: ${count}`)
        .join(', ');
      if (levels) {
        details.push(`Breakdown: ${levels}`);
      }
    }

    return `X-Fidelity Analysis Results\n${details.join('\n')}\n\nClick to view details`;
  }

  private hasHighSeverityIssues(): boolean {
    if (!this.lastResult?.summary.issuesByLevel) {
      return false;
    }

    const highSeverityLevels = ['error', 'critical', 'high'];
    return highSeverityLevels.some(
      level => (this.lastResult!.summary.issuesByLevel![level] || 0) > 0
    );
  }

  /**
   * Update status bar with real-time progress information
   */
  updateProgress(phase: string, progress: number, message?: string): void {
    if (this.currentState === 'running') {
      const progressText = `$(loading~spin) ${phase} (${Math.round(progress)}%)`;
      this.statusBarItem.text = progressText;
      this.statusBarItem.tooltip =
        message || `X-Fidelity - ${phase}... ${Math.round(progress)}%`;
    }
  }

  /**
   * Trigger a manual refresh of the display
   */
  refresh(): void {
    this.updateDisplay();
  }

  dispose(): void {
    this.statusBarItem.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
