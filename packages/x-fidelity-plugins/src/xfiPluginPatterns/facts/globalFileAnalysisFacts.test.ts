import { globalFileAnalysis } from './globalFileAnalysisFacts';
import { logger } from '@x-fidelity/core';
import { maskSensitiveData } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn()
    },
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
            resultFact: 'lineNumberAnalysis',
            outputGrouping: 'pattern' // Explicitly set to pattern to ensure patternData is available
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        // Check the patternData structure is available when outputGrouping is 'pattern'
        expect(result.patternData[0].files[0].matches[0].lineNumber).toBe(2);
        expect(result.patternData[0].files[0].matches[0].match).toBe('pattern\\(');
        expect(result.patternData[0].files[0].matches[0].context).toBe('line2 pattern()');
        
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
        expect(result).toEqual({ patternData: [], fileResults: [] });
    });

    it('should handle invalid globalFileMetadata', async () => {
        mockAlmanac.factValue.mockResolvedValue('not an array');

        const params = {
            patterns: ['pattern\\('],
            resultFact: 'invalidDataAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(logger.error).toHaveBeenCalledWith('Invalid globalFileMetadata');
        expect(result).toEqual({ patternData: [], fileResults: [] });
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
        
        // Check that patternMatches is now an array
        expect(Array.isArray(result.fileResults[0].patternMatches)).toBe(true);
        
        // Find the pattern entries in the array
        const file1Pattern1 = result.fileResults[0].patternMatches.find((p: any) => p.pattern === 'pattern1\\(');
        const file1Pattern2 = result.fileResults[0].patternMatches.find((p: any) => p.pattern === 'pattern2\\(');
        expect(file1Pattern1).toBeDefined();
        expect(file1Pattern2).toBeDefined();
        
        expect(result.fileResults[1]).toHaveProperty('fileName', 'file2.ts');
        expect(result.fileResults[1]).toHaveProperty('filePath', '/path/to/file2.ts');
        
        // Check pattern matches for second file
        const file2Pattern1 = result.fileResults[1].patternMatches.find((p: any) => p.pattern === 'pattern1\\(');
        const file2Pattern2 = result.fileResults[1].patternMatches.find((p: any) => p.pattern === 'pattern2\\(');
        expect(file2Pattern1).toBeDefined();
        expect(file2Pattern2).toBeUndefined();
        
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
        expect(result).toHaveProperty('patternData');
        expect(result.patternData.length).toBe(2);
        
        // Find the pattern entries
        const pattern1Entry = result.patternData.find((p: any) => p.pattern === 'pattern1\\(');
        const pattern2Entry = result.patternData.find((p: any) => p.pattern === 'pattern2\\(');
        
        // Verify pattern1 matches both files
        expect(pattern1Entry.files.length).toBe(2);
        
        // Verify pattern2 matches only one file
        expect(pattern2Entry.files.length).toBe(1);
        expect(pattern2Entry.files[0].filePath).toBe('/path/to/file1.ts');
        
        // No need to check backward-compatible structure
    });

    it('should handle empty patterns array', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { pattern(); }'
            }
        ]);

        const params = {
            patterns: [],
            fileFilter: '\\.ts$',
            resultFact: 'emptyPatternsAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(1);
        expect(result.matchCounts).toEqual({});
    });

    it('should handle invalid regex patterns', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { pattern(); }'
            }
        ]);

        const params = {
            patterns: ['[invalid regex'],
            fileFilter: '\\.ts$',
            resultFact: 'invalidRegexAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        // The function includes invalid regex patterns in patternData with 0 matches
        expect(result.patternData).toEqual([{
            pattern: '[invalid regex',
            count: 0,
            files: []
        }]);
        // Note: summary may not be defined for invalid patterns
    });

    it('should handle large file content', async () => {
        const largeContent = 'pattern();\n'.repeat(10000);
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'large.ts',
                filePath: '/path/to/large.ts',
                fileContent: largeContent
            }
        ]);

        const params = {
            patterns: ['pattern\\(\\)'],
            fileFilter: '\\.ts$',
            resultFact: 'largeFileAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(1);
        expect(result.matchCounts['pattern\\(\\)']).toBe(10000);
    });

    it('should handle concurrent pattern matching', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'pattern1(); pattern2(); pattern1();'
            }
        ]);

        const params = {
            patterns: ['pattern1\\(\\)', 'pattern2\\(\\)'],
            fileFilter: '\\.ts$',
            resultFact: 'concurrentPatternAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(1);
        expect(result.matchCounts['pattern1\\(\\)']).toBe(2);
        expect(result.matchCounts['pattern2\\(\\)']).toBe(1);
    });

    it('should handle special characters in patterns', async () => {
        mockAlmanac.factValue.mockResolvedValue([
            {
                fileName: 'file1.ts',
                filePath: '/path/to/file1.ts',
                fileContent: 'function test() { $special@chars(); }'
            }
        ]);

        const params = {
            patterns: ['\\$special@chars\\(\\)'],
            fileFilter: '\\.ts$',
            resultFact: 'specialCharsAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(1);
        expect(result.matchCounts['\\$special@chars\\(\\)']).toBe(1);
    });
});
