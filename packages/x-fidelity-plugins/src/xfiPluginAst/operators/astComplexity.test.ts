import { astComplexity } from './astComplexity';
import { logger } from '@x-fidelity/core';

// Mock dependencies
jest.mock('@x-fidelity/core');

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('astComplexity', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have correct metadata', () => {
        expect(astComplexity.name).toBe('astComplexity');
        expect(astComplexity.description).toBe('Checks if AST complexity metrics exceed specified thresholds');
        expect(typeof astComplexity.fn).toBe('function');
    });

    it('should return false when no complexity data available', () => {
        const factValue = null;
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith('No complexity data available');
    });

    it('should return false when complexities array is empty', () => {
        const factValue = { complexities: [] };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith('No complexity data available');
    });

    it('should return true when cyclomatic complexity exceeds threshold', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 15,
                        cognitiveComplexity: 5,
                        nestingDepth: 2,
                        parameterCount: 3,
                        returnCount: 1
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true);
        expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.objectContaining({ thresholds }),
            'Checking AST complexity against thresholds'
        );
        expect(mockLogger.debug).toHaveBeenCalledWith(
            expect.objectContaining({
                functionName: 'testFunction',
                metrics: factValue.complexities[0].metrics,
                thresholds,
                exceedsThresholds: expect.objectContaining({
                    cyclomaticComplexity: true
                })
            }),
            'Function exceeds complexity thresholds'
        );
    });

    it('should return true when cognitive complexity exceeds threshold', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 5,
                        cognitiveComplexity: 20,
                        nestingDepth: 2,
                        parameterCount: 3,
                        returnCount: 1
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true);
    });

    it('should return true when nesting depth exceeds threshold', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 5,
                        cognitiveComplexity: 10,
                        nestingDepth: 6,
                        parameterCount: 3,
                        returnCount: 1
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true);
    });

    it('should return true when parameter count exceeds threshold', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 5,
                        cognitiveComplexity: 10,
                        nestingDepth: 2,
                        parameterCount: 7,
                        returnCount: 1
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true);
    });

    it('should return true when return count exceeds threshold', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 5,
                        cognitiveComplexity: 10,
                        nestingDepth: 2,
                        parameterCount: 3,
                        returnCount: 5
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true);
    });

    it('should return false when all metrics are below thresholds', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 5,
                        cognitiveComplexity: 10,
                        nestingDepth: 2,
                        parameterCount: 3,
                        returnCount: 1
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(false);
    });

    it('should return true if any function exceeds thresholds', () => {
        const factValue = {
            complexities: [
                {
                    name: 'simpleFunction',
                    metrics: {
                        cyclomaticComplexity: 2,
                        cognitiveComplexity: 3,
                        nestingDepth: 1,
                        parameterCount: 2,
                        returnCount: 1
                    }
                },
                {
                    name: 'complexFunction',
                    metrics: {
                        cyclomaticComplexity: 15,
                        cognitiveComplexity: 10,
                        nestingDepth: 2,
                        parameterCount: 3,
                        returnCount: 1
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true);
    });

    it('should handle functions with missing metrics', () => {
        const factValue = {
            complexities: [
                {
                    name: 'functionWithoutMetrics'
                    // No metrics property
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(false);
    });

    it('should handle errors gracefully', () => {
        // Create a factValue that will cause an error when processed
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    get metrics() {
                        throw new Error('Test error');
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(false);
        expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('Error in astComplexity operator:')
        );
    });

    it('should handle threshold equality correctly', () => {
        const factValue = {
            complexities: [
                {
                    name: 'testFunction',
                    metrics: {
                        cyclomaticComplexity: 10,
                        cognitiveComplexity: 15,
                        nestingDepth: 4,
                        parameterCount: 5,
                        returnCount: 3
                    }
                }
            ]
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(true); // Should return true when equal to threshold
    });

    it('should handle empty complexities property', () => {
        const factValue = {
            complexities: undefined
        };
        const thresholds = {
            cyclomaticComplexity: 10,
            cognitiveComplexity: 15,
            nestingDepth: 4,
            parameterCount: 5,
            returnCount: 3
        };

        const result = astComplexity.fn(factValue, thresholds);

        expect(result).toBe(false);
        expect(mockLogger.debug).toHaveBeenCalledWith('No complexity data available');
    });
}); 