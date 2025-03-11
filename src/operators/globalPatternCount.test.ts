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
    it('should return true when count exceeds threshold', () => {
        const analysisResult = {
            matchCounts: {
                'pattern1': 10
            },
            summary: {
                totalFiles: 5,
                totalMatches: 10
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, 5)).toBe(true);
    });

    it('should return false when count is below threshold', () => {
        const analysisResult = {
            matchCounts: {
                'pattern1': 3
            },
            summary: {
                totalFiles: 5,
                totalMatches: 3
            }
        };
        
        expect(globalPatternCount.fn(analysisResult, 5)).toBe(false);
    });

    it('should handle edge cases', () => {
        // No patterns
        expect(globalPatternCount.fn({ matchCounts: {}, summary: {} }, 1)).toBe(false);
        
        // No matches
        expect(globalPatternCount.fn({ 
            matchCounts: { 'pattern1': 0 }, 
            summary: { totalMatches: 0 } 
        }, 1)).toBe(false);
    });
});
