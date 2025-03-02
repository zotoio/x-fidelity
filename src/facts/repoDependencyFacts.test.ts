import * as repoDependencyFacts from './repoDependencyFacts';
import fs from 'fs';
import { Almanac } from 'json-rules-engine';
import { LocalDependencies, MinimumDepVersions, VersionData } from '../types/typeDefs';
import { semverValid, normalizePackageName, collectLocalDependencies, getDependencyVersionFacts } from './repoDependencyFacts';
import * as util from 'util';
import { logger } from '../utils/logger';
import { execSync } from 'child_process';

// Create the mock directly in the jest.mock call
jest.mock('child_process', () => ({
    execSync: jest.fn().mockImplementation(() => {
        return Buffer.from(JSON.stringify({
            data: {
                trees: [
                    {
                        name: 'package1@1.0.0',
                        children: [
                            { name: 'dependency1@0.1.0' }
                        ]
                    }
                ]
            }
        }));
    })
}));

// Get a reference to the mock for use in tests
const mockExecSync = require('child_process').execSync as jest.Mock;
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    existsSync: jest.fn(),
    promises: {
        readFile: jest.fn(),
    },
    readFileSync: jest.fn(),
}));
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn()
    }
}));
jest.mock('../core/cli', () => ({
    options: {
        dir: '/mock/dir'
    }
}));
jest.mock('util', () => ({
    ...jest.requireActual('util'),
    promisify: jest.fn().mockImplementation((fn) => {
        // Return a function that returns a promise
        return (...args: any[]) => Promise.resolve(fn(...args));
    })
}));

// Add this line to increase the timeout for all tests in this file
jest.setTimeout(30000); // 30 seconds

describe('repoDependencyFacts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('collectLocalDependencies', () => {
        it('should collect dependencies from yarn.lock', async () => {
            (fs.existsSync as jest.Mock).mockImplementation((path) => {
                return path.includes('yarn.lock');
            });
            
            const mockYarnOutput = {
                data: {
                    trees: [
                        {
                            name: 'package1@1.0.0',
                            children: [
                                { name: 'dependency1@0.1.0' }
                            ]
                        }
                    ]
                }
            };
            
            mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockYarnOutput)));
            
            const result = await collectLocalDependencies();
            
            expect(result).toEqual([
                {
                    name: 'package1',
                    version: '1.0.0',
                    dependencies: [
                        { name: 'dependency1', version: '0.1.0' }
                    ]
                }
            ]);
            expect(execSync).toHaveBeenCalledWith('yarn list --json', expect.any(Object));
        });
        
        it('should collect dependencies from package-lock.json', async () => {
            (fs.existsSync as jest.Mock).mockImplementation((path) => {
                return !path.includes('yarn.lock') && path.includes('package-lock.json');
            });
            
            const mockNpmOutput = {
                dependencies: {
                    'package1': {
                        version: '1.0.0',
                        dependencies: {
                            'dependency1': {
                                version: '0.1.0'
                            }
                        }
                    }
                }
            };
            
            mockExecSync.mockReturnValue(Buffer.from(JSON.stringify(mockNpmOutput)));
            
            const result = await collectLocalDependencies();
            
            expect(result).toEqual([
                {
                    name: 'package1',
                    version: '1.0.0',
                    dependencies: [
                        { name: 'dependency1', version: '0.1.0' }
                    ]
                }
            ]);
            expect(execSync).toHaveBeenCalledWith('npm ls -a --json', expect.any(Object));
        });
        
        it('should handle errors when no lock files are found', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            
            // Mock process.exit to prevent test from exiting
            const originalExit = process.exit;
            process.exit = jest.fn() as any;
            
            try {
                await collectLocalDependencies();
                // If we get here, the function didn't throw, which is a failure
                expect(true).toBe(false); // This will fail the test
            } catch (error) {
                expect((error as Error).message).toContain('No yarn.lock or package-lock.json found');
                expect(logger.error).toHaveBeenCalled();
            } finally {
                // Restore process.exit
                process.exit = originalExit;
            }
        });
        
        it('should handle npm command errors', async () => {
            (fs.existsSync as jest.Mock).mockImplementation((path) => {
                return !path.includes('yarn.lock') && path.includes('package-lock.json');
            });
            
            mockExecSync.mockImplementation(() => {
                throw new Error('ELSPROBLEMS');
            });
            
            await expect(collectLocalDependencies()).rejects.toThrow(/Error determining npm dependencies/);
            expect(logger.error).toHaveBeenCalled();
        });
        
        it('should handle yarn command errors', async () => {
            (fs.existsSync as jest.Mock).mockImplementation((path) => {
                return path.includes('yarn.lock');
            });
            
            mockExecSync.mockImplementation(() => {
                throw new Error('Command failed');
            });
            
            await expect(collectLocalDependencies()).rejects.toThrow(/Error determining yarn dependencies/);
            expect(logger.error).toHaveBeenCalled();
        });
        
        it('should handle JSON parsing errors', async () => {
            (fs.existsSync as jest.Mock).mockImplementation((path) => {
                return path.includes('yarn.lock');
            });
            
            mockExecSync.mockReturnValue(Buffer.from('Invalid JSON'));
            
            await expect(collectLocalDependencies()).rejects.toThrow();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getDependencyVersionFacts', () => {
        it('should return dependency version facts', async () => {
            const mockArchetypeConfig = {
                facts: ['repoDependencyFacts'],
                config: {
                    minimumDependencyVersions: {
                        'package1': '^1.0.0'
                    }
                }
            };
            
            const mockLocalDependencies = [
                {
                    name: 'package1',
                    version: '1.0.0'
                }
            ];
            
            jest.spyOn(repoDependencyFacts, 'collectLocalDependencies').mockResolvedValue(mockLocalDependencies);
            
            const result = await getDependencyVersionFacts(mockArchetypeConfig as any);
            
            expect(result).toEqual([
                { dep: 'package1', ver: '1.0.0', min: '^1.0.0' }
            ]);
        });
        
        it('should return empty array when repoDependencyFacts is not enabled', async () => {
            const mockArchetypeConfig = {
                facts: ['otherFact'],
                config: {
                    minimumDependencyVersions: {}
                }
            };
            
            const result = await getDependencyVersionFacts(mockArchetypeConfig as any);
            
            expect(result).toEqual([]);
            expect(logger.warn).toHaveBeenCalled();
        });
        
        it('should return empty array when no local dependencies are found', async () => {
            const mockArchetypeConfig = {
                facts: ['repoDependencyFacts'],
                config: {
                    minimumDependencyVersions: {}
                }
            };
            
            jest.spyOn(repoDependencyFacts, 'collectLocalDependencies').mockResolvedValue([]);
            
            const result = await getDependencyVersionFacts(mockArchetypeConfig as any);
            
            expect(result).toEqual([]);
            expect(logger.warn).toHaveBeenCalled();
        });
    });

    describe('findPropertiesInTree', () => {
        it('should find properties in a nested dependency tree', () => {
            const depGraph: LocalDependencies[] = [
                {
                    name: 'root1',
                    version: '1.0.0',
                    dependencies: [
                        { name: 'child1', version: '0.1.0' },
                        { 
                            name: 'child2',
                            version: '0.2.0',
                            dependencies: [
                                { name: 'grandchild1', version: '0.0.1' }
                            ]
                        }
                    ]
                },
                { name: 'root2', version: '2.0.0' }
            ];

            const minVersions: MinimumDepVersions = {
                'child1': '^0.1.0',
                'grandchild1': '^0.0.1',
                'root2': '^1.5.0'
            };

            const result = repoDependencyFacts.findPropertiesInTree(depGraph, minVersions);

            expect(result).toEqual([
                { dep: 'root1/child1', ver: '0.1.0', min: '^0.1.0' },
                { dep: 'root1/child2/grandchild1', ver: '0.0.1', min: '^0.0.1' },
                { dep: 'root2', ver: '2.0.0', min: '^1.5.0' }
            ]);
        });

        it('should return an empty array when no matching properties are found', () => {
            const depGraph: LocalDependencies[] = [
                { name: 'package1', version: '1.0.0' },
                { name: 'package2', version: '2.0.0' }
            ];

            const minVersions: MinimumDepVersions = {
                'package3': '^3.0.0'
            };

            const result = repoDependencyFacts.findPropertiesInTree(depGraph, minVersions);

            expect(result).toEqual([]);
        });
        
        it('should handle circular dependencies', () => {
            // Create a circular dependency structure
            const child: LocalDependencies = {
                name: 'child',
                version: '1.0.0'
            };
            
            const parent: LocalDependencies = {
                name: 'parent',
                version: '1.0.0',
                dependencies: [child]
            };
            
            // Create the circular reference
            child.dependencies = [parent];
            
            const depGraph: LocalDependencies[] = [parent];
            
            const minVersions: MinimumDepVersions = {
                'child': '^1.0.0',
                'parent': '^1.0.0'
            };
            
            const result = repoDependencyFacts.findPropertiesInTree(depGraph, minVersions);
            
            // Should find both dependencies without infinite recursion
            expect(result).toEqual([
                { dep: 'parent', ver: '1.0.0', min: '^1.0.0' },
                { dep: 'parent/child', ver: '1.0.0', min: '^1.0.0' }
            ]);
        });
        
        it('should handle namespaced packages', () => {
            const depGraph: LocalDependencies[] = [
                { name: '@scope/package', version: '1.0.0' }
            ];
            
            const minVersions: MinimumDepVersions = {
                '@scope/package': '^1.0.0',
                'scope/package': '^1.0.0'  // Should match both formats
            };
            
            const result = repoDependencyFacts.findPropertiesInTree(depGraph, minVersions);
            
            expect(result).toEqual([
                { dep: '@scope/package', ver: '1.0.0', min: '^1.0.0' }
            ]);
        });
    });

    describe('repoDependencyAnalysis', () => {
        const mockAlmanac: Almanac = {
            factValue: jest.fn(),
            addRuntimeFact: jest.fn(),
        } as unknown as Almanac;

        it('should return an empty result for non-REPO_GLOBAL_CHECK files', async () => {
            (mockAlmanac.factValue as jest.Mock).mockResolvedValueOnce({ fileName: 'some-file.js' });

            const result = await repoDependencyFacts.repoDependencyAnalysis({}, mockAlmanac);

            expect(result).toEqual({ result: [] });
        });

        it('should analyze dependencies for REPO_GLOBAL_CHECK', async () => {
            (mockAlmanac.factValue as jest.Mock)
                .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' })
                .mockResolvedValueOnce({
                    installedDependencyVersions: [
                        { dep: 'package1', ver: '1.0.0', min: '^2.0.0' },
                        { dep: 'package2', ver: '2.0.0', min: '>1.0.0' }
                    ]
                });

            const result = await repoDependencyFacts.repoDependencyAnalysis({ resultFact: 'testResult' }, mockAlmanac);

            expect(result).toEqual({
                result: [
                    { dependency: 'package1', currentVersion: '1.0.0', requiredVersion: '^2.0.0' }
                ]
            });
            expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('testResult', expect.any(Object));
        });
        
        it('should handle errors during analysis', async () => {
            (mockAlmanac.factValue as jest.Mock)
                .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' })
                .mockRejectedValueOnce(new Error('Failed to get dependency data'));
                
            const result = await repoDependencyFacts.repoDependencyAnalysis({ resultFact: 'testResult' }, mockAlmanac);
            
            expect(result).toEqual({ result: [] });
            expect(logger.error).toHaveBeenCalled();
        });
        
        it('should handle invalid semver versions', async () => {
            (mockAlmanac.factValue as jest.Mock)
                .mockResolvedValueOnce({ fileName: 'REPO_GLOBAL_CHECK' })
                .mockResolvedValueOnce({
                    installedDependencyVersions: [
                        { dep: 'package1', ver: 'not-a-version', min: '^2.0.0' },
                        { dep: 'package2', ver: '2.0.0', min: 'not-a-range' }
                    ]
                });
                
            const result = await repoDependencyFacts.repoDependencyAnalysis({ resultFact: 'testResult' }, mockAlmanac);
            
            expect(result.result).toEqual([]);
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('normalizePackageName', () => {
        it('should add @ prefix to non-namespaced packages', () => {
            expect(normalizePackageName('package')).toBe('@package');
        });
        
        it('should not modify already namespaced packages', () => {
            expect(normalizePackageName('@scope/package')).toBe('@scope/package');
        });
    });

    describe('semverValid', () => {
        it('should return true for valid version comparisons', () => {
            expect(semverValid('2.0.0', '>1.0.0')).toBe(true);
            expect(semverValid('1.5.0', '1.0.0 - 2.0.0')).toBe(true);
            expect(semverValid('1.0.0', '1.0.0')).toBe(true);
            expect(semverValid('2.0.0', '>=1.0.0')).toBe(true);
        });
    
        it('should return false for invalid version comparisons', () => {
            expect(semverValid('1.0.0', '^2.0.0')).toBe(false);
            expect(semverValid('3.0.0', '1.0.0 - 2.0.0')).toBe(false);
            expect(semverValid('0.9.0', '>=1.0.0')).toBe(false);
        });
    
        it('should handle complex version ranges', () => {
            expect(semverValid('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
            expect(semverValid('2.5.0', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
            expect(semverValid('5.5.5', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
            expect(semverValid('8.0.0', '1.x || >=9.5.0 || 5.0.0 - 7.2.3')).toBe(false);
        });
    
        it('should handle caret ranges', () => {
            expect(semverValid('1.2.3', '^1.2.3')).toBe(true);
            expect(semverValid('1.3.0', '^1.2.3')).toBe(true);
            expect(semverValid('2.0.0', '^1.2.3')).toBe(false);
        });
    
        it('should handle tilde ranges', () => {
            expect(semverValid('1.2.3', '~1.2.3')).toBe(true);
            expect(semverValid('1.2.9', '~1.2.3')).toBe(true);
            expect(semverValid('1.3.0', '~1.2.3')).toBe(false);
        });
    
        it('should handle x-ranges', () => {
            expect(semverValid('1.2.3', '1.2.x')).toBe(true);
            expect(semverValid('1.2.9', '1.2.x')).toBe(true);
            expect(semverValid('1.3.0', '1.2.x')).toBe(false);
            expect(semverValid('1.2.3', '1.x')).toBe(true);
            expect(semverValid('1.3.0', '1.x')).toBe(true);
            expect(semverValid('2.0.0', '1.x')).toBe(false);
        });
    
        it('should handle star ranges', () => {
            expect(semverValid('1.2.3', '*')).toBe(true);
            expect(semverValid('2.0.0', '*')).toBe(true);
        });
    
        it('should handle greater than and less than ranges', () => {
            expect(semverValid('2.0.0', '>1.2.3')).toBe(true);
            expect(semverValid('1.2.3', '>1.2.3')).toBe(false);
            expect(semverValid('1.2.2', '<1.2.3')).toBe(true);
            expect(semverValid('1.2.3', '<1.2.3')).toBe(false);
        });
    
        it('should handle AND ranges', () => {
            expect(semverValid('1.2.3', '>1.2.2 <1.2.4')).toBe(true);
            expect(semverValid('1.2.4', '>1.2.2 <1.2.4')).toBe(false);
        });
    
        it('should handle OR ranges', () => {
            expect(semverValid('1.2.3', '1.2.3 || 1.2.4')).toBe(true);
            expect(semverValid('1.2.4', '1.2.3 || 1.2.4')).toBe(true);
            expect(semverValid('1.2.5', '1.2.3 || 1.2.4')).toBe(false);
        });
    
        it('should handle pre-release versions', () => {
            expect(semverValid('1.2.3-alpha', '>=1.2.3-alpha')).toBe(true);
            expect(semverValid('1.2.3-beta', '>=1.2.3-alpha')).toBe(true);
            expect(semverValid('1.2.2', '>=1.2.3-alpha')).toBe(false);
            expect(semverValid('1.2.4-ALPHA', '>=1.2.3')).toBe(true);
            expect(semverValid('1.2.4-BETA-abc.4', '>=1.2.3')).toBe(true);
            expect(semverValid('1.2.4-BETA-abc.4', '>=1.2.4-BETA-abc.4')).toBe(true);
            expect(semverValid('1.2.4-BETA-abc.3', '>=1.2.4-BETA-abc.4')).toBe(false);
            expect(semverValid('1.2.4+202410', '>=1.2.4+202409')).toBe(true);
            expect(semverValid('1.2.3+202410', '>=1.2.4+202409')).toBe(false);
            expect(semverValid('1.2.5+202410', '>=1.2.4+202409')).toBe(true);
            expect(semverValid('1.2.5-BETA-abc.3+202410', '>=1.2.4+202409')).toBe(true);
            expect(semverValid('1.2.3-BETA-abc.3+202410', '>=1.2.4+202409')).toBe(false);
            expect(semverValid('1.2.5-BETA-abc.3+202410', '>=1.2.4+202409')).toBe(true);
        });
    
        it('should return true for empty strings', () => {
            expect(semverValid('', '')).toBe(true);
        });
    
        it('should return false for invalid input', () => {
            expect(semverValid('not-a-version', '1.0.0')).toBe(false);
            expect(semverValid('1.0.0', 'not-a-range')).toBe(false);
        });
        
        it('should handle logging for invalid inputs', () => {
            semverValid('invalid-version', '^1.0.0');
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('invalid installed version'));
            
            jest.clearAllMocks();
            
            semverValid('1.0.0', 'invalid-range');
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('invalid required version'));
        });
    });
});
