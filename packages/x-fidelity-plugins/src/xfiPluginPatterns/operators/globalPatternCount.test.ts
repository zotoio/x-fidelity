import { globalPatternCount } from './globalPatternCount';

describe('globalPatternCount operator', () => {
    const operator = globalPatternCount.fn;

    describe('threshold comparison', () => {
        it('should return true when count meets threshold', () => {
            const factValue = ['match1', 'match2', 'match3'];
            expect(operator(factValue, { threshold: 3 })).toBe(true);
        });

        it('should return true when count exceeds threshold', () => {
            const factValue = ['match1', 'match2', 'match3', 'match4', 'match5'];
            expect(operator(factValue, { threshold: 3 })).toBe(true);
        });

        it('should return false when count is below threshold', () => {
            const factValue = ['match1', 'match2'];
            expect(operator(factValue, { threshold: 3 })).toBe(false);
        });

        it('should handle zero threshold', () => {
            // Note: threshold of 0 is considered falsy by the implementation
            // and returns false (this is a quirk of the implementation)
            expect(operator([], { threshold: 0 })).toBe(false);
            expect(operator(['item'], { threshold: 0 })).toBe(false);
        });

        it('should handle threshold of 1', () => {
            expect(operator(['single'], { threshold: 1 })).toBe(true);
            expect(operator([], { threshold: 1 })).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should return false for null factValue', () => {
            expect(operator(null, { threshold: 1 })).toBe(false);
        });

        it('should return false for undefined factValue', () => {
            expect(operator(undefined, { threshold: 1 })).toBe(false);
        });

        it('should return false for null threshold', () => {
            expect(operator(['item'], null as any)).toBe(false);
        });

        it('should return false for undefined threshold', () => {
            expect(operator(['item'], undefined as any)).toBe(false);
        });

        it('should return false for missing threshold.threshold', () => {
            expect(operator(['item'], {} as any)).toBe(false);
        });

        it('should handle empty array', () => {
            // Note: threshold of 0 is considered falsy by the implementation
            expect(operator([], { threshold: 0 })).toBe(false);
            expect(operator([], { threshold: 1 })).toBe(false);
        });

        it('should work with large arrays', () => {
            const largeArray = Array(1000).fill('item');
            expect(operator(largeArray, { threshold: 999 })).toBe(true);
            expect(operator(largeArray, { threshold: 1001 })).toBe(false);
        });
    });

    describe('with various array contents', () => {
        it('should work with string arrays', () => {
            const strings = ['file1.ts', 'file2.ts', 'file3.ts'];
            expect(operator(strings, { threshold: 2 })).toBe(true);
        });

        it('should work with object arrays', () => {
            const objects = [{ path: 'a' }, { path: 'b' }];
            expect(operator(objects, { threshold: 2 })).toBe(true);
        });

        it('should work with mixed type arrays', () => {
            const mixed = ['string', 123, { obj: true }, null];
            expect(operator(mixed, { threshold: 4 })).toBe(true);
        });
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(globalPatternCount.name).toBe('globalPatternCount');
        });

        it('should have description', () => {
            expect(globalPatternCount.description).toBeDefined();
            expect(typeof globalPatternCount.description).toBe('string');
        });

        it('should have fn function', () => {
            expect(typeof globalPatternCount.fn).toBe('function');
        });
    });
});
