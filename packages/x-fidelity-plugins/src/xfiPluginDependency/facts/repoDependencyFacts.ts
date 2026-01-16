import { logger, options, safeClone, safeStringify, repoDir, discoverBinary, createEnhancedEnvironment } from '@x-fidelity/core';
import { exec, execSync } from 'child_process';
import { LocalDependencies, MinimumDepVersions, VersionData, ArchetypeConfig } from '@x-fidelity/types';
import { Almanac } from 'json-rules-engine';
import * as semver from 'semver';
import { FileData } from '@x-fidelity/types';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { FactDefn } from '@x-fidelity/types';

// Create a properly typed promisified exec function
const execPromise = util.promisify(exec);

// ✅ Performance optimization: Add caching for dependency collection
interface DependencyCache {
    dependencies: LocalDependencies[];
    cacheKey: string;
    timestamp: number;
}

interface VersionDataCache {
    versionData: VersionData[];
    cacheKey: string;
    timestamp: number;
}

// Simple in-memory cache for the current process
const dependencyCache = new Map<string, DependencyCache>();
const versionDataCache = new Map<string, VersionDataCache>();

// ✅ Cache for dependency analysis results to avoid redundant computation
interface DependencyAnalysisCache {
    analysis: any[];
    cacheKey: string;
    timestamp: number;
}

const analysisCache = new Map<string, DependencyAnalysisCache>();

/**
 * Clears all dependency caches - useful for testing
 */
export function clearDependencyCache(): void {
    dependencyCache.clear();
    versionDataCache.clear();
    analysisCache.clear(); // ✅ Clear analysis cache too
}

/**
 * Clears dependency analysis cache - useful for testing and cleanup
 */
export function clearDependencyAnalysisCache(): void {
    analysisCache.clear();
}

/**
 * Generates a cache key based on package manager files' modification times
 */
function getDependencyCacheKey(repoPath?: string): string {
    const actualRepoPath = repoPath || options.dir || process.cwd();
    const files = [
        path.join(actualRepoPath, 'package.json'),
        path.join(actualRepoPath, 'pnpm-lock.yaml'),
        path.join(actualRepoPath, 'yarn.lock'),
        path.join(actualRepoPath, 'package-lock.json'),
        path.join(actualRepoPath, 'npm-shrinkwrap.json')
    ];

    const mtimes: string[] = [];
    for (const file of files) {
        try {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                mtimes.push(`${file}:${stats.mtime.getTime()}`);
            }
        } catch (error) {
            // File doesn't exist or can't be accessed, skip
        }
    }

    return mtimes.join('|');
}

/**
 * Generates a cache key for version data based on dependencies and archetype config
 */
function getVersionDataCacheKey(dependencyCacheKey: string, archetypeConfig: ArchetypeConfig): string {
    const minDepsHash = JSON.stringify(archetypeConfig.config.minimumDependencyVersions || {});
    return `${dependencyCacheKey}:${minDepsHash}`;
}

/**
 * Collects the local dependencies with caching for performance.
 * @param repoPath The repository path to analyze (optional, defaults to options.dir)
 * @returns The local dependencies.
 */
export async function collectLocalDependencies(repoPath?: string): Promise<LocalDependencies[]> {
    const startTime = Date.now();
    const actualRepoPath = repoPath || options.dir || process.cwd();
    const cacheKey = getDependencyCacheKey(actualRepoPath);

    // Check cache first
    const cached = dependencyCache.get(cacheKey);
    if (cached && cached.cacheKey === cacheKey) {
        const cacheAge = Date.now() - cached.timestamp;
        logger.debug(`Using cached dependency data (age: ${cacheAge}ms)`);
        return cached.dependencies;
    }

    logger.debug('Cache miss, collecting dependencies from package manager...');

    let result: LocalDependencies[] = [];
    if (fs.existsSync(path.join(actualRepoPath, 'pnpm-lock.yaml'))) {
        result = await collectNodeDependencies('pnpm', actualRepoPath);
    } else if (fs.existsSync(path.join(actualRepoPath, 'yarn.lock'))) {
        result = await collectNodeDependencies('yarn', actualRepoPath);
    } else if (fs.existsSync(path.join(actualRepoPath, 'package-lock.json'))) {
        result = await collectNodeDependencies('npm', actualRepoPath);
    } else {
        logger.warn('No pnpm-lock.yaml, yarn.lock or package-lock.json found - returning empty dependencies array');
        return []; // ✅ Return empty array instead of exiting process
    }

    // Cache the result
    dependencyCache.set(cacheKey, {
        dependencies: result,
        cacheKey,
        timestamp: Date.now()
    });

    const executionTime = Date.now() - startTime;
    logger.debug(`collectLocalDependencies completed in ${executionTime}ms (cache: ${cached ? 'HIT' : 'MISS'})`);
    logger.trace(`collectLocalDependencies: ${safeStringify(result)}`);
    return result;
}

async function collectNodeDependencies(packageManager: string, repoPath?: string): Promise<LocalDependencies[]> {
    const emptyDeps: LocalDependencies[] = [];
    const actualRepoPath = repoPath || options.dir || process.cwd();
    // Prepare timing variables at function scope for use in finally
    let execMethod = 'exec';
    let execMs = 0;
    const overallStart = Date.now();
    try {
        logger.debug(`collectNodeDependencies: start for ${packageManager} (cwd: ${actualRepoPath})`);
        // Discover the actual binary path for reliable execution
        const discoverStart = Date.now();
        const binaryResult = await discoverBinary(packageManager);
        const discoverMs = Date.now() - discoverStart;
        logger.debug(`collectNodeDependencies: discoverBinary(${packageManager}) took ${discoverMs}ms`);
        
        if (!binaryResult) {
            logger.warn(`${packageManager} binary not found, skipping dependency collection`);
            return emptyDeps;
        }

        const binaryPath = binaryResult.path;
        const envStart = Date.now();
        const enhancedEnv = await createEnhancedEnvironment();
        const envMs = Date.now() - envStart;
        logger.debug(`collectNodeDependencies: createEnhancedEnvironment() took ${envMs}ms`);
        
        let stdout: string;
        let stderr: string = '';

        try {
            // Use discovered binary path with enhanced environment
            // Determine the appropriate command for each package manager
            let command: string;
            if (packageManager === 'npm') {
                command = `"${binaryPath}" ls -a --json`;
            } else if (packageManager === 'pnpm') {
                command = `"${binaryPath}" list -r --json --depth=Infinity`;
            } else {
                // yarn
                command = `"${binaryPath}" list --json`;
            }

            const execStart = Date.now();
            const result = await execPromise(command, {
                cwd: actualRepoPath, maxBuffer: 10485760 * 2, env: enhancedEnv
            });
            execMs = Date.now() - execStart;
            stdout = result.stdout;
            stderr = result.stderr;
        } catch (execError) {
            // If promisified exec fails, fall back to execSync
            logger.warn(`Falling back to execSync for ${packageManager} dependencies`);
            execMethod = 'execSync';
            
            // Determine the appropriate command for each package manager
            let command: string;
            if (packageManager === 'npm') {
                command = `"${binaryPath}" ls -a --json`;
            } else if (packageManager === 'pnpm') {
                command = `"${binaryPath}" list -r --json --depth=Infinity`;
            } else {
                // yarn
                command = `"${binaryPath}" list --json`;
            }

            const execStart = Date.now();
            const output = execSync(command, {
                cwd: actualRepoPath, maxBuffer: 10485760, env: enhancedEnv
            });
            execMs = Date.now() - execStart;
            stdout = output.toString();
        }

        if (stderr?.includes('"error"')) {
            logger.error({
                err: stderr,
                packageManager,
                type: 'dependency-error',
                operation: 'collect-dependencies'
            }, 'Error determining dependencies');
            throw new Error(stderr);
        }

        try {
            const parseStart = Date.now();
            const result = JSON.parse(stdout);
            const parseMs = Date.now() - parseStart;
            logger.debug(`collectNodeDependencies: JSON.parse took ${parseMs}ms`);
            logger.trace(`collectNodeDependencies ${packageManager}: ${JSON.stringify(result)}`);
            
            if (packageManager === 'npm') {
                return processNpmDependencies(result);
            } else if (packageManager === 'pnpm') {
                return processPnpmDependencies(result);
            } else {
                return processYarnDependencies(result);
            }

        } catch (e) {
            logger.error({
                err: e,
                packageManager,
                type: 'parse-error'
            }, 'Error parsing dependencies');
            throw new Error(`Error parsing ${packageManager} dependencies`);
        }
    } catch (e: any) {
        let message = `Error determining ${packageManager} dependencies: ${e}`;

        if (e.message?.includes('ELSPROBLEMS')) {
            message += `\nError determining ${packageManager} dependencies: did you forget to run '${packageManager} install' first?`;
        }
        logger.error({
            err: e,
            packageManager,
            type: 'dependency-error'
        }, 'Error determining dependencies');
        throw new Error(message);
    }
    finally {
        // Log final timing even on error paths
        try {
            const end = Date.now();
            logger.debug(`collectNodeDependencies: finished for ${packageManager} using ${execMethod} in ${typeof execMs === 'number' ? execMs : 0}ms (total ${end - overallStart}ms)`);
        } catch {}
    }
}

function processYarnDependencies(yarnOutput: any): LocalDependencies[] {
    const dependencies: LocalDependencies[] = [];
    if (yarnOutput?.data?.trees) {
        const processDependency = (node: any) => {
            const newDep: LocalDependencies = extractNameAndVersion(node.name);
            if (node.children) {
                newDep.dependencies = [];
                node.children.forEach((child: any) => {
                    newDep.dependencies?.push(processDependency(child));
                });
            }
            return newDep;
        };
        const extractNameAndVersion = (nameAndVersion: string) => {
            const lastAtIndex = nameAndVersion.lastIndexOf('@');
            if (nameAndVersion.startsWith('@') && lastAtIndex > 0) {
                return {
                    name: nameAndVersion.substring(0, lastAtIndex),
                    version: nameAndVersion.substring(lastAtIndex + 1)
                };
            }
            const parts = nameAndVersion.split('@');
            return { name: parts[0], version: parts[1] };
        };
        yarnOutput.data.trees.forEach((tree: any) => {
            dependencies.push(processDependency(tree));
        });
    }
    return dependencies;
}

function processNpmDependencies(npmOutput: any): LocalDependencies[] {
    const dependencies: LocalDependencies[] = [];
    const processDependency = (name: string, info: any) => {
        const newDep: LocalDependencies = { name, version: info.version };
        if (info.dependencies) {
            newDep.dependencies = [];
            Object.entries(info.dependencies).forEach(([childName, childInfo]: [string, any]) => {
                newDep.dependencies?.push(processDependency(childName, childInfo));
            });
        }
        return newDep;
    };
    if (npmOutput.dependencies) {
        Object.entries(npmOutput.dependencies).forEach(([name, info]: [string, any]) => {
            dependencies.push(processDependency(name, info));
        });
    }
    return dependencies;
}

function processPnpmDependencies(pnpmOutput: any): LocalDependencies[] {
    const dependencies: LocalDependencies[] = [];
    
    // pnpm list --json can return an array (for workspaces) or a single object
    // We need to handle both cases
    const outputs = Array.isArray(pnpmOutput) ? pnpmOutput : [pnpmOutput];
    
    const processDependency = (depNode: any): LocalDependencies => {
        const newDep: LocalDependencies = { 
            name: depNode.name, 
            version: depNode.version 
        };
        
        // pnpm can have dependencies as an array or object depending on version
        if (depNode.dependencies) {
            newDep.dependencies = [];
            if (Array.isArray(depNode.dependencies)) {
                // pnpm list --json returns dependencies as an array
                depNode.dependencies.forEach((child: any) => {
                    newDep.dependencies?.push(processDependency(child));
                });
            } else {
                // Handle object format (older pnpm versions or different output modes)
                Object.entries(depNode.dependencies).forEach(([childName, childInfo]: [string, any]) => {
                    const childDep: LocalDependencies = {
                        name: childName,
                        version: typeof childInfo === 'string' ? childInfo : childInfo.version
                    };
                    if (typeof childInfo === 'object' && childInfo.dependencies) {
                        childDep.dependencies = [];
                        if (Array.isArray(childInfo.dependencies)) {
                            childInfo.dependencies.forEach((grandChild: any) => {
                                childDep.dependencies?.push(processDependency(grandChild));
                            });
                        } else {
                            Object.entries(childInfo.dependencies).forEach(([gcName, gcInfo]: [string, any]) => {
                                childDep.dependencies?.push({
                                    name: gcName,
                                    version: typeof gcInfo === 'string' ? gcInfo : gcInfo.version
                                });
                            });
                        }
                    }
                    newDep.dependencies?.push(childDep);
                });
            }
        }
        
        return newDep;
    };
    
    for (const output of outputs) {
        // Process top-level dependencies from pnpm list output
        if (output.dependencies) {
            if (Array.isArray(output.dependencies)) {
                // pnpm list --json returns dependencies as an array
                output.dependencies.forEach((dep: any) => {
                    dependencies.push(processDependency(dep));
                });
            } else {
                // Handle object format
                Object.entries(output.dependencies).forEach(([name, info]: [string, any]) => {
                    const dep: LocalDependencies = {
                        name,
                        version: typeof info === 'string' ? info : info.version
                    };
                    if (typeof info === 'object' && info.dependencies) {
                        dep.dependencies = [];
                        if (Array.isArray(info.dependencies)) {
                            info.dependencies.forEach((child: any) => {
                                dep.dependencies?.push(processDependency(child));
                            });
                        } else {
                            Object.entries(info.dependencies).forEach(([childName, childInfo]: [string, any]) => {
                                dep.dependencies?.push({
                                    name: childName,
                                    version: typeof childInfo === 'string' ? childInfo : childInfo.version
                                });
                            });
                        }
                    }
                    dependencies.push(dep);
                });
            }
        }
        
        // Also handle devDependencies if present
        if (output.devDependencies) {
            if (Array.isArray(output.devDependencies)) {
                output.devDependencies.forEach((dep: any) => {
                    dependencies.push(processDependency(dep));
                });
            } else {
                Object.entries(output.devDependencies).forEach(([name, info]: [string, any]) => {
                    const dep: LocalDependencies = {
                        name,
                        version: typeof info === 'string' ? info : info.version
                    };
                    dependencies.push(dep);
                });
            }
        }
    }
    
    return dependencies;
}

/**
 * Gets the installed dependency versions with caching for performance.
 * @param archetypeConfig The archetype configuration.
 * @param repoPath The repository path to analyze (optional, defaults to options.dir)
 * @returns The installed dependency versions.
 */
export async function getDependencyVersionFacts(archetypeConfig: ArchetypeConfig, repoPath?: string): Promise<VersionData[]> {
    const startTime = Date.now();
    const dependencyCacheKey = getDependencyCacheKey(repoPath);
    const versionCacheKey = getVersionDataCacheKey(dependencyCacheKey, archetypeConfig);

    // Check cache first
    const cached = versionDataCache.get(versionCacheKey);
    if (cached && cached.cacheKey === versionCacheKey) {
        const cacheAge = Date.now() - cached.timestamp;
        logger.debug(`Using cached version data (age: ${cacheAge}ms)`);
        return cached.versionData;
    }

    logger.debug('Cache miss, computing dependency version facts...');

    const localDependencies = await collectLocalDependencies(repoPath);
    const minimumDependencyVersions = archetypeConfig.config.minimumDependencyVersions;

    if (!localDependencies || localDependencies.length === 0) {
        logger.warn('getDependencyVersionFacts: no local dependencies found');
        return [];
    }

    const installedDependencyVersions = findPropertiesInTree(localDependencies, minimumDependencyVersions);

    // Cache the result
    versionDataCache.set(versionCacheKey, {
        versionData: installedDependencyVersions,
        cacheKey: versionCacheKey,
        timestamp: Date.now()
    });

    const executionTime = Date.now() - startTime;
    logger.debug(`getDependencyVersionFacts completed in ${executionTime}ms (cache: ${cached ? 'HIT' : 'MISS'})`);

    return installedDependencyVersions;
}

/**
 * Recursively search for properties in a tree of objects.
 * @param depGraph - The object to search.
 * @param minVersions - The minimum dependency versions to search for.
 * @returns An array of results.
 */
export function findPropertiesInTree(depGraph: LocalDependencies[], minVersions: MinimumDepVersions): VersionData[] {
    const results: VersionData[] = [];
    const visited = new Set<string>();

    logger.trace({ depGraph }, 'Processing dependency graph');

    function walk(dep: LocalDependencies, parentName = '') {
        const fullName = parentName ? `${parentName}/${dep.name}` : dep.name;
        if (visited.has(fullName)) {
            return; // Skip if already visited to avoid circular references
        }
        visited.add(fullName);

        if (Object.keys(minVersions).some(key => key === dep.name || `@${key}` === dep.name)) {
            const minVersionKey = Object.keys(minVersions).find(key => key === dep.name || `@${key}` === dep.name);
            if (minVersionKey) {
                // Use optional chaining and nullish coalescing to avoid errors
                results.push({
                    dep: fullName,
                    ver: dep.version,
                    min: minVersions[minVersionKey]
                });
            }
        }
        if (dep.dependencies) {
            dep.dependencies.forEach(childDep => {
                // Avoid circular references by checking the full path
                const childFullName = `${fullName}/${childDep.name}`;
                if (!visited.has(childFullName)) {
                    walk(childDep, fullName);
                }
            });
        }
    }

    depGraph.forEach(dep => walk(dep));
    logger.debug(`findPropertiesInTree result: ${safeStringify(results)}`);
    return results;
}

export async function repoDependencyAnalysis(params: any, almanac: Almanac) {
    const result: any = { 'result': [] };

    try {
        // Get dependency data from the repoDependencyVersions fact
        const installedVersions: VersionData[] = await almanac.factValue('repoDependencyVersions') || [];
        
        // ✅ Create cache key to avoid redundant computation
        const cacheKey = `dependency-analysis-${installedVersions.length}-${JSON.stringify(installedVersions.slice(0, 3)).substring(0, 50)}`;
        
        // ✅ Check cache first for expensive analysis
        const cached = analysisCache.get(cacheKey);
        if (cached && cached.cacheKey === cacheKey) {
            const cacheAge = Date.now() - cached.timestamp;
            logger.debug(`Using cached dependency analysis result (age: ${cacheAge}ms, key: ${cacheKey.substring(0, 16)}...)`);
            
            // ✅ Always set runtime fact even for cached results
            if (params.resultFact) {
                almanac.addRuntimeFact(params.resultFact, cached.analysis);
            }
            
            return cached.analysis;
        }

        logger.debug(`Cache miss, computing dependency analysis... (${installedVersions.length} dependencies)`);
        
        const analysis: any = [];
        logger.debug(`repoDependencyAnalysis: found ${installedVersions.length} installed dependencies`);

        const versionsToCheck = installedVersions;
        logger.debug(`repoDependencyAnalysis: checking ${versionsToCheck.length} dependencies against requirements`);

        versionsToCheck.forEach((versionData: VersionData) => {
            logger.debug(`outdatedFramework: checking ${versionData.dep}`);

            try {
                // Check if the installed version satisfies the required version
                const isValid = semverValid(versionData.ver, versionData.min);
                if (!isValid && semver.valid(versionData.ver)) {
                    const dependencyFailure = {
                        'dependency': versionData.dep,
                        'currentVersion': versionData.ver,
                        'requiredVersion': versionData.min
                    };

                    logger.error(`dependencyFailure: ${safeStringify(dependencyFailure)}`);
                    analysis.push(dependencyFailure);
                }
            } catch (error) {
                logger.error(`Error validating dependency ${versionData.dep}: ${error}`);
            }
        });

        result.result = analysis;
        
        // ✅ Cache the result for future use
        analysisCache.set(cacheKey, {
            analysis,
            cacheKey,
            timestamp: Date.now()
        });

        // ✅ Add runtime fact with rule-specific name
        if (params.resultFact) {
            almanac.addRuntimeFact(params.resultFact, analysis);
        }

        logger.debug(`repoDependencyAnalysis result: ${safeStringify(result)}`);
        logger.debug(`repoDependencyAnalysis returning analysis array directly: ${safeStringify(analysis)}`);

        // Return just the analysis array for the outdatedFramework operator
        return result.result;
    } catch (error) {
        logger.error(`Error in repoDependencyAnalysis: ${error}`);
        // Return empty array on error for consistent interface
        return [];
    }
}

export function semverValid(installed: string, required: string): boolean {

    // Remove potential @namespace from installed version
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    installed = installed.includes('@') ? installed.split('@').pop()! : installed;

    if (!installed || !required) {
        return true;
    }

    // ensure that both inputs are now valid semver or range strings
    if (!semver.valid(installed) && !semver.validRange(installed)) {
        logger.error(`semverValid: invalid installed version or range: ${installed}`);
        return false;
    }
    if (!semver.valid(required) && !semver.validRange(required)) {
        logger.error(`semverValid: invalid required version or range: ${required}`);
        return false;
    }

    // If 'installed' is a single version and 'required' is a range
    if (semver.valid(installed) && semver.validRange(required)) {
        logger.debug('range vs version');
        // For pre-release versions, compare with the minimum version from the range
        if (semver.prerelease(installed)) {
            const minVer = semver.minVersion(required);
            return minVer ? semver.gte(installed, minVer) : true;
        }
        return semver.satisfies(installed, required);
    }

    // If 'required' is a single version and 'installed' is a range
    if (semver.valid(required) && semver.validRange(installed)) {
        logger.debug('version vs range');
        // For pre-release versions, use direct comparison
        if (semver.prerelease(required)) {
            return semver.satisfies(required, installed);
        }
        return semver.satisfies(required, installed);
    }

    // If both are single versions, simply compare them
    if (semver.valid(required) && semver.valid(installed)) {
        logger.debug('version vs version');
        // For pre-release versions, use semver.gte to include pre-releases in comparison
        return semver.gte(installed, required);
    }

    // If both are ranges, check if they intersect
    if (semver.validRange(required) && semver.validRange(installed)) {
        logger.debug('range vs range');
        return semver.intersects(required, installed);
    }

    return false;
}
export function normalizePackageName(name: string): string {
    return name.startsWith('@') ? name : `@${name}`;
}

// Export FactDefn objects for direct use in the plugin
export const dependencyVersionFact: FactDefn = {
    name: 'repoDependencyVersions',  // ✅ Fixed naming mismatch - was 'dependencyVersion'
    description: 'Checks dependency versions against minimum requirements',
    type: 'global',  // ✅ Global fact - precomputed once and cached
    priority: 10,    // ✅ Higher priority for dependency data
    fn: async (params: unknown, almanac?: unknown) => {
        // ✅ Extract repoPath and archetypeConfig from new parameter structure
        const { repoPath, archetypeConfig } = params as { repoPath: string; archetypeConfig: any };
        return getDependencyVersionFacts(archetypeConfig, repoPath);
    }
};

export const repoDependencyAnalysisFact: FactDefn = {
    name: 'repoDependencyAnalysis',
    description: 'Analyzes repository dependencies for outdated versions',
    type: 'global-function',  // ✅ FIXED: Changed from 'global' to 'global-function' to support rule parameters
    priority: 8,              // ✅ High priority for dependency analysis
    fn: async (params: unknown, almanac?: unknown) => {
        return await repoDependencyAnalysis(params, almanac as any);
    }
};