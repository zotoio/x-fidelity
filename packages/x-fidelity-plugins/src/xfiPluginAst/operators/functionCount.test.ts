import { functionCountOperator } from './functionCount';

describe('functionCountOperator', () => {
    it('should have correct metadata', () => {
        expect(functionCountOperator.name).toBe('functionCount');
        expect(functionCountOperator.description).toBe('Checks if the number of functions in a file exceeds a threshold');
        expect(typeof functionCountOperator.fn).toBe('function');
    });

    it('should return true when function count exceeds threshold', () => {
        const factValue = { count: 5 };
        const threshold = 3;

        const result = functionCountOperator.fn(factValue, threshold);

        expect(result).toBe(true);
    });

    it('should return false when function count equals threshold', () => {
        const factValue = { count: 3 };
        const threshold = 3;

        const result = functionCountOperator.fn(factValue, threshold);

        expect(result).toBe(false);
    });

    it('should return false when function count is below threshold', () => {
        const factValue = { count: 2 };
        const threshold = 5;

        const result = functionCountOperator.fn(factValue, threshold);

        expect(result).toBe(false);
    });

    it('should return false when factValue is null', () => {
        const result = functionCountOperator.fn(null, 3);

        expect(result).toBe(false);
    });

    it('should return false when factValue is undefined', () => {
        const result = functionCountOperator.fn(undefined, 3);

        expect(result).toBe(false);
    });

    it('should return false when factValue has no count property', () => {
        const factValue = { otherProperty: 'value' };

        const result = functionCountOperator.fn(factValue, 3);

        expect(result).toBe(false);
    });

    it('should return false when count is not a number', () => {
        const factValue = { count: 'not-a-number' };

        const result = functionCountOperator.fn(factValue, 3);

        expect(result).toBe(false);
    });

    it('should return false when count is null', () => {
        const factValue = { count: null };

        const result = functionCountOperator.fn(factValue, 3);

        expect(result).toBe(false);
    });

    it('should return false when count is undefined', () => {
        const factValue = { count: undefined };

        const result = functionCountOperator.fn(factValue, 3);

        expect(result).toBe(false);
    });

    it('should handle zero threshold', () => {
        const factValue = { count: 1 };

        const result = functionCountOperator.fn(factValue, 0);

        expect(result).toBe(true);
    });

    it('should handle negative threshold', () => {
        const factValue = { count: 0 };

        const result = functionCountOperator.fn(factValue, -1);

        expect(result).toBe(true);
    });

    it('should handle zero count', () => {
        const factValue = { count: 0 };

        const result = functionCountOperator.fn(factValue, 1);

        expect(result).toBe(false);
    });

    it('should handle edge case where both are zero', () => {
        const factValue = { count: 0 };

        const result = functionCountOperator.fn(factValue, 0);

        expect(result).toBe(false);
    });
}); 