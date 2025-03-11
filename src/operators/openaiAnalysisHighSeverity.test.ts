import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        warn: jest.fn()
    },
}));

describe('openaiAnalysisHighSeverity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return false if no high severity issues are found', () => {
        const openaiAnalysis = {
            result: [
                { severity: 5 },
                { severity: 6 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toEqual(false);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should return true if high severity issues are found', () => {
        const openaiAnalysis = {
            prompt: "test prompt",
            result: [
                { severity: 9 },
                { severity: 10 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toEqual(true);
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysisHighSeverity: : "test prompt" high severity issues found');
    });

    it('should use default severity threshold if not provided', () => {
        const openaiAnalysis = {
            prompt: "default prompt",
            result: [
                { severity: 9 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, null);
        expect(result).toEqual(true);
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysisHighSeverity: : "default prompt" high severity issues found');
    });

    it('should handle empty result array', () => {
        const openaiAnalysis = {
            result: []
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toBe(false);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle undefined openaiAnalysis', () => {
        const result = openaiAnalysisHighSeverity.fn(undefined, 8);
        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysisHighSeverity: TypeError: Cannot read properties of undefined (reading \'result\')');
    });

    it('should handle invalid severity values', () => {
        const openaiAnalysis = {
            result: [
                { severity: 'high' },
                { severity: null }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toBe(false);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle mixed valid and invalid severity values', () => {
        const openaiAnalysis = {
            prompt: "mixed prompt",
            result: [
                { severity: 5 },
                { severity: 'high' },
                { severity: 9 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, 8);
        expect(result).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysisHighSeverity: : "mixed prompt" high severity issues found');
    });

    it('should use default severity threshold when not provided', () => {
        const openaiAnalysis = {
            prompt: "default threshold",
            result: [
                { severity: 7 },
                { severity: 8 }
            ]
        };
        const result = openaiAnalysisHighSeverity.fn(openaiAnalysis, null);
        expect(result).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysisHighSeverity: : "default threshold" high severity issues found');
    });
});
