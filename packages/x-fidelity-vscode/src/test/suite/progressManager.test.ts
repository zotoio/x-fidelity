import * as assert from 'assert';
import * as vscode from 'vscode';
import { suite, test, setup } from 'mocha';
import { ProgressManager, ProgressReporter, ProgressPhase } from '../../utils/progressManager';

suite('ProgressManager Tests', () => {
  let progressManager: ProgressManager;

  setup(() => {
    progressManager = new ProgressManager();
  });

  test('should create custom phases with correct weights', () => {
    const customPhases = progressManager.createCustomPhases([
      { name: 'Phase 1', weight: 30 },
      { name: 'Phase 2', weight: 70, description: 'Phase 2 description' }
    ]);

    assert.strictEqual(customPhases.length, 2);
    assert.strictEqual(customPhases[0].name, 'Phase 1');
    assert.strictEqual(customPhases[0].weight, 30);
    assert.strictEqual(customPhases[1].description, 'Phase 2 description');
  });

  test('should throw error for invalid phase weights', () => {
    assert.throws(() => {
      progressManager.createCustomPhases([
        { name: 'Invalid', weight: 0 }
      ]);
    }, /Total phase weight must be greater than 0/);
  });

  test('should run operation with progress tracking', async () => {
    let progressReports: Array<{ message?: string; increment?: number }> = [];
    let reporterStates: Array<any> = [];

    // Mock VSCode progress API
    const mockProgress = {
      report: (value: { message?: string; increment?: number }) => {
        progressReports.push(value);
      }
    };

    const testOperation = async (reporter: ProgressReporter, _token: vscode.CancellationToken) => {
      // Test phase progression
      reporter.updatePhaseProgress(50, 'Starting first phase');
      reporterStates.push(reporter.getCurrentState());
      
      reporter.nextPhase('Moving to second phase');
      reporterStates.push(reporter.getCurrentState());
      
      reporter.updatePhaseProgress(100, 'Completing second phase');
      reporterStates.push(reporter.getCurrentState());
      
      return 'test-result';
    };

    // Mock vscode.window.withProgress for testing
    const originalWithProgress = vscode.window.withProgress;
    (vscode.window as any).withProgress = (options: any, operation: any) => {
      const mockToken = { isCancellationRequested: false };
      return operation(mockProgress, mockToken);
    };

    try {
      const result = await progressManager.runWithProgress(
        'Test Analysis',
        testOperation
      );

      assert.strictEqual(result, 'test-result');
      assert.ok(progressReports.length > 0, 'Should have progress reports');
      assert.ok(reporterStates.length > 0, 'Should have reporter states');
      
      // Verify states show proper progression
      const firstState = reporterStates[0];
      assert.ok(firstState.overallProgress > 0, 'Should have some overall progress');
      assert.strictEqual(firstState.phaseProgress, 50, 'Should have 50% phase progress');
      
    } finally {
      // Restore original function
      (vscode.window as any).withProgress = originalWithProgress;
    }
  });

  test('should handle cancellation gracefully', async () => {
    const testOperation = async (_reporter: ProgressReporter, _token: vscode.CancellationToken) => {
      // Simulate cancellation during operation
      return 'should-not-complete';
    };

    // Mock cancelled token
    const originalWithProgress = vscode.window.withProgress;
    (vscode.window as any).withProgress = (options: any, operation: any) => {
      const mockToken = { isCancellationRequested: true };
      const mockProgress = { report: () => {} };
      return operation(mockProgress, mockToken);
    };

    try {
      const result = await progressManager.runWithProgress(
        'Test Analysis',
        testOperation
      );

      assert.strictEqual(result, null, 'Should return null when cancelled');
    } finally {
      (vscode.window as any).withProgress = originalWithProgress;
    }
  });

  test('should handle operation errors', async () => {
    const testError = new Error('Test operation failed');
    const testOperation = async (_reporter: ProgressReporter, _token: vscode.CancellationToken) => {
      throw testError;
    };

    const originalWithProgress = vscode.window.withProgress;
    (vscode.window as any).withProgress = (options: any, operation: any) => {
      const mockToken = { isCancellationRequested: false };
      const mockProgress = { report: () => {} };
      return operation(mockProgress, mockToken);
    };

    try {
      await assert.rejects(
        progressManager.runWithProgress('Test Analysis', testOperation),
        testError
      );
    } finally {
      (vscode.window as any).withProgress = originalWithProgress;
    }
  });

  test('should emit progress events when using runWithProgressAndEvents', async () => {
    let progressEvents: Array<any> = [];

    const testOperation = async (reporter: ProgressReporter, _token: vscode.CancellationToken) => {
      reporter.updatePhaseProgress(25);
      reporter.nextPhase();
      reporter.updatePhaseProgress(75);
      return 'test-result';
    };

    const onProgress = (state: any) => {
      progressEvents.push(state);
    };

    const originalWithProgress = vscode.window.withProgress;
    (vscode.window as any).withProgress = (options: any, operation: any) => {
      const mockToken = { isCancellationRequested: false };
      const mockProgress = { report: () => {} };
      return operation(mockProgress, mockToken);
    };

    try {
      const result = await progressManager.runWithProgressAndEvents(
        'Test Analysis',
        testOperation,
        onProgress
      );

      assert.strictEqual(result, 'test-result');
      assert.ok(progressEvents.length >= 2, 'Should have multiple progress events');
      
      // Verify progression in events
      const firstEvent = progressEvents[0];
      const lastEvent = progressEvents[progressEvents.length - 1];
      assert.ok(lastEvent.overallProgress > firstEvent.overallProgress, 'Overall progress should increase');
      
    } finally {
      (vscode.window as any).withProgress = originalWithProgress;
    }
  });
});

suite('ProgressReporter Tests', () => {
  test('should calculate progress correctly', () => {
    const phases: ProgressPhase[] = [
      { name: 'Phase 1', weight: 30 },
      { name: 'Phase 2', weight: 70 }
    ];

    const mockProgress = { report: () => {} };
    const reporter = new ProgressReporter(mockProgress as any, phases);

    // Test initial state
    let state = reporter.getCurrentState();
    assert.strictEqual(state.currentPhase, 'Phase 1');
    assert.strictEqual(state.overallProgress, 0);
    assert.strictEqual(state.phaseProgress, 0);

    // Test phase 1 at 50%
    reporter.updatePhaseProgress(50);
    state = reporter.getCurrentState();
    assert.strictEqual(state.phaseProgress, 50);
    assert.strictEqual(state.overallProgress, 15); // 30% of 50% = 15%

    // Test moving to phase 2
    reporter.nextPhase();
    state = reporter.getCurrentState();
    assert.strictEqual(state.currentPhase, 'Phase 2');
    assert.strictEqual(state.overallProgress, 30); // Phase 1 complete = 30%
    assert.strictEqual(state.phaseProgress, 0);

    // Test phase 2 at 50%
    reporter.updatePhaseProgress(50);
    state = reporter.getCurrentState();
    assert.strictEqual(state.overallProgress, 65); // 30% + (70% * 50%) = 65%
  });

  test('should handle progress bounds correctly', () => {
    const phases: ProgressPhase[] = [{ name: 'Test', weight: 100 }];
    const mockProgress = { report: () => {} };
    const reporter = new ProgressReporter(mockProgress as any, phases);

    // Test negative progress
    reporter.updatePhaseProgress(-10);
    let state = reporter.getCurrentState();
    assert.strictEqual(state.phaseProgress, 0);

    // Test progress over 100
    reporter.updatePhaseProgress(150);
    state = reporter.getCurrentState();
    assert.strictEqual(state.phaseProgress, 100);
  });

  test('should not advance past last phase', () => {
    const phases: ProgressPhase[] = [{ name: 'Only Phase', weight: 100 }];
    const mockProgress = { report: () => {} };
    const reporter = new ProgressReporter(mockProgress as any, phases);

    reporter.nextPhase(); // Should not advance beyond the last phase
    const state = reporter.getCurrentState();
    assert.strictEqual(state.currentPhase, 'Only Phase');
  });
}); 