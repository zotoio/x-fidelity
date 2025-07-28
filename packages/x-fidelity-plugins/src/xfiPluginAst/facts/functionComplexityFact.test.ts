import { functionComplexityFact } from './functionComplexityFact';
import { logger } from '@x-fidelity/core';
import { generateAst } from '../../sharedPluginUtils/astUtils';

// Mock dependencies
jest.mock('@x-fidelity/core');
jest.mock('../../sharedPluginUtils/astUtils');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockGenerateAst = generateAst as jest.MockedFunction<typeof generateAst>;

describe('functionComplexityFact', () => {
    const mockAlmanac = {
        factValue: jest.fn(),
        addRuntimeFact: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAlmanac.factValue.mockReset();
        mockAlmanac.addRuntimeFact.mockReset();
        mockGenerateAst.mockReset();
        mockLogger.debug.mockReset();
        mockLogger.error.mockReset();
    });

    it('should have correct metadata', () => {
        expect(functionComplexityFact.name).toBe('functionComplexity');
        expect(functionComplexityFact.description).toBe('Calculates complexity metrics for functions in the codebase using Tree-sitter');
        expect(typeof functionComplexityFact.fn).toBe('function');
    });

    it('should return empty complexities when no fileData available', async () => {
        mockAlmanac.factValue.mockResolvedValue(null);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result).toEqual({ complexities: [] });
        expect(mockLogger.debug).toHaveBeenCalledWith('No fileData available for functionComplexity fact');
    });

    it('should return empty complexities when no file content available', async () => {
        mockAlmanac.factValue.mockResolvedValue({
            fileName: 'test.ts'
            // No content or fileContent
        });

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result).toEqual({ complexities: [] });
        expect(mockLogger.debug).toHaveBeenCalledWith('No file content available for functionComplexity fact');
    });

    it('should use existing AST when available', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'function test() { return 1; }'
        };
        
        // Simplified mock AST - just the function node with minimal properties
        const mockFunctionNode = {
            type: 'function_declaration',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 28 },
            children: [
                {
                    type: 'identifier',
                    text: 'test',
                    startPosition: { row: 0, column: 9 },
                    endPosition: { row: 0, column: 13 },
                    children: []
                }
            ]
        };

        const mockAst = {
            tree: mockFunctionNode
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData) // fileData call
            .mockResolvedValueOnce(mockAst); // ast call

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result.complexities).toHaveLength(1);
        expect(result.complexities[0].name).toBe('test');
        expect(mockGenerateAst).not.toHaveBeenCalled();
    });

    it('should generate new AST when not available', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'function test() { return 1; }'
        };
        
        const mockAst = {
            tree: {
                type: 'program',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 28 },
                children: [
                    {
                        type: 'function_declaration',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 28 },
                        children: []
                    }
                ]
            }
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData) // fileData call
            .mockRejectedValueOnce(new Error('AST not available')); // ast call fails

        mockGenerateAst.mockResolvedValue(mockAst);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(mockGenerateAst).toHaveBeenCalledWith({
            ...fileData,
            fileContent: 'function test() { return 1; }',
            fileName: 'test.ts'
        });
        expect(result.complexities).toHaveLength(1);
    });

    it('should handle various function types', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'code'
        };
        
        // Create a program node that contains multiple function types
        const mockAst = {
            tree: {
                type: 'program',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 10, column: 0 },
                children: [
                    {
                        type: 'function_declaration',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 2, column: 0 },
                        children: [
                            {
                                type: 'identifier',
                                text: 'functionDecl',
                                startPosition: { row: 0, column: 9 },
                                endPosition: { row: 0, column: 21 },
                                children: []
                            }
                        ]
                    },
                    {
                        type: 'method_definition',
                        startPosition: { row: 3, column: 0 },
                        endPosition: { row: 5, column: 0 },
                        children: [
                            {
                                type: 'property_identifier',
                                text: 'methodDef',
                                startPosition: { row: 3, column: 0 },
                                endPosition: { row: 3, column: 9 },
                                children: []
                            }
                        ]
                    },
                    {
                        type: 'arrow_function',
                        startPosition: { row: 6, column: 0 },
                        endPosition: { row: 7, column: 0 },
                        children: [] // Anonymous arrow function
                    }
                ]
            }
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockResolvedValueOnce(mockAst);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result.complexities).toHaveLength(3);
        expect(result.complexities[0].name).toBe('functionDecl');
        expect(result.complexities[1].name).toBe('methodDef');
        expect(result.complexities[2].name).toBe('anonymous');
    });

    it('should calculate basic metrics correctly', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'function test() { return 1; }'
        };
        
        // Simple function node that will be detected and have metrics calculated
        const mockFunctionNode = {
            type: 'function_declaration',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 28 },
            children: [
                {
                    type: 'identifier',
                    text: 'test',
                    startPosition: { row: 0, column: 9 },
                    endPosition: { row: 0, column: 13 },
                    children: []
                },
                {
                    type: 'formal_parameters',
                    startPosition: { row: 0, column: 13 },
                    endPosition: { row: 0, column: 15 },
                    children: []
                },
                {
                    type: 'statement_block',
                    startPosition: { row: 0, column: 16 },
                    endPosition: { row: 0, column: 28 },
                    children: [
                        {
                            type: 'return_statement',
                            startPosition: { row: 0, column: 18 },
                            endPosition: { row: 0, column: 26 },
                            children: []
                        }
                    ]
                }
            ]
        };

        const mockAst = {
            tree: mockFunctionNode
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockResolvedValueOnce(mockAst);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result.complexities).toHaveLength(1);
        const complexity = result.complexities[0];
        expect(complexity.name).toBe('test');
        expect(complexity.metrics.name).toBe('test');
        expect(complexity.metrics.cyclomaticComplexity).toBe(1);
        expect(complexity.metrics.lineCount).toBe(1);
        expect(complexity.metrics.location.startLine).toBe(1);
        expect(complexity.metrics.location.endLine).toBe(1);
    });

    it('should add result to almanac when resultFact provided', async () => {
        const params = {
            resultFact: 'complexityResult'
        };

        const fileData = {
            fileName: 'test.ts',
            content: 'function test() { return 1; }'
        };
        
        // Simple function node for testing almanac functionality
        const mockFunctionNode = {
            type: 'function_declaration',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 0, column: 28 },
            children: [
                {
                    type: 'identifier',
                    text: 'test',
                    startPosition: { row: 0, column: 9 },
                    endPosition: { row: 0, column: 13 },
                    children: []
                }
            ]
        };

        const mockAst = {
            tree: mockFunctionNode
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockResolvedValueOnce(mockAst);

        await functionComplexityFact.fn(params, mockAlmanac);

        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith(
            'complexityResult',
            expect.objectContaining({
                complexities: expect.any(Array)
            })
        );
        
        // Verify the structure contains the function with metrics
        const call = mockAlmanac.addRuntimeFact.mock.calls[0];
        const result = call[1];
        expect(result.complexities).toHaveLength(1);
        expect(result.complexities[0]).toHaveProperty('name', 'test');
        expect(result.complexities[0]).toHaveProperty('metrics');
        expect(result.complexities[0].metrics).toHaveProperty('cyclomaticComplexity');
        expect(result.complexities[0].metrics).toHaveProperty('cognitiveComplexity');
    });

    it('should handle duplicate nodes correctly', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'code'
        };
        
        // Create AST with duplicate node (same position and type)
        const duplicateNode = {
            type: 'function_declaration',
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 1, column: 0 },
            children: []
        };
        
        const mockAst = {
            tree: {
                type: 'program',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 2, column: 0 },
                children: [duplicateNode, duplicateNode] // Same node twice
            }
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockResolvedValueOnce(mockAst);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        // Should only process the function once due to visited set
        expect(result.complexities).toHaveLength(1);
    });

    it('should handle errors gracefully', async () => {
        const error = new Error('Test error');
        mockAlmanac.factValue.mockRejectedValue(error);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result).toEqual({ complexities: [] });
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Error in functionComplexityFact: Error: Test error'
        );
    });

    it('should handle invalid file content gracefully', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: null
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockRejectedValueOnce(new Error('No AST'));

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result).toEqual({ complexities: [] });
        expect(mockLogger.debug).toHaveBeenCalledWith('No file content available for functionComplexity fact');
    });

    it('should handle failed AST generation', async () => {
        const fileData = {
            fileName: 'test.ts',
            content: 'function test() {}'
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockRejectedValueOnce(new Error('No AST'));

        mockGenerateAst.mockResolvedValue({ tree: null });

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(result).toEqual({ complexities: [] });
        expect(mockLogger.debug).toHaveBeenCalledWith('No AST tree generated for functionComplexity fact');
    });

    it('should use fileContent when content not available', async () => {
        const fileData = {
            fileName: 'test.ts',
            fileContent: 'function test() { return 1; }'
        };
        
        const mockAst = {
            tree: {
                type: 'function_declaration',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 28 },
                children: []
            }
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockRejectedValueOnce(new Error('No AST'));

        mockGenerateAst.mockResolvedValue(mockAst);

        const result = await functionComplexityFact.fn({}, mockAlmanac);

        expect(mockGenerateAst).toHaveBeenCalledWith({
            fileName: 'test.ts',
            fileContent: 'function test() { return 1; }'
        });
        expect(result.complexities).toHaveLength(1);
    });

    it('should handle unknown fileName', async () => {
        const fileData = {
            // No fileName
            content: 'function test() { return 1; }'
        };
        
        const mockAst = {
            tree: {
                type: 'function_declaration',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 28 },
                children: []
            }
        };

        mockAlmanac.factValue
            .mockResolvedValueOnce(fileData)
            .mockRejectedValueOnce(new Error('No AST'));

        mockGenerateAst.mockResolvedValue(mockAst);

        await functionComplexityFact.fn({}, mockAlmanac);

        expect(mockGenerateAst).toHaveBeenCalledWith({
            content: 'function test() { return 1; }',
            fileContent: 'function test() { return 1; }',
            fileName: 'unknown.ts'
        });
    });
}); 