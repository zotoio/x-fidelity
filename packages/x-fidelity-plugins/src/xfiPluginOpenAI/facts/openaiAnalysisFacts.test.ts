import { openaiAnalysisFn, openaiAnalysis, collectOpenaiAnalysisFacts } from './openaiAnalysisFacts';
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
    isOpenAIEnabled: jest.fn().mockReturnValue(true),
    aiSuggestionsSchema: {
        type: 'object',
        properties: {
            issues: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        issue: { type: 'string' },
                        severity: { type: 'number' },
                        description: { type: 'string' }
                    }
                }
            }
        }
    }
}));

jest.mock('json-rules-engine');

// Create a mock function that we can control
const mockCreate = jest.fn();

jest.mock('openai', () => {
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

describe('openaiAnalysisFacts', () => {
    let mockAlmanac: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAlmanac = {
            factValue: jest.fn(),
            addRuntimeFact: jest.fn()
        };

        // Set default mock behavior
        mockCreate.mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({ issues: [] }) } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        });
    });

    describe('fact definition', () => {
        it('should have correct metadata', () => {
            expect(openaiAnalysis.name).toBe('openaiAnalysis');
            expect(openaiAnalysis.description).toBe('Analyzes the codebase using OpenAI');
            expect(openaiAnalysis.type).toBe('global-function');
            expect(openaiAnalysis.priority).toBe(3);
            expect(typeof openaiAnalysis.fn).toBe('function');
        });
    });

    describe('openaiAnalysisFn', () => {
        it('should return empty result when OpenAI is disabled', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(false);

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
        });

        it('should return empty result when OpenAI client is not initialized', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            // Mock that OpenAI is not available (e.g., missing API key)
            delete process.env.OPENAI_API_KEY;

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
        });

        it('should analyze codebase with OpenAI when enabled', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';
            process.env.OPENAI_MODEL = 'gpt-4o';

            const mockFileData: FileData = {
                fileName: 'test.ts',
                filePath: '/test/test.ts',
                fileContent: 'const test = "hello";',
                fileAst: null
            };

            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            issues: [
                                {
                                    issue: 'Unused variable',
                                    severity: 3,
                                    description: 'Variable test is declared but never used',
                                    filePaths: ['/test/test.ts'],
                                    suggestion: 'Remove unused variable or use it',
                                    codeSnippets: [{
                                        filePath: '/test/test.ts',
                                        lineNumber: 1,
                                        before: 'const test = "hello";',
                                        after: '// Remove if not needed'
                                    }]
                                }
                            ]
                        })
                    }
                }],
                usage: {
                    prompt_tokens: 100,
                    completion_tokens: 50,
                    total_tokens: 150
                }
            };

            mockCreate.mockResolvedValue(mockResponse);
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'System prompt for analysis';
                }
                if (factName === 'fileData') {
                    return mockFileData;
                }
                return null;
            });

            const params = {
                prompt: 'Analyze this code for issues',
                resultFact: 'codeAnalysisResult'
            };

            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result.prompt).toBe('Analyze this code for issues');
            expect(result.result).toHaveLength(1);
            expect((result.result as any)[0].issue).toBe('Unused variable');
            expect((result.result as any)[0].severity).toBe(3);

            expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('codeAnalysisResult', result);
            expect(mockCreate).toHaveBeenCalled();
        });

        it('should handle OpenAI API errors gracefully', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';

            mockCreate.mockRejectedValue(new Error('API Rate limit exceeded'));
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Test system prompt';
                }
                if (factName === 'fileData') {
                    return { fileName: 'test.ts', fileContent: 'test code', filePath: '/test.ts', fileAst: null };
                }
                return null;
            });

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
            
            const { logger } = require('@x-fidelity/core');
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Error analyzing facts with OpenAI: API Rate limit exceeded')
            );
        });

        it('should handle empty OpenAI response', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';

            const mockResponse = {
                choices: [{
                    message: {
                        content: null
                    }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 }
            };

            mockCreate.mockResolvedValue(mockResponse);
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Test system prompt';
                }
                if (factName === 'fileData') {
                    return { fileName: 'test.ts', fileContent: 'test code', filePath: '/test.ts', fileAst: null };
                }
                return null;
            });

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
        });

        it('should handle invalid JSON in OpenAI response', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';

            const mockResponse = {
                choices: [{
                    message: {
                        content: 'Invalid JSON response'
                    }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            };

            mockCreate.mockResolvedValue(mockResponse);
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Test system prompt';
                }
                if (factName === 'fileData') {
                    return { fileName: 'test.ts', fileContent: 'test code', filePath: '/test.ts', fileAst: null };
                }
                return null;
            });

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
        });

        it('should use custom model when specified', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';
            process.env.OPENAI_MODEL = 'gpt-3.5-turbo';

            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({ issues: [] })
                    }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            };

            mockCreate.mockResolvedValue(mockResponse);
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Test system prompt';
                }
                if (factName === 'fileData') {
                    return { fileName: 'test.ts', fileContent: 'test code', filePath: '/test.ts', fileAst: null };
                }
                return null;
            });

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            await openaiAnalysisFn(params, mockAlmanac);

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-3.5-turbo'
                })
            );
        });

        it('should default to gpt-4o model when not specified', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';
            delete process.env.OPENAI_MODEL;

            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({ issues: [] })
                    }
                }],
                usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
            };

            mockCreate.mockResolvedValue(mockResponse);
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Test system prompt';
                }
                if (factName === 'fileData') {
                    return { fileName: 'test.ts', fileContent: 'test code', filePath: '/test.ts', fileAst: null };
                }
                return null;
            });

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            await openaiAnalysisFn(params, mockAlmanac);

            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: 'gpt-4o'
                })
            );
        });
    });

    describe('collectOpenaiAnalysisFacts', () => {
        it('should format file data and create system prompt', async () => {
            const fileData: FileData[] = [
                {
                    fileName: 'test1.ts',
                    filePath: '/src/test1.ts',
                    fileContent: 'const x = 1;   \n\n  const y = 2;',
                    fileAst: null
                },
                {
                    fileName: 'test2.js',
                    filePath: '/src/test2.js',
                    fileContent: 'function  test()  { return  true; }',
                    fileAst: null
                }
            ];

            const systemPrompt = await collectOpenaiAnalysisFacts(fileData);

            expect(typeof systemPrompt).toBe('string');
            expect(systemPrompt).toContain('expert software engineer');
            expect(systemPrompt).toContain('security, performance');
            expect(systemPrompt).toContain('separation of concerns');
            expect(systemPrompt).toContain(JSON.stringify([
                {
                    fileName: 'test1.ts',
                    filePath: '/src/test1.ts',
                    fileContent: 'const x = 1; \n\n const y = 2;', // Consecutive spaces removed
                    fileAst: null
                },
                {
                    fileName: 'test2.js',
                    filePath: '/src/test2.js',
                    fileContent: 'function test() { return true; }', // Consecutive spaces removed
                    fileAst: null
                }
            ]));
        });

        it('should skip REPO_GLOBAL_CHECK files', async () => {
            const fileData: FileData[] = [
                {
                    fileName: 'REPO_GLOBAL_CHECK',
                    filePath: '/REPO_GLOBAL_CHECK',
                    fileContent: 'This should be skipped',
                    fileAst: null
                },
                {
                    fileName: 'test.ts',
                    filePath: '/src/test.ts',
                    fileContent: 'const test = "hello";',
                    fileAst: null
                }
            ];

            const systemPrompt = await collectOpenaiAnalysisFacts(fileData);

            expect(systemPrompt).not.toContain('This should be skipped');
            expect(systemPrompt).toContain('const test = \\"hello\\";');
        });

        it('should handle empty file data array', async () => {
            const systemPrompt = await collectOpenaiAnalysisFacts([]);

            expect(typeof systemPrompt).toBe('string');
            expect(systemPrompt).toContain('expert software engineer');
            expect(systemPrompt).toContain('[]'); // Empty array in JSON
        });

        it('should handle files with special characters', async () => {
            const fileData: FileData[] = [
                {
                    fileName: '特殊文件.ts',
                    filePath: '/src/特殊文件.ts',
                    fileContent: 'const emoji = "🚀"; // 特殊字符',
                    fileAst: null
                }
            ];

            const systemPrompt = await collectOpenaiAnalysisFacts(fileData);

            expect(systemPrompt).toContain('特殊文件.ts');
            expect(systemPrompt).toContain('🚀');
            expect(systemPrompt).toContain('特殊字符');
        });

        it('should handle very large files', async () => {
            const largeContent = 'console.log("test");  '.repeat(1000);
            const fileData: FileData[] = [
                {
                    fileName: 'large.js',
                    filePath: '/src/large.js',
                    fileContent: largeContent,
                    fileAst: null
                }
            ];

            const systemPrompt = await collectOpenaiAnalysisFacts(fileData);

            expect(typeof systemPrompt).toBe('string');
            expect(systemPrompt.length).toBeGreaterThan(1000);
            // Should contain the compressed content (consecutive spaces removed)
            expect(systemPrompt).toContain('console.log(\\"test\\");');
        });
    });

    describe('edge cases', () => {
        it('should handle missing environment variables', async () => {
            delete process.env.OPENAI_API_KEY;
            delete process.env.OPENAI_MODEL;

            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(false);

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
        });

        it('should handle malformed params', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            const invalidParams = null;
            const result = await openaiAnalysisFn(invalidParams, mockAlmanac);

            expect(result).toEqual({ prompt: 'unknown', result: [] });
        });

        it('should handle missing almanac facts', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';

            mockAlmanac.factValue.mockResolvedValue(null);

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
        });

        it('should handle network timeouts', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';

            mockCreate.mockRejectedValue(new Error('Request timeout'));
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Test system prompt';
                }
                if (factName === 'fileData') {
                    return { fileName: 'test.ts', fileContent: 'test code', filePath: '/test.ts', fileAst: null };
                }
                return null;
            });

            const params = { prompt: 'Test prompt', resultFact: 'testResult' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect(result).toEqual({ prompt: 'Test prompt', result: [] });
            
            const { logger } = require('@x-fidelity/core');
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Request timeout')
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle complex codebase analysis', async () => {
            const { isOpenAIEnabled } = require('@x-fidelity/core');
            isOpenAIEnabled.mockReturnValue(true);

            process.env.OPENAI_API_KEY = 'test-api-key';

            const complexFileData: FileData = {
                fileName: 'complex.tsx',
                filePath: '/src/components/complex.tsx',
                fileContent: `
                    import React, { useState, useEffect } from 'react';
                    
                    const ComplexComponent = ({ data }) => {
                        const [state, setState] = useState(data);
                        
                        useEffect(() => {
                            console.log(state);
                        }, []); // Missing dependency
                        
                        return <div>{state}</div>;
                    };
                `,
                fileAst: null
            };

            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            issues: [
                                {
                                    issue: 'Missing useEffect dependency',
                                    severity: 7,
                                    description: 'useEffect is missing state dependency',
                                    filePaths: ['/src/components/complex.tsx'],
                                    suggestion: 'Add state to dependency array',
                                    codeSnippets: [{
                                        filePath: '/src/components/complex.tsx',
                                        lineNumber: 8,
                                        before: 'useEffect(() => { console.log(state); }, []);',
                                        after: 'useEffect(() => { console.log(state); }, [state]);'
                                    }]
                                }
                            ]
                        })
                    }
                }],
                usage: { prompt_tokens: 200, completion_tokens: 100, total_tokens: 300 }
            };

            mockCreate.mockResolvedValue(mockResponse);
            mockAlmanac.factValue.mockImplementation((factName: string) => {
                if (factName === 'openaiSystemPrompt') {
                    return 'Complex analysis system prompt';
                }
                if (factName === 'fileData') {
                    return complexFileData;
                }
                return null;
            });

            const params = { prompt: 'Analyze React component for best practices', resultFact: 'complexAnalysis' };
            const result = await openaiAnalysisFn(params, mockAlmanac);

            expect((result.result as any)[0].issue).toBe('Missing useEffect dependency');
            expect((result.result as any)[0].severity).toBe(7);
            expect((result.result as any)[0].suggestion).toBe('Add state to dependency array');
        });
    });
});
