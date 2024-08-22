import * as repoDependencyFacts from './repoDependencyFacts';
import { execSync } from 'child_process';
import fs from 'fs';
import { Almanac } from 'json-rules-engine';
import { LocalDependencies, MinimumDepVersions } from '../types/typeDefs';

jest.mock('child_process');
jest.mock('fs');
jest.mock('../utils/logger');
jest.mock('../core/cli', () => ({
    options: {
        dir: '/mock/dir'
    }
}));

describe('repoDependencyFacts', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('collectLocalDependencies', () => {
        it('should collect Yarn dependencies when yarn.lock exists', () => {
            (fs.existsSync as jest.Mock).mockImplementation((filePath) => filePath.includes('yarn.lock'));
            (execSync as jest.Mock).mockReturnValue(JSON.stringify({
                data: {
                    trees: [
                        { name: 'package1@1.0.0', children: [{ name: 'subpackage1@0.1.0' }] },
                        { name: 'package2@2.0.0' }
                    ]
                }
            }));

            const result = repoDependencyFacts.collectLocalDependencies();

            expect(result).toEqual([
                { name: 'package1', version: '1.0.0', dependencies: [{ name: 'subpackage1', version: '0.1.0' }] },
                { name: 'package2', version: '2.0.0' }
            ]);
        });

        it('should collect NPM dependencies when package-lock.json exists', () => {
            (fs.existsSync as jest.Mock).mockImplementation((filePath) => filePath.includes('package-lock.json'));
            (execSync as jest.Mock).mockReturnValue(JSON.stringify({
                dependencies: {
                    package1: { version: '1.0.0', dependencies: { subpackage1: { version: '0.1.0' } } },
                    package2: { version: '2.0.0' }
                }
            }));

            const result = repoDependencyFacts.collectLocalDependencies();

            expect(result).toEqual([
                { name: 'package1', version: '1.0.0', dependencies: [{ name: 'subpackage1', version: '0.1.0' }] },
                { name: 'package2', version: '2.0.0' }
            ]);
        });

        it('should throw an error when no supported lock file is found', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            expect(() => repoDependencyFacts.collectLocalDependencies()).toThrow('Unsupported package manager');
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

    });

    describe('semverValid', () => {
        it('should return true for valid version comparisons', () => {
            expect(repoDependencyFacts.semverValid('2.0.0', '^1.0.0')).toBe(false);
            expect(repoDependencyFacts.semverValid('1.5.0', '1.0.0 - 2.0.0')).toBe(true);
            expect(repoDependencyFacts.semverValid('1.0.0', '1.0.0')).toBe(true);
            expect(repoDependencyFacts.semverValid('2.0.0', '>=1.0.0')).toBe(true);
        });

        it('should return false for invalid version comparisons', () => {
            expect(repoDependencyFacts.semverValid('1.0.0', '^2.0.0')).toBe(false);
            expect(repoDependencyFacts.semverValid('3.0.0', '1.0.0 - 2.0.0')).toBe(false);
            expect(repoDependencyFacts.semverValid('0.9.0', '>=1.0.0')).toBe(false);
        });

        it('should handle complex version ranges', () => {
            expect(repoDependencyFacts.semverValid('1.2.3', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
            expect(repoDependencyFacts.semverValid('2.5.0', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
            expect(repoDependencyFacts.semverValid('5.5.5', '1.x || >=2.5.0 || 5.0.0 - 7.2.3')).toBe(true);
            expect(repoDependencyFacts.semverValid('8.0.0', '1.x || >=9.5.0 || 5.0.0 - 7.2.3')).toBe(false);
        });

        it('should return true for empty strings', () => {
            expect(repoDependencyFacts.semverValid('', '')).toBe(true);
        });

        it('should return false for invalid input', () => {
            expect(repoDependencyFacts.semverValid('not-a-version', '1.0.0')).toBe(false);
            expect(repoDependencyFacts.semverValid('1.0.0', 'not-a-range')).toBe(false);
        });
    });
});
