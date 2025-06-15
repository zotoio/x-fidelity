import { openaiAnalysis, collectOpenaiAnalysisFacts } from './openaiAnalysisFacts';
import { Almanac } from 'json-rules-engine';
import { OpenAI } from 'openai';
import { logger } from '@x-fidelity/core';
import { maskSensitiveData } from '@x-fidelity/core';
import { FileData } from '@x-fidelity/types';
import { isOpenAIEnabled } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn()
    },
    maskSensitiveData: jest.fn(data => data),
    isOpenAIEnabled: jest.fn().mockReturnValue(true)
}));

jest.mock('json-rules-engine');

jest.mock('openai', () => {
    const mockCreate = jest.fn().mockResolvedValue({
        choices: [{ message: { content: '[]' } }]
    });
    return {
        OpenAI: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: mockCreate
                }
            }
        }))
    };
});

describe('openaiAnalysis', () => {
    const mockAlmanac: Almanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn(),
    } as unknown as Almanac;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return an empty result if fileName is not REPO_GLOBAL_CHECK', async () => {
        (mockAlmanac.factValue as jest.Mock)
            .mockResolvedValueOnce('some prompt')
            .mockResolvedValueOnce({ fileName: 'someFile' });

        const result = await openaiAnalysis({ prompt: 'test prompt', resultFact: 'testResult' }, mockAlmanac);

        expect(result).toEqual({ result: [] });
    });

    it('should log an error if OpenAI request fails', async () => {
        (mockAlmanac.factValue as jest.Mock)
            .mockResolvedValueOnce('some prompt')
            .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' });

            
        ((new OpenAI()).chat.completions.create as jest.Mock).mockRejectedValue(new Error('mock error'));

        const result = await openaiAnalysis({ prompt: 'test prompt', resultFact: 'testResult' }, mockAlmanac);

        expect(result).toEqual({ result: [] });
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysis: Error analyzing facts with OpenAI: mock error');
    });

    it('should handle empty OpenAI response', async () => {
        (mockAlmanac.factValue as jest.Mock)
            .mockResolvedValueOnce('some prompt')
            .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' });

        const mockResponse = {
            choices: [
                {
                    message: {
                        content: null
                    }
                }
            ]
        };

        ((new OpenAI()).chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

        const result = await openaiAnalysis({ prompt: 'test prompt', resultFact: 'testResult' }, mockAlmanac);

        expect(result).toEqual({ result: [] });
        expect(logger.error).toHaveBeenCalledWith('openaiAnalysis: Error analyzing facts with OpenAI: OpenAI response is empty');
    });
});

describe('collectOpenaiAnalysisFacts', () => {
    it('should format file data correctly', async () => {
        const mockFileData: FileData[] = [
            { 
                fileName: 'file1.ts', 
                filePath: '/repo/file1.ts', 
                fileContent: 'logger.info("Hello, world!");'
            },
            { 
                fileName: 'REPO_GLOBAL_CHECK', 
                filePath: '/repo/REPO_GLOBAL_CHECK', 
                fileContent: 'logger.info("Hello, world!");'
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);

        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('file1.ts');
        expect(result).not.toContain('REPO_GLOBAL_CHECK');
    });

    it('should handle empty file data array', async () => {
        const result = await collectOpenaiAnalysisFacts([]);
        expect(result).toContain('You are an expert software engineer');
        expect(result).not.toContain('file1.ts');
    });

    it('should handle files with no content', async () => {
        const mockFileData: FileData[] = [
            { 
                fileName: 'empty.ts', 
                filePath: '/repo/empty.ts', 
                fileContent: ''
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);
        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('empty.ts');
        expect(result).toContain('""'); // Empty content shows as empty string in JSON
    });

    it('should handle files with special characters', async () => {
        const mockFileData: FileData[] = [
            { 
                fileName: 'special.ts', 
                filePath: '/repo/special.ts', 
                fileContent: 'const special = "\\u0000\\u0001\\u0002";'
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);
        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('special.ts');
        expect(result).toContain('const special');
    });

    it('should handle files with very long content', async () => {
        const longContent = 'const x = 1;\n'.repeat(1000);
        const mockFileData: FileData[] = [
            { 
                fileName: 'long.ts', 
                filePath: '/repo/long.ts', 
                fileContent: longContent
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);
        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('long.ts');
        expect(result).toContain('const x = 1;');
    });

    it('should handle files with different line endings', async () => {
        const mockFileData: FileData[] = [
            { 
                fileName: 'mixed.ts', 
                filePath: '/repo/mixed.ts', 
                fileContent: 'line1\r\nline2\nline3\r'
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);
        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('mixed.ts');
        expect(result).toContain('line1');
        expect(result).toContain('line2');
        expect(result).toContain('line3');
    });

    it('should handle files with binary content', async () => {
        const mockFileData: FileData[] = [
            { 
                fileName: 'binary.bin', 
                filePath: '/repo/binary.bin', 
                fileContent: Buffer.from([0x00, 0x01, 0x02]).toString()
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);
        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('binary.bin');
        expect(result).toContain('\\u0000\\u0001\\u0002'); // Binary content shows as escaped chars
    });

    it('should handle files with non-ASCII characters', async () => {
        const mockFileData: FileData[] = [
            { 
                fileName: 'unicode.ts', 
                filePath: '/repo/unicode.ts', 
                fileContent: 'const emoji = "👋"; const text = "你好";'
            }
        ];

        const result = await collectOpenaiAnalysisFacts(mockFileData);
        expect(result).toContain('You are an expert software engineer');
        expect(result).toContain('unicode.ts');
        expect(result).toContain('const emoji');
        expect(result).toContain('const text');
    });
});
