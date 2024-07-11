import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('openaiAnalysisHighSeverity', () => {
    it('should return false if no high severity issues are found', () => {
        const openaiAnalysis = {
            result: [
                { severity: 5 },
                { severity: 6 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toBe(false);
    });

    it('should return true if high severity issues are found', () => {
        const openaiAnalysis = {
            result: [
                { severity: 9 },
                { severity: 10 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('openai: high severity issues found');
    });

    it('should use default severity threshold if not provided', () => {
        const openaiAnalysis = {
            result: [
                { severity: 9 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, null);
        expect(result).toBe(true);
    });
});
