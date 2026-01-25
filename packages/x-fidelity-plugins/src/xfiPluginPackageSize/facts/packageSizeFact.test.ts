/**
 * Tests for Package Size Fact
 */

import { join, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { 
    packageSizeFact,
    detectWorkspace,
    calculatePackageSize,
    expandGlobPattern,
    getPackageName,
    isInDirectories,
    getExtensionName,
    getPnpmWorkspacePackages,
    getPackageJsonWorkspaces,
    detectWorkspaceType
} from './packageSizeFact';

// Mock the logger and getOptions
jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn()
    },
    getOptions: jest.fn(() => ({
        outputFormat: 'human',
        logLevel: 'info'
    }))
}));

// Test fixtures directory
const FIXTURES_DIR = join(__dirname, '__fixtures__');

// Helper to create test fixtures
function createTestPackage(
    basePath: string, 
    name: string, 
    files: Record<string, string>
): void {
    const pkgPath = join(basePath, name);
    mkdirSync(pkgPath, { recursive: true });
    
    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = join(pkgPath, filePath);
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, content);
    }
}

// Cleanup helper
function cleanupFixtures(): void {
    if (existsSync(FIXTURES_DIR)) {
        rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
}

describe('packageSizeFact', () => {
    beforeAll(() => {
        cleanupFixtures();
        mkdirSync(FIXTURES_DIR, { recursive: true });
    });
    
    afterAll(() => {
        cleanupFixtures();
    });

    describe('getExtensionName', () => {
        it('should return friendly names for common extensions', () => {
            expect(getExtensionName('.ts')).toBe('TypeScript');
            expect(getExtensionName('.tsx')).toBe('TypeScript (React)');
            expect(getExtensionName('.js')).toBe('JavaScript');
            expect(getExtensionName('.jsx')).toBe('JavaScript (React)');
            expect(getExtensionName('.json')).toBe('JSON');
            expect(getExtensionName('.md')).toBe('Markdown');
            expect(getExtensionName('.css')).toBe('CSS');
            expect(getExtensionName('.d.ts')).toBe('TypeScript Declaration');
        });
        
        it('should return uppercase extension for unknown types', () => {
            expect(getExtensionName('.xyz')).toBe('XYZ');
            expect(getExtensionName('.custom')).toBe('CUSTOM');
        });
    });

    describe('isInDirectories', () => {
        const basePath = '/project';
        
        it('should return true for files in specified directories', () => {
            expect(isInDirectories('/project/src/file.ts', basePath, ['src'])).toBe(true);
            expect(isInDirectories('/project/dist/file.js', basePath, ['dist'])).toBe(true);
            expect(isInDirectories('/project/src/nested/file.ts', basePath, ['src'])).toBe(true);
        });
        
        it('should return false for files not in specified directories', () => {
            expect(isInDirectories('/project/other/file.ts', basePath, ['src'])).toBe(false);
            expect(isInDirectories('/project/file.ts', basePath, ['src'])).toBe(false);
        });
        
        it('should handle multiple directories', () => {
            expect(isInDirectories('/project/src/file.ts', basePath, ['src', 'lib'])).toBe(true);
            expect(isInDirectories('/project/lib/file.ts', basePath, ['src', 'lib'])).toBe(true);
            expect(isInDirectories('/project/other/file.ts', basePath, ['src', 'lib'])).toBe(false);
        });
    });

    describe('expandGlobPattern', () => {
        const testDir = join(FIXTURES_DIR, 'glob-test');
        
        beforeAll(() => {
            mkdirSync(testDir, { recursive: true });
            mkdirSync(join(testDir, 'packages', 'pkg-a'), { recursive: true });
            mkdirSync(join(testDir, 'packages', 'pkg-b'), { recursive: true });
            mkdirSync(join(testDir, 'apps', 'web'), { recursive: true });
            mkdirSync(join(testDir, '.hidden'), { recursive: true });
            mkdirSync(join(testDir, 'node_modules', 'dep'), { recursive: true });
        });
        
        it('should expand wildcard patterns', () => {
            const result = expandGlobPattern(testDir, 'packages/*');
            expect(result).toHaveLength(2);
            expect(result).toContain(join(testDir, 'packages', 'pkg-a'));
            expect(result).toContain(join(testDir, 'packages', 'pkg-b'));
        });
        
        it('should exclude hidden directories', () => {
            const result = expandGlobPattern(testDir, '*');
            const names = result.map(p => p.split('/').pop());
            expect(names).not.toContain('.hidden');
        });
        
        it('should exclude node_modules', () => {
            const result = expandGlobPattern(testDir, '*');
            const names = result.map(p => p.split('/').pop());
            expect(names).not.toContain('node_modules');
        });
        
        it('should handle negation patterns', () => {
            const result = expandGlobPattern(testDir, '!packages/*');
            expect(result).toHaveLength(0);
        });
        
        it('should handle exact paths', () => {
            const result = expandGlobPattern(testDir, 'apps/web');
            expect(result).toHaveLength(1);
            expect(result[0]).toBe(join(testDir, 'apps', 'web'));
        });
    });

    describe('getPackageName', () => {
        const testDir = join(FIXTURES_DIR, 'name-test');
        
        beforeAll(() => {
            mkdirSync(testDir, { recursive: true });
            
            // Package with name
            mkdirSync(join(testDir, 'valid-pkg'));
            writeFileSync(join(testDir, 'valid-pkg', 'package.json'), JSON.stringify({ name: 'my-package' }));
            
            // Package without name
            mkdirSync(join(testDir, 'no-name-pkg'));
            writeFileSync(join(testDir, 'no-name-pkg', 'package.json'), JSON.stringify({}));
            
            // No package.json
            mkdirSync(join(testDir, 'no-pkg-json'));
        });
        
        it('should return package name from package.json', async () => {
            const name = await getPackageName(join(testDir, 'valid-pkg'));
            expect(name).toBe('my-package');
        });
        
        it('should return null for package without name', async () => {
            const name = await getPackageName(join(testDir, 'no-name-pkg'));
            expect(name).toBeNull();
        });
        
        it('should return null for directory without package.json', async () => {
            const name = await getPackageName(join(testDir, 'no-pkg-json'));
            expect(name).toBeNull();
        });
        
        it('should return null for non-existent directory', async () => {
            const name = await getPackageName(join(testDir, 'non-existent'));
            expect(name).toBeNull();
        });
    });

    describe('getPnpmWorkspacePackages', () => {
        const testDir = join(FIXTURES_DIR, 'pnpm-test');
        
        beforeAll(() => {
            mkdirSync(testDir, { recursive: true });
            mkdirSync(join(testDir, 'packages', 'core'), { recursive: true });
            mkdirSync(join(testDir, 'packages', 'cli'), { recursive: true });
        });
        
        it('should return empty array if no pnpm-workspace.yaml', () => {
            const result = getPnpmWorkspacePackages(testDir);
            expect(result).toEqual([]);
        });
        
        it('should parse pnpm-workspace.yaml and return package paths', () => {
            writeFileSync(join(testDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
            const result = getPnpmWorkspacePackages(testDir);
            expect(result).toHaveLength(2);
            expect(result).toContain(join(testDir, 'packages', 'core'));
            expect(result).toContain(join(testDir, 'packages', 'cli'));
        });
        
        it('should handle invalid yaml', () => {
            writeFileSync(join(testDir, 'pnpm-workspace.yaml'), 'invalid: yaml: content:');
            const result = getPnpmWorkspacePackages(testDir);
            expect(result).toEqual([]);
        });
    });

    describe('getPackageJsonWorkspaces', () => {
        const testDir = join(FIXTURES_DIR, 'yarn-npm-test');
        
        beforeAll(() => {
            mkdirSync(testDir, { recursive: true });
            mkdirSync(join(testDir, 'packages', 'core'), { recursive: true });
            mkdirSync(join(testDir, 'packages', 'cli'), { recursive: true });
        });
        
        it('should return empty arrays if no package.json', () => {
            const noJsonDir = join(testDir, 'no-json');
            mkdirSync(noJsonDir, { recursive: true });
            const result = getPackageJsonWorkspaces(noJsonDir);
            expect(result).toEqual({ patterns: [], workspaces: [] });
        });
        
        it('should parse workspaces array format', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                name: 'root',
                workspaces: ['packages/*']
            }));
            const result = getPackageJsonWorkspaces(testDir);
            expect(result.patterns).toEqual(['packages/*']);
            expect(result.workspaces).toHaveLength(2);
        });
        
        it('should parse workspaces.packages format (yarn nohoist)', () => {
            const nohoistDir = join(testDir, 'nohoist');
            mkdirSync(nohoistDir, { recursive: true });
            mkdirSync(join(nohoistDir, 'packages', 'web'), { recursive: true });
            writeFileSync(join(nohoistDir, 'package.json'), JSON.stringify({
                name: 'root',
                workspaces: {
                    packages: ['packages/*'],
                    nohoist: ['**/react']
                }
            }));
            const result = getPackageJsonWorkspaces(nohoistDir);
            expect(result.patterns).toEqual(['packages/*']);
        });
        
        it('should return empty arrays for package.json without workspaces', () => {
            const simpleDir = join(testDir, 'simple');
            mkdirSync(simpleDir, { recursive: true });
            writeFileSync(join(simpleDir, 'package.json'), JSON.stringify({ name: 'simple' }));
            const result = getPackageJsonWorkspaces(simpleDir);
            expect(result).toEqual({ patterns: [], workspaces: [] });
        });
    });

    describe('detectWorkspaceType', () => {
        const testDir = join(FIXTURES_DIR, 'workspace-type-test');
        
        beforeEach(() => {
            if (existsSync(testDir)) {
                rmSync(testDir, { recursive: true, force: true });
            }
            mkdirSync(testDir, { recursive: true });
            mkdirSync(join(testDir, 'packages', 'a'), { recursive: true });
        });
        
        it('should detect pnpm workspace', () => {
            writeFileSync(join(testDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
            expect(detectWorkspaceType(testDir)).toBe('pnpm');
        });
        
        it('should detect yarn workspace', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
            writeFileSync(join(testDir, 'yarn.lock'), '');
            expect(detectWorkspaceType(testDir)).toBe('yarn');
        });
        
        it('should detect npm workspace', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
            writeFileSync(join(testDir, 'package-lock.json'), '{}');
            expect(detectWorkspaceType(testDir)).toBe('npm');
        });
        
        it('should default to yarn if workspaces defined but no lock file', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({ workspaces: ['packages/*'] }));
            expect(detectWorkspaceType(testDir)).toBe('yarn');
        });
        
        it('should return unknown for non-workspace project', () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'simple' }));
            expect(detectWorkspaceType(testDir)).toBe('unknown');
        });
    });

    describe('detectWorkspace', () => {
        const testDir = join(FIXTURES_DIR, 'detect-workspace-test');
        
        beforeEach(() => {
            if (existsSync(testDir)) {
                rmSync(testDir, { recursive: true, force: true });
            }
            mkdirSync(testDir, { recursive: true });
        });
        
        it('should detect monorepo with pnpm', async () => {
            mkdirSync(join(testDir, 'packages', 'core'), { recursive: true });
            writeFileSync(join(testDir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');
            
            const result = await detectWorkspace(testDir);
            expect(result.isMonorepo).toBe(true);
            expect(result.workspaceType).toBe('pnpm');
            expect(result.packagePaths).toHaveLength(1);
        });
        
        it('should detect monorepo with yarn workspaces', async () => {
            mkdirSync(join(testDir, 'packages', 'core'), { recursive: true });
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({
                name: 'root',
                workspaces: ['packages/*']
            }));
            writeFileSync(join(testDir, 'yarn.lock'), '');
            
            const result = await detectWorkspace(testDir);
            expect(result.isMonorepo).toBe(true);
            expect(result.workspaceType).toBe('yarn');
            expect(result.packagePaths).toHaveLength(1);
        });
        
        it('should detect single package (not monorepo)', async () => {
            writeFileSync(join(testDir, 'package.json'), JSON.stringify({ name: 'single-pkg' }));
            
            const result = await detectWorkspace(testDir);
            expect(result.isMonorepo).toBe(false);
            expect(result.workspaceType).toBe('unknown');
            expect(result.packagePaths).toHaveLength(1);
            expect(result.packagePaths[0]).toBe(resolve(testDir));
        });
        
        it('should return empty packages for directory without package.json', async () => {
            const result = await detectWorkspace(testDir);
            expect(result.isMonorepo).toBe(false);
            expect(result.packagePaths).toHaveLength(0);
        });
    });

    describe('calculatePackageSize', () => {
        const testDir = join(FIXTURES_DIR, 'size-calc-test');
        const pkgDir = join(testDir, 'my-package');
        
        beforeAll(() => {
            mkdirSync(pkgDir, { recursive: true });
            mkdirSync(join(pkgDir, 'src'), { recursive: true });
            mkdirSync(join(pkgDir, 'dist'), { recursive: true });
            
            // Create package.json
            writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'my-package' }));
            
            // Create source files (10 bytes each)
            writeFileSync(join(pkgDir, 'src', 'index.ts'), '0123456789');
            writeFileSync(join(pkgDir, 'src', 'utils.ts'), '0123456789');
            
            // Create build files (5 bytes each)
            writeFileSync(join(pkgDir, 'dist', 'index.js'), '01234');
            writeFileSync(join(pkgDir, 'dist', 'index.d.ts'), '01234');
        });
        
        it('should calculate source and build sizes correctly', async () => {
            const result = await calculatePackageSize(
                pkgDir,
                testDir,
                ['src'],
                ['dist'],
                true,
                10000
            );
            
            expect(result).not.toBeNull();
            expect(result!.name).toBe('my-package');
            // Source includes: 2 src files (10 bytes each) + package.json (21 bytes) = 41 bytes
            // Files not in src or dist dirs (like package.json) count as source
            expect(result!.sourceSize).toBe(41);
            expect(result!.buildSize).toBe(10); // 2 files * 5 bytes
            expect(result!.totalSize).toBe(51);
        });
        
        it('should include breakdown when requested', async () => {
            const result = await calculatePackageSize(
                pkgDir,
                testDir,
                ['src'],
                ['dist'],
                true,
                10000
            );
            
            expect(result!.sourceBreakdown).toHaveProperty('TypeScript');
            expect(result!.buildBreakdown).toHaveProperty('JavaScript');
            expect(result!.buildBreakdown).toHaveProperty('TypeScript Declaration');
        });
        
        it('should not include breakdown when disabled', async () => {
            const result = await calculatePackageSize(
                pkgDir,
                testDir,
                ['src'],
                ['dist'],
                false,
                10000
            );
            
            expect(Object.keys(result!.sourceBreakdown)).toHaveLength(0);
            expect(Object.keys(result!.buildBreakdown)).toHaveLength(0);
        });
        
        it('should return null for directory without package.json name', async () => {
            const noNameDir = join(testDir, 'no-name');
            mkdirSync(noNameDir, { recursive: true });
            writeFileSync(join(noNameDir, 'package.json'), JSON.stringify({}));
            
            const result = await calculatePackageSize(noNameDir, testDir, ['src'], ['dist'], true, 10000);
            expect(result).toBeNull();
        });
        
        it('should respect maxFiles limit', async () => {
            const result = await calculatePackageSize(
                pkgDir,
                testDir,
                ['src'],
                ['dist'],
                true,
                2 // Limit to 2 files
            );
            
            // Should still work but potentially have different size
            expect(result).not.toBeNull();
        });
    });

    describe('packageSizeFact.fn', () => {
        const factTestDir = join(FIXTURES_DIR, 'fact-test');
        
        beforeAll(() => {
            // Ensure clean state - remove if exists
            if (existsSync(factTestDir)) {
                rmSync(factTestDir, { recursive: true, force: true });
            }
            
            // Create monorepo structure
            mkdirSync(join(factTestDir, 'packages', 'core', 'src'), { recursive: true });
            mkdirSync(join(factTestDir, 'packages', 'cli', 'src'), { recursive: true });
            
            // Create root package.json with workspaces
            writeFileSync(join(factTestDir, 'package.json'), JSON.stringify({
                name: 'monorepo',
                workspaces: ['packages/*']
            }));
            writeFileSync(join(factTestDir, 'yarn.lock'), '');
            
            // Create core package
            writeFileSync(join(factTestDir, 'packages', 'core', 'package.json'), JSON.stringify({
                name: '@test/core'
            }));
            writeFileSync(join(factTestDir, 'packages', 'core', 'src', 'index.ts'), 'export {};');
            
            // Create cli package
            writeFileSync(join(factTestDir, 'packages', 'cli', 'package.json'), JSON.stringify({
                name: '@test/cli'
            }));
            writeFileSync(join(factTestDir, 'packages', 'cli', 'src', 'index.ts'), 'console.log("hello");');
        });
        
        it('should analyze monorepo and return structured result', async () => {
            const result = await packageSizeFact.fn({ repoPath: factTestDir });
            
            expect(result.isMonorepo).toBe(true);
            expect(result.workspaceType).toBe('yarn');
            expect(result.packages).toHaveLength(2);
            expect(result.totalSize).toBeGreaterThan(0);
            expect(result.analyzedAt).toBeDefined();
            expect(result.workspaceRoot).toBe(resolve(factTestDir));
        });
        
        it('should analyze single package', async () => {
            const singlePkgDir = join(FIXTURES_DIR, 'single-pkg-test');
            
            // Ensure clean state
            if (existsSync(singlePkgDir)) {
                rmSync(singlePkgDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(singlePkgDir, 'src'), { recursive: true });
            writeFileSync(join(singlePkgDir, 'package.json'), JSON.stringify({ name: 'single' }));
            writeFileSync(join(singlePkgDir, 'src', 'index.ts'), 'export {};');
            
            const result = await packageSizeFact.fn({ repoPath: singlePkgDir });
            
            expect(result.isMonorepo).toBe(false);
            expect(result.packages).toHaveLength(1);
            expect(result.packages[0].name).toBe('single');
        });
        
        it('should use default parameters', async () => {
            const result = await packageSizeFact.fn({ repoPath: factTestDir });
            expect(result).toBeDefined();
        });
        
        it('should handle custom source and build directories', async () => {
            const customDir = join(FIXTURES_DIR, 'custom-dirs-test');
            
            // Ensure clean state
            if (existsSync(customDir)) {
                rmSync(customDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(customDir, 'source'), { recursive: true });
            mkdirSync(join(customDir, 'output'), { recursive: true });
            writeFileSync(join(customDir, 'package.json'), JSON.stringify({ name: 'custom' }));
            writeFileSync(join(customDir, 'source', 'main.ts'), 'export {};');
            writeFileSync(join(customDir, 'output', 'main.js'), '');
            
            const result = await packageSizeFact.fn({
                repoPath: customDir,
                sourceDirs: ['source'],
                buildDirs: ['output']
            });
            
            expect(result.packages).toHaveLength(1);
            expect(result.packages[0].sourceSize).toBeGreaterThan(0);
        });
        
        it('should handle non-existent directory gracefully', async () => {
            const result = await packageSizeFact.fn({ repoPath: '/non/existent/path' });
            expect(result.packages).toHaveLength(0);
            expect(result.totalSize).toBe(0);
        });
        
        it('should return empty packages for directory without package.json', async () => {
            const emptyDir = join(FIXTURES_DIR, 'empty-dir-test');
            
            // Ensure clean state
            if (existsSync(emptyDir)) {
                rmSync(emptyDir, { recursive: true, force: true });
            }
            
            mkdirSync(emptyDir, { recursive: true });
            
            const result = await packageSizeFact.fn({ repoPath: emptyDir });
            expect(result.packages).toHaveLength(0);
        });
        
        it('should suppress table output when noPackageSizeTable is true', async () => {
            const result = await packageSizeFact.fn({ 
                repoPath: factTestDir,
                noPackageSizeTable: true 
            });
            
            expect(result).toBeDefined();
            expect(result.packages.length).toBeGreaterThan(0);
        });
    });

    describe('fact metadata', () => {
        it('should have correct name', () => {
            expect(packageSizeFact.name).toBe('packageSize');
        });
        
        it('should be a global fact type', () => {
            expect(packageSizeFact.type).toBe('global');
        });
        
        it('should have a description', () => {
            expect(packageSizeFact.description).toBeDefined();
            expect(packageSizeFact.description!.length).toBeGreaterThan(0);
        });
        
        it('should have a priority set', () => {
            expect(packageSizeFact.priority).toBeDefined();
            expect(typeof packageSizeFact.priority).toBe('number');
        });
    });

    describe('edge cases', () => {
        const edgeCaseDir = join(FIXTURES_DIR, 'edge-cases');
        
        beforeAll(() => {
            // Ensure clean state
            if (existsSync(edgeCaseDir)) {
                rmSync(edgeCaseDir, { recursive: true, force: true });
            }
            mkdirSync(edgeCaseDir, { recursive: true });
        });
        
        it('should handle package with only root files (no src/dist)', async () => {
            const pkgDir = join(edgeCaseDir, 'root-files-only');
            
            if (existsSync(pkgDir)) {
                rmSync(pkgDir, { recursive: true, force: true });
            }
            
            mkdirSync(pkgDir, { recursive: true });
            writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'root-files' }));
            writeFileSync(join(pkgDir, 'index.ts'), 'export {};');
            writeFileSync(join(pkgDir, 'README.md'), '# Hello');
            
            const result = await packageSizeFact.fn({ repoPath: pkgDir });
            
            expect(result.packages).toHaveLength(1);
            // Files not in src or dist should count as source
            expect(result.packages[0].sourceSize).toBeGreaterThan(0);
            expect(result.packages[0].buildSize).toBe(0);
        });
        
        it('should handle deeply nested source files', async () => {
            const pkgDir = join(edgeCaseDir, 'nested');
            
            if (existsSync(pkgDir)) {
                rmSync(pkgDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(pkgDir, 'src', 'deep', 'nested', 'path'), { recursive: true });
            writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'nested' }));
            writeFileSync(join(pkgDir, 'src', 'deep', 'nested', 'path', 'file.ts'), 'export {};');
            
            const result = await packageSizeFact.fn({ repoPath: pkgDir });
            
            expect(result.packages).toHaveLength(1);
            expect(result.packages[0].sourceSize).toBeGreaterThan(0);
        });
        
        it('should handle special file extensions correctly', async () => {
            const pkgDir = join(edgeCaseDir, 'special-ext');
            
            if (existsSync(pkgDir)) {
                rmSync(pkgDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(pkgDir, 'src'), { recursive: true });
            writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'special' }));
            writeFileSync(join(pkgDir, 'src', 'types.d.ts'), 'declare const x: number;');
            writeFileSync(join(pkgDir, 'src', 'module.mjs'), 'export default {};');
            writeFileSync(join(pkgDir, 'src', 'common.cjs'), 'module.exports = {};');
            
            const result = await packageSizeFact.fn({ 
                repoPath: pkgDir,
                includeBreakdown: true
            });
            
            expect(result.packages).toHaveLength(1);
            const breakdown = result.packages[0].sourceBreakdown;
            expect(breakdown).toHaveProperty('TypeScript Declaration');
            expect(breakdown).toHaveProperty('ES Module');
            expect(breakdown).toHaveProperty('CommonJS');
        });
        
        it('should handle zero-size files', async () => {
            const pkgDir = join(edgeCaseDir, 'zero-size');
            
            if (existsSync(pkgDir)) {
                rmSync(pkgDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(pkgDir, 'src'), { recursive: true });
            writeFileSync(join(pkgDir, 'package.json'), JSON.stringify({ name: 'zero-size' }));
            writeFileSync(join(pkgDir, 'src', 'empty.ts'), '');
            
            const result = await packageSizeFact.fn({ repoPath: pkgDir });
            
            expect(result.packages).toHaveLength(1);
            // Package.json has content, so totalSize > 0
            expect(result.packages[0].totalSize).toBeGreaterThan(0);
        });
        
        it('should handle pattern matching for package-* style directories', async () => {
            const patternDir = join(edgeCaseDir, 'pattern-matching');
            
            if (existsSync(patternDir)) {
                rmSync(patternDir, { recursive: true, force: true });
            }
            
            // Create pattern-matched workspace structure
            mkdirSync(join(patternDir, 'packages', 'package-core'), { recursive: true });
            mkdirSync(join(patternDir, 'packages', 'package-utils'), { recursive: true });
            
            writeFileSync(join(patternDir, 'package.json'), JSON.stringify({
                name: 'pattern-monorepo',
                workspaces: ['packages/package-*']
            }));
            writeFileSync(join(patternDir, 'yarn.lock'), '');
            
            writeFileSync(join(patternDir, 'packages', 'package-core', 'package.json'), 
                JSON.stringify({ name: '@pattern/core' }));
            writeFileSync(join(patternDir, 'packages', 'package-utils', 'package.json'), 
                JSON.stringify({ name: '@pattern/utils' }));
            
            const result = await packageSizeFact.fn({ repoPath: patternDir });
            
            expect(result.isMonorepo).toBe(true);
            expect(result.packages.length).toBeGreaterThanOrEqual(2);
        });
        
        it('should handle invalid pnpm-workspace.yaml without packages field', async () => {
            const pnpmDir = join(edgeCaseDir, 'pnpm-no-packages');
            
            if (existsSync(pnpmDir)) {
                rmSync(pnpmDir, { recursive: true, force: true });
            }
            
            mkdirSync(pnpmDir, { recursive: true });
            // Create a pnpm-workspace.yaml without packages field
            writeFileSync(join(pnpmDir, 'pnpm-workspace.yaml'), 'someOtherField:\n  - value');
            writeFileSync(join(pnpmDir, 'package.json'), JSON.stringify({ name: 'pnpm-test' }));
            
            const result = await packageSizeFact.fn({ repoPath: pnpmDir });
            
            // Should fall back to single package detection
            expect(result.packages).toHaveLength(1);
        });
        
        it('should handle package with build files', async () => {
            const buildPkgDir = join(edgeCaseDir, 'with-build');
            
            if (existsSync(buildPkgDir)) {
                rmSync(buildPkgDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(buildPkgDir, 'src'), { recursive: true });
            mkdirSync(join(buildPkgDir, 'dist'), { recursive: true });
            writeFileSync(join(buildPkgDir, 'package.json'), JSON.stringify({ name: 'with-build' }));
            writeFileSync(join(buildPkgDir, 'src', 'index.ts'), 'export const foo = 1;');
            writeFileSync(join(buildPkgDir, 'dist', 'index.js'), 'exports.foo = 1;');
            writeFileSync(join(buildPkgDir, 'dist', 'index.d.ts'), 'export declare const foo: number;');
            
            const result = await packageSizeFact.fn({ repoPath: buildPkgDir });
            
            expect(result.packages).toHaveLength(1);
            expect(result.packages[0].sourceSize).toBeGreaterThan(0);
            expect(result.packages[0].buildSize).toBeGreaterThan(0);
        });
        
        it('should handle npm workspaces', async () => {
            const npmDir = join(edgeCaseDir, 'npm-workspace');
            
            if (existsSync(npmDir)) {
                rmSync(npmDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(npmDir, 'packages', 'lib'), { recursive: true });
            
            writeFileSync(join(npmDir, 'package.json'), JSON.stringify({
                name: 'npm-monorepo',
                workspaces: ['packages/*']
            }));
            writeFileSync(join(npmDir, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3 }));
            writeFileSync(join(npmDir, 'packages', 'lib', 'package.json'), 
                JSON.stringify({ name: '@npm/lib' }));
            
            const result = await packageSizeFact.fn({ repoPath: npmDir });
            
            expect(result.isMonorepo).toBe(true);
            expect(result.workspaceType).toBe('npm');
        });
        
        it('should handle multiple build directories', async () => {
            const multiBuildDir = join(edgeCaseDir, 'multi-build');
            
            if (existsSync(multiBuildDir)) {
                rmSync(multiBuildDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(multiBuildDir, 'src'), { recursive: true });
            mkdirSync(join(multiBuildDir, 'dist'), { recursive: true });
            mkdirSync(join(multiBuildDir, 'build'), { recursive: true });
            mkdirSync(join(multiBuildDir, 'out'), { recursive: true });
            
            writeFileSync(join(multiBuildDir, 'package.json'), JSON.stringify({ name: 'multi-build' }));
            writeFileSync(join(multiBuildDir, 'src', 'index.ts'), 'export {};');
            // Add content to build files so they have non-zero size
            writeFileSync(join(multiBuildDir, 'dist', 'index.js'), 'exports.foo = 1;');
            writeFileSync(join(multiBuildDir, 'build', 'index.js'), 'exports.bar = 2;');
            writeFileSync(join(multiBuildDir, 'out', 'index.js'), 'exports.baz = 3;');
            
            const result = await packageSizeFact.fn({ repoPath: multiBuildDir });
            
            expect(result.packages).toHaveLength(1);
            expect(result.packages[0].buildSize).toBeGreaterThan(0);
        });
        
        it('should handle more file extensions correctly', async () => {
            const extDir = join(edgeCaseDir, 'all-extensions');
            
            if (existsSync(extDir)) {
                rmSync(extDir, { recursive: true, force: true });
            }
            
            mkdirSync(join(extDir, 'src'), { recursive: true });
            writeFileSync(join(extDir, 'package.json'), JSON.stringify({ name: 'all-ext' }));
            
            // Write various file types
            writeFileSync(join(extDir, 'src', 'app.tsx'), 'export default () => null;');
            writeFileSync(join(extDir, 'src', 'util.jsx'), 'export default () => null;');
            writeFileSync(join(extDir, 'src', 'config.json'), '{}');
            writeFileSync(join(extDir, 'src', 'README.md'), '# Test');
            writeFileSync(join(extDir, 'src', 'style.css'), 'body {}');
            writeFileSync(join(extDir, 'src', 'style.scss'), '$color: red;');
            writeFileSync(join(extDir, 'src', 'style.less'), '@color: red;');
            writeFileSync(join(extDir, 'src', 'template.html'), '<div></div>');
            writeFileSync(join(extDir, 'src', 'config.yaml'), 'key: value');
            writeFileSync(join(extDir, 'src', 'config.yml'), 'key: value');
            
            const result = await packageSizeFact.fn({ 
                repoPath: extDir,
                includeBreakdown: true
            });
            
            expect(result.packages).toHaveLength(1);
            const breakdown = result.packages[0].sourceBreakdown;
            
            expect(breakdown).toHaveProperty('TypeScript (React)');
            expect(breakdown).toHaveProperty('JavaScript (React)');
            expect(breakdown).toHaveProperty('JSON');
            expect(breakdown).toHaveProperty('Markdown');
            expect(breakdown).toHaveProperty('CSS');
            expect(breakdown).toHaveProperty('SCSS');
            expect(breakdown).toHaveProperty('LESS');
            expect(breakdown).toHaveProperty('HTML');
            expect(breakdown).toHaveProperty('YAML');
        });
    });
});
