import { logger } from '../utils/logger';
import { outdatedFramework } from './outdatedFramework';

describe('outdatedFramework', () => {
    it('returns false when filePath is not yarn.lock', () => {
        const filePath = 'notYarn.lock';
        const dependencyData = {};
        expect(outdatedFramework.fn(filePath, JSON.stringify(dependencyData))).toBe(false);
    });

    it('returns false when all dependencies are up-to-date', () => {
        const filePath = 'yarn.lock';
        const dependencyData = {
            installedDependencyVersions: [
                { dep: 'dep1', ver: '2.0.0', min: '1.0.0' },
                { dep: 'dep2', ver: '3.0.0', min: '2.0.0' }
            ]
        };
        expect(outdatedFramework.fn(filePath, dependencyData)).toBe(false);
    });

    it('returns true when at least one dependency is outdated', () => {
        const filePath = 'yarn.lock';
        const dependencyData = {
            installedDependencyVersions: [
                { dep: 'dep1', ver: '.0.0', min: '1.0.0' },
                { dep: 'dep2', ver: '1.0.0', min: '2.0.0' }
            ]
        };
        expect(outdatedFramework.fn(filePath, dependencyData)).toBe(true);
    });

    it('logs an error when at least one dependency is outdated', () => {
        const filePath = 'yarn.lock';
        const dependencyData = {
            installedDependencyVersions: [
                { dep: 'dep1', ver: '1.0.0', min: '1.0.0' },
                { dep: 'dep2', ver: '1.0.0', min: '2.0.0' }
            ]
        };
        const errorSpy = jest.spyOn(logger, 'error');
        outdatedFramework.fn(filePath, dependencyData);
        expect(errorSpy).toHaveBeenCalled();
    });
});