import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';

// Mock the core module
jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    },
    isPathInside: jest.fn((path: string, structure: any) => {
        // Simple mock implementation - checks if path starts with any allowed prefix
        if (!structure || !structure.allowedPaths) return false;
        return structure.allowedPaths.some((allowed: string) => path.startsWith(allowed));
    }),
    REPO_GLOBAL_CHECK: {},
    options: {}
}));

describe('nonStandardDirectoryStructure operator', () => {
    const operator = nonStandardDirectoryStructure.fn;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('basic functionality', () => {
        it('should return true when files are outside standard structure', () => {
            const { isPathInside } = require('@x-fidelity/core');
            isPathInside.mockReturnValue(false);

            const files = [
                { filePath: '/project/nonstandard/file.ts' }
            ];
            const structure = { allowedPaths: ['/project/src'] };
            
            expect(operator(files, structure)).toBe(true);
        });

        it('should return false when all files are within standard structure', () => {
            const { isPathInside } = require('@x-fidelity/core');
            isPathInside.mockReturnValue(true);

            const files = [
                { filePath: '/project/src/file.ts' },
                { filePath: '/project/src/utils/helper.ts' }
            ];
            const structure = { allowedPaths: ['/project/src'] };
            
            expect(operator(files, structure)).toBe(false);
        });

        it('should return true when some files are outside standard structure', () => {
            const { isPathInside } = require('@x-fidelity/core');
            isPathInside
                .mockReturnValueOnce(true)  // First file inside
                .mockReturnValueOnce(false); // Second file outside

            const files = [
                { filePath: '/project/src/file.ts' },
                { filePath: '/project/random/file.ts' }
            ];
            const structure = { allowedPaths: ['/project/src'] };
            
            expect(operator(files, structure)).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should return false for null factValue', () => {
            expect(operator(null, { allowedPaths: ['/src'] })).toBe(false);
        });

        it('should return false for undefined factValue', () => {
            expect(operator(undefined, { allowedPaths: ['/src'] })).toBe(false);
        });

        it('should return false for non-array factValue', () => {
            expect(operator('string', { allowedPaths: ['/src'] })).toBe(false);
            expect(operator(123, { allowedPaths: ['/src'] })).toBe(false);
            expect(operator({}, { allowedPaths: ['/src'] })).toBe(false);
        });

        it('should return false for null standardStructure', () => {
            const files = [{ filePath: '/project/file.ts' }];
            expect(operator(files, null)).toBe(false);
        });

        it('should return false for undefined standardStructure', () => {
            const files = [{ filePath: '/project/file.ts' }];
            expect(operator(files, undefined)).toBe(false);
        });

        it('should return false for non-object standardStructure', () => {
            const files = [{ filePath: '/project/file.ts' }];
            expect(operator(files, 'string')).toBe(false);
            expect(operator(files, 123)).toBe(false);
        });

        it('should handle empty file array', () => {
            const { isPathInside } = require('@x-fidelity/core');
            isPathInside.mockReturnValue(true);
            
            expect(operator([], { allowedPaths: ['/src'] })).toBe(false);
        });

        it('should handle files without filePath property', () => {
            const { isPathInside } = require('@x-fidelity/core');
            isPathInside.mockReturnValue(false);

            const files = [
                { path: '/project/file.ts' }, // Missing filePath, has path instead
                { name: 'file.ts' } // Missing filePath entirely
            ];
            
            // Should handle gracefully - undefined paths checked against structure
            const result = operator(files, { allowedPaths: ['/src'] });
            expect(typeof result).toBe('boolean');
        });
    });

    describe('error handling', () => {
        it('should return false when isPathInside throws error', () => {
            const { isPathInside } = require('@x-fidelity/core');
            isPathInside.mockImplementation(() => {
                throw new Error('Test error');
            });

            const files = [{ filePath: '/project/file.ts' }];
            const structure = { allowedPaths: ['/src'] };
            
            expect(operator(files, structure)).toBe(false);
        });
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(nonStandardDirectoryStructure.name).toBe('nonStandardDirectoryStructure');
        });

        it('should have description', () => {
            expect(nonStandardDirectoryStructure.description).toBeDefined();
            expect(typeof nonStandardDirectoryStructure.description).toBe('string');
        });

        it('should have fn function', () => {
            expect(typeof nonStandardDirectoryStructure.fn).toBe('function');
        });
    });
});
