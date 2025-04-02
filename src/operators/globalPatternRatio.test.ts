import { globalPatternRatio } from './globalPatternRatio';
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

describe('globalPatternRatio', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when ratio exceeds threshold with default gte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'newApiMethod\\(', count: 8, files: [] },
                { pattern: 'legacyApiMethod\\(', count: 2, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, 3)).toBe(true);
    });

    it('should return true when ratio exceeds threshold with explicit gte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'newApiMethod\\(', count: 8, files: [] },
                { pattern: 'legacyApiMethod\\(', count: 2, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, { value: 3, comparison: 'gte' })).toBe(true);
    });

    it('should return false when ratio is below threshold with gte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'newApiMethod\\(', count: 4, files: [] },
                { pattern: 'legacyApiMethod\\(', count: 6, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, { value: 1, comparison: 'gte' })).toBe(false);
    });

    it('should return true when ratio is below threshold with lte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'newApiMethod\\(', count: 4, files: [] },
                { pattern: 'legacyApiMethod\\(', count: 6, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, { value: 1, comparison: 'lte' })).toBe(true);
    });

    it('should return false when ratio exceeds threshold with lte comparison', () => {
        const analysisResult = {
            patternData: [
                { pattern: 'newApiMethod\\(', count: 8, files: [] },
                { pattern: 'legacyApiMethod\\(', count: 2, files: [] }
            ],
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, { value: 3, comparison: 'lte' })).toBe(false);
    });

    it('should handle edge cases', () => {
        // No patterns
        expect(globalPatternRatio.fn({ patternData: [], summary: {} }, { value: 1, comparison: 'gte' })).toBe(false);
        
        // Only one pattern
        expect(globalPatternRatio.fn({ 
            patternData: [{ pattern: 'pattern1', count: 5, files: [] }], 
            summary: { totalMatches: 5 } 
        }, { value: 1, comparison: 'gte' })).toBe(false);
        
        // Denominator is zero
        expect(globalPatternRatio.fn({ 
            patternData: [
                { pattern: 'pattern1', count: 5, files: [] },
                { pattern: 'pattern2', count: 0, files: [] }
            ], 
            summary: { totalMatches: 5 } 
        }, { value: 1, comparison: 'gte' })).toBe(false);
    });

    it('should handle new pattern totals with lte comparison', () => {
        const analysisResult = {
            summary: {
                newPatternsTotal: 3,
                legacyPatternsTotal: 7,
                totalFiles: 5
            }
        };
        
        // 3/(3+7) = 0.3, which is <= 0.5
        expect(globalPatternRatio.fn(analysisResult, { value: 0.5, comparison: 'lte' })).toBe(true);
    });

    it('should handle new pattern totals with gte comparison', () => {
        const analysisResult = {
            summary: {
                newPatternsTotal: 7,
                legacyPatternsTotal: 3,
                totalFiles: 5
            }
        };
        
        // 7/(7+3) = 0.7, which is >= 0.5
        expect(globalPatternRatio.fn(analysisResult, { value: 0.5, comparison: 'gte' })).toBe(true);
    });
});
