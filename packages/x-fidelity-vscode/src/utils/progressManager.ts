import * as vscode from 'vscode';

export interface ProgressPhase {
  readonly name: string;
  readonly weight: number;
  readonly description?: string;
}

export interface ProgressState {
  readonly currentPhase: string;
  readonly overallProgress: number;
  readonly phaseProgress: number;
  readonly message?: string;
}

export class ProgressReporter {
  private currentPhaseIndex = 0;
  private phaseProgress = 0;
  private totalWeight: number;

  constructor(
    private progress: vscode.Progress<{ message?: string; increment?: number }>,
    private phases: ProgressPhase[]
  ) {
    this.totalWeight = phases.reduce((sum, phase) => sum + phase.weight, 0);
  }

  nextPhase(message?: string): void {
    if (this.currentPhaseIndex < this.phases.length - 1) {
      this.currentPhaseIndex++;
      this.phaseProgress = 0;
      this.updateProgress(message);
    }
  }

  updatePhaseProgress(progress: number, message?: string): void {
    this.phaseProgress = Math.max(0, Math.min(100, progress));
    this.updateProgress(message);
  }

  private updateProgress(message?: string): void {
    const currentPhase = this.phases[this.currentPhaseIndex];

    const displayMessage =
      message || `${currentPhase.name}... ${this.phaseProgress.toFixed(0)}%`;

    this.progress.report({
      message: displayMessage,
      increment: 0 // We manage absolute progress ourselves
    });
  }

  getCurrentState(): ProgressState {
    const currentPhase = this.phases[this.currentPhaseIndex];
    const previousPhasesWeight = this.phases
      .slice(0, this.currentPhaseIndex)
      .reduce((sum, phase) => sum + phase.weight, 0);

    const currentPhaseContribution =
      (currentPhase.weight * this.phaseProgress) / 100;
    const overallProgress =
      ((previousPhasesWeight + currentPhaseContribution) / this.totalWeight) *
      100;

    return {
      currentPhase: currentPhase.name,
      overallProgress,
      phaseProgress: this.phaseProgress,
      message: currentPhase.description
    };
  }

  complete(message?: string): void {
    this.progress.report({
      message: message || 'Analysis complete',
      increment: 100
    });
  }
}

export class ProgressManager {
  private readonly analysisPhases: ProgressPhase[] = [
    {
      name: 'Initializing',
      weight: 10,
      description: 'Preparing analysis environment'
    },
    {
      name: 'Scanning Files',
      weight: 20,
      description: 'Discovering source files to analyze'
    },
    {
      name: 'Loading Plugins',
      weight: 10,
      description: 'Initializing analysis plugins'
    },
    {
      name: 'Running Analysis',
      weight: 45,
      description: 'Executing code quality checks'
    },
    {
      name: 'Processing Results',
      weight: 10,
      description: 'Converting analysis results'
    },
    {
      name: 'Finalizing',
      weight: 5,
      description: 'Completing analysis and cleanup'
    }
  ];

  async runWithProgress<T>(
    title: string,
    operation: (
      reporter: ProgressReporter,
      token: vscode.CancellationToken
    ) => Promise<T>,
    phases?: ProgressPhase[]
  ): Promise<T | null> {
    const usedPhases = phases || this.analysisPhases;

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      async (progress, token) => {
        const reporter = new ProgressReporter(progress, usedPhases);

        try {
          // Check if cancelled before starting
          if (token.isCancellationRequested) {
            return null;
          }

          const result = await operation(reporter, token);

          // Check if cancelled after completion
          if (token.isCancellationRequested) {
            return null;
          }

          reporter.complete();
          return result;
        } catch (error) {
          if (token.isCancellationRequested) {
            progress.report({ message: 'Analysis cancelled by user' });
            return null;
          }

          progress.report({
            message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          throw error;
        }
      }
    );
  }

  async runWithProgressAndEvents<T>(
    title: string,
    operation: (
      reporter: ProgressReporter,
      token: vscode.CancellationToken
    ) => Promise<T>,
    onProgress?: (state: ProgressState) => void,
    phases?: ProgressPhase[]
  ): Promise<T | null> {
    const usedPhases = phases || this.analysisPhases;

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
      },
      async (progress, token) => {
        const reporter = new ProgressReporter(progress, usedPhases);

        // Create a wrapper that also emits events
        const eventReporter: ProgressReporter = {
          ...reporter,
          updatePhaseProgress: (progressValue: number, message?: string) => {
            reporter.updatePhaseProgress(progressValue, message);
            if (onProgress) {
              onProgress(reporter.getCurrentState());
            }
          },
          nextPhase: (message?: string) => {
            reporter.nextPhase(message);
            if (onProgress) {
              onProgress(reporter.getCurrentState());
            }
          }
        } as ProgressReporter;

        try {
          const result = await operation(eventReporter, token);
          if (!token.isCancellationRequested) {
            reporter.complete();
          }
          return result;
        } catch (error) {
          if (token.isCancellationRequested) {
            return null;
          }
          throw error;
        }
      }
    );
  }

  createCustomPhases(
    phases: { name: string; weight: number; description?: string }[]
  ): ProgressPhase[] {
    const totalWeight = phases.reduce((sum, phase) => sum + phase.weight, 0);
    if (totalWeight <= 0) {
      throw new Error('Total phase weight must be greater than 0');
    }

    return phases.map(phase => ({
      name: phase.name,
      weight: phase.weight,
      description: phase.description
    }));
  }
}
