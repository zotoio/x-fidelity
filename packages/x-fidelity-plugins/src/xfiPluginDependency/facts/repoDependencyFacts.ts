import { logger, options, safeClone, safeStringify, repoDir } from '@x-fidelity/core';
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

export const dependencyVersionFact: FactDefn = {
    name: 'dependencyVersion',
    description: 'Checks dependency versions against minimum requirements',
    fn: async (params: unknown, almanac?: unknown) => {
        const archetypeConfig = params as ArchetypeConfig;
        return getDependencyVersionFacts(archetypeConfig);
    }
};

export const localDependenciesFact: FactDefn = {
    name: 'localDependencies',
    description: 'Collects local project dependencies',
    fn: async (params: unknown, almanac?: unknown) => {
        return collectLocalDependencies();
    }
};

/**
 * Collects the local dependencies.
 * @returns The local dependencies.
 */
export async function collectLocalDependencies(): Promise<LocalDependencies[]> {
    let result: LocalDependencies[] = [];
    const repoDir = options.dir || process.cwd();
    if (fs.existsSync(path.join(repoDir, 'yarn.lock'))) {
        result = await collectNodeDependencies('yarn');
    } else if (fs.existsSync(path.join(repoDir, 'package-lock.json'))) {
        result = await collectNodeDependencies('npm');
    } else {
        logger.error('No yarn.lock or package-lock.json found');
        process.exit(1);
    }
    logger.trace(`collectLocalDependencies: ${safeStringify(result)}`);
    return result;
}

async function collectNodeDependencies(packageManager: string): Promise<LocalDependencies[]>  {
    const emptyDeps: LocalDependencies[] = [];
    try {
        let stdout: string;
        let stderr: string = '';
        
        try {
            // Use execSync as a fallback if execPromise fails
            if (packageManager === 'npm') {
                const result = await execPromise('npm ls -a --json', { cwd: options.dir, maxBuffer: 10485760 });
                stdout = result.stdout;
                stderr = result.stderr;
            } else {
                const result = await execPromise('yarn list --json', { cwd: options.dir, maxBuffer: 10485760 });
                stdout = result.stdout;
                stderr = result.stderr;
            }
        } catch (execError) {
            // If promisified exec fails, fall back to execSync
            logger.warn(`Falling back to execSync for ${packageManager} dependencies`);
            const output = execSync(
                packageManager === 'npm' ? 'npm ls -a --json' : 'yarn list --json', 
                { cwd: options.dir, maxBuffer: 10485760 }
            );
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
            const result = JSON.parse(stdout);
            logger.trace(`collectNodeDependencies ${packageManager}: ${JSON.stringify(result)}`);
            return packageManager === 'npm' ? 
            processNpmDependencies(result) :
            processYarnDependencies(result)

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
        const newDep: LocalDependencies = {name, version: info.version };
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

/**
 * Gets the installed dependency versions.
 * @param archetypeConfig The archetype configuration.
 * @returns The installed dependency versions.
 */
export async function getDependencyVersionFacts(archetypeConfig: ArchetypeConfig): Promise<VersionData[]> {
    logger.debug('Getting dependency version facts...');

    try {
        // Get installed dependencies
        const installedDeps = await getInstalledDependencies();
        logger.debug(`Found ${Object.keys(installedDeps).length} installed dependencies`);

        // Get minimum required versions
        const minVersions = await getMinimumDependencyVersions(archetypeConfig);
        logger.debug(`Found ${Object.keys(minVersions).length} minimum version requirements`);

        // Get latest versions
        const latestVersions = await getLatestDependencyVersions(installedDeps);
        logger.debug(`Found ${Object.keys(latestVersions).length} latest versions`);

        // Compare versions and build result
        const result: VersionData[] = [];
        for (const [dep, ver] of Object.entries(installedDeps)) {
            const latestVersion = latestVersions[dep];
            const minVersion = minVersions[dep];

            if (!latestVersion) {
                logger.warn(`Could not determine latest version for ${dep}`);
                continue;
            }

            // Clean the version string by removing range specifiers
            const cleanVer = ver.replace(/^[\^~>=<]/, '');
            
            let isOutdated = false;
            let updateType: 'major' | 'minor' | 'patch' = 'patch';
            
            try {
                if (semver.valid(cleanVer) && semver.valid(latestVersion)) {
                    isOutdated = semver.lt(cleanVer, latestVersion);
                    updateType = isOutdated ? getUpdateType(cleanVer, latestVersion) : 'patch';
                }
            } catch (error) {
                logger.warn(`Error comparing versions for ${dep}: ${error}`);
            }

            result.push({
                name: dep,
                version: cleanVer,
                latestVersion,
                isOutdated,
                updateType,
                dep,
                min: minVersion || '',
                ver: cleanVer
            });
        }

        return result;
    } catch (error) {
        logger.error(`Error getting dependency version facts: ${error}`);
        throw error;
    }
}

function getUpdateType(currentVersion: string, latestVersion: string): 'major' | 'minor' | 'patch' {
    const current = semver.parse(currentVersion);
    const latest = semver.parse(latestVersion);

    if (!current || !latest) {
        return 'major';
    }

    if (latest.major > current.major) {
        return 'major';
    }
    if (latest.minor > current.minor) {
        return 'minor';
    }
    return 'patch';
}

async function getInstalledDependencies(): Promise<Record<string, string>> {
    try {
        const packageJsonPath = path.join(repoDir() || process.cwd(), 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            logger.warn('No package.json found');
            return {};
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const dependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
        };

        return dependencies;
    } catch (error) {
        logger.error(`Error getting installed dependencies: ${error}`);
        throw error;
    }
}

async function getMinimumDependencyVersions(archetypeConfig: ArchetypeConfig): Promise<MinimumDepVersions> {
    try {
        return archetypeConfig.minimumDependencyVersions || {};
    } catch (error) {
        logger.error(`Error getting minimum dependency versions: ${error}`);
        throw error;
    }
}

async function getLatestDependencyVersions(installedDeps: Record<string, string>): Promise<Record<string, string>> {
    const latestVersions: Record<string, string> = {};

    try {
        for (const dep of Object.keys(installedDeps)) {
            try {
                const output = execSync(`npm view ${dep} version`, { encoding: 'utf8' });
                latestVersions[dep] = output.trim();
            } catch (error) {
                logger.warn(`Error getting latest version for ${dep}: ${error}`);
            }
        }

        return latestVersions;
    } catch (error) {
        logger.error(`Error getting latest dependency versions: ${error}`);
        throw error;
    }
}

/**
 * Recursively search for properties in a tree of objects.
 * @param depGraph - The object to search.
 * @param minVersions - The minimum dependency versions to search for.
 * @returns An array of results.
 */
export function findPropertiesInTree(depGraph: LocalDependencies[], minVersions: MinimumDepVersions): VersionData[] {
    const results: VersionData[] = [];

    function walk(dep: LocalDependencies) {
        if (dep.name && dep.version) {
            const minVersion = minVersions[dep.name];
            if (minVersion) {
                const isOutdated = !semverValid(dep.version, minVersion);
                const updateType = isOutdated ? getUpdateType(dep.version, minVersion) : 'patch';
                results.push({
                    name: dep.name,
                    version: dep.version,
                    latestVersion: minVersion,
                    isOutdated,
                    updateType,
                    dep: dep.name,
                    min: minVersion,
                    ver: dep.version
                });
            }
        }

        if (dep.dependencies) {
            for (const childDep of dep.dependencies) {
                walk(childDep);
            }
        }
    }

    for (const dep of depGraph) {
        walk(dep);
    }

    return results;
}

export async function repoDependencyAnalysis(params: any, almanac: Almanac) {
    const result: any = {'result': []};
    
    try {
        const fileData: FileData = await almanac.factValue('fileData');

        if (fileData.fileName !== 'REPO_GLOBAL_CHECK') {
            return result;
        }

        const analysis: any = [];
        const dependencyData: any = await almanac.factValue('dependencyData');
        const safeDependencyData = safeClone(dependencyData);

        // Use rule-provided versions if they exist, otherwise use the ones from dependencyData
        const versionsToCheck = params?.minimumDependencyVersions ? 
            safeDependencyData.installedDependencyVersions.filter((versionData: VersionData) => 
                params.minimumDependencyVersions[versionData.dep]) :
            safeDependencyData.installedDependencyVersions;

        versionsToCheck.forEach((versionData: VersionData) => { 
            logger.debug(`outdatedFramework: checking ${versionData.dep}`);

            try {
                // Check if the installed version satisfies the required version, supporting both ranges and specific versions
                // Get required version from rule params if it exists, otherwise from archetype config
                const requiredVersion = params?.minimumDependencyVersions?.[versionData.dep] || versionData.min;
                
                // Check if the installed version satisfies the required version
                const isValid = semverValid(versionData.ver, requiredVersion);
                if (!isValid && semver.valid(versionData.ver)) {
                    const dependencyFailure = {
                        'dependency': versionData.dep,
                        'currentVersion': versionData.ver,
                        'requiredVersion': requiredVersion
                    };
                    
                    logger.error(`dependencyFailure: ${safeStringify(dependencyFailure)}`);
                    analysis.push(dependencyFailure);
                }
            } catch (error) {
                logger.error(`Error validating dependency ${versionData.dep}: ${error}`);
            }
        });

        result.result = analysis;

        almanac.addRuntimeFact(params.resultFact, result);

        logger.debug(`repoDependencyAnalysis result: ${safeStringify(result)}`);
    } catch (error) {
        logger.error(`Error in repoDependencyAnalysis: ${error}`);
    }
    
    return result;
}

export function semverValid(installed: string, required: string): boolean {
    try {
        if (!semver.valid(installed) || !semver.valid(required)) {
            return false;
        }
        return semver.gte(installed, required);
    } catch (error) {
        logger.error(`Error comparing versions: ${error}`);
        return false;
    }
}

export function normalizePackageName(name: string): string {
    return name.startsWith('@') ? name : `@${name}`;
}

function parseYarnLock(content: string, packageName: string): LocalDependencies[] {
    const childDeps: LocalDependencies[] = [];
    const lines = content.split('\n');
    let isInPackage = false;

    for (const line of lines) {
        if (line.startsWith(`"${packageName}@`)) {
            isInPackage = true;
        } else if (isInPackage && line.trim().startsWith('dependencies:')) {
            isInPackage = false;
            break;
        } else if (isInPackage && line.trim().startsWith('version')) {
            const version = line.split('"')[1];
            childDeps.push({
                name: packageName,
                version,
                dependencies: []
            });
        }
    }

    return childDeps;
}

function parsePackageLock(packageLock: any, packageName: string): Record<string, any> {
    const childDeps: Record<string, any> = {};

    function walk(deps: Record<string, any>) {
        for (const [name, info] of Object.entries(deps)) {
            if (name === packageName) {
                if (info.dependencies) {
                    Object.assign(childDeps, info.dependencies);
                }
            } else if (info.dependencies) {
                walk(info.dependencies);
            }
        }
    }

    if (packageLock.dependencies) {
        walk(packageLock.dependencies);
    }

    return childDeps;
}

function processDependency(name: string, info?: any): LocalDependencies {
    return {
        name,
        version: info?.version || '',
        dependencies: []
    };
}


