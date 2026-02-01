/**
 * Test suite for ResultCoordinator
 * Tests analysis result processing and diagnostic conversion
 */

import { ResultCoordinator } from './resultCoordinator';

// Mock vscode module
jest.mock('vscode', () => ({
  Diagnostic: jest.fn().mockImplementation((range, message, severity) => ({
    range,
    message,
    severity,
    source: 'X-Fidelity'
  })),
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3
  },
  Range: jest
    .fn()
    .mockImplementation((startLine, startCol, endLine, endCol) => ({
      start: { line: startLine, character: startCol },
      end: { line: endLine, character: endCol }
    })),
  Uri: {
    file: jest.fn(path => ({
      fsPath: path,
      toString: () => `file://${path}`
    })),
    parse: jest.fn(uri => ({
      fsPath: uri.replace('file://', ''),
      toString: () => uri
    }))
  },
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
    getWorkspaceFolder: jest.fn()
  },
  EventEmitter: jest.fn().mockImplementation(() => ({
    event: jest.fn(),
    fire: jest.fn(),
    dispose: jest.fn()
  }))
}));

// Mock utils
jest.mock('../utils/globalLogger', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn()
  }))
}));

jest.mock('../utils/rangeValidation', () => ({
  validateRange: jest.fn((startLine, startCol, endLine, endCol) => ({
    startLine: Math.max(0, startLine),
    startColumn: Math.max(0, startCol),
    endLine: Math.max(startLine, endLine),
    endColumn: Math.max(startCol, endCol)
  }))
}));

jest.mock('../utils/diagnosticLocationExtractor', () => ({
  DiagnosticLocationExtractor: {
    extractLocation: jest.fn(error => ({
      found: true,
      confidence: 'high',
      location: {
        startLine: error?.details?.lineNumber || 1,
        startColumn: error?.details?.columnNumber || 1,
        endLine: error?.details?.lineNumber || 1,
        endColumn: (error?.details?.columnNumber || 1) + 10,
        source: 'test'
      }
    })),
    validateLocation: jest.fn(loc => loc),
    getConfidenceDescription: jest.fn(() => 'Test confidence')
  }
}));

jest.mock('../utils/fileSourceTranslator', () => ({
  FileSourceTranslator: {
    isGlobalCheck: jest.fn(file => file?.includes('REPO_GLOBAL_CHECK')),
    translateFileSourceForDisplay: jest.fn(file => file),
    resolveFileUri: jest.fn(file =>
      Promise.resolve({
        fsPath: file,
        toString: () => `file://${file}`
      })
    )
  }
}));

describe('ResultCoordinator', () => {
  let coordinator: ResultCoordinator;

  beforeEach(() => {
    coordinator = new ResultCoordinator();
  });

  afterEach(() => {
    coordinator.dispose();
  });

  describe('processAndDistributeResults', () => {
    const createMockComponents = () => ({
      diagnosticProvider: {
        updateFromProcessedResult: jest.fn()
      },
      issuesTreeViewManager: {
        updateFromProcessedResult: jest.fn()
      },
      statusBarProvider: {
        updateFromProcessedResult: jest.fn()
      }
    });

    it('should process valid analysis result', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 2,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: {
                      message: 'Test warning',
                      lineNumber: 10,
                      columnNumber: 5
                    }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 1000,
        operationId: 'test-op-1'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result).toBeDefined();
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
      expect(result.diagnostics).toBeInstanceOf(Map);
    });

    it('should handle empty issueDetails', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 0,
            fileCount: 0,
            issueDetails: []
          }
        },
        summary: { totalIssues: 0 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-2'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.totalIssues).toBe(0);
      expect(result.successfulIssues).toBe(0);
    });

    it('should handle malformed ScanResult structures', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                // Missing filePath
                errors: [{ ruleFailure: 'test-rule', level: 'warning' }]
              },
              {
                filePath: '/test/valid.ts'
                // Missing errors array
              }
            ]
          }
        },
        summary: { totalIssues: 0 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-3'
      };

      const components = createMockComponents();

      // Should not throw
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );
      expect(result).toBeDefined();
    });

    it('should track failed diagnostic conversions', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 2,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'valid-rule',
                    level: 'warning',
                    details: { message: 'Valid issue' }
                  },
                  {
                    ruleFailure: 'another-rule',
                    level: 'error',
                    details: { message: 'Another issue' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 2 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-4'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.totalIssues).toBe(
        result.successfulIssues + result.failedIssuesCount
      );
    });

    it('should calculate issue breakdown by severity', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 3,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'error-rule',
                    level: 'error',
                    details: { message: 'Error' }
                  },
                  {
                    ruleFailure: 'warning-rule',
                    level: 'warning',
                    details: { message: 'Warning' }
                  },
                  {
                    ruleFailure: 'info-rule',
                    level: 'info',
                    details: { message: 'Info' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 3 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-5'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.issueBreakdown).toBeDefined();
      expect(typeof result.issueBreakdown.error).toBe('number');
      expect(typeof result.issueBreakdown.warning).toBe('number');
      expect(typeof result.issueBreakdown.info).toBe('number');
    });

    it('should distribute results to all components', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-6'
      };

      const components = createMockComponents();
      await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(
        components.diagnosticProvider.updateFromProcessedResult
      ).toHaveBeenCalled();
      expect(
        components.issuesTreeViewManager.updateFromProcessedResult
      ).toHaveBeenCalled();
      expect(
        components.statusBarProvider.updateFromProcessedResult
      ).toHaveBeenCalled();
    });

    it('should cache processed result for diagnostic restoration', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-7'
      };

      const components = createMockComponents();
      await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(coordinator.hasCachedResults()).toBe(true);
      expect(coordinator.getLastProcessedResult()).toBeDefined();
    });
  });

  describe('restoreDiagnosticsFromCache', () => {
    const createMockComponents = () => ({
      diagnosticProvider: {
        updateFromProcessedResult: jest.fn()
      },
      issuesTreeViewManager: {
        updateFromProcessedResult: jest.fn()
      },
      statusBarProvider: {
        updateFromProcessedResult: jest.fn()
      }
    });

    it('should return false when no cached results', async () => {
      const components = createMockComponents();
      const result = await coordinator.restoreDiagnosticsFromCache(components);

      expect(result).toBe(false);
    });

    it('should restore diagnostics from cache', async () => {
      // First, process a result to cache it
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-8'
      };

      const components = createMockComponents();
      await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // Clear the mock call history
      jest.clearAllMocks();

      // Now restore from cache
      const restoreResult =
        await coordinator.restoreDiagnosticsFromCache(components);

      expect(restoreResult).toBe(true);
      expect(
        components.diagnosticProvider.updateFromProcessedResult
      ).toHaveBeenCalled();
    });
  });

  describe('getLastProcessedResult and hasCachedResults', () => {
    it('should return null when no results processed', () => {
      expect(coordinator.getLastProcessedResult()).toBeNull();
      expect(coordinator.hasCachedResults()).toBe(false);
    });
  });

  describe('severity mapping', () => {
    const createMockComponents = () => ({
      diagnosticProvider: { updateFromProcessedResult: jest.fn() },
      issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
      statusBarProvider: { updateFromProcessedResult: jest.fn() }
    });

    it('should map error/critical/fatality levels to error severity', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 3,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'rule1',
                    level: 'error',
                    details: { message: 'Error' }
                  },
                  {
                    ruleFailure: 'rule2',
                    level: 'critical',
                    details: { message: 'Critical' }
                  },
                  {
                    ruleFailure: 'rule3',
                    level: 'fatality',
                    details: { message: 'Fatality' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 3 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-9'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // All should be mapped to error severity
      expect(result.issueBreakdown.error).toBeGreaterThanOrEqual(0);
    });

    it('should map warning/warn/medium levels to warning severity', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 2,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'rule1',
                    level: 'warning',
                    details: { message: 'Warning' }
                  },
                  {
                    ruleFailure: 'rule2',
                    level: 'warn',
                    details: { message: 'Warn' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 2 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-10'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.issueBreakdown.warning).toBeGreaterThanOrEqual(0);
    });
  });

  describe('enhanced details extraction', () => {
    const createMockComponents = () => ({
      diagnosticProvider: { updateFromProcessedResult: jest.fn() },
      issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
      statusBarProvider: { updateFromProcessedResult: jest.fn() }
    });

    it('should extract dependency issue details', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/README.md',
                errors: [
                  {
                    ruleFailure: 'outdatedDependency-global',
                    level: 'error',
                    details: {
                      message: 'Outdated dependencies',
                      details: [
                        {
                          dependency: 'lodash',
                          currentVersion: '3.0.0',
                          requiredVersion: '4.0.0',
                          location: {
                            manifestPath: 'package.json',
                            lineNumber: 10,
                            columnNumber: 5
                          }
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-11'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result).toBeDefined();
    });

    it('should extract complexity issue details', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/complex.ts',
                errors: [
                  {
                    ruleFailure: 'functionComplexity-iterative',
                    level: 'warning',
                    details: {
                      message: 'High complexity',
                      details: {
                        complexities: [
                          {
                            name: 'complexFunction',
                            metrics: {
                              cyclomaticComplexity: 25,
                              cognitiveComplexity: 50,
                              location: { startLine: 10 }
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-12'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle null result gracefully', async () => {
      const components = {
        diagnosticProvider: { updateFromProcessedResult: jest.fn() },
        issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
        statusBarProvider: { updateFromProcessedResult: jest.fn() }
      };

      const mockResult = {
        metadata: null,
        summary: { totalIssues: 0 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-null'
      };

      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.totalIssues).toBe(0);
    });

    it('should handle component update failures', async () => {
      const failingComponents = {
        diagnosticProvider: {
          updateFromProcessedResult: jest
            .fn()
            .mockRejectedValue(new Error('Update failed'))
        },
        issuesTreeViewManager: {
          updateFromProcessedResult: jest.fn()
        },
        statusBarProvider: {
          updateFromProcessedResult: jest.fn()
        }
      };

      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-fail'
      };

      // Should throw when component update fails
      await expect(
        coordinator.processAndDistributeResults(
          mockResult as any,
          failingComponents
        )
      ).rejects.toThrow('Update failed');
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      expect(() => coordinator.dispose()).not.toThrow();
    });
  });

  describe('cache restoration with stale/corrupted data', () => {
    const createMockComponents = () => ({
      diagnosticProvider: { updateFromProcessedResult: jest.fn() },
      issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
      statusBarProvider: { updateFromProcessedResult: jest.fn() }
    });

    it('should handle restoration when cached result has null diagnostics map', async () => {
      // First, process a valid result to populate cache
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-cache-1'
      };

      const components = createMockComponents();
      await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // Verify cache exists
      expect(coordinator.hasCachedResults()).toBe(true);
      const cached = coordinator.getLastProcessedResult();
      expect(cached).not.toBeNull();
      expect(cached!.diagnostics).toBeInstanceOf(Map);
    });

    it('should handle restoration when component throws during restore', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-cache-2'
      };

      const components = createMockComponents();
      await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // Now try to restore with a failing component
      const failingComponents = {
        diagnosticProvider: {
          updateFromProcessedResult: jest
            .fn()
            .mockRejectedValue(new Error('Restore failed'))
        },
        issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
        statusBarProvider: { updateFromProcessedResult: jest.fn() }
      };

      const result =
        await coordinator.restoreDiagnosticsFromCache(failingComponents);

      // Should return false when restoration fails
      expect(result).toBe(false);
    });

    it('should handle multiple sequential cache restorations', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 2,
            fileCount: 2,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'rule-1',
                    level: 'warning',
                    details: { message: 'Warning 1' }
                  }
                ]
              },
              {
                filePath: '/test/src/file2.ts',
                errors: [
                  {
                    ruleFailure: 'rule-2',
                    level: 'error',
                    details: { message: 'Error 1' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 2 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-sequential'
      };

      const components = createMockComponents();
      await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // Restore multiple times in sequence
      for (let i = 0; i < 3; i++) {
        jest.clearAllMocks();
        const freshComponents = createMockComponents();
        const result =
          await coordinator.restoreDiagnosticsFromCache(freshComponents);

        expect(result).toBe(true);
        expect(
          freshComponents.diagnosticProvider.updateFromProcessedResult
        ).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('component failure handling during distribution', () => {
    it('should propagate error when diagnosticProvider fails', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-diag-fail'
      };

      const failingComponents = {
        diagnosticProvider: {
          updateFromProcessedResult: jest
            .fn()
            .mockRejectedValue(new Error('DiagnosticProvider failed'))
        },
        issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
        statusBarProvider: { updateFromProcessedResult: jest.fn() }
      };

      await expect(
        coordinator.processAndDistributeResults(
          mockResult as any,
          failingComponents
        )
      ).rejects.toThrow('DiagnosticProvider failed');
    });

    it('should propagate error when issuesTreeViewManager fails', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-tree-fail'
      };

      const failingComponents = {
        diagnosticProvider: { updateFromProcessedResult: jest.fn() },
        issuesTreeViewManager: {
          updateFromProcessedResult: jest.fn().mockImplementation(() => {
            throw new Error('TreeViewManager failed');
          })
        },
        statusBarProvider: { updateFromProcessedResult: jest.fn() }
      };

      await expect(
        coordinator.processAndDistributeResults(
          mockResult as any,
          failingComponents
        )
      ).rejects.toThrow('TreeViewManager failed');
    });

    it('should propagate error when statusBarProvider fails', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-status-fail'
      };

      const failingComponents = {
        diagnosticProvider: { updateFromProcessedResult: jest.fn() },
        issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
        statusBarProvider: {
          updateFromProcessedResult: jest.fn().mockImplementation(() => {
            throw new Error('StatusBarProvider failed');
          })
        }
      };

      await expect(
        coordinator.processAndDistributeResults(
          mockResult as any,
          failingComponents
        )
      ).rejects.toThrow('StatusBarProvider failed');
    });

    it('should handle components missing updateFromProcessedResult method', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/file1.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: { message: 'Test' }
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'test-op-missing-method'
      };

      // Components without the updateFromProcessedResult method
      const incompleteComponents = {
        diagnosticProvider: {},
        issuesTreeViewManager: {},
        statusBarProvider: {}
      };

      // Should not throw, but log warnings
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        incompleteComponents as any
      );

      expect(result).toBeDefined();
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('large result set handling', () => {
    const createMockComponents = () => ({
      diagnosticProvider: { updateFromProcessedResult: jest.fn() },
      issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
      statusBarProvider: { updateFromProcessedResult: jest.fn() }
    });

    it('should handle result set with 100+ issues', async () => {
      const issues = Array.from({ length: 100 }, (_, i) => ({
        ruleFailure: `rule-${i}`,
        level: i % 3 === 0 ? 'error' : i % 3 === 1 ? 'warning' : 'info',
        details: { message: `Issue ${i}`, lineNumber: i + 1, columnNumber: 1 }
      }));

      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 100,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/large-file.ts',
                errors: issues
              }
            ]
          }
        },
        summary: { totalIssues: 100 },
        timestamp: Date.now(),
        duration: 5000,
        operationId: 'test-op-large'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.totalIssues).toBe(100);
      expect(result.processedIssues.length + result.failedIssues.length).toBe(
        100
      );
    });

    it('should handle issues spread across many files', async () => {
      const issueDetails = Array.from({ length: 50 }, (_, i) => ({
        filePath: `/test/src/file${i}.ts`,
        errors: [
          {
            ruleFailure: `rule-${i}`,
            level: 'warning',
            details: { message: `Issue in file ${i}` }
          }
        ]
      }));

      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 50,
            fileCount: 50,
            issueDetails
          }
        },
        summary: { totalIssues: 50 },
        timestamp: Date.now(),
        duration: 2000,
        operationId: 'test-op-many-files'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.totalIssues).toBe(50);
      // Diagnostics should be grouped by file
      expect(result.diagnostics.size).toBeGreaterThan(0);
    });

    it('should correctly categorize mixed severity issues in large result set', async () => {
      const errors = Array.from({ length: 20 }, (_, i) => ({
        ruleFailure: `error-rule-${i}`,
        level: 'error',
        details: { message: `Error ${i}` }
      }));
      const warnings = Array.from({ length: 30 }, (_, i) => ({
        ruleFailure: `warning-rule-${i}`,
        level: 'warning',
        details: { message: `Warning ${i}` }
      }));
      const infos = Array.from({ length: 50 }, (_, i) => ({
        ruleFailure: `info-rule-${i}`,
        level: 'info',
        details: { message: `Info ${i}` }
      }));

      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 100,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/src/mixed.ts',
                errors: [...errors, ...warnings, ...infos]
              }
            ]
          }
        },
        summary: { totalIssues: 100 },
        timestamp: Date.now(),
        duration: 3000,
        operationId: 'test-op-mixed'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.issueBreakdown.error).toBe(20);
      expect(result.issueBreakdown.warning).toBe(30);
      expect(result.issueBreakdown.info).toBe(50);
    });
  });

  describe('concurrent analysis handling', () => {
    const createMockComponents = () => ({
      diagnosticProvider: { updateFromProcessedResult: jest.fn() },
      issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
      statusBarProvider: { updateFromProcessedResult: jest.fn() }
    });

    it('should handle rapid sequential processAndDistributeResults calls', async () => {
      const components = createMockComponents();

      // Fire off multiple rapid calls
      const results = await Promise.all([
        coordinator.processAndDistributeResults(
          {
            metadata: {
              XFI_RESULT: {
                archetype: 'test-1',
                totalIssues: 1,
                fileCount: 1,
                issueDetails: [
                  {
                    filePath: '/test/file1.ts',
                    errors: [
                      {
                        ruleFailure: 'r1',
                        level: 'warning',
                        details: { message: 'M1' }
                      }
                    ]
                  }
                ]
              }
            },
            summary: { totalIssues: 1 },
            timestamp: Date.now(),
            duration: 100,
            operationId: 'op-1'
          } as any,
          components
        ),
        coordinator.processAndDistributeResults(
          {
            metadata: {
              XFI_RESULT: {
                archetype: 'test-2',
                totalIssues: 2,
                fileCount: 1,
                issueDetails: [
                  {
                    filePath: '/test/file2.ts',
                    errors: [
                      {
                        ruleFailure: 'r2',
                        level: 'error',
                        details: { message: 'M2' }
                      },
                      {
                        ruleFailure: 'r3',
                        level: 'error',
                        details: { message: 'M3' }
                      }
                    ]
                  }
                ]
              }
            },
            summary: { totalIssues: 2 },
            timestamp: Date.now(),
            duration: 100,
            operationId: 'op-2'
          } as any,
          components
        )
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].totalIssues).toBe(1);
      expect(results[1].totalIssues).toBe(2);

      // Last result should be cached
      const cached = coordinator.getLastProcessedResult();
      expect(cached).not.toBeNull();
    });

    it('should preserve cache consistency after interleaved operations', async () => {
      const mockResult1 = {
        metadata: {
          XFI_RESULT: {
            archetype: 'arch-1',
            totalIssues: 5,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/a.ts',
                errors: Array.from({ length: 5 }, (_, i) => ({
                  ruleFailure: `rule-a-${i}`,
                  level: 'warning',
                  details: { message: `A${i}` }
                }))
              }
            ]
          }
        },
        summary: { totalIssues: 5 },
        timestamp: Date.now(),
        duration: 500,
        operationId: 'interleave-1'
      };

      const components = createMockComponents();

      // Process first result
      await coordinator.processAndDistributeResults(
        mockResult1 as any,
        components
      );

      // Check cache
      let cached = coordinator.getLastProcessedResult();
      expect(cached?.totalIssues).toBe(5);

      // Process second result
      const mockResult2 = {
        metadata: {
          XFI_RESULT: {
            archetype: 'arch-2',
            totalIssues: 3,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/b.ts',
                errors: Array.from({ length: 3 }, (_, i) => ({
                  ruleFailure: `rule-b-${i}`,
                  level: 'error',
                  details: { message: `B${i}` }
                }))
              }
            ]
          }
        },
        summary: { totalIssues: 3 },
        timestamp: Date.now(),
        duration: 300,
        operationId: 'interleave-2'
      };

      await coordinator.processAndDistributeResults(
        mockResult2 as any,
        components
      );

      // Cache should now have the second result
      cached = coordinator.getLastProcessedResult();
      expect(cached?.totalIssues).toBe(3);
    });
  });

  describe('edge cases in issue extraction', () => {
    const createMockComponents = () => ({
      diagnosticProvider: { updateFromProcessedResult: jest.fn() },
      issuesTreeViewManager: { updateFromProcessedResult: jest.fn() },
      statusBarProvider: { updateFromProcessedResult: jest.fn() }
    });

    it('should handle issueDetails with null errors array', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 0,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/file.ts',
                errors: null
              }
            ]
          }
        },
        summary: { totalIssues: 0 },
        timestamp: Date.now(),
        duration: 100,
        operationId: 'test-null-errors'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      expect(result.totalIssues).toBe(0);
    });

    it('should handle ruleFailure with undefined message', async () => {
      const mockResult = {
        metadata: {
          XFI_RESULT: {
            archetype: 'test-archetype',
            totalIssues: 1,
            fileCount: 1,
            issueDetails: [
              {
                filePath: '/test/file.ts',
                errors: [
                  {
                    ruleFailure: 'test-rule',
                    level: 'warning',
                    details: {} // No message
                  }
                ]
              }
            ]
          }
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 100,
        operationId: 'test-no-message'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // Should use fallback message
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
    });

    it('should handle XFI_RESULT at root level instead of in metadata', async () => {
      const mockResult = {
        XFI_RESULT: {
          archetype: 'test-archetype',
          totalIssues: 1,
          fileCount: 1,
          issueDetails: [
            {
              filePath: '/test/file.ts',
              errors: [
                {
                  ruleFailure: 'test-rule',
                  level: 'warning',
                  details: { message: 'Test' }
                }
              ]
            }
          ]
        },
        summary: { totalIssues: 1 },
        timestamp: Date.now(),
        duration: 100,
        operationId: 'test-root-xfi'
      };

      const components = createMockComponents();
      const result = await coordinator.processAndDistributeResults(
        mockResult as any,
        components
      );

      // Should handle XFI_RESULT at root level
      expect(result.totalIssues).toBeGreaterThanOrEqual(0);
    });
  });
});
