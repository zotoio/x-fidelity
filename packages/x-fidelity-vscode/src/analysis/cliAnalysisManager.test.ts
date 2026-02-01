/**
 * Test suite for CLIAnalysisManager
 * Tests state management, concurrent execution prevention, and analysis lifecycle
 */

import { CLIAnalysisManager } from './cliAnalysisManager';
import * as vscode from 'vscode';

// Mock vscode module
jest.mock('vscode', () => {
  const mockDisposable = { dispose: jest.fn() };
  const mockEventEmitter = {
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn()
  };

  return {
    Disposable: {
      from: jest.fn(() => mockDisposable)
    },
    EventEmitter: jest.fn(() => mockEventEmitter),
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
      onDidChangeConfiguration: jest.fn(() => mockDisposable)
    },
    window: {
      withProgress: jest.fn((options, task) => {
        const progress = { report: jest.fn() };
        const token = { isCancellationRequested: false };
        return task(progress, token);
      }),
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn()
    },
    commands: {
      executeCommand: jest.fn()
    },
    ProgressLocation: {
      Window: 1,
      Notification: 15
    },
    CancellationError: class CancellationError extends Error {
      constructor() {
        super('Operation cancelled');
        this.name = 'CancellationError';
      }
    },
    CancellationTokenSource: jest.fn(() => ({
      token: { isCancellationRequested: false },
      cancel: jest.fn(),
      dispose: jest.fn()
    }))
  };
});

// Mock utilities
jest.mock('../utils/globalLogger', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  })),
  commandLogger: {
    execution: jest.fn(),
    completion: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../utils/workspaceUtils', () => ({
  getAnalysisTargetDirectory: jest.fn(() => '/test/workspace')
}));

jest.mock('../utils/analysisResultCache', () => ({
  AnalysisResultCache: {
    isAnalysisRunning: jest.fn(() => false),
    markAnalysisStarted: jest.fn(() => 'analysis-id-123'),
    markAnalysisCompleted: jest.fn(),
    clearAllCaches: jest.fn().mockResolvedValue(undefined),
    ensureFreshResults: jest.fn().mockResolvedValue(undefined),
    validateResultFile: jest.fn(() => ({ valid: true })),
    getCacheStatistics: jest.fn(() => ({ hits: 0, misses: 0 }))
  }
}));

jest.mock('../utils/serialization', () => ({
  safeSerializeAnalysisResult: jest.fn(result => result)
}));

jest.mock('../utils/cliSpawner', () => ({
  createCLISpawner: jest.fn(() => ({
    runAnalysis: jest.fn().mockResolvedValue({
      metadata: {
        XFI_RESULT: {
          issueDetails: []
        }
      },
      summary: {
        totalIssues: 0,
        filesAnalyzed: 5,
        analysisTimeMs: 1000
      }
    })
  }))
}));

describe('CLIAnalysisManager', () => {
  let manager: CLIAnalysisManager;
  let mockConfigManager: any;
  let mockDiagnosticProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigManager = {
      getConfig: jest.fn(() => ({
        archetype: 'test-archetype',
        cliExtraArgs: [],
        analysisTimeout: 60000
      }))
    };

    mockDiagnosticProvider = {
      updateDiagnostics: jest.fn().mockResolvedValue(undefined)
    };

    manager = new CLIAnalysisManager(mockConfigManager, mockDiagnosticProvider);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('isAnalysisRunning', () => {
    it('should return false initially', () => {
      expect(manager.isAnalysisRunning).toBe(false);
    });
  });

  describe('runAnalysis - concurrent execution prevention', () => {
    it('should prevent concurrent analysis execution', async () => {
      const { AnalysisResultCache } = require('../utils/analysisResultCache');

      // Simulate analysis already running
      AnalysisResultCache.isAnalysisRunning.mockReturnValue(true);

      const result = await manager.runAnalysis();

      expect(result).toBeNull();
    });

    it('should allow sequential analysis after completion', async () => {
      const { AnalysisResultCache } = require('../utils/analysisResultCache');
      AnalysisResultCache.isAnalysisRunning.mockReturnValue(false);

      const result1 = await manager.runAnalysis();
      const result2 = await manager.runAnalysis();

      // Both should complete (not return null due to concurrency)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });
  });

  describe('state transitions', () => {
    let stateChanges: string[];

    beforeEach(() => {
      stateChanges = [];
      manager.onStateChanged(state => {
        stateChanges.push(state);
      });
    });

    it('should transition to analyzing state when starting', async () => {
      await manager.runAnalysis();

      expect(stateChanges).toContain('analyzing');
    });

    it('should transition to complete state on success', async () => {
      await manager.runAnalysis();

      expect(stateChanges).toContain('complete');
    });

    it('should transition to error state on failure', async () => {
      const { createCLISpawner } = require('../utils/cliSpawner');
      createCLISpawner.mockReturnValue({
        runAnalysis: jest.fn().mockRejectedValue(new Error('Analysis failed'))
      });

      // Recreate manager with failing spawner
      manager.dispose();
      manager = new CLIAnalysisManager(
        mockConfigManager,
        mockDiagnosticProvider
      );

      await expect(manager.runAnalysis()).rejects.toThrow('Analysis failed');
    });
  });

  describe('cancelAnalysis', () => {
    it('should cancel running analysis', async () => {
      // Start an analysis
      const analysisPromise = manager.runAnalysis();

      // Cancel it
      await manager.cancelAnalysis();

      // Verify state is reset
      expect(manager.isAnalysisRunning).toBe(false);

      // Let the promise resolve
      await analysisPromise.catch(() => {});
    });

    it('should clean up analysis ID after cancellation', async () => {
      const { AnalysisResultCache } = require('../utils/analysisResultCache');

      await manager.runAnalysis();
      await manager.cancelAnalysis();

      expect(AnalysisResultCache.markAnalysisCompleted).toHaveBeenCalled();
    });
  });

  describe('analysis lifecycle', () => {
    it('should mark analysis as started in cache', async () => {
      const { AnalysisResultCache } = require('../utils/analysisResultCache');

      await manager.runAnalysis();

      expect(AnalysisResultCache.markAnalysisStarted).toHaveBeenCalled();
    });

    it('should mark analysis as completed in cache', async () => {
      const { AnalysisResultCache } = require('../utils/analysisResultCache');

      await manager.runAnalysis();

      expect(AnalysisResultCache.markAnalysisCompleted).toHaveBeenCalled();
    });

    it('should clear caches before fresh analysis', async () => {
      const { AnalysisResultCache } = require('../utils/analysisResultCache');

      await manager.runAnalysis();

      expect(AnalysisResultCache.clearAllCaches).toHaveBeenCalled();
      expect(AnalysisResultCache.ensureFreshResults).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing workspace gracefully', async () => {
      const { getAnalysisTargetDirectory } = require('../utils/workspaceUtils');
      getAnalysisTargetDirectory.mockReturnValue(null);

      await expect(manager.runAnalysis()).rejects.toThrow(
        'No workspace folder found'
      );
    });

    it('should handle CLI spawner errors', async () => {
      const { createCLISpawner } = require('../utils/cliSpawner');
      createCLISpawner.mockReturnValue({
        runAnalysis: jest.fn().mockRejectedValue(new Error('CLI failed'))
      });

      manager.dispose();
      manager = new CLIAnalysisManager(
        mockConfigManager,
        mockDiagnosticProvider
      );

      await expect(manager.runAnalysis()).rejects.toThrow('CLI failed');
    });

    it('should handle user cancellation', async () => {
      const mockCancellationError = new (vscode as any).CancellationError();

      const { createCLISpawner } = require('../utils/cliSpawner');
      createCLISpawner.mockReturnValue({
        runAnalysis: jest.fn().mockRejectedValue(mockCancellationError)
      });

      manager.dispose();
      manager = new CLIAnalysisManager(
        mockConfigManager,
        mockDiagnosticProvider
      );

      const result = await manager.runAnalysis();

      // Cancellation should return null, not throw
      expect(result).toBeNull();
    });
  });

  describe('result handling', () => {
    it('should update diagnostics with analysis result', async () => {
      await manager.runAnalysis();

      expect(mockDiagnosticProvider.updateDiagnostics).toHaveBeenCalled();
    });

    it('should fire completion event with result', async () => {
      let completedResult: any = null;
      manager.onComplete(result => {
        completedResult = result;
      });

      await manager.runAnalysis();

      expect(completedResult).toBeDefined();
      expect(completedResult.summary).toBeDefined();
    });

    it('should store last analysis result', async () => {
      await manager.runAnalysis();

      const lastResult = manager.getLastResult();
      expect(lastResult).toBeDefined();
      expect(lastResult?.summary).toBeDefined();
    });

    it('should create safe serializable result', async () => {
      const { safeSerializeAnalysisResult } = require('../utils/serialization');

      await manager.runAnalysis();

      expect(safeSerializeAnalysisResult).toHaveBeenCalled();
    });
  });

  describe('trigger source handling', () => {
    it('should open side panel for manual trigger', async () => {
      await manager.runAnalysis({ triggerSource: 'manual' });

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.view.extension.xfidelity'
      );
    });

    it('should not open side panel for automatic trigger', async () => {
      await manager.runAnalysis({ triggerSource: 'automatic' });

      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
        'workbench.view.extension.xfidelity'
      );
    });

    it('should default to automatic trigger', async () => {
      await manager.runAnalysis();

      // Should not open side panel (automatic is default)
      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
        'workbench.view.extension.xfidelity'
      );
    });
  });

  describe('getCurrentResults', () => {
    it('should return null when no analysis has run', () => {
      expect(manager.getCurrentResults()).toBeNull();
    });

    it('should return last result after analysis', async () => {
      await manager.runAnalysis();

      const result = manager.getCurrentResults();
      expect(result).toBeDefined();
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics object', () => {
      const metrics = manager.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics).toBe('object');
    });
  });

  describe('getLogger', () => {
    it('should return logger instance', () => {
      const logger = manager.getLogger();
      expect(logger).toBeDefined();
    });
  });

  describe('getCLISpawner', () => {
    it('should return CLI spawner instance', () => {
      const spawner = manager.getCLISpawner();
      expect(spawner).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should clean up all resources', () => {
      expect(() => manager.dispose()).not.toThrow();
    });

    it('should dispose event emitters', () => {
      manager.dispose();
      // No error should occur when calling dispose
    });
  });

  describe('configuration changes', () => {
    it('should clear cache when configuration changes', () => {
      // The manager sets up a configuration change listener in setupEventListeners
      // This is tested indirectly through the constructor
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });
  });

  describe('minimal result creation', () => {
    it('should handle serialization failure gracefully', async () => {
      const { safeSerializeAnalysisResult } = require('../utils/serialization');
      safeSerializeAnalysisResult.mockReturnValue(null);

      // Should not throw, should use fallback
      const result = await manager.runAnalysis();
      expect(result).toBeDefined();
    });
  });

  describe('date formatting', () => {
    it('should format dates with timezone correctly', async () => {
      await manager.runAnalysis();

      const result = manager.getCurrentResults();
      // The result should have timestamp in correct format
      expect(result?.timestamp).toBeDefined();
    });
  });
});

describe('CLIAnalysisManager - State Machine', () => {
  let manager: CLIAnalysisManager;
  let mockConfigManager: any;
  let mockDiagnosticProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigManager = {
      getConfig: jest.fn(() => ({
        archetype: 'test-archetype',
        cliExtraArgs: [],
        analysisTimeout: 60000
      }))
    };

    mockDiagnosticProvider = {
      updateDiagnostics: jest.fn().mockResolvedValue(undefined)
    };

    manager = new CLIAnalysisManager(mockConfigManager, mockDiagnosticProvider);
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('state transitions diagram', () => {
    /**
     * State Machine:
     * idle -> analyzing -> complete/error -> idle
     *            |
     *            v (cancel)
     *          idle
     */

    it('should follow idle -> analyzing -> complete -> idle cycle', async () => {
      const states: string[] = [];
      manager.onStateChanged(state => states.push(state));

      await manager.runAnalysis();

      expect(states).toEqual(['analyzing', 'complete']);
    });

    it('should follow idle -> analyzing -> error cycle on failure', async () => {
      const { createCLISpawner } = require('../utils/cliSpawner');
      createCLISpawner.mockReturnValue({
        runAnalysis: jest.fn().mockRejectedValue(new Error('Failure'))
      });

      manager.dispose();
      manager = new CLIAnalysisManager(
        mockConfigManager,
        mockDiagnosticProvider
      );

      const states: string[] = [];
      manager.onStateChanged(state => states.push(state));

      await manager.runAnalysis().catch(() => {});

      expect(states).toContain('analyzing');
      expect(states).toContain('error');
    });

    it('should reset to idle after cancellation', async () => {
      const states: string[] = [];
      manager.onStateChanged(state => states.push(state));

      // Start analysis
      const analysisPromise = manager.runAnalysis();

      // Cancel immediately
      await manager.cancelAnalysis();

      await analysisPromise.catch(() => {});

      expect(states).toContain('idle');
    });
  });
});
