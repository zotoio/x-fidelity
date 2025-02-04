import { customOperator } from './customOperator';

describe('customOperator', () => {
    it('should evaluate equality correctly', () => {
        expect(customOperator.fn('test', 'test')).toBe(true);
        expect(customOperator.fn('test', 'different')).toBe(false);
        expect(customOperator.fn(123, 123)).toBe(true);
        expect(customOperator.fn(null, null)).toBe(true);
        expect(customOperator.fn(undefined, undefined)).toBe(true);
    });

    it('should handle edge cases', () => {
        expect(customOperator.fn('', '')).toBe(true);
        expect(customOperator.fn(0, '0')).toBe(false); // Strict equality
        expect(customOperator.fn([], [])).toBe(false); // Reference equality
        expect(customOperator.fn({}, {})).toBe(false); // Reference equality
    });
});
