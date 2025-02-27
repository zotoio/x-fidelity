import { globalFileAnalysis } from './globalFileAnalysisFacts';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('globalFileAnalysis', () => {
    it('should analyze patterns across multiple files', async () => {
        const mockAlmanac = {
            factValue: jest.fn().mockResolvedValue([
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
            ]),
            addRuntimeFact: jest.fn(),
        };

        const params = {
            patterns: ['newApiMethod\\(', 'legacyApiMethod\\('],
            fileFilter: '\\.ts$',
            resultFact: 'apiUsageAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.summary.totalFiles).toBe(2);
        expect(result.matchCounts['newApiMethod\\(']).toBe(3);
        expect(result.matchCounts['legacyApiMethod\\(']).toBe(1);
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('apiUsageAnalysis', expect.any(Object));
    });

    it('should handle errors gracefully', async () => {
        const mockAlmanac = {
            factValue: jest.fn().mockRejectedValue(new Error('Test error')),
            addRuntimeFact: jest.fn(),
        };

        const params = {
            patterns: ['newApiMethod\\('],
            fileFilter: '\\.ts$',
            resultFact: 'apiUsageAnalysis'
        };

        const result = await globalFileAnalysis.fn(params, mockAlmanac);

        expect(result.result).toEqual([]);
        expect(logger.error).toHaveBeenCalled();
    });
});
