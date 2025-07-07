import { customOperator } from './customOperator';

describe('customOperator', () => {
    it('should evaluate equality correctly', () => {
        expect(customOperator.fn({ value: 'test' }, 'test')).toBe(true);
        expect(customOperator.fn({ value: 'test' }, 'different')).toBe(false);
        expect(customOperator.fn({ value: 123 }, 123)).toBe(true);
        expect(customOperator.fn({ value: null }, null)).toBe(false); // null is falsy
    });

    it('should handle edge cases', () => {
        expect(customOperator.fn({ value: '' }, '')).toBe(false); // empty string is falsy
        expect(customOperator.fn({ value: 0 }, 0)).toBe(false); // 0 is falsy
        expect(customOperator.fn({ value: 'test' }, 'test')).toBe(true); // non-falsy values work
        expect(customOperator.fn(null, 'anything')).toBe(false); // null factValue
        expect(customOperator.fn({ someOtherProp: 'test' }, 'test')).toBe(false); // missing value property
        expect(customOperator.fn({ value: undefined }, undefined)).toBe(false); // undefined is falsy
    });
});
