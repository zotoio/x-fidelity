import { hasFilesWithMultiplePatterns } from './hasFilesWithMultiplePatterns';

describe('hasFilesWithMultiplePatterns operator', () => {
    const operator = hasFilesWithMultiplePatterns.fn;

    describe('basic functionality', () => {
        it('should return true when array has elements', () => {
            expect(operator(['file1.ts', 'file2.ts'])).toBe(true);
        });

        it('should return true when array has single element', () => {
            expect(operator(['file1.ts'])).toBe(true);
        });

        it('should return false when array is empty', () => {
            expect(operator([])).toBe(false);
        });
    });

    describe('with file objects', () => {
        it('should return true with file object arrays', () => {
            const files = [
                { filePath: '/path/file1.ts', matches: ['pattern1', 'pattern2'] },
                { filePath: '/path/file2.ts', matches: ['pattern1'] }
            ];
            expect(operator(files)).toBe(true);
        });

        it('should return true with single file having multiple patterns', () => {
            const files = [
                { filePath: '/path/file.ts', patterns: ['console.log', 'debugger'] }
            ];
            expect(operator(files)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should return false for null factValue', () => {
            expect(operator(null)).toBe(false);
        });

        it('should return false for undefined factValue', () => {
            expect(operator(undefined)).toBe(false);
        });

        it('should return false for non-array factValue', () => {
            expect(operator('string')).toBe(false);
            expect(operator(123)).toBe(false);
            expect(operator({})).toBe(false);
            expect(operator(true)).toBe(false);
        });

        it('should work with large arrays', () => {
            const largeArray = Array(1000).fill({ filePath: 'file.ts' });
            expect(operator(largeArray)).toBe(true);
        });

        it('should work with arrays containing various types', () => {
            const mixed = [null, undefined, 'string', 123, {}];
            expect(operator(mixed)).toBe(true);
        });
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(hasFilesWithMultiplePatterns.name).toBe('hasFilesWithMultiplePatterns');
        });

        it('should have description', () => {
            expect(hasFilesWithMultiplePatterns.description).toBeDefined();
            expect(typeof hasFilesWithMultiplePatterns.description).toBe('string');
        });

        it('should have fn function', () => {
            expect(typeof hasFilesWithMultiplePatterns.fn).toBe('function');
        });
    });
});
