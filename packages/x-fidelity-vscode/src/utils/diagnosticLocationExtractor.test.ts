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
    const fixturePath = path.resolve(__dirname, '../../../x-fidelity-fixtures/node-fullstack/XFI_RESULT-example.json');
    const fixtureContent = fs.readFileSync(fixturePath, 'utf8');
    xfiResultFixture = JSON.parse(fixtureContent);
  });

  describe('Real XFI_RESULT Fixture Tests', () => {
    it('should extract location from function complexity rule in fixture', () => {
      // Get the first complexity error from the fixture
      const complexityFileIssue = xfiResultFixture.XFI_RESULT.issueDetails.find(
        (issue: any) => issue.errors?.some((error: any) => error.ruleFailure === 'functionComplexity-iterative')
      );
      
      expect(complexityFileIssue).toBeDefined();
      
      const complexityError = complexityFileIssue.errors.find(
        (error: any) => error.ruleFailure === 'functionComplexity-iterative'
      );

      const result = DiagnosticLocationExtractor.extractLocation(complexityError);

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
        (issue: any) => issue.errors?.some((error: any) => error.ruleFailure === 'noDatabases-iterative')
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
        (issue: any) => issue.errors?.some((error: any) => error.ruleFailure === 'sensitiveLogging-iterative')
      );
      
      expect(sensitiveFileIssue).toBeDefined();
      
      const sensitiveError = sensitiveFileIssue.errors.find(
        (error: any) => error.ruleFailure === 'sensitiveLogging-iterative'
      );

      const result = DiagnosticLocationExtractor.extractLocation(sensitiveError);

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
      console.log(`Successful extractions: ${successfulExtractions}/${totalErrors}`);
      console.log(`High confidence extractions: ${highConfidenceExtractions}/${totalErrors}`);

      expect(totalErrors).toBeGreaterThan(0);
      expect(successfulExtractions).toBeGreaterThan(0);
    });
  });
});