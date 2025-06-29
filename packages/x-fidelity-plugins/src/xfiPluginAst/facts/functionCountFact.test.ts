import { functionCountFact } from './functionCountFact';
import { logger } from '@x-fidelity/core';

// Mock dependencies
jest.mock('@x-fidelity/core');

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('functionCountFact', () => {
    const mockAlmanac = {
        factValue: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have correct metadata', () => {
        expect(functionCountFact.name).toBe('functionCount');
        expect(functionCountFact.description).toBe('Counts the number of functions in a file');
        expect(typeof functionCountFact.fn).toBe('function');
    });

    it('should return zero count when no AST available', async () => {
        mockAlmanac.factValue.mockResolvedValue(null);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 0 });
    });

    it('should return zero count when AST has no rootNode', async () => {
        mockAlmanac.factValue.mockResolvedValue({ tree: {} });

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 0 });
    });

    it('should count function declarations', async () => {
        const mockAst = {
            rootNode: {
                type: 'program',
                children: [
                    {
                        type: 'function_declaration',
                        children: []
                    },
                    {
                        type: 'variable_declaration',
                        children: []
                    }
                ]
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 1 });
    });

    it('should count arrow functions', async () => {
        const mockAst = {
            rootNode: {
                type: 'program',
                children: [
                    {
                        type: 'arrow_function',
                        children: []
                    }
                ]
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 1 });
    });

    it('should count nested functions', async () => {
        const mockAst = {
            rootNode: {
                type: 'program',
                children: [
                    {
                        type: 'function_declaration',
                        children: [
                            {
                                type: 'block_statement',
                                children: [
                                    {
                                        type: 'arrow_function',
                                        children: []
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 2 });
    });

    it('should handle nodes without children', async () => {
        const mockAst = {
            rootNode: {
                type: 'function_declaration'
                // No children property
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 1 });
    });

    it('should count multiple functions at same level', async () => {
        const mockAst = {
            rootNode: {
                type: 'program',
                children: [
                    {
                        type: 'function_declaration',
                        children: []
                    },
                    {
                        type: 'arrow_function',
                        children: []
                    },
                    {
                        type: 'function_declaration',
                        children: []
                    }
                ]
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 3 });
    });

    it('should handle errors gracefully', async () => {
        const error = new Error('Test error');
        mockAlmanac.factValue.mockRejectedValue(error);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 0 });
        expect(mockLogger.error).toHaveBeenCalledWith('Error in functionCount fact:', error);
    });

    it('should ignore non-function node types', async () => {
        const mockAst = {
            rootNode: {
                type: 'program',
                children: [
                    {
                        type: 'variable_declaration',
                        children: []
                    },
                    {
                        type: 'if_statement',
                        children: []
                    },
                    {
                        type: 'class_declaration',
                        children: []
                    }
                ]
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 0 });
    });

    it('should handle deeply nested structure', async () => {
        const mockAst = {
            rootNode: {
                type: 'program',
                children: [
                    {
                        type: 'class_declaration',
                        children: [
                            {
                                type: 'method_definition',
                                children: [
                                    {
                                        type: 'function_declaration',
                                        children: [
                                            {
                                                type: 'block_statement',
                                                children: [
                                                    {
                                                        type: 'arrow_function',
                                                        children: []
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        };

        mockAlmanac.factValue.mockResolvedValue(mockAst);

        const result = await functionCountFact.fn({}, mockAlmanac);

        expect(result).toEqual({ count: 2 });
    });
}); 