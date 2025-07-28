import * as vscode from 'vscode';
import { CLIAnalysisManager } from '../analysis/cliAnalysisManager';
import { createComponentLogger } from '../utils/globalLogger';
import type { AnalysisResult } from '../analysis/types';
import type { ProcessedAnalysisResult } from '../types/issues';
import type { IAnalysisEngine } from '../analysis/analysisEngineInterface';

type SimpleAnalysisState = 'idle' | 'analyzing' | 'complete' | 'error';

export class StatusBarProvider implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private disposables: vscode.Disposable[] = [];
  private logger;
  private currentState: SimpleAnalysisState = 'idle';
  private lastResult: AnalysisResult | null = null;

  constructor(private analysisEngine: IAnalysisEngine) {
    this.logger = createComponentLogger('StatusBar');

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
    // Listen to analysis state changes using the interface methods
    this.disposables.push(
      this.analysisEngine.onStateChanged((state: SimpleAnalysisState) => {
        this.logger.debug(`Status bar received state change: ${state}`);
        this.currentState = state;
        this.updateDisplay();
      })
    );

    // Listen to analysis completion using the interface methods
    this.disposables.push(
      this.analysisEngine.onComplete((result: AnalysisResult) => {
        this.logger.debug(
          `Status bar received analysis completion with ${result.summary.totalIssues} issues`
        );
        this.lastResult = result;
        this.updateDisplay();
      })
    );
  }

  private updateDisplay(): void {
    try {
      // Determine analysis mode for display
      const isCliMode = this.analysisEngine instanceof CLIAnalysisManager;
      const modeIndicator = isCliMode ? '' : '';

      let statusText = '';
      let statusTooltip = '';

      switch (this.currentState) {
        case 'idle':
          statusText = `$(zap) X-Fidelity${modeIndicator}`;
          statusTooltip = `X-Fidelity${modeIndicator} - Click to run analysis`;
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = undefined;
          break;

        case 'analyzing':
          statusText = `$(sync~spin) X-Fidelity${modeIndicator}`;
          statusTooltip = `X-Fidelity${modeIndicator} - Analysis in progress...`;
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

            statusText = `${icon} X-Fidelity${modeIndicator} (${issueCount})`;
            statusTooltip = `X-Fidelity${modeIndicator} - Found ${issueCount} issues`;
            this.statusBarItem.backgroundColor = color;
          } else {
            statusText = `$(check) X-Fidelity${modeIndicator}`;
            statusTooltip = `X-Fidelity${modeIndicator} - Analysis complete`;
            this.statusBarItem.backgroundColor = undefined;
          }
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          break;

        case 'error':
          statusText = `$(error) X-Fidelity${modeIndicator}`;
          statusTooltip = `X-Fidelity${modeIndicator} - Analysis failed`;
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = new vscode.ThemeColor(
            'statusBarItem.errorBackground'
          );
          break;

        default:
          statusText = `$(zap) X-Fidelity${modeIndicator}`;
          statusTooltip = `X-Fidelity${modeIndicator}`;
          this.statusBarItem.command = 'xfidelity.runAnalysis';
          this.statusBarItem.backgroundColor = undefined;
      }

      this.statusBarItem.text = statusText;
      this.statusBarItem.tooltip = statusTooltip;

      this.logger.debug(
        `Status bar updated: "${statusText}" (state: ${this.currentState})`
      );
    } catch (error) {
      this.logger.error('Failed to update status bar display:', error);
    }
  }

  /**
   * NEW: Direct update method for ResultCoordinator pattern
   * Updates status bar directly from pre-processed results to ensure consistent counts
   */
  public updateFromProcessedResult(processed: ProcessedAnalysisResult): void {
    try {
      this.logger.debug('Updating status bar from processed result', {
        totalIssues: processed.totalIssues,
        successfulIssues: processed.successfulIssues,
        failedIssues: processed.failedIssues
      });

      // Update state to complete
      this.currentState = 'complete';

      // Create a compatible lastResult for existing display logic
      this.lastResult = {
        metadata: processed.metadata,
        diagnostics: new Map(), // Not used by status bar
        timestamp: processed.timestamp,
        duration: processed.duration,
        summary: {
          totalIssues: processed.totalIssues,
          filesAnalyzed: Object.keys(
            processed.metadata?.XFI_RESULT?.fileCount || {}
          ).length,
          analysisTimeMs: processed.duration,
          issuesByLevel: {
            error: processed.issueBreakdown.error,
            warning: processed.issueBreakdown.warning,
            info: processed.issueBreakdown.info,
            hint: processed.issueBreakdown.hint,
            fatality: 0, // Not used in breakdown
            exempt: processed.issueBreakdown.exempt
          }
        }
      };

      // Determine analysis mode for display
      const isCliMode = this.analysisEngine instanceof CLIAnalysisManager;
      const modeIndicator = isCliMode ? '' : '';

      // Create status display with consistent counts
      const totalIssues = processed.totalIssues;
      const unhandledIssues = processed.failedIssuesCount;

      const icon = totalIssues > 0 ? '$(warning)' : '$(check)';
      const color =
        totalIssues > 0
          ? new vscode.ThemeColor('statusBarItem.warningBackground')
          : undefined;

      const unhandledSuffix =
        unhandledIssues > 0 ? ` • ${unhandledIssues} unhandled` : '';
      const statusText = `${icon} X-Fidelity${modeIndicator} (${totalIssues}${unhandledSuffix})`;
      const statusTooltip = `X-Fidelity${modeIndicator} - Found ${totalIssues} issues${unhandledIssues > 0 ? ` (${unhandledIssues} could not be processed)` : ''}`;

      this.statusBarItem.text = statusText;
      this.statusBarItem.tooltip = statusTooltip;
      this.statusBarItem.backgroundColor = color;
      this.statusBarItem.command = 'xfidelity.runAnalysis';

      this.logger.debug(
        `Status bar updated from processed result: "${statusText}"`
      );

      // NO EVENT EMISSION - direct update pattern eliminates events
    } catch (error) {
      this.logger.error(
        'Failed to update status bar from processed result:',
        error
      );
    }
  }

  dispose(): void {
    this.statusBarItem?.dispose();
    this.disposables.forEach(d => d.dispose());
  }
}
