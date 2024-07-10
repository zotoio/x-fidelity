import { openaiAnalysis, collectOpenaiAnalysisFacts } from './openaiAnalysisFacts';
import { Almanac } from 'json-rules-engine';
import { OpenAI } from 'openai';
import { logger } from '../utils/logger';
import { FileData } from './repoFilesystemFacts';

jest.mock('openai');
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

describe('openaiAnalysis', () => {
    const mockAlmanac = {
        factValue: jest.fn()
    } as unknown as Almanac;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return an empty result if fileName is not REPO_GLOBAL_CHECK', async () => {
        mockAlmanac.factValue.mockResolvedValueOnce('some prompt').mockResolvedValueOnce({ fileName: 'someFile' });

        const result = await openaiAnalysis({ prompt: 'test prompt', resultFact: 'testResult' }, mockAlmanac);

        expect(result).toEqual({ result: [] });
    });

    it('should return analysis result from OpenAI', async () => {
        mockAlmanac.factValue.mockResolvedValueOnce('some prompt').mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' });

        const mockResponse = {
            choices: [
                {
                    message: {
                        content: JSON.stringify([{ issue: 'test issue', severity: 9 }])
                    }
                }
            ]
        };

        (OpenAI.prototype.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

        const result = await openaiAnalysis({ prompt: 'test prompt', resultFact: 'testResult' }, mockAlmanac);

        expect(result).toEqual({ result: [{ issue: 'test issue', severity: 9 }] });
    });

    it('should log an error if OpenAI request fails', async () => {
        mockAlmanac.factValue.mockResolvedValueOnce('some prompt').mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' });

        (OpenAI.prototype.chat.completions.create as jest.Mock).mockRejectedValue(new Error('mock error'));

        const result = await openaiAnalysis({ prompt: 'test prompt', resultFact: 'testResult' }, mockAlmanac);

        expect(result).toEqual({ result: [] });
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysis: Error analyzing facts with OpenAI: Error: mock error');
    });
});

describe('collectOpenaiAnalysisFacts', () => {
    it('should format file data correctly', async () => {
        const mockFileData: FileData[] = [
            { fileName: 'file1.ts', filePath: '/repo/file1.ts', fileContent: 'console.log("Hello, world!");' },
            { fileName: 'REPO_GLOBAL_CHECK', filePath: '/repo/REPO_GLOBAL_CHECK', fileContent: 'console.log("Hello, world!");' }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);

        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('file1.ts');
        expect(result).not.toContain('REPO_GLOBAL_CHECK');
    });
});
