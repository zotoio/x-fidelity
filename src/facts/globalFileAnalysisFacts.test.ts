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
        expect(result.fileMatches['pattern\\('][0].matches[0].match).toBe('pattern\\(');
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

        expect(logger.error).toHaveBeenCalledWith(`Error in globalFileAnalysis: Error: Test error`);
        expect(result).toEqual({ matchCounts: {}, fileMatches: {}, fileResults: {}, fileResultsArray: [] });
    });

    it('should handle invalid globalFileMetadata', async () => {
        mockAlmanac.factValue.mockResolvedValue('not an array');

        const params = {
            patterns: ['pattern\\('],
            resultFact: 'invalidDataAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(logger.error).toHaveBeenCalledWith('Invalid globalFileMetadata');
        expect(result).toEqual({ matchCounts: {}, fileMatches: {}, fileResults: {}, fileResultsArray: [] });
    });

    it('should support file-centric output format', async () => {
        // Mock the file data with content that will definitely match our patterns
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { pattern1(); pattern2(); }'
            },
            {
                fileName: 'file2.ts',
                filePath: '/path/to/file2.ts',
                fileContent: 'function test2() { pattern1(); }'
            }
        ]);

        // Use the exact same pattern strings that appear in the file content
        const params = {
            patterns: ['pattern1\\(', 'pattern2\\('],
            fileFilter: '\\.ts$',
            resultFact: 'fileCentricAnalysis',
            outputGrouping: 'file'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        // Check that the file-centric output properties exist
        expect(result).toHaveProperty('fileResults');
        
        // Verify the file results array has the expected length
        expect(result.fileResults.length).toBe(2);
        
        // Check that the pattern matches exist for each file
        expect(result.fileResults[0]).toHaveProperty('fileName', 'file1.ts');
        expect(result.fileResults[0]).toHaveProperty('filePath', '/path/to/file1.ts');
        expect(result.fileResults[0]).toHaveProperty('patternMatches');
        expect(result.fileResults[0].patternMatches).toHaveProperty('pattern1\\(');
        expect(result.fileResults[0].patternMatches).toHaveProperty('pattern2\\(');
        
        expect(result.fileResults[1]).toHaveProperty('fileName', 'file2.ts');
        expect(result.fileResults[1]).toHaveProperty('filePath', '/path/to/file2.ts');
        expect(result.fileResults[1].patternMatches).toHaveProperty('pattern1\\(');
        expect(result.fileResults[1].patternMatches).not.toHaveProperty('pattern2\\(');
        
        // Verify the runtime fact was added
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('fileCentricAnalysis', expect.any(Object));
    });
    it('should only include files with matches in file-centric output', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { pattern1(); }'
            },
            {
                fileName: 'file2.ts',
                filePath: '/path/to/file2.ts',
                fileContent: 'function test2() { noMatch(); }'
            },
            {
                fileName: 'file3.ts',
                filePath: '/path/to/file3.ts',
                fileContent: 'function test3() { pattern2(); }'
            }
        ]);

        const params = {
            patterns: ['pattern1\\(', 'pattern2\\('],
            fileFilter: '\\.ts$',
            resultFact: 'fileCentricAnalysis',
            outputGrouping: 'file'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        // Only 2 files should be in the results (file1.ts and file3.ts)
        expect(result.fileResults.length).toBe(2);
        
        // Check that file2.ts is not included
        const fileNames = result.fileResults.map((file: any) => file.fileName);
        expect(fileNames).toContain('file1.ts');
        expect(fileNames).not.toContain('file2.ts');
        expect(fileNames).toContain('file3.ts');
    });

    it('should handle pattern-centric output format', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { pattern1(); pattern2(); }'
            },
            {
                fileName: 'file2.ts',
                filePath: '/path/to/file2.ts',
                fileContent: 'function test2() { pattern1(); }'
            }
        ]);

        const params = {
            patterns: ['pattern1\\(', 'pattern2\\('],
            fileFilter: '\\.ts$',
            resultFact: 'patternCentricAnalysis',
            outputGrouping: 'pattern'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        // Check that the pattern-centric output properties exist
        expect(result).toHaveProperty('fileMatches');
        expect(result.fileMatches).toHaveProperty('pattern1\\(');
        expect(result.fileMatches).toHaveProperty('pattern2\\(');
        
        // Verify pattern1 matches both files
        expect(result.fileMatches['pattern1\\('].length).toBe(2);
        
        // Verify pattern2 matches only one file
        expect(result.fileMatches['pattern2\\('].length).toBe(1);
        expect(result.fileMatches['pattern2\\('][0].filePath).toBe('/path/to/file1.ts');
    });
});
