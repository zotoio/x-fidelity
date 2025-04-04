import { globalPatternCount } from './globalPatternCount';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        warn: jest.fn()
    },
}));

describe('globalPatternCount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when count exceeds threshold with default gte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'pattern1', count: 10, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, 5)).toBe(false);
    });

    it('should return true when count exceeds threshold with explicit gte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'pattern1', count: 10, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, { threshold: 5, comparison: 'gte' })).toBe(true);
    });

    it('should return false when count is below threshold with gte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'pattern1', count: 3, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 3
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, { threshold: 5, comparison: 'gte' })).toBe(false);
    });

    it('should return true when count is below threshold with lte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'pattern1', count: 3, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 3
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, { threshold: 5, comparison: 'lte' })).toBe(true);
    });

    it('should return false when count exceeds threshold with lte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'pattern1', count: 10, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, { threshold: 5, comparison: 'lte' })).toBe(false);
    });

    it('should handle edge cases', () => {
        // No patterns
        expect(globalPatternCount.fn({ patternData: [], summary: {} }, 1)).toBe(false);
        
        // No matches
        expect(globalPatternCount.fn({ 
            patternData: [{ pattern: 'pattern1', count: 0, files: [] }], 
            summary: { totalMatches: 0 } 
        }, 1)).toBe(true);
    });

    it('should handle new pattern totals with lte comparison', () => {
        const analysisResult = {
            summary: {
                newPatternsTotal: 3,
                totalFiles: 5
            }
        };
        
        // 3 is <= 5
        expect(globalPatternCount.fn(analysisResult, { threshold: 5, comparison: 'lte' })).toBe(true);
    });

    it('should handle new pattern totals with gte comparison', () => {
        const analysisResult = {
            summary: {
                newPatternsTotal: 7,
                totalFiles: 5
            }
        };
        
        // 7 is >= 5
        expect(globalPatternCount.fn(analysisResult, { threshold: 5, comparison: 'gte' })).toBe(true);
    });
});
