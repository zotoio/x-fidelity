import { globalPatternRatio } from './globalPatternRatio';

describe('globalPatternRatio operator', () => {
    const operator = globalPatternRatio.fn;

    describe('ratio calculation with gte comparison', () => {
        it('should return true when ratio meets threshold', () => {
            // 5 items with total of 10 = 50% ratio, threshold 0.5
            const factValue = Array(5).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0.5, comparison: 'gte' })).toBe(true);
        });

        it('should return true when ratio exceeds threshold', () => {
            const factValue = Array(8).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0.5, comparison: 'gte' })).toBe(true);
        });

        it('should return false when ratio is below threshold', () => {
            const factValue = Array(3).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0.5, comparison: 'gte' })).toBe(false);
        });
    });

    describe('ratio calculation with lte comparison', () => {
        it('should return true when ratio is at or below threshold', () => {
            const factValue = Array(3).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0.5, comparison: 'lte' })).toBe(true);
        });

        it('should return false when ratio exceeds threshold', () => {
            const factValue = Array(8).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0.5, comparison: 'lte' })).toBe(false);
        });
    });

    describe('default comparison', () => {
        it('should default to gte comparison when not specified', () => {
            const factValue = Array(5).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0.5 })).toBe(true);
        });
    });

    describe('ratio without total property', () => {
        it('should use array length as total if total not specified', () => {
            // 3 items / 3 total = 100% ratio
            const factValue = ['a', 'b', 'c'];
            expect(operator(factValue, { value: 1.0, comparison: 'gte' })).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should return false for null factValue', () => {
            expect(operator(null, { value: 0.5 })).toBe(false);
        });

        it('should return false for undefined factValue', () => {
            expect(operator(undefined, { value: 0.5 })).toBe(false);
        });

        it('should return false for non-array factValue', () => {
            expect(operator('string', { value: 0.5 })).toBe(false);
            expect(operator(123, { value: 0.5 })).toBe(false);
            expect(operator({}, { value: 0.5 })).toBe(false);
        });

        it('should return false for null threshold', () => {
            expect(operator(['item'], null as any)).toBe(false);
        });

        it('should return false for undefined threshold', () => {
            expect(operator(['item'], undefined as any)).toBe(false);
        });

        it('should return false for non-object threshold', () => {
            expect(operator(['item'], 'string' as any)).toBe(false);
            expect(operator(['item'], 123 as any)).toBe(false);
        });

        it('should return false for non-number threshold value', () => {
            expect(operator(['item'], { value: 'string' } as any)).toBe(false);
            expect(operator(['item'], { value: null } as any)).toBe(false);
        });

        it('should handle empty array', () => {
            const emptyArray: any[] = [];
            (emptyArray as any).total = 10;
            // 0/10 = 0%, should be less than 0.5
            expect(operator(emptyArray, { value: 0.5, comparison: 'gte' })).toBe(false);
            expect(operator(emptyArray, { value: 0, comparison: 'gte' })).toBe(true);
        });

        it('should handle 100% ratio', () => {
            const factValue = Array(10).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 1.0, comparison: 'gte' })).toBe(true);
        });

        it('should handle 0% threshold', () => {
            const factValue = Array(5).fill('item');
            (factValue as any).total = 10;
            expect(operator(factValue, { value: 0, comparison: 'gte' })).toBe(true);
        });
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(globalPatternRatio.name).toBe('globalPatternRatio');
        });

        it('should have description', () => {
            expect(globalPatternRatio.description).toBeDefined();
            expect(typeof globalPatternRatio.description).toBe('string');
        });

        it('should have fn function', () => {
            expect(typeof globalPatternRatio.fn).toBe('function');
        });
    });
});
