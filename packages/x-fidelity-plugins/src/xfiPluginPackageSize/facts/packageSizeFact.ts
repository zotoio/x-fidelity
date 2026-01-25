/**
 * Package Size Fact
 * 
 * A global fact that analyzes package sizes in a monorepo, detecting workspace
 * configurations (yarn/npm/pnpm) and calculating source, build, and total sizes.
 */

import { FactDefn } from '@x-fidelity/types';
import { logger, getOptions } from '@x-fidelity/core';
import { glob } from 'glob';
import { stat, readFile } from 'fs/promises';
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, extname, relative, resolve } from 'path';
import * as yaml from 'js-yaml';
import type { 
    PackageSizeResult, 
    PackageSizeInfo, 
    PackageSizeFactParams,
    SizeBreakdown,
    WorkspaceType 
} from '../types';
import { generatePackageSizeTable, shouldOutputPackageSizeTable } from '../utils/consoleTable';

/**
 * Workspace detection result
 */
interface WorkspaceInfo {
    isMonorepo: boolean;
    workspaceType: WorkspaceType;
    packagePaths: string[];
}

/**
 * Expand glob patterns to match directories
 * Handles patterns like "packages/*" or "apps/**"
 */
function expandGlobPattern(repoPath: string, pattern: string): string[] {
    const results: string[] = [];
    
    // Handle negation patterns (skip them)
    if (pattern.startsWith('!')) {
        return [];
    }
    
    // Split pattern into parts
    const parts = pattern.split('/');
    let currentPaths = [repoPath];
    
    for (const part of parts) {
        const nextPaths: string[] = [];
        
        for (const currentPath of currentPaths) {
            if (part === '*' || part === '**') {
                // Wildcard - match all directories
                try {
                    const entries = readdirSync(currentPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                            nextPaths.push(join(currentPath, entry.name));
                        }
                    }
                } catch (error) {
                    logger.debug(`Unable to read directory ${currentPath}: ${error}`);
                }
            } else if (part.includes('*')) {
                // Pattern like "package-*"
                const regex = new RegExp('^' + part.replace(/\*/g, '.*') + '$');
                try {
                    const entries = readdirSync(currentPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && regex.test(entry.name)) {
                            nextPaths.push(join(currentPath, entry.name));
                        }
                    }
                } catch (error) {
                    logger.debug(`Unable to read directory ${currentPath} for pattern ${part}: ${error}`);
                }
            } else {
                // Exact match
                const fullPath = join(currentPath, part);
                if (existsSync(fullPath)) {
                    nextPaths.push(fullPath);
                }
            }
        }
        
        currentPaths = nextPaths;
    }
    
    return currentPaths;
}

/**
 * Get workspace package paths from pnpm-workspace.yaml
 */
function getPnpmWorkspacePackages(repoPath: string): string[] {
    const workspaceFile = join(repoPath, 'pnpm-workspace.yaml');
    
    if (!existsSync(workspaceFile)) {
        return [];
    }
    
    try {
        const content = readFileSync(workspaceFile, 'utf-8');
        const config = yaml.load(content) as { packages?: string[] };
        
        if (!config?.packages || !Array.isArray(config.packages)) {
            return [];
        }
        
        const packagePaths: string[] = [];
        for (const pattern of config.packages) {
            const expanded = expandGlobPattern(repoPath, pattern);
            packagePaths.push(...expanded);
        }
        
        return packagePaths;
    } catch (error) {
        logger.debug(`Error reading pnpm-workspace.yaml: ${error}`);
        return [];
    }
}

/**
 * Get workspace package paths from package.json workspaces field
 * (Used by yarn and npm workspaces)
 */
function getPackageJsonWorkspaces(repoPath: string): { patterns: string[]; workspaces: string[] } {
    const packageJsonPath = join(repoPath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
        return { patterns: [], workspaces: [] };
    }
    
    try {
        const content = readFileSync(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        
        let patterns: string[] = [];
        
        if (Array.isArray(pkg.workspaces)) {
            patterns = pkg.workspaces;
        } else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
            // Yarn workspaces with nohoist
            patterns = pkg.workspaces.packages;
        }
        
        if (patterns.length === 0) {
            return { patterns: [], workspaces: [] };
        }
        
        const packagePaths: string[] = [];
        for (const pattern of patterns) {
            const expanded = expandGlobPattern(repoPath, pattern);
            packagePaths.push(...expanded);
        }
        
        return { patterns, workspaces: packagePaths };
    } catch (error) {
        logger.debug(`Error reading package.json workspaces: ${error}`);
        return { patterns: [], workspaces: [] };
    }
}

/**
 * Detect workspace type (yarn, npm, pnpm, or unknown)
 */
function detectWorkspaceType(repoPath: string): WorkspaceType {
    // Check for pnpm-workspace.yaml first
    if (existsSync(join(repoPath, 'pnpm-workspace.yaml'))) {
        return 'pnpm';
    }
    
    // Check for yarn.lock (yarn workspaces)
    if (existsSync(join(repoPath, 'yarn.lock'))) {
        const { patterns } = getPackageJsonWorkspaces(repoPath);
        if (patterns.length > 0) {
            return 'yarn';
        }
    }
    
    // Check for package-lock.json (npm workspaces)
    if (existsSync(join(repoPath, 'package-lock.json'))) {
        const { patterns } = getPackageJsonWorkspaces(repoPath);
        if (patterns.length > 0) {
            return 'npm';
        }
    }
    
    // Check if there are workspaces defined even without lock file
    const { patterns } = getPackageJsonWorkspaces(repoPath);
    if (patterns.length > 0) {
        // Default to yarn if workspaces are defined but no lock file
        return 'yarn';
    }
    
    return 'unknown';
}

/**
 * Detect workspace configuration and return package paths
 */
async function detectWorkspace(repoPath: string): Promise<WorkspaceInfo> {
    const absoluteRepoPath = resolve(repoPath);
    
    // Try pnpm workspaces first
    const pnpmPackages = getPnpmWorkspacePackages(absoluteRepoPath);
    if (pnpmPackages.length > 0) {
        return {
            isMonorepo: true,
            workspaceType: 'pnpm',
            packagePaths: pnpmPackages
        };
    }
    
    // Try yarn/npm workspaces
    const { workspaces: packageJsonWorkspaces } = getPackageJsonWorkspaces(absoluteRepoPath);
    if (packageJsonWorkspaces.length > 0) {
        const workspaceType = detectWorkspaceType(absoluteRepoPath);
        return {
            isMonorepo: true,
            workspaceType,
            packagePaths: packageJsonWorkspaces
        };
    }
    
    // Single package (not a monorepo)
    // Check if this is a valid package (has package.json)
    if (existsSync(join(absoluteRepoPath, 'package.json'))) {
        return {
            isMonorepo: false,
            workspaceType: 'unknown',
            packagePaths: [absoluteRepoPath]
        };
    }
    
    return {
        isMonorepo: false,
        workspaceType: 'unknown',
        packagePaths: []
    };
}

/**
 * Get package name from package.json
 */
async function getPackageName(pkgPath: string): Promise<string | null> {
    const packageJsonPath = join(pkgPath, 'package.json');
    
    if (!existsSync(packageJsonPath)) {
        return null;
    }
    
    try {
        const content = await readFile(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        return pkg.name || null;
    } catch (error) {
        logger.debug(`Error reading package.json at ${pkgPath}: ${error}`);
        return null;
    }
}

/**
 * Get friendly name for file extension
 */
function getExtensionName(ext: string): string {
    const extMap: Record<string, string> = {
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript (React)',
        '.js': 'JavaScript',
        '.jsx': 'JavaScript (React)',
        '.mjs': 'ES Module',
        '.cjs': 'CommonJS',
        '.json': 'JSON',
        '.md': 'Markdown',
        '.css': 'CSS',
        '.scss': 'SCSS',
        '.less': 'LESS',
        '.html': 'HTML',
        '.yaml': 'YAML',
        '.yml': 'YAML',
        '.svg': 'SVG',
        '.png': 'PNG',
        '.jpg': 'JPEG',
        '.jpeg': 'JPEG',
        '.gif': 'GIF',
        '.woff': 'Font',
        '.woff2': 'Font',
        '.ttf': 'Font',
        '.eot': 'Font',
        '.map': 'Source Map',
        '.d.ts': 'TypeScript Declaration'
    };
    
    return extMap[ext] || ext.replace('.', '').toUpperCase();
}

/**
 * Check if a file path is in any of the specified directories
 */
function isInDirectories(filePath: string, basePath: string, dirs: string[]): boolean {
    const relativePath = relative(basePath, filePath);
    return dirs.some(dir => relativePath.startsWith(dir + '/') || relativePath === dir);
}

/**
 * Calculate size information for a single package
 */
async function calculatePackageSize(
    pkgPath: string,
    workspaceRoot: string,
    sourceDirs: string[],
    buildDirs: string[],
    includeBreakdown: boolean,
    maxFiles: number
): Promise<PackageSizeInfo | null> {
    try {
        // Get package name
        const name = await getPackageName(pkgPath);
        if (!name) {
            logger.debug(`Skipping ${pkgPath}: no package.json or name`);
            return null;
        }
        
        // Get all files excluding node_modules
        const files = await glob('**/*', {
            cwd: pkgPath,
            nodir: true,
            ignore: ['**/node_modules/**', '**/.git/**'],
            absolute: true
        });
        
        // Limit files if needed
        const filesToProcess = files.slice(0, maxFiles);
        if (files.length > maxFiles) {
            logger.warn(`Package ${name} has ${files.length} files, limiting to ${maxFiles}`);
        }
        
        let sourceSize = 0;
        let buildSize = 0;
        const sourceBreakdown: SizeBreakdown = {};
        const buildBreakdown: SizeBreakdown = {};
        
        // Process files
        for (const filePath of filesToProcess) {
            try {
                const stats = await stat(filePath);
                const size = stats.size;
                
                // Determine if source or build
                const isSource = isInDirectories(filePath, pkgPath, sourceDirs);
                const isBuild = isInDirectories(filePath, pkgPath, buildDirs);
                
                // Get extension for breakdown
                let ext = extname(filePath).toLowerCase();
                // Handle special cases like .d.ts
                if (filePath.endsWith('.d.ts')) {
                    ext = '.d.ts';
                }
                const extName = getExtensionName(ext);
                
                if (isBuild) {
                    buildSize += size;
                    if (includeBreakdown) {
                        buildBreakdown[extName] = (buildBreakdown[extName] || 0) + size;
                    }
                } else if (isSource) {
                    sourceSize += size;
                    if (includeBreakdown) {
                        sourceBreakdown[extName] = (sourceBreakdown[extName] || 0) + size;
                    }
                } else {
                    // Files not in source or build dirs count as source
                    sourceSize += size;
                    if (includeBreakdown) {
                        sourceBreakdown[extName] = (sourceBreakdown[extName] || 0) + size;
                    }
                }
            } catch (error) {
                logger.debug(`Error getting stats for ${filePath}: ${error}`);
            }
        }
        
        const totalSize = sourceSize + buildSize;
        const relativePath = relative(workspaceRoot, pkgPath) || '.';
        
        return {
            name,
            path: relativePath,
            totalSize,
            sourceSize,
            buildSize,
            sourceBreakdown,
            buildBreakdown,
            exceedsWarning: false, // Will be set by operator
            exceedsFatality: false // Will be set by operator
        };
    } catch (error) {
        logger.error(`Error calculating size for package at ${pkgPath}:`, error);
        return null;
    }
}

/**
 * Package Size Fact Definition
 * 
 * Analyzes package sizes in a monorepo, excluding node_modules.
 * Returns structured data about each package's source and build sizes.
 */
export const packageSizeFact: FactDefn = {
    name: 'packageSize',
    description: 'Analyzes package sizes in a monorepo, excluding node_modules',
    type: 'global',
    priority: 10,
    fn: async (params: unknown, _almanac?: unknown): Promise<PackageSizeResult> => {
        const factParams = params as PackageSizeFactParams & { repoPath?: string };
        const repoPath = factParams?.repoPath || '.';
        const sourceDirs = factParams?.sourceDirs || ['src'];
        const buildDirs = factParams?.buildDirs || ['dist', 'build', 'out', 'lib'];
        const includeBreakdown = factParams?.includeBreakdown !== false;
        const maxFilesPerPackage = factParams?.maxFilesPerPackage || 10000;
        
        const absoluteRepoPath = resolve(repoPath);
        logger.debug(`[packageSizeFact] Analyzing packages at: ${absoluteRepoPath}`);
        
        try {
            // Step 1: Detect workspace type and packages
            const workspaceInfo = await detectWorkspace(absoluteRepoPath);
            logger.debug(`[packageSizeFact] Found ${workspaceInfo.packagePaths.length} packages (${workspaceInfo.workspaceType})`);
            
            // Step 2: Calculate sizes for each package
            const packages: PackageSizeInfo[] = [];
            for (const pkgPath of workspaceInfo.packagePaths) {
                const pkgInfo = await calculatePackageSize(
                    pkgPath,
                    absoluteRepoPath,
                    sourceDirs,
                    buildDirs,
                    includeBreakdown,
                    maxFilesPerPackage
                );
                if (pkgInfo) {
                    packages.push(pkgInfo);
                }
            }
            
            // Step 3: Calculate totals
            const totalSize = packages.reduce((sum, pkg) => sum + pkg.totalSize, 0);
            
            const result: PackageSizeResult = {
                packages,
                totalSize,
                isMonorepo: workspaceInfo.isMonorepo,
                workspaceType: workspaceInfo.workspaceType,
                analyzedAt: new Date().toISOString(),
                workspaceRoot: absoluteRepoPath
            };
            
            // Step 4: Log table to console if enabled
            // Check options for output suppression
            const coreOptions = getOptions();
            const outputOptions = {
                noPackageSizeTable: factParams?.noPackageSizeTable,
                outputFormat: coreOptions.outputFormat as 'human' | 'json' | undefined,
                logLevel: coreOptions.logLevel as 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | undefined,
                verbose: coreOptions.logLevel === 'debug'
            };
            
            if (shouldOutputPackageSizeTable(outputOptions)) {
                const table = generatePackageSizeTable({ 
                    result,
                    config: {
                        verbose: outputOptions.verbose,
                        // Colors are auto-detected via shouldUseColors
                    }
                });
                logger.info('\n' + table);
            } else {
                logger.debug('[packageSizeFact] Table output suppressed by configuration');
            }
            
            return result;
        } catch (error) {
            logger.error('[packageSizeFact] Error analyzing package sizes:', error);
            return {
                packages: [],
                totalSize: 0,
                isMonorepo: false,
                workspaceType: 'unknown',
                analyzedAt: new Date().toISOString(),
                workspaceRoot: absoluteRepoPath
            };
        }
    }
};

// Export helper functions for testing
export { 
    detectWorkspace, 
    calculatePackageSize, 
    expandGlobPattern, 
    getPackageName,
    isInDirectories,
    getExtensionName,
    getPnpmWorkspacePackages,
    getPackageJsonWorkspaces,
    detectWorkspaceType
};
