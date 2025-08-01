import { outdatedFramework } from './outdatedFramework';

describe('outdatedFramework operator', () => {
    it('should return true when dependency failures are found', () => {
        const dependencyFailures = [
            { dependency: 'react', currentVersion: '16.0.0', requiredVersion: '18.0.0' },
            { dependency: 'vue', currentVersion: '2.0.0', requiredVersion: '3.0.0' }
        ];

        const result = outdatedFramework.fn(dependencyFailures);
        expect(result).toBe(true);
    });

    it('should return false when no dependency failures are found', () => {
        const noDependencyFailures: any[] = [];

        const result = outdatedFramework.fn(noDependencyFailures);
        expect(result).toBe(false);
    });

    it('should return false when factValue is null', () => {
        const result = outdatedFramework.fn(null);
        expect(result).toBe(false);
    });

    it('should return false when factValue is undefined', () => {
        const result = outdatedFramework.fn(undefined);
        expect(result).toBe(false);
    });

    it('should return false when factValue is not an array', () => {
        const result = outdatedFramework.fn('not an array');
        expect(result).toBe(false);
    });

    it('should return false when factValue is an object but not an array', () => {
        const result = outdatedFramework.fn({ dependency: 'react' });
        expect(result).toBe(false);
    });

    it('should handle single dependency failure', () => {
        const singleFailure = [
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

        const result = outdatedFramework.fn(problematicValue);
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