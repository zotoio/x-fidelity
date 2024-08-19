import { execSync } from 'child_process';
import { collectLocalDependencies, getDependencyVersionFacts, findPropertiesInTree, repoDependencyAnalysis } from './repoDependencyFacts';
import { logger } from '../utils/logger';
import { Almanac } from 'json-rules-engine';
import * as semver from 'semver';
import { LocalDependencies } from '../types/typeDefs';

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
    },
}));

jest.mock('../core/cli', () => ({
    options: {
        dir: '/mock/dir'
    }
}));

describe('collectLocalDependencies', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return parsed JSON result when yarn execSync succeeds', () => {
        const mockResult = JSON.stringify({ dependencies: {} });
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockResult));

        const result = collectLocalDependencies();
        expect(result).toEqual({ dependencies: {} });
        expect(execSync).toHaveBeenCalledWith('yarn list --json --depth=0 --cwd /mock/dir');
    });

    it('should try npm when yarn fails', () => {
        (execSync as jest.Mock)
            .mockImplementationOnce(() => { throw new Error('yarn error'); })
            .mockReturnValueOnce(Buffer.from(JSON.stringify({ dependencies: {} })));

        const result = collectLocalDependencies();
        expect(result).toEqual({ dependencies: {} });
        expect(execSync).toHaveBeenCalledWith('yarn list --json --depth=0 --cwd /mock/dir');
        expect(execSync).toHaveBeenCalledWith('npm ls -a --json --prefix /mock/dir');
    });

    it('should log error and throw when both yarn and npm fail', () => {
        (execSync as jest.Mock).mockImplementation(() => { throw new Error('command error'); });

        expect(() => collectLocalDependencies()).toThrow();
        expect(logger.error).toHaveBeenCalledTimes(2);
    });
});

describe('getDependencyVersionFacts', () => {
    it('should return installed dependency versions correctly', async () => {
        const mockLocalDependencies = { dependencies: { commander: { version: '2.0.0' }, nodemon: { version: '3.9.0' } } };
        jest.spyOn(global, collectLocalDependencies as any).mockReturnValue(mockLocalDependencies);
        
        const mockArchetypeConfig = {
            config: {
                minimumDependencyVersions: { commander: '^2.0.0', nodemon: '^3.9.0' }
            }
        };
        
        const result = await getDependencyVersionFacts(mockArchetypeConfig as any);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should return an empty array if no local dependencies found', async () => {
        jest.spyOn(global, collectLocalDependencies as any).mockReturnValue(null);
        
        const mockArchetypeConfig = {
            config: {
                minimumDependencyVersions: { commander: '^2.0.0', nodemon: '^3.9.0' }
            }
        };
        
        const result = await getDependencyVersionFacts(mockArchetypeConfig as any);
        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith('getDependencyVersionFacts: no local dependencies found');
    });
});

describe('findPropertiesInTree', () => {
    it('should find properties in the tree correctly', () => {
        const depGraph: LocalDependencies = {
            dependencies: {
                commander: { version: '2.0.0' },
                nodemon: { version: '3.9.0' }
            }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should handle nested dependencies correctly', () => {
        const depGraph: LocalDependencies = {
            dependencies: {
                commander: { 
                    version: '2.0.0',
                    dependencies: {
                        nodemon: { version: '3.9.0' }
                    }
                }
            }
        };
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });
});

describe('repoDependencyAnalysis', () => {
    let mockAlmanac: Almanac;

    beforeEach(() => {
        mockAlmanac = {
            factValue: jest.fn(),
            addRuntimeFact: jest.fn(),
        } as unknown as Almanac;
    });

    it('should return empty result for non-REPO_GLOBAL_CHECK files', async () => {
        (mockAlmanac.factValue as jest.Mock).mockResolvedValueOnce({ fileName: 'someFile.js' });
        
        const result = await repoDependencyAnalysis({}, mockAlmanac);
        expect(result).toEqual({ result: [] });
    });

    it('should analyze dependencies correctly', async () => {
        (mockAlmanac.factValue as jest.Mock)
            .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' })
            .mockResolvedValueOnce({
                installedDependencyVersions: [
                    { dep: 'outdated', ver: '1.0.0', min: '^2.0.0' },
                    { dep: 'uptodate', ver: '3.0.0', min: '^2.0.0' }
                ]
            });

        jest.spyOn(semver, 'gtr').mockImplementation((version, range) => {
            return version === '3.0.0';  // Only 'uptodate' should be greater than required
        });

        const result = await repoDependencyAnalysis({ resultFact: 'testResult' }, mockAlmanac);
        
        expect(result).toEqual({
            result: [
                { dependency: 'outdated', currentVersion: '1.0.0', requiredVersion: '^2.0.0' }
            ]
        });
        expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('testResult', result);
    });

    it('should handle errors gracefully', async () => {
        (mockAlmanac.factValue as jest.Mock)
            .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' })
            .mockRejectedValueOnce(new Error('Test error'));

        const result = await repoDependencyAnalysis({}, mockAlmanac);
        
        expect(result).toEqual({ result: [] });
        expect(logger.error).toHaveBeenCalled();
    });
});

