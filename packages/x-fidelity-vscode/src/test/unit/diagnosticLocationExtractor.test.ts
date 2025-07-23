import { DiagnosticLocationExtractor } from '../../utils/diagnosticLocationExtractor';

describe('Enhanced DiagnosticLocationExtractor Tests', () => {
  
  describe('Core Enhanced Functionality', () => {
    it('should extract location with metadata tracking', () => {
      const error = {
        ruleFailure: 'functionComplexity-iterative',
        details: {
          details: {
            complexities: [{
              metrics: {
                location: {
                  startLine: 145,
                  endLine: 231,
                  startColumn: 1,
                  endColumn: 2
                }
              }
            }]
          }
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.found).toBe(true);
      expect(result.location.startLine).toBe(145);
      expect(result.location.endLine).toBe(231);
      expect(result.location.startColumn).toBe(1);
      expect(result.location.endColumn).toBe(2);
      expect(result.location.source).toBe('complexity-metrics');
      expect(result.metadata?.extractorUsed).toBeDefined();
    });

    it('should handle file-level rules correctly', () => {
      const error = {
        ruleFailure: 'codeRhythm-iterative',
        details: {
          message: 'Code structure analysis suggests potential readability issues.',
          consistency: 0.4,
          complexity: 0.3,
          readability: 0.7
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.found).toBe(true);
      expect(result.location.startLine).toBe(1);
      expect(result.location.source).toBe('file-level-rule');
      expect(result.metadata?.extractorUsed).toBeDefined();
    });

    it('should extract from direct location objects', () => {
      const error = {
        ruleFailure: 'customRule',
        details: {
          location: {
            startLine: 100,
            startColumn: 5,
            endLine: 105,
            endColumn: 10
          }
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.found).toBe(true);
      expect(result.location.startLine).toBe(100);
      expect(result.location.startColumn).toBe(5);
      expect(result.location.endLine).toBe(105);
      expect(result.location.endColumn).toBe(10);
      expect(result.location.source).toBe('location-object');
    });

    it('should extract from direct details lineNumber', () => {
      const error = {
        ruleFailure: 'customRule',
        details: {
          lineNumber: 42,
          columnNumber: 10,
          message: 'Custom rule violation'
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.found).toBe(true);
      expect(result.location.startLine).toBe(42);
      expect(result.location.startColumn).toBe(10);
      expect(result.location.source).toBe('details-line-number');
    });

    it('should extract from range objects', () => {
      const error = {
        ruleFailure: 'astRule',
        details: {
          range: {
            start: { line: 50, column: 10 },
            end: { line: 50, column: 25 }
          }
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.found).toBe(true);
      expect(result.location.startLine).toBe(50);
      expect(result.location.startColumn).toBe(10);
      expect(result.location.endLine).toBe(50);
      expect(result.location.endColumn).toBe(25);
      expect(result.location.source).toBe('range-object');
    });

    it('should handle malformed data gracefully with fallback', () => {
      const error = {
        ruleFailure: 'malformedRule',
        details: {
          lineNumber: 'not-a-number',
          location: null,
          range: undefined
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.found).toBe(false);
      expect(result.location.startLine).toBe(1); // fallback
      expect(result.metadata?.extractorUsed).toBe('fallback');
    });

    it('should validate and sanitize location coordinates', () => {
      const invalidLocation = {
        startLine: -5,
        startColumn: 0,
        endLine: -1,
        endColumn: -10,
        source: 'test'
      };

      const validated = DiagnosticLocationExtractor.validateLocation(invalidLocation);
      
      expect(validated.startLine).toBe(1);
      expect(validated.startColumn).toBe(1);
      expect(validated.endLine).toBe(1);
      expect(validated.endColumn).toBe(2); // at least startColumn + 1
    });

    it('should provide confidence descriptions', () => {
      const highDesc = DiagnosticLocationExtractor.getConfidenceDescription('high');
      const mediumDesc = DiagnosticLocationExtractor.getConfidenceDescription('medium');
      const lowDesc = DiagnosticLocationExtractor.getConfidenceDescription('low');
      
      expect(highDesc).toContain('Precise location');
      expect(mediumDesc).toContain('Good location');
      expect(lowDesc).toContain('Basic location');
    });
  });



  describe('Real-world XFI_RESULT.json Structures', () => {
    it('should handle actual complexity structure', () => {
      const realComplexityError = {
        "ruleFailure": "functionComplexity-iterative",
        "level": "warning",
        "details": {
          "message": "Functions detected with high complexity. Consider refactoring.",
          "details": {
            "complexities": [
              {
                "name": "anonymous",
                "metrics": {
                  "name": "anonymous",
                  "cyclomaticComplexity": 24,
                  "cognitiveComplexity": 89,
                  "nestingDepth": 11,
                  "parameterCount": 10,
                  "returnCount": 15,
                  "lineCount": 112,
                  "location": {
                    "startLine": 22,
                    "endLine": 133,
                    "startColumn": 48,
                    "endColumn": 4
                  }
                }
              }
            ]
          }
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(realComplexityError);
      
      expect(result.found).toBe(true);
      expect(result.location.startLine).toBe(22);
      expect(result.location.endLine).toBe(133);
      expect(result.location.source).toBe('complexity-metrics');
    });
  });

  describe('Debugging and Metadata Features', () => {
    it('should provide extraction metadata for debugging', () => {
      const error = {
        ruleFailure: 'testRule',
        details: {
          lineNumber: 100
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(error);
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.extractorUsed).toBeDefined();
      expect(result.metadata?.rawData).toBeDefined();
    });

    it('should handle sanitization of large data for logging', () => {
      const largeError = {
        ruleFailure: 'largeDataRule',
        details: {
          lineNumber: 50,
          largeData: 'x'.repeat(1000) // Large string
        }
      };

      const result = DiagnosticLocationExtractor.extractLocation(largeError);
      
      expect(result.metadata?.rawData).toBeDefined();
      // Should be truncated or handled gracefully
    });
  });
}); 