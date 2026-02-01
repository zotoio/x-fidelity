/**
 * Test suite for DiagnosticLocationExtractor
 * Verifies location extraction from real XFI_RESULT fixture data
 */

import { DiagnosticLocationExtractor } from './diagnosticLocationExtractor';
import * as fs from 'fs';
import * as path from 'path';

describe('DiagnosticLocationExtractor', () => {
  let xfiResultFixture: any;

  beforeAll(() => {
    const fixturePath = path.resolve(
      __dirname,
      '../../../x-fidelity-fixtures/node-fullstack/XFI_RESULT-example.json'
    );
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
    xfiResultFixture = JSON.parse(fixtureContent);
  });

  describe('Real XFI_RESULT Fixture Tests', () => {
    it('should extract location from function complexity rule in fixture', () => {
      // Get the first complexity error from the fixture
      const complexityFileIssue = xfiResultFixture.XFI_RESULT.issueDetails.find(
        (issue: any) =>
          issue.errors?.some(
            (error: any) => error.ruleFailure === 'functionComplexity-iterative'
          )
      );

      expect(complexityFileIssue).toBeDefined();

      const complexityError = complexityFileIssue.errors.find(
        (error: any) => error.ruleFailure === 'functionComplexity-iterative'
      );

      const result =
        DiagnosticLocationExtractor.extractLocation(complexityError);

      expect(result.found).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.location.source).toBe('complexity-metrics');
      expect(result.location.startLine).toBe(22); // From first complexity item
      expect(result.location.startColumn).toBe(48);
      expect(result.location.endLine).toBe(133);
      expect(result.location.endColumn).toBe(4);
    });

    it('should extract location from database rule in fixture', () => {
      // Get a database error from the fixture
      const databaseFileIssue = xfiResultFixture.XFI_RESULT.issueDetails.find(
        (issue: any) =>
          issue.errors?.some(
            (error: any) => error.ruleFailure === 'noDatabases-iterative'
          )
      );

      expect(databaseFileIssue).toBeDefined();

      const databaseError = databaseFileIssue.errors.find(
        (error: any) => error.ruleFailure === 'noDatabases-iterative'
      );

      const result = DiagnosticLocationExtractor.extractLocation(databaseError);

      expect(result.found).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.location.source).toBe('details-array');
      expect(result.location.startLine).toBe(24); // From first details item
      expect(result.location.startColumn).toBe(1); // Default
      expect(result.location.endLine).toBe(24);
    });

    it('should extract location from sensitive logging rule in fixture', () => {
      // Get a sensitive logging error from the fixture
      const sensitiveFileIssue = xfiResultFixture.XFI_RESULT.issueDetails.find(
        (issue: any) =>
          issue.errors?.some(
            (error: any) => error.ruleFailure === 'sensitiveLogging-iterative'
          )
      );

      expect(sensitiveFileIssue).toBeDefined();

      const sensitiveError = sensitiveFileIssue.errors.find(
        (error: any) => error.ruleFailure === 'sensitiveLogging-iterative'
      );

      const result =
        DiagnosticLocationExtractor.extractLocation(sensitiveError);

      expect(result.found).toBe(true);
      expect(result.confidence).toBe('medium');
      expect(result.location.startLine).toBe(19); // From fixture data
    });

    it('should handle all error types in fixture without crashes', () => {
      let totalErrors = 0;
      let successfulExtractions = 0;
      let highConfidenceExtractions = 0;

      for (const fileIssue of xfiResultFixture.XFI_RESULT.issueDetails) {
        if (fileIssue.errors) {
          for (const error of fileIssue.errors) {
            totalErrors++;

            const result = DiagnosticLocationExtractor.extractLocation(error);

            // Should never crash
            expect(result).toBeDefined();
            expect(result.location).toBeDefined();
            expect(result.location.startLine).toBeGreaterThan(0);
            expect(result.location.startColumn).toBeGreaterThan(0);

            if (result.found) {
              successfulExtractions++;
            }

            if (result.confidence === 'high') {
              highConfidenceExtractions++;
            }
          }
        }
      }

      console.log(`Processed ${totalErrors} errors from fixture`);
      console.log(
        `Successful extractions: ${successfulExtractions}/${totalErrors}`
      );
      console.log(
        `High confidence extractions: ${highConfidenceExtractions}/${totalErrors}`
      );

      expect(totalErrors).toBeGreaterThan(0);
      expect(successfulExtractions).toBeGreaterThan(0);
    });
  });

  describe('Unit Tests for Individual Extractors', () => {
    describe('extractFromDependencyLocation', () => {
      it('should extract location from dependency failure with location info', () => {
        const error = {
          ruleFailure: 'outdatedDependency-global',
          details: {
            details: [
              {
                dependency: 'lodash',
                currentVersion: '3.0.0',
                requiredVersion: '>=4.0.0',
                location: {
                  lineNumber: 15,
                  columnNumber: 5,
                  endLineNumber: 15,
                  endColumnNumber: 25,
                  manifestPath: 'package.json'
                }
              }
            ]
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.location.source).toBe('dependency-manifest-location');
        expect(result.location.startLine).toBe(15);
        expect(result.location.startColumn).toBe(5);
      });

      it('should handle single dependency failure (not in array)', () => {
        const error = {
          ruleFailure: 'outdatedDependency-global',
          details: {
            details: {
              dependency: 'express',
              currentVersion: '3.0.0',
              requiredVersion: '>=4.0.0',
              location: {
                lineNumber: 20,
                columnNumber: 3
              }
            }
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(20);
        expect(result.location.startColumn).toBe(3);
      });
    });

    describe('extractFromComplexityMetrics', () => {
      it('should extract from nested details.details.complexities structure', () => {
        const error = {
          ruleFailure: 'functionComplexity-iterative',
          details: {
            details: {
              complexities: [
                {
                  name: 'complexFunction',
                  metrics: {
                    cyclomaticComplexity: 25,
                    location: {
                      startLine: 50,
                      startColumn: 1,
                      endLine: 100,
                      endColumn: 2
                    }
                  }
                }
              ]
            }
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.location.source).toBe('complexity-metrics');
        expect(result.location.startLine).toBe(50);
        expect(result.location.endLine).toBe(100);
      });

      it('should extract from direct details.complexities structure (resolved fact)', () => {
        const error = {
          ruleFailure: 'functionComplexity-iterative',
          details: {
            complexities: [
              {
                name: 'anotherFunction',
                metrics: {
                  location: {
                    startLine: 10,
                    startColumn: 5,
                    endLine: 30,
                    endColumn: 3
                  }
                }
              }
            ]
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(10);
      });
    });

    describe('extractFromLocationObject', () => {
      it('should extract from details.location object', () => {
        const error = {
          ruleFailure: 'ast-rule',
          details: {
            location: {
              startLine: 42,
              startColumn: 10,
              endLine: 42,
              endColumn: 50
            }
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.location.source).toBe('location-object');
        expect(result.location.startLine).toBe(42);
        expect(result.location.startColumn).toBe(10);
      });

      it('should extract from top-level location object', () => {
        const error = {
          ruleFailure: 'direct-location-rule',
          location: {
            startLine: 5,
            startColumn: 1
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(5);
      });
    });

    describe('extractFromASTNode', () => {
      it('should extract from details.node with startLine/startColumn', () => {
        const error = {
          ruleFailure: 'ast-pattern-rule',
          details: {
            node: {
              startLine: 25,
              startColumn: 3,
              endLine: 30,
              endColumn: 5
            }
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('high');
        expect(result.location.source).toBe('ast-node');
        expect(result.location.startLine).toBe(25);
      });

      it('should extract from node with line/column format', () => {
        const error = {
          ruleFailure: 'ast-rule',
          node: {
            line: 15,
            column: 8
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(15);
        expect(result.location.startColumn).toBe(8);
      });
    });

    describe('extractFromDetailsArray', () => {
      it('should extract from details array with lineNumber', () => {
        const error = {
          ruleFailure: 'pattern-match-rule',
          details: {
            details: [
              { lineNumber: 33, match: 'problematic code' },
              { lineNumber: 45, match: 'another issue' }
            ]
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(33); // First item
      });

      it('should handle details array with match length for endColumn', () => {
        const error = {
          ruleFailure: 'pattern-rule',
          details: {
            details: [{ lineNumber: 10, columnNumber: 5, match: 'test-match' }]
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startColumn).toBe(5);
        expect(result.location.endColumn).toBe(5 + 'test-match'.length);
      });
    });

    describe('extractFromRangeObject', () => {
      it('should extract from range.start/end structure', () => {
        const error = {
          ruleFailure: 'range-based-rule',
          details: {
            range: {
              start: { line: 100, column: 5 },
              end: { line: 105, column: 20 }
            }
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('medium');
        expect(result.location.source).toBe('range-object');
        expect(result.location.startLine).toBe(100);
        expect(result.location.endLine).toBe(105);
      });
    });

    describe('extractFromDetailsLineNumber', () => {
      it('should extract from details.lineNumber directly', () => {
        const error = {
          ruleFailure: 'simple-rule',
          details: {
            lineNumber: 77,
            columnNumber: 12
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(77);
        expect(result.location.startColumn).toBe(12);
      });

      it('should extract from top-level lineNumber', () => {
        const error = {
          ruleFailure: 'top-level-rule',
          lineNumber: 55,
          columnNumber: 1
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(55);
      });
    });

    describe('extractFromFileLevelRules', () => {
      it('should return line 1 for file-level rules without location data', () => {
        const error = {
          ruleFailure: 'functionCount-iterative',
          details: {
            message: 'Too many functions in file'
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('medium');
        expect(result.location.source).toBe('file-level-rule');
        expect(result.location.startLine).toBe(1);
      });

      it('should not use file-level fallback if specific location exists', () => {
        const error = {
          ruleFailure: 'sensitiveLogging-iterative',
          details: {
            details: [
              { lineNumber: 42, pattern: 'password', match: 'password=secret' }
            ]
          }
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        // Should not be file-level-rule because specific location exists
        expect(result.location.startLine).toBe(42);
      });
    });

    describe('extractFromLegacyFields', () => {
      it('should extract from legacy lineNumber field', () => {
        const error = {
          ruleFailure: 'legacy-rule',
          lineNumber: 88,
          columnNumber: 4
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.location.startLine).toBe(88);
      });

      it('should extract from legacy line/column fields', () => {
        const error = {
          ruleFailure: 'old-format-rule',
          line: 99,
          column: 7
        };

        const result = DiagnosticLocationExtractor.extractLocation(error);

        expect(result.found).toBe(true);
        expect(result.confidence).toBe('low');
        expect(result.location.source).toBe('legacy-line-column');
        expect(result.location.startLine).toBe(99);
        expect(result.location.startColumn).toBe(7);
      });
    });
  });

  describe('Default and Fallback Behavior', () => {
    it('should return default location for empty error', () => {
      const result = DiagnosticLocationExtractor.extractLocation({});

      expect(result.found).toBe(false);
      expect(result.confidence).toBe('low');
      expect(result.location.source).toBe('default');
      expect(result.location.startLine).toBe(1);
      expect(result.location.startColumn).toBe(1);
    });

    it('should return default location for null error', () => {
      const result = DiagnosticLocationExtractor.extractLocation(null);

      expect(result.found).toBe(false);
      expect(result.location.startLine).toBe(1);
    });

    it('should return default location for undefined error', () => {
      const result = DiagnosticLocationExtractor.extractLocation(undefined);

      expect(result.found).toBe(false);
      expect(result.location.startLine).toBe(1);
    });

    it('should include metadata with extractor used', () => {
      const error = {
        ruleFailure: 'test-rule',
        lineNumber: 10
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.extractorUsed).toBeDefined();
    });
  });

  describe('validateLocation', () => {
    it('should validate and fix invalid locations', () => {
      const location = {
        startLine: -5,
        startColumn: 0,
        endLine: -1,
        endColumn: -10,
        source: 'test'
      };

      const validated = DiagnosticLocationExtractor.validateLocation(location);

      expect(validated.startLine).toBeGreaterThanOrEqual(1);
      expect(validated.startColumn).toBeGreaterThanOrEqual(1);
      expect(validated.endLine).toBeGreaterThanOrEqual(validated.startLine);
      expect(validated.endColumn).toBeGreaterThanOrEqual(1);
    });

    it('should preserve valid locations', () => {
      const location = {
        startLine: 10,
        startColumn: 5,
        endLine: 15,
        endColumn: 20,
        source: 'test'
      };

      const validated = DiagnosticLocationExtractor.validateLocation(location);

      expect(validated.startLine).toBe(10);
      expect(validated.startColumn).toBe(5);
      expect(validated.endLine).toBe(15);
      expect(validated.endColumn).toBe(20);
    });

    it('should handle string numbers', () => {
      const location = {
        startLine: '10' as any,
        startColumn: '5' as any,
        endLine: '15' as any,
        endColumn: '20' as any,
        source: 'test'
      };

      const validated = DiagnosticLocationExtractor.validateLocation(location);

      expect(validated.startLine).toBe(10);
      expect(validated.startColumn).toBe(5);
    });
  });

  describe('getConfidenceDescription', () => {
    it('should return correct description for high confidence', () => {
      const desc = DiagnosticLocationExtractor.getConfidenceDescription('high');
      expect(desc).toContain('Precise');
    });

    it('should return correct description for medium confidence', () => {
      const desc =
        DiagnosticLocationExtractor.getConfidenceDescription('medium');
      expect(desc).toContain('Good');
    });

    it('should return correct description for low confidence', () => {
      const desc = DiagnosticLocationExtractor.getConfidenceDescription('low');
      expect(desc).toContain('Basic');
    });
  });
});
