import { globalPatternRatio } from './globalPatternRatio';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
    },
}));

describe('globalPatternRatio', () => {
    it('should return true when ratio exceeds threshold', () => {
        const analysisResult = {
            matchCounts: {
                'newApiMethod\\(': 8,
                'legacyApiMethod\\(': 2
            },
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, 3)).toBe(true);
    });

    it('should return false when ratio is below threshold', () => {
        const analysisResult = {
            matchCounts: {
                'newApiMethod\\(': 4,
                'legacyApiMethod\\(': 6
            },
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternRatio.fn(analysisResult, 1)).toBe(false);
    });

    it('should handle edge cases', () => {
        // No patterns
        expect(globalPatternRatio.fn({ matchCounts: {}, summary: {} }, 1)).toBe(false);
        
        // Only one pattern
        expect(globalPatternRatio.fn({ 
            matchCounts: { 'pattern1': 5 }, 
            summary: { totalMatches: 5 } 
        }, 1)).toBe(false);
        
        // Denominator is zero
        expect(globalPatternRatio.fn({ 
            matchCounts: { 'pattern1': 5, 'pattern2': 0 }, 
            summary: { totalMatches: 5 } 
        }, 1)).toBe(false);
    });
});
