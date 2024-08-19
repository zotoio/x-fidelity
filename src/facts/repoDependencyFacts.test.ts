import { jest } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as semver from 'semver';
import { Almanac } from 'json-rules-engine';
import {
  collectLocalDependencies,
  getDependencyVersionFacts,
  findPropertiesInTree,
  repoDependencyAnalysis
} from './repoDependencyFacts';
import { LocalDependencies, ArchetypeConfig, VersionData } from '../types/typeDefs';
import { options } from '../core/cli';
import { FileData } from './repoFilesystemFacts';

jest.mock('fs');
jest.mock('child_process');
jest.mock('../core/cli', () => ({
  options: {
    dir: '/test/dir'
  }
}));

describe('repoDependencyFacts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collectLocalDependencies', () => {
    it('should collect Yarn dependencies when yarn.lock exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((file: unknown) => typeof file === 'string' && file.endsWith('yarn.lock'));
      (execSync as jest.Mock).mockReturnValue(JSON.stringify({
        data: {
          trees: [
            { name: 'package-a@1.0.0', children: [{ name: 'package-b@2.0.0' }] }
          ]
        }
      }));

      const result = collectLocalDependencies();

      expect(result).toEqual([
        { name: 'package-a', version: '1.0.0', dependencies: [{ name: 'package-b', version: '2.0.0' }] }
      ]);
    });

    it('should collect NPM dependencies when package-lock.json exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((file: unknown) => typeof file === 'string' && file.endsWith('package-lock.json'));
      (execSync as jest.Mock).mockReturnValue(JSON.stringify({
        dependencies: {
          'package-a': { version: '1.0.0', dependencies: { 'package-b': { version: '2.0.0' } } }
        }
      }));

      const result = collectLocalDependencies();

      expect(result).toEqual([
        { name: 'package-a', version: '1.0.0', dependencies: [{ name: 'package-b', version: '2.0.0' }] }
      ]);
    });

    it('should throw an error when no lock file is found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      expect(() => collectLocalDependencies()).toThrow('Unsupported package manager');
    });
  });

  describe('getDependencyVersionFacts', () => {
    it('should return installed dependency versions', async () => {
      const mockArchetypeConfig: ArchetypeConfig = {
        name: 'test-archetype',
        rules: [],
        operators: [],
        facts: [],
        config: {
          minimumDependencyVersions: {
            'package-a': '1.0.0',
            'package-b': '2.0.0'
          },
          standardStructure: {},
          blacklistPatterns: [],
          whitelistPatterns: []
        }
      };

      jest.spyOn(global, 'collectLocalDependencies' as any).mockReturnValue([
        { name: 'package-a', version: '1.1.0' },
        { name: 'package-b', version: '2.1.0' },
        { name: 'package-c', version: '3.0.0' }
      ]);

      const result = await getDependencyVersionFacts(mockArchetypeConfig);

      expect(result).toEqual([
        { dep: 'package-a', ver: '1.1.0', min: '1.0.0' },
        { dep: 'package-b', ver: '2.1.0', min: '2.0.0' }
      ]);
    });

    it('should return an empty array when no local dependencies are found', async () => {
      const mockArchetypeConfig: ArchetypeConfig = {
        name: 'test-archetype',
        rules: [],
        operators: [],
        facts: [],
        config: {
          minimumDependencyVersions: {},
          standardStructure: {},
          blacklistPatterns: [],
          whitelistPatterns: []
        }
      };

      jest.spyOn(global, 'collectLocalDependencies' as any).mockReturnValue([]);

      const result = await getDependencyVersionFacts(mockArchetypeConfig);

      expect(result).toEqual([]);
    });
  });

  describe('findPropertiesInTree', () => {
    it('should find properties in a nested dependency tree', () => {
      const depGraph: LocalDependencies[] = [
        {
          name: 'package-a',
          version: '1.0.0',
          dependencies: [
            { name: 'package-b', version: '2.0.0' },
            { name: 'package-c', version: '3.0.0', dependencies: [{ name: 'package-d', version: '4.0.0' }] }
          ]
        }
      ];

      const minVersions = {
        'package-a': '0.9.0',
        'package-c': '2.9.0',
        'package-d': '3.9.0'
      };

      const result = findPropertiesInTree(depGraph, minVersions);

      expect(result).toEqual([
        { dep: 'package-a', ver: '1.0.0', min: '0.9.0' },
        { dep: 'package-a/package-c', ver: '3.0.0', min: '2.9.0' },
        { dep: 'package-a/package-c/package-d', ver: '4.0.0', min: '3.9.0' }
      ]);
    });

    it('should return an empty array when no matching properties are found', () => {
      const depGraph: LocalDependencies[] = [
        { name: 'package-x', version: '1.0.0' },
        { name: 'package-y', version: '2.0.0' }
      ];

      const minVersions = {
        'package-z': '3.0.0'
      };

      const result = findPropertiesInTree(depGraph, minVersions);

      expect(result).toEqual([]);
    });
  });

  describe('repoDependencyAnalysis', () => {
    it('should return an empty result for non-global checks', async () => {
      const almanac = {
        factValue: jest.fn().mockResolvedValue({ fileName: 'not-global-check' } as never)
      } as unknown as Almanac;

      const result = await repoDependencyAnalysis({}, almanac);

      expect(result).toEqual({ result: [] });
    });

    it('should analyze dependencies and return failures', async () => {
      const almanac = {
        factValue: jest.fn().mockImplementation((fact) => {
          if (fact === 'fileData') {
            return Promise.resolve({ fileName: 'REPO_GLOBAL_CHECK' });
          }
          if (fact === 'dependencyData') {
            return Promise.resolve({
              installedDependencyVersions: [
                { dep: 'package-a', ver: '1.0.0', min: '2.0.0' },
                { dep: 'package-b', ver: '3.0.0', min: '2.0.0' }
              ]
            });
          }
        }),
        addRuntimeFact: jest.fn()
      } as unknown as Almanac;

      const result = await repoDependencyAnalysis({ resultFact: 'testFact' }, almanac);

      expect(result).toEqual({
        result: [
          { dependency: 'package-a', currentVersion: '1.0.0', requiredVersion: '2.0.0' }
        ]
      });
      expect(almanac.addRuntimeFact).toHaveBeenCalledWith('testFact', result);
    });

    it('should return an empty result when all dependencies meet requirements', async () => {
      const almanac = {
        factValue: jest.fn().mockImplementation((fact) => {
          if (fact === 'fileData') {
            return Promise.resolve({ fileName: 'REPO_GLOBAL_CHECK' });
          }
          if (fact === 'dependencyData') {
            return Promise.resolve({
              installedDependencyVersions: [
                { dep: 'package-a', ver: '2.1.0', min: '2.0.0' },
                { dep: 'package-b', ver: '3.0.0', min: '2.0.0' }
              ]
            });
          }
        }),
        addRuntimeFact: jest.fn()
      } as unknown as Almanac;

      const result = await repoDependencyAnalysis({ resultFact: 'testFact' }, almanac);

      expect(result).toEqual({ result: [] });
      expect(almanac.addRuntimeFact).toHaveBeenCalledWith('testFact', result);
    });
  });
});
