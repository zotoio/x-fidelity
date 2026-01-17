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
            
            mockFs.existsSync.mockReturnValue(true);
            mockFs.statSync.mockReturnValue({ mtime: { getTime: () => 12345 } } as any);
            mockFs.readFileSync.mockReturnValue(packageJsonContent);
            
            // First call
            await parsePackageJsonLocations('/test/repo');
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
            
            // Second call should use cache
            await parsePackageJsonLocations('/test/repo');
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(1); // Still 1, not 2
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
            
            mockFs.existsSync.mockReturnValue(true);
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
            
            // Should only read the file once
            expect(mockFs.readFileSync).toHaveBeenCalledTimes(1);
        });

        it('should handle mixed found and not found dependencies', async () => {
            const packageJsonContent = `{
  "dependencies": {
    "react": "^18.0.0"
  }
}`;
            
            mockFs.existsSync.mockReturnValue(true);
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
});
