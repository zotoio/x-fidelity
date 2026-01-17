/**
 * Tests for Manifest Location Parser
 * 
 * Tests the parsing of package.json and similar manifest files
 * to find precise line/column locations for dependencies.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
    parsePackageJsonLocations,
    getDependencyLocation,
    enhanceDependencyFailureWithLocation,
    enhanceDependencyFailuresWithLocations,
    clearManifestCache
} from './manifestLocationParser';

// Mock fs and path modules
jest.mock('fs');
jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('manifestLocationParser', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        clearManifestCache();
    });

    describe('parsePackageJsonLocations', () => {
        it('should parse dependencies section and extract line numbers', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.21"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            expect(locations.size).toBe(2);
            
            const reactLocation = locations.get('react');
            expect(reactLocation).toBeDefined();
            expect(reactLocation?.lineNumber).toBe(5);
            expect(reactLocation?.section).toBe('dependencies');
            
            const lodashLocation = locations.get('lodash');
            expect(lodashLocation).toBeDefined();
            expect(lodashLocation?.lineNumber).toBe(6);
            expect(lodashLocation?.section).toBe('dependencies');
        });

        it('should parse devDependencies section', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            expect(locations.size).toBe(2);
            
            const tsLocation = locations.get('typescript');
            expect(tsLocation).toBeDefined();
            expect(tsLocation?.lineNumber).toBe(4);
            expect(tsLocation?.section).toBe('devDependencies');
        });

        it('should handle scoped packages (@scope/package)', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "@x-fidelity/core": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            expect(locations.size).toBe(2);
            
            const coreLocation = locations.get('@x-fidelity/core');
            expect(coreLocation).toBeDefined();
            expect(coreLocation?.lineNumber).toBe(3);
            
            const typesLocation = locations.get('@types/node');
            expect(typesLocation).toBeDefined();
            expect(typesLocation?.lineNumber).toBe(4);
        });

        it('should return empty map when package.json does not exist', async () => {
            mockFs.existsSync.mockReturnValue(false);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            expect(locations.size).toBe(0);
        });

        it('should use cache for repeated calls with same mtime', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^18.0.0"
  }
}`;
            
            // Mock existsSync to only return true for root package.json, not workspace files
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const p = filePath.toString();
                return p.endsWith('package.json') && !p.includes('pnpm-workspace');
            });
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            // First call - reads package.json twice (once for parsing, once for workspace detection)
            // but workspace detection reads the same cached content
            const initialReadCount = mockFs.readFileSync.mock.calls.length;
            await parsePackageJsonLocations('/test/repo');
            const firstCallReads = mockFs.readFileSync.mock.calls.length - initialReadCount;
            
            // Second call should use cache (no additional reads)
            await parsePackageJsonLocations('/test/repo');
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(firstCallReads); // Same count as after first call
        });

        it('should handle peerDependencies section', async () => {
            const packageJsonContent = `{
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            expect(locations.size).toBe(1);
            
            const reactLocation = locations.get('react');
            expect(reactLocation).toBeDefined();
            expect(reactLocation?.section).toBe('peerDependencies');
        });
    });

    describe('getDependencyLocation', () => {
        it('should return location for an existing dependency', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^18.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const location = await getDependencyLocation('/test/repo', 'react');
            
            expect(location).not.toBeNull();
            expect(location?.lineNumber).toBe(3);
        });

        it('should handle transitive dependency paths like parent/child', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "express": "^4.18.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            // express/lodash means lodash is a transitive dep of express
            // We should look for the root dep (express)
            const location = await getDependencyLocation('/test/repo', 'express/lodash');
            
            expect(location).not.toBeNull();
            expect(location?.lineNumber).toBe(3);
        });

        it('should handle scoped package names correctly', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "@x-fidelity/core": "^1.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            // "@x-fidelity/core" should be treated as a single package, not transitive
            const location = await getDependencyLocation('/test/repo', '@x-fidelity/core');
            
            expect(location).not.toBeNull();
            expect(location?.lineNumber).toBe(3);
        });

        it('should handle scoped package with transitive dep correctly', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "@x-fidelity/core": "^1.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            // "@x-fidelity/core/react" means react is a transitive dep of @x-fidelity/core
            // We should look for the root dep (@x-fidelity/core)
            const location = await getDependencyLocation('/test/repo', '@x-fidelity/core/react');
            
            expect(location).not.toBeNull();
            expect(location?.lineNumber).toBe(3);
        });

        it('should return null for non-existent dependency', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^18.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const location = await getDependencyLocation('/test/repo', 'non-existent-package');
            
            expect(location).toBeNull();
        });
    });

    describe('enhanceDependencyFailureWithLocation', () => {
        it('should enhance failure with location info', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^16.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const failure = {
                dependency: 'react',
                currentVersion: '16.14.0',
                requiredVersion: '^18.0.0'
            };
            
            const enhanced = await enhanceDependencyFailureWithLocation(failure, '/test/repo');
            
            expect(enhanced.location).toBeDefined();
            expect(enhanced.location?.lineNumber).toBe(3);
            expect(enhanced.isTransitive).toBe(false);
        });

        it('should mark transitive dependencies correctly', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "express": "^4.18.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const failure = {
                dependency: 'express/lodash',
                currentVersion: '4.17.0',
                requiredVersion: '^4.17.21'
            };
            
            const enhanced = await enhanceDependencyFailureWithLocation(failure, '/test/repo');
            
            expect(enhanced.isTransitive).toBe(true);
            // Should find the root dep location (express)
            expect(enhanced.location).toBeDefined();
        });

        it('should return original failure when location not found', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^18.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const failure = {
                dependency: 'non-existent',
                currentVersion: '1.0.0',
                requiredVersion: '^2.0.0'
            };
            
            const enhanced = await enhanceDependencyFailureWithLocation(failure, '/test/repo');
            
            expect(enhanced.location).toBeUndefined();
            expect(enhanced.dependency).toBe('non-existent');
        });
    });

    describe('enhanceDependencyFailuresWithLocations', () => {
        it('should batch enhance multiple failures efficiently', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^16.0.0",
    "lodash": "^4.0.0"
  }
}`;
            
            // Mock to only return true for root package.json
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const p = filePath.toString();
                return p.endsWith('package.json') && !p.includes('pnpm-workspace');
            });
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const failures = [
                { dependency: 'react', currentVersion: '16.14.0', requiredVersion: '^18.0.0' },
                { dependency: 'lodash', currentVersion: '4.17.0', requiredVersion: '^4.17.21' }
            ];
            
            const enhanced = await enhanceDependencyFailuresWithLocations(failures, '/test/repo');
            
            expect(enhanced).toHaveLength(2);
            expect(enhanced[0].location).toBeDefined();
            expect(enhanced[0].location?.lineNumber).toBe(3);
            expect(enhanced[1].location).toBeDefined();
            expect(enhanced[1].location?.lineNumber).toBe(4);
        });

        it('should handle mixed found and not found dependencies', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^18.0.0"
  }
}`;
            
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const p = filePath.toString();
                return p.endsWith('package.json') && !p.includes('pnpm-workspace');
            });
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const failures = [
                { dependency: 'react', currentVersion: '17.0.0', requiredVersion: '^18.0.0' },
                { dependency: 'unknown-dep', currentVersion: '1.0.0', requiredVersion: '^2.0.0' }
            ];
            
            const enhanced = await enhanceDependencyFailuresWithLocations(failures, '/test/repo');
            
            expect(enhanced).toHaveLength(2);
            expect(enhanced[0].location).toBeDefined();
            expect(enhanced[1].location).toBeUndefined();
        });
    });

    describe('workspace support', () => {
        it('should find dependencies in yarn/npm workspace packages', async () => {
            const rootPackageJson = `{
  "name": "monorepo",
  "workspaces": ["packages/*"],
  "dependencies": {
    "root-dep": "^1.0.0"
  }
}`;
            const workspacePackageJson = `{
  "name": "@test/pkg",
  "dependencies": {
    "workspace-dep": "^2.0.0"
  }
}`;
            
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const p = filePath.toString();
                // Allow root package.json, workspace package.json, packages dir and packages/pkg
                return p === '/test/repo/package.json' || 
                       p === '/test/repo/packages' ||
                       p === '/test/repo/packages/pkg' ||
                       p === '/test/repo/packages/pkg/package.json';
            });
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const p = filePath.toString();
                if (p === '/test/repo/packages/pkg/package.json') {
                    return workspacePackageJson;
                }
                return rootPackageJson;
            });
            mockFs.readdirSync.mockImplementation((dirPath: fs.PathLike, options?: any) => {
                const p = dirPath.toString();
                if (p === '/test/repo/packages') {
                    // Return Dirent-like objects when withFileTypes is used
                    return [{ name: 'pkg', isDirectory: () => true }] as any;
                }
                return [];
            });
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            // Should find deps from both root and workspace package
            expect(locations.get('root-dep')).toBeDefined();
            expect(locations.get('workspace-dep')).toBeDefined();
        });

        it('should find dependencies in pnpm workspace packages', async () => {
            const rootPackageJson = `{
  "name": "monorepo",
  "dependencies": {
    "root-dep": "^1.0.0"
  }
}`;
            const pnpmWorkspaceYaml = `packages:
  - 'packages/*'
`;
            const workspacePackageJson = `{
  "name": "@test/pkg",
  "dependencies": {
    "pnpm-workspace-dep": "^3.0.0"
  }
}`;
            
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const p = filePath.toString();
                return p === '/test/repo/package.json' || 
                       p === '/test/repo/pnpm-workspace.yaml' || 
                       p === '/test/repo/packages' ||
                       p === '/test/repo/packages/pkg' ||
                       p === '/test/repo/packages/pkg/package.json';
            });
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const p = filePath.toString();
                if (p === '/test/repo/pnpm-workspace.yaml') {
                    return pnpmWorkspaceYaml;
                }
                if (p === '/test/repo/packages/pkg/package.json') {
                    return workspacePackageJson;
                }
                return rootPackageJson;
            });
            mockFs.readdirSync.mockImplementation((dirPath: fs.PathLike, options?: any) => {
                const p = dirPath.toString();
                if (p === '/test/repo/packages') {
                    return [{ name: 'pkg', isDirectory: () => true }] as any;
                }
                return [];
            });
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            // Should find deps from both root and workspace package
            expect(locations.get('root-dep')).toBeDefined();
            expect(locations.get('pnpm-workspace-dep')).toBeDefined();
        });

        it('should use root package.json location when dependency exists in both', async () => {
            const rootPackageJson = `{
  "name": "monorepo",
  "workspaces": ["packages/*"],
  "dependencies": {
    "shared-dep": "^1.0.0"
  }
}`;
            const workspacePackageJson = `{
  "name": "@test/pkg",
  "dependencies": {
    "shared-dep": "^2.0.0"
  }
}`;
            
            mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
                const p = filePath.toString();
                return p === '/test/repo/package.json' || 
                       p === '/test/repo/packages' ||
                       p === '/test/repo/packages/pkg' ||
                       p === '/test/repo/packages/pkg/package.json';
            });
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
                const p = filePath.toString();
                if (p === '/test/repo/packages/pkg/package.json') {
                    return workspacePackageJson;
                }
                return rootPackageJson;
            });
            mockFs.readdirSync.mockImplementation((dirPath: fs.PathLike, options?: any) => {
                const p = dirPath.toString();
                if (p === '/test/repo/packages') {
                    return [{ name: 'pkg', isDirectory: () => true }] as any;
                }
                return [];
            });
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            // Should find shared-dep at root location (root takes precedence)
            const sharedDepLocation = locations.get('shared-dep');
            expect(sharedDepLocation).toBeDefined();
            expect(sharedDepLocation?.manifestPath).toBe('/test/repo/package.json');
        });
    });

    describe('resolutions and overrides support', () => {
        it('should parse yarn resolutions section', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  },
  "resolutions": {
    "lodash": "4.17.21",
    "@types/node": "18.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            // react + lodash + @types/node (no duplicates since none have glob patterns)
            expect(locations.size).toBe(3);
            
            const lodashLocation = locations.get('lodash');
            expect(lodashLocation).toBeDefined();
            expect(lodashLocation?.lineNumber).toBe(8);
            expect(lodashLocation?.section).toBe('resolutions');
            
            const typesNodeLocation = locations.get('@types/node');
            expect(typesNodeLocation).toBeDefined();
            expect(typesNodeLocation?.lineNumber).toBe(9);
            expect(typesNodeLocation?.section).toBe('resolutions');
        });

        it('should parse yarn resolutions with glob patterns', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "resolutions": {
    "**/lodash": "4.17.21",
    "react/*": "18.0.0",
    "parent/child": "1.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            // Should store both original and normalized names
            expect(locations.get('**/lodash')).toBeDefined();
            expect(locations.get('lodash')).toBeDefined();
            expect(locations.get('lodash')?.lineNumber).toBe(5);
            
            expect(locations.get('react/*')).toBeDefined();
            expect(locations.get('react')).toBeDefined();
            expect(locations.get('react')?.lineNumber).toBe(6);
            
            expect(locations.get('parent/child')).toBeDefined();
            expect(locations.get('child')).toBeDefined();
            expect(locations.get('child')?.lineNumber).toBe(7);
        });

        it('should parse yarn resolutions with version constraints', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "resolutions": {
    "lodash@^4.0.0": "4.17.21",
    "@scope/package@1.0.0": "2.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            // Should store both original and normalized names
            expect(locations.get('lodash@^4.0.0')).toBeDefined();
            expect(locations.get('lodash')).toBeDefined();
            expect(locations.get('lodash')?.lineNumber).toBe(5);
            
            expect(locations.get('@scope/package@1.0.0')).toBeDefined();
            expect(locations.get('@scope/package')).toBeDefined();
            expect(locations.get('@scope/package')?.lineNumber).toBe(6);
        });

        it('should parse npm overrides section', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  },
  "overrides": {
    "lodash": "4.17.21",
    "minimist": "1.2.6"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            const lodashLocation = locations.get('lodash');
            expect(lodashLocation).toBeDefined();
            expect(lodashLocation?.lineNumber).toBe(8);
            expect(lodashLocation?.section).toBe('overrides');
            
            const minimistLocation = locations.get('minimist');
            expect(minimistLocation).toBeDefined();
            expect(minimistLocation?.lineNumber).toBe(9);
            expect(minimistLocation?.section).toBe('overrides');
        });

        it('should parse pnpm.overrides section', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  },
  "pnpm": {
    "overrides": {
      "lodash": "4.17.21",
      "@types/node": "18.0.0"
    }
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            const lodashLocation = locations.get('lodash');
            expect(lodashLocation).toBeDefined();
            expect(lodashLocation?.lineNumber).toBe(9);
            expect(lodashLocation?.section).toBe('pnpm.overrides');
            
            const typesNodeLocation = locations.get('@types/node');
            expect(typesNodeLocation).toBeDefined();
            expect(typesNodeLocation?.lineNumber).toBe(10);
            expect(typesNodeLocation?.section).toBe('pnpm.overrides');
        });

        it('should handle all dependency sections together', async () => {
            const packageJsonContent = `{
  "name": "test-package",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  },
  "resolutions": {
    "lodash": "4.17.21"
  },
  "overrides": {
    "minimist": "1.2.6"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            const locations = await parsePackageJsonLocations('/test/repo');
            
            expect(locations.get('react')?.section).toBe('dependencies');
            expect(locations.get('typescript')?.section).toBe('devDependencies');
            expect(locations.get('lodash')?.section).toBe('resolutions');
            expect(locations.get('minimist')?.section).toBe('overrides');
        });
    });
});
