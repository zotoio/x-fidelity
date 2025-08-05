import { outdatedFramework } from './outdatedFramework';
import { DependencyFailure } from '@x-fidelity/types';

describe('outdatedFramework operator', () => {
    it('should return true when dependency failures are found', () => {
        const dependencyFailures: DependencyFailure[] = [
            { dependency: 'react', currentVersion: '16.0.0', requiredVersion: '18.0.0' },
            { dependency: 'vue', currentVersion: '2.0.0', requiredVersion: '3.0.0' }
        ];

        const result = outdatedFramework.fn(dependencyFailures);
        expect(result).toBe(true);
    });

    it('should return false when no dependency failures are found', () => {
        const noDependencyFailures: DependencyFailure[] = [];

        const result = outdatedFramework.fn(noDependencyFailures);
        expect(result).toBe(false);
    });

    it('should return false when factValue is null', () => {
        const result = outdatedFramework.fn(null as any);
        expect(result).toBe(false);
    });

    it('should return false when factValue is undefined', () => {
        const result = outdatedFramework.fn(undefined as any);
        expect(result).toBe(false);
    });

    it('should return false when factValue is not an array', () => {
        const result = outdatedFramework.fn('not an array' as any);
        expect(result).toBe(false);
    });

    it('should return false when factValue is an object but not an array', () => {
        const result = outdatedFramework.fn({ dependency: 'react' } as any);
        expect(result).toBe(false);
    });

    it('should handle single dependency failure', () => {
        const singleFailure: DependencyFailure[] = [
            { dependency: 'react', currentVersion: '16.0.0', requiredVersion: '18.0.0' }
        ];

        const result = outdatedFramework.fn(singleFailure);
        expect(result).toBe(true);
    });

    it('should handle errors gracefully and return false', () => {
        // Create a problematic object that would cause issues during processing
        const problematicValue = {
            get length() {
                throw new Error('Length access error');
            }
        };

        const result = outdatedFramework.fn(problematicValue as any);
        expect(result).toBe(false);
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(outdatedFramework.name).toBe('outdatedFramework');
        });

        it('should have appropriate description', () => {
            expect(outdatedFramework.description).toBe('Checks if project uses outdated framework versions');
        });
    });
});

// Additional tests for edge cases and robustness

describe('outdatedFramework operator - edge cases', () => {
    it('should handle empty array', () => {
        const result = outdatedFramework.fn([]);
        expect(result).toBe(false);
    });

    it('should handle array with non-object elements', () => {
        const result = outdatedFramework.fn([1, 'string', null] as any[]);
        expect(result).toBe(false);
    });

    it('should handle array with objects that are not dependency failures', () => {
        const result = outdatedFramework.fn([{ name: 'test' }, { value: 42 }] as any[]);
        expect(result).toBe(false);
    });

    it('should handle large number of dependency failures', () => {
        const largeFailures: DependencyFailure[] = Array.from({ length: 1000 }, (_, i) => ({
            dependency: `dep-${i}`,
            currentVersion: '1.0.0',
            requiredVersion: '2.0.0'
        }));

        const result = outdatedFramework.fn(largeFailures);
        expect(result).toBe(true);
    });

    it('should handle large number of valid dependencies', () => {
        const largeValid: DependencyFailure[] = Array.from({ length: 1000 }, (_, i) => ({
            dependency: `dep-${i}`,
            currentVersion: '2.0.0',
            requiredVersion: '2.0.0'
        }));

        const result = outdatedFramework.fn(largeValid);
        expect(result).toBe(false);
    });
});
