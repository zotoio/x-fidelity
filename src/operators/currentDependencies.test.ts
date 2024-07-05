import { logger } from '../utils/logger';
import { currentDependencies } from './currentDependencies';

describe('currentDependencies', () => {
    it('returns true when filePath is not yarn.lock', () => {
        const filePath = 'notYarn.lock';
        const dependencyData = {};
        expect(currentDependencies.fn(filePath, JSON.stringify(dependencyData))).toBe(true);
    });

    it('returns true when all dependencies are up-to-date', () => {
        const filePath = 'yarn.lock';
        const dependencyData = {
            installedDependencyVersions: [
                { dep: 'dep1', ver: '2.0.0', min: '1.0.0' },
                { dep: 'dep2', ver: '3.0.0', min: '2.0.0' }
            ]
        };
        expect(currentDependencies.fn(filePath, dependencyData)).toBe(true);
    });

    it('returns false when at least one dependency is outdated', () => {
        const filePath = 'yarn.lock';
        const dependencyData = {
            installedDependencyVersions: [
                { dep: 'dep1', ver: '.0.0', min: '1.0.0' },
                { dep: 'dep2', ver: '1.0.0', min: '2.0.0' }
            ]
        };
        expect(currentDependencies.fn(filePath, dependencyData)).toBe(false);
    });

    it('logs an error when at least one dependency is outdated', () => {
        const filePath = 'package.json';
        const dependencyData = {
            installedDependencyVersions: [
                { dep: 'dep1', ver: '1.0.0', min: '1.0.0' },
                { dep: 'dep2', ver: '1.0.0', min: '2.0.0' }
            ]
        };
        const errorSpy = jest.spyOn(logger, 'error');
        currentDependencies.fn(filePath, dependencyData);
        expect(errorSpy).toHaveBeenCalled();
    });
});
