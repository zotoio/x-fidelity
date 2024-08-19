import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { collectLocalDependencies, getDependencyVersionFacts, findPropertiesInTree, repoDependencyAnalysis } from './repoDependencyFacts';
import { logger } from '../utils/logger';
import { Almanac } from 'json-rules-engine';
import * as semver from 'semver';
import { LocalDependencies } from '../types/typeDefs';

jest.mock('./repoDependencyFacts', () => ({
    ...jest.requireActual('./repoDependencyFacts'),
    collectLocalDependencies: jest.fn(),
}));

jest.mock('child_process', () => ({
    execSync: jest.fn(),
}));

jest.mock('fs', () => ({
    existsSync: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
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

    it('should call collectYarnDependencies when yarn.lock exists', () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
            return path.basename(filePath) === 'yarn.lock';
        });
        const mockYarnOutput = { data: { trees: [{ name: 'package@1.0.0' }] } };
        (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify(mockYarnOutput)));

        const result = collectLocalDependencies();
        expect(result).toEqual([{ name: 'package', version: '1.0.0' }]);
        expect(execSync).toHaveBeenCalledWith('yarn list --json --cwd /mock/dir');
    });

    it('should call collectNpmDependencies when package-lock.json exists', () => {
        (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
            return path.basename(filePath) === 'package-lock.json';
        });
        const mockNpmOutput = { dependencies: { 'package': { version: '1.0.0' } } };
        (execSync as jest.Mock).mockReturnValue(Buffer.from(JSON.stringify(mockNpmOutput)));

        const result = collectLocalDependencies();
        expect(result).toEqual([]);
        expect(execSync).toHaveBeenCalledWith('npm ls -a --json --prefix /mock/dir');
    });

    it('should throw an error when no lock file is found', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        expect(() => collectLocalDependencies()).toThrow('Unsupported package manager');
        expect(logger.error).toHaveBeenCalledWith('No yarn.lock or package-lock.json found');
    });
});

describe('getDependencyVersionFacts', () => {
    it('should return installed dependency versions correctly', async () => {
        
        (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
            return path.basename(filePath) === 'package-lock.json';
        });
        
        const mockLocalDependencies: LocalDependencies[] = [
            { name: 'commander', version: '2.0.0' },
            { name: 'nodemon', version: '3.9.0' }
        ];
        (collectLocalDependencies as jest.Mock).mockReturnValue(mockLocalDependencies);
        
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
        (collectLocalDependencies as jest.Mock).mockReturnValue([]);
        
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
        const depGraph: LocalDependencies[] = [
            {
                name: 'root',
                version: '1.0.0',
                dependencies: [
                    { name: 'commander', version: '2.0.0' },
                    { name: 'nodemon', version: '3.9.0' }
                ]
            }
        ];
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'root/commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'root/nodemon', ver: '3.9.0', min: '^3.9.0' }
        ]);
    });

    it('should handle nested dependencies correctly', () => {
        const depGraph: LocalDependencies[] = [
            {
                name: 'root',
                version: '1.0.0',
                dependencies: [
                    {
                        name: 'commander',
                        version: '2.0.0',
                        dependencies: [
                            { name: 'nodemon', version: '3.9.0' }
                        ]
                    }
                ]
            }
        ];
        const minVersions = { commander: '^2.0.0', nodemon: '^3.9.0' };

        const result = findPropertiesInTree(depGraph, minVersions);
        expect(result).toEqual([
            { dep: 'root/commander', ver: '2.0.0', min: '^2.0.0' },
            { dep: 'root/commander/nodemon', ver: '3.9.0', min: '^3.9.0' }
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

jest.mock('semver', () => ({
    gtr: jest.fn(),
    Range: jest.fn()
}));

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
jest.mock('semver', () => ({
    gtr: jest.fn(),
    Range: jest.fn()
}));

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
