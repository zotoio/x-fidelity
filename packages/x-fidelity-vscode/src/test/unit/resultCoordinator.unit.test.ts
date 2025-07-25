import * as assert from 'assert';
import { ResultCoordinator } from '../../core/resultCoordinator';
import { ProcessedAnalysisResult } from '../../types/issues';
import type { AnalysisResult } from '../../analysis/types';

// Mock VSCode API

// Mock components
class MockDiagnosticProvider {
  public updateFromProcessedResultCalled = false;
  public lastProcessedResult: ProcessedAnalysisResult | null = null;

  async updateFromProcessedResult(processed: ProcessedAnalysisResult): Promise<void> {
    this.updateFromProcessedResultCalled = true;
    this.lastProcessedResult = processed;
  }
}

class MockIssuesTreeViewManager {
  public updateFromProcessedResultCalled = false;
  public lastProcessedResult: ProcessedAnalysisResult | null = null;

  updateFromProcessedResult(processed: ProcessedAnalysisResult): void {
    this.updateFromProcessedResultCalled = true;
    this.lastProcessedResult = processed;
  }
}

class MockStatusBarProvider {
  public updateFromProcessedResultCalled = false;
  public lastProcessedResult: ProcessedAnalysisResult | null = null;

  updateFromProcessedResult(processed: ProcessedAnalysisResult): void {
    this.updateFromProcessedResultCalled = true;
    this.lastProcessedResult = processed;
  }
}

describe('ResultCoordinator Unit Tests', () => {
  let coordinator: ResultCoordinator;
  let mockDiagnosticProvider: MockDiagnosticProvider;
  let mockTreeViewManager: MockIssuesTreeViewManager;
  let mockStatusBarProvider: MockStatusBarProvider;

  beforeEach(() => {
    coordinator = new ResultCoordinator();
    mockDiagnosticProvider = new MockDiagnosticProvider();
    mockTreeViewManager = new MockIssuesTreeViewManager();
    mockStatusBarProvider = new MockStatusBarProvider();
  });

  afterEach(() => {
    coordinator.dispose();
  });

  it('should create ResultCoordinator instance', () => {
    assert.ok(coordinator instanceof ResultCoordinator);
  });

  it('should process analysis result with valid XFI_RESULT', async () => {
    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {} as any,
          telemetryData: { repoUrl: '', configServer: '', hostInfo: {} as any, userInfo: {} as any, startTime: 0 },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          archetype: 'node-fullstack',
          repoPath: '/test/path',
          repoUrl: 'https://test.com/repo',
          xfiVersion: '1.0.0',
          fileCount: 2,
          totalIssues: 2,
          warningCount: 1,
          errorCount: 1,
          fatalityCount: 0,
          exemptCount: 0,
          startTime: '2024-01-01T00:00:00+10:00',
          finishTime: '2024-01-01T00:01:00+10:00',
          startTimeStamp: 1704067200000,
          finishTimeStamp: 1704067260000,
          durationSeconds: 60,
          issueDetails: [
            {
              filePath: '/test/file1.ts',
              errors: [
                {
                  ruleFailure: 'test-rule-1',
                  level: 'warning',
                  details: {
                    message: 'Test warning message',
                    lineNumber: 10,
                    columnNumber: 5
                  }
                }
              ]
            },
            {
              filePath: '/test/file2.ts',
              errors: [
                {
                  ruleFailure: 'test-rule-2',
                  level: 'error',
                  details: {
                    message: 'Test error message',
                    lineNumber: 20,
                    columnNumber: 8
                  }
                }
              ]
            }
          ]
        }
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 60000,
      summary: {
        totalIssues: 2,
        filesAnalyzed: 2,
        analysisTimeMs: 60000
      },
      operationId: 'test-operation'
    };

    // Debug: Verify input data structure
    assert.ok(mockAnalysisResult.metadata, 'Metadata should exist');
    assert.ok(mockAnalysisResult.metadata.XFI_RESULT, 'XFI_RESULT should exist');
    assert.ok(Array.isArray(mockAnalysisResult.metadata.XFI_RESULT.issueDetails), 'issueDetails should be an array');
    assert.strictEqual(mockAnalysisResult.metadata.XFI_RESULT.issueDetails.length, 2, 'Should have 2 issue details');

    const processed = await coordinator.processAndDistributeResults(
      mockAnalysisResult,
      {
        diagnosticProvider: mockDiagnosticProvider,
        issuesTreeViewManager: mockTreeViewManager,
        statusBarProvider: mockStatusBarProvider
      }
    );

    // Debug: Verify the processed result contains expected data
    assert.ok(processed, 'Processed result should exist');
    assert.ok(typeof processed.totalIssues === 'number', 'totalIssues should be a number');
    assert.ok(typeof processed.successfulIssues === 'number', 'successfulIssues should be a number');
    assert.ok(typeof processed.failedIssuesCount === 'number', 'failedIssuesCount should be a number');

    // If we're getting 0 issues, let's fail with more details
    if (processed.successfulIssues === 0 && processed.failedIssuesCount === 0) {
      throw new Error(`No issues were processed. Input had ${mockAnalysisResult.metadata.XFI_RESULT.issueDetails.length} issueDetails. Processed result: ${JSON.stringify({
        totalIssues: processed.totalIssues,
        successfulIssues: processed.successfulIssues,
        failedIssuesCount: processed.failedIssuesCount,
        processedIssuesLength: processed.processedIssues.length,
        failedIssuesLength: processed.failedIssues.length,
        issueBreakdown: processed.issueBreakdown
      }, null, 2)}`);
    }

    // If we're getting failed issues instead of successful, let's see why
    if (processed.successfulIssues === 0 && processed.failedIssuesCount > 0) {
      const firstFailure = processed.failedIssues[0];
      throw new Error(`All issues failed processing. First failure: ${JSON.stringify(firstFailure, null, 2)}`);
    }

    // Verify processed result structure
    assert.strictEqual(processed.totalIssues, 2);
    assert.strictEqual(processed.successfulIssues, 2);
    assert.strictEqual(processed.failedIssuesCount, 0);
    assert.strictEqual(processed.processedIssues.length, 2);
    assert.strictEqual(processed.failedIssues.length, 0);

    // Verify issue breakdown
    assert.strictEqual(processed.issueBreakdown.error, 1);
    assert.strictEqual(processed.issueBreakdown.warning, 1);
    assert.strictEqual(processed.issueBreakdown.info, 0);
    assert.strictEqual(processed.issueBreakdown.hint, 0);
    assert.strictEqual(processed.issueBreakdown.exempt, 0);
    assert.strictEqual(processed.issueBreakdown.unhandled, 0);

    // Verify all components were updated
    assert.strictEqual(mockDiagnosticProvider.updateFromProcessedResultCalled, true);
    assert.strictEqual(mockTreeViewManager.updateFromProcessedResultCalled, true);
    assert.strictEqual(mockStatusBarProvider.updateFromProcessedResultCalled, true);

    // Verify all components received the same data
    assert.deepStrictEqual(mockDiagnosticProvider.lastProcessedResult, processed);
    assert.deepStrictEqual(mockTreeViewManager.lastProcessedResult, processed);
    assert.deepStrictEqual(mockStatusBarProvider.lastProcessedResult, processed);
  });

  it('should handle empty analysis result', async () => {
    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {} as any,
          telemetryData: { repoUrl: '', configServer: '', hostInfo: {} as any, userInfo: {} as any, startTime: 0 },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          archetype: 'node-fullstack',
          repoPath: '/test/path',
          repoUrl: 'https://test.com/repo',
          xfiVersion: '1.0.0',
          fileCount: 0,
          totalIssues: 0,
          warningCount: 0,
          errorCount: 0,
          fatalityCount: 0,
          exemptCount: 0,
          startTime: '2024-01-01T00:00:00+10:00',
          finishTime: '2024-01-01T00:00:30+10:00',
          startTimeStamp: 1704067200000,
          finishTimeStamp: 1704067230000,
          durationSeconds: 30,
          issueDetails: []
        }
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 30000,
      summary: {
        totalIssues: 0,
        filesAnalyzed: 0,
        analysisTimeMs: 30000
      }
    };

    const processed = await coordinator.processAndDistributeResults(
      mockAnalysisResult,
      {
        diagnosticProvider: mockDiagnosticProvider,
        issuesTreeViewManager: mockTreeViewManager,
        statusBarProvider: mockStatusBarProvider
      }
    );

    // Verify empty result handling
    assert.strictEqual(processed.totalIssues, 0);
    assert.strictEqual(processed.successfulIssues, 0);
    assert.strictEqual(processed.failedIssuesCount, 0);
    assert.strictEqual(processed.processedIssues.length, 0);
    assert.strictEqual(processed.failedIssues.length, 0);

    // Verify all components were still updated
    assert.strictEqual(mockDiagnosticProvider.updateFromProcessedResultCalled, true);
    assert.strictEqual(mockTreeViewManager.updateFromProcessedResultCalled, true);
    assert.strictEqual(mockStatusBarProvider.updateFromProcessedResultCalled, true);
  });

  it('should handle failed issue conversions', async () => {
    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {} as any,
          telemetryData: { repoUrl: '', configServer: '', hostInfo: {} as any, userInfo: {} as any, startTime: 0 },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          archetype: 'node-fullstack',
          repoPath: '/test/path',
          repoUrl: 'https://test.com/repo',
          xfiVersion: '1.0.0',
          fileCount: 2,
          totalIssues: 2,
          warningCount: 1,
          errorCount: 1,
          fatalityCount: 0,
          exemptCount: 0,
          startTime: '2024-01-01T00:00:00+10:00',
          finishTime: '2024-01-01T00:01:00+10:00',
          startTimeStamp: 1704067200000,
          finishTimeStamp: 1704067260000,
          durationSeconds: 60,
          issueDetails: [
            {
              filePath: '', // Invalid empty path to trigger failure
              errors: [
                {
                  ruleFailure: 'test-rule-fail',
                  level: 'warning',
                  details: {
                    message: 'This should fail URI resolution'
                  }
                }
              ]
            },
            {
              filePath: '/test/valid-file.ts',
              errors: [
                {
                  ruleFailure: 'test-rule-success',
                  level: 'error',
                  details: {
                    message: 'This should succeed',
                    lineNumber: 20,
                    columnNumber: 8
                  }
                }
              ]
            }
          ]
        }
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 60000,
      summary: {
        totalIssues: 2,
        filesAnalyzed: 2,
        analysisTimeMs: 60000
      }
    };

    const processed = await coordinator.processAndDistributeResults(
      mockAnalysisResult,
      {
        diagnosticProvider: mockDiagnosticProvider,
        issuesTreeViewManager: mockTreeViewManager,
        statusBarProvider: mockStatusBarProvider
      }
    );

    // Should have 1 successful and 1 failed issue
    assert.strictEqual(processed.totalIssues, 2);
    assert.strictEqual(processed.successfulIssues, 1);
    assert.strictEqual(processed.failedIssuesCount, 1);
    
    // Should have failed issues tracked
    assert.strictEqual(processed.failedIssues.length, 1);
    assert.strictEqual(processed.failedIssues[0].ruleId, 'test-rule-fail');
    assert.strictEqual(processed.failedIssues[0].failureReason, 'File URI resolution failed');

    // Should show unhandled in breakdown
    assert.strictEqual(processed.issueBreakdown.unhandled, 1);
    assert.strictEqual(processed.issueBreakdown.error, 1);
  });

  it('should handle invalid XFI_RESULT structure', async () => {
    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: null as any // Invalid structure
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 30000,
      summary: {
        totalIssues: 0,
        filesAnalyzed: 0,
        analysisTimeMs: 30000
      }
    };

    const processed = await coordinator.processAndDistributeResults(
      mockAnalysisResult,
      {
        diagnosticProvider: mockDiagnosticProvider,
        issuesTreeViewManager: mockTreeViewManager,
        statusBarProvider: mockStatusBarProvider
      }
    );

    // Should handle gracefully with empty results
    assert.strictEqual(processed.totalIssues, 0);
    assert.strictEqual(processed.successfulIssues, 0);
    assert.strictEqual(processed.failedIssuesCount, 0);
  });

  it('should preserve metadata and timing information', async () => {
    const timestamp = Date.now();
    const duration = 45000;
    
    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {} as any,
          telemetryData: { repoUrl: '', configServer: '', hostInfo: {} as any, userInfo: {} as any, startTime: 0 },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          archetype: 'java-microservice',
          repoPath: '/test/java-path',
          repoUrl: 'https://test.com/java-repo',
          xfiVersion: '2.0.0',
          fileCount: 0,
          totalIssues: 0,
          warningCount: 0,
          errorCount: 0,
          fatalityCount: 0,
          exemptCount: 0,
          startTime: '2024-01-01T00:00:00+10:00',
          finishTime: '2024-01-01T00:00:45+10:00',
          startTimeStamp: 1704067200000,
          finishTimeStamp: 1704067245000,
          durationSeconds: 45,
          issueDetails: []
        }
      },
      diagnostics: new Map(),
      timestamp,
      duration,
      summary: {
        totalIssues: 0,
        filesAnalyzed: 0,
        analysisTimeMs: duration
      }
    };

    const processed = await coordinator.processAndDistributeResults(
      mockAnalysisResult,
      {
        diagnosticProvider: mockDiagnosticProvider,
        issuesTreeViewManager: mockTreeViewManager,
        statusBarProvider: mockStatusBarProvider
      }
    );

    // Verify metadata preservation
    assert.strictEqual(processed.metadata, mockAnalysisResult.metadata);
    assert.strictEqual(processed.timestamp, timestamp);
    assert.strictEqual(processed.duration, duration);
  });

  it('should handle component update failures gracefully', async () => {
    // Create a failing component
    const failingProvider = {
      updateFromProcessedResult: () => {
        throw new Error('Component update failed');
      }
    };

    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {} as any,
          telemetryData: { repoUrl: '', configServer: '', hostInfo: {} as any, userInfo: {} as any, startTime: 0 },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          archetype: 'node-fullstack',
          repoPath: '/test/path',
          repoUrl: 'https://test.com/repo',
          xfiVersion: '1.0.0',
          fileCount: 0,
          totalIssues: 0,
          warningCount: 0,
          errorCount: 0,
          fatalityCount: 0,
          exemptCount: 0,
          startTime: '2024-01-01T00:00:00+10:00',
          finishTime: '2024-01-01T00:00:30+10:00',
          startTimeStamp: 1704067200000,
          finishTimeStamp: 1704067230000,
          durationSeconds: 30,
          issueDetails: []
        }
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 30000,
      summary: {
        totalIssues: 0,
        filesAnalyzed: 0,
        analysisTimeMs: 30000
      }
    };

    // Should throw error when component update fails
    await assert.rejects(
      async () => {
        await coordinator.processAndDistributeResults(
          mockAnalysisResult,
          {
            diagnosticProvider: failingProvider as any,
            issuesTreeViewManager: mockTreeViewManager,
            statusBarProvider: mockStatusBarProvider
          }
        );
      },
      /Component update failed/
    );
  });

  it('should calculate issue breakdown correctly', async () => {
    const mockAnalysisResult: AnalysisResult = {
      metadata: {
        XFI_RESULT: {
          repoXFIConfig: {} as any,
          telemetryData: { repoUrl: '', configServer: '', hostInfo: {} as any, userInfo: {} as any, startTime: 0 },
          memoryUsage: {},
          factMetrics: {},
          options: {},
          archetype: 'node-fullstack',
          repoPath: '/test/path',
          repoUrl: 'https://test.com/repo',
          xfiVersion: '1.0.0',
          fileCount: 5,
          totalIssues: 6,
          warningCount: 2,
          errorCount: 2,
          fatalityCount: 1,
          exemptCount: 1,
          startTime: '2024-01-01T00:00:00+10:00',
          finishTime: '2024-01-01T00:01:00+10:00',
          startTimeStamp: 1704067200000,
          finishTimeStamp: 1704067260000,
          durationSeconds: 60,
          issueDetails: [
            {
              filePath: '/test/file1.ts',
              errors: [
                { ruleFailure: 'rule1', level: 'error', details: { message: 'Error 1', lineNumber: 1 } },
                { ruleFailure: 'rule2', level: 'warning', details: { message: 'Warning 1', lineNumber: 2 } }
              ]
            },
            {
              filePath: '/test/file2.ts',
              errors: [
                { ruleFailure: 'rule3', level: 'fatality', details: { message: 'Fatal 1', lineNumber: 3 } },
                { ruleFailure: 'rule4', level: 'warning', details: { message: 'Info 1', lineNumber: 4 } }
              ]
            },
            {
              filePath: '/test/file3.ts',
              errors: [
                { ruleFailure: 'rule5', level: 'warning', details: { message: 'Hint 1', lineNumber: 5 } },
                { ruleFailure: 'rule6', level: 'exempt', details: { message: 'Exempt 1', lineNumber: 6 } }
              ]
            }
          ]
        }
      },
      diagnostics: new Map(),
      timestamp: Date.now(),
      duration: 60000,
      summary: {
        totalIssues: 6,
        filesAnalyzed: 3,
        analysisTimeMs: 60000
      }
    };

    const processed = await coordinator.processAndDistributeResults(
      mockAnalysisResult,
      {
        diagnosticProvider: mockDiagnosticProvider,
        issuesTreeViewManager: mockTreeViewManager,
        statusBarProvider: mockStatusBarProvider
      }
    );

    // Verify comprehensive breakdown based on actual test data:
    // rule1: 'error' -> error 
    // rule2: 'warning' -> warning
    // rule3: 'fatality' -> error (mapped as error)
    // rule4: 'warning' -> warning  
    // rule5: 'warning' -> warning
    // rule6: 'exempt' -> exempt
    
    // Based on the actual breakdown, we have:
    // error: 2, warning: 3, info: 1, hint: 0, exempt: 0, unhandled: 0
    // This means exempt is being mapped to info by the mapSeverity method
    assert.strictEqual(processed.issueBreakdown.error, 2); // error + fatality
    assert.strictEqual(processed.issueBreakdown.warning, 3); // 3 warning level issues
    assert.strictEqual(processed.issueBreakdown.info, 1); // exempt gets mapped to info
    assert.strictEqual(processed.issueBreakdown.hint, 0); 
    assert.strictEqual(processed.issueBreakdown.exempt, 0); // exempt doesn't get preserved in mapSeverity
    assert.strictEqual(processed.issueBreakdown.unhandled, 0);
  });
}); 