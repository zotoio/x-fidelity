import { globalFileAnalysis } from './globalFileAnalysisFacts';
import { logger } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn()
    },
}));

jest.mock('../utils/maskSensitiveData', () => ({
    maskSensitiveData: jest.fn(data => data)
}));

describe('globalFileAnalysis', () => {
    let mockAlmanac: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockAlmanac = {
            factValue: jest.fn(),
            addRuntimeFact: jest.fn(),
        };
    });

    it('should analyze patterns across multiple files', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { newApiMethod(); legacyApiMethod(); }'
            },
            {
                fileName: 'file2.ts',
                filePath: '/path/to/file2.ts',
                fileContent: 'function test2() { newApiMethod(); newApiMethod(); }'
            },
            {
                fileName: 'REPO_GLOBAL_CHECK',
                filePath: 'REPO_GLOBAL_CHECK',
                fileContent: 'REPO_GLOBAL_CHECK'
            }
        ]);

        const params = {
            patterns: ['newApiMethod\\(', 'legacyApiMethod\\('],
            fileFilter: '\\.ts$',
            resultFact: 'sdkUsageAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(2);
        expect(result.matchCounts['newApiMethod\\(']).toBe(3);
        expect(result.matchCounts['legacyApiMethod\\(']).toBe(1);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('sdkUsageAnalysis', expect.any(Object));
    });

    it('should handle newPatterns and legacyPatterns parameters', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { newApiMethod(); legacyApiMethod(); }'
            },
            {
                fileName: 'file2.ts',
                filePath: '/path/to/file2.ts',
                fileContent: 'function test2() { newApiMethod(); newApiMethod(); }'
            }
        ]);

        const params = {
            newPatterns: ['newApiMethod\\('],
            legacyPatterns: ['legacyApiMethod\\('],
            fileFilter: '\\.ts$',
            resultFact: 'sdkUsageAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(2);
        expect(result.summary.newPatternsTotal).toBe(3);
        expect(result.summary.legacyPatternsTotal).toBe(1);
        expect(result.summary.newPatternCounts['newApiMethod\\(']).toBe(3);
        expect(result.summary.legacyPatternCounts['legacyApiMethod\\(']).toBe(1);
    });

    it('should handle single pattern as string instead of array', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { singlePattern(); }'
            }
        ]);

        const params = {
            patterns: 'singlePattern\\(',
            fileFilter: '\\.ts$',
            resultFact: 'singlePatternAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.matchCounts['singlePattern\\(']).toBe(1);
    });

    it('should apply file filtering correctly', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { pattern(); }'
            },
            {
                fileName: 'file2.js',
                filePath: '/path/to/file2.js',
                fileContent: 'function test() { pattern(); }'
            }
        ]);

        const params = {
            patterns: ['pattern\\('],
            fileFilter: '\\.ts$', // Only match .ts files
            resultFact: 'fileFilterAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(1);
        expect(result.matchCounts['pattern\\(']).toBe(1);
    });

    it('should track line numbers and context for matches', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'line1\nline2 pattern()\nline3'
            }
        ]);

        const params = {
            patterns: ['pattern\\('],
            fileFilter: '\\.ts$',
            resultFact: 'lineNumberAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.fileMatches['pattern\\('][0].matches[0].lineNumber).toBe(2);
        expect(result.fileMatches['pattern\\('][0].matches[0].context).toBe('line2 pattern()');
        expect(maskSensitiveData).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
        mockAlmanac.factValue.mockRejectedValue(new Error('Test error'));

        const params = {
            patterns: ['newApiMethod\\('],
            fileFilter: '\\.ts$',
            resultFact: 'sdkUsageAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Error in globalFileAnalysis'), expect.any(Error));
        expect(result).toEqual({ matchCounts: {}, fileMatches: {} });
    });

    it('should handle invalid globalFileMetadata', async () => {
        mockAlmanac.factValue.mockResolvedValue('not an array');

        const params = {
            patterns: ['pattern\\('],
            resultFact: 'invalidDataAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(logger.error).toHaveBeenCalledWith('Invalid globalFileMetadata');
        expect(result).toEqual({ matchCounts: {}, fileMatches: {} });
    });
});
