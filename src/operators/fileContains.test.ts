import { logger } from '../utils/logger';
import { fileContains } from './fileContains';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
    },
}));

describe('fileContains', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true when the checkString is found in the fileContent', () => {
        const repoFileAnalysis = { result: [{ lineNumber: 1, line: 'Hello, world!' }] };
        expect(fileContains.fn(repoFileAnalysis)).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('fileContains: true');
    });

    it('returns false when the checkString is not found in the fileContent', () => {
        const repoFileAnalysis = { result: [] };
        expect(fileContains.fn(repoFileAnalysis)).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('fileContains: false');
    });

    it('handles undefined repoFileAnalysis', () => {
        expect(fileContains.fn(undefined)).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('fileContains: false');
    });

    it('handles repoFileAnalysis without result property', () => {
        const repoFileAnalysis = {};
        expect(fileContains.fn(repoFileAnalysis)).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('fileContains: false');
    });

    it('handles repoFileAnalysis with empty result array', () => {
        const repoFileAnalysis = { result: [] };
        expect(fileContains.fn(repoFileAnalysis)).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('fileContains: false');
    });

    it('logs an error and returns true if an exception occurs', () => {
        const repoFileAnalysis = { result: null };
        expect(fileContains.fn(repoFileAnalysis)).toBe(true);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('fileContains:'));
        expect(logger.debug).toHaveBeenCalledWith('fileContains: true');
    });
});
