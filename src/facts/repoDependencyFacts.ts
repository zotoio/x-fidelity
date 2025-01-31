import { logger } from '../utils/logger';
import { exec } from 'child_process';
import { LocalDependencies, MinimumDepVersions, VersionData, ArchetypeConfig } from '../types/typeDefs';
import { Almanac } from 'json-rules-engine';
import * as semver from 'semver';
import { FileData } from '../types/typeDefs';
import { options } from '../core/cli';
import fs from 'fs';
import path from 'path';
import { safeClone, safeStringify } from '../utils/utils';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Collects the local dependencies.
 * @returns The local dependencies.
 */
export async function collectLocalDependencies(): Promise<LocalDependencies[]> {
    let result: LocalDependencies[] = [];
    if (fs.existsSync(path.join(options.dir, 'yarn.lock'))) {
        result = await collectNodeDependencies('yarn');
    } else if (fs.existsSync(path.join(options.dir, 'package-lock.json'))) {
        result = await collectNodeDependencies('npm');
    } else {
        logger.on('finish', function () {
            process.exit(1);
        });
        logger.error('No yarn.lock or package-lock.json found');
        logger.end();
        throw new Error('Unsupported package manager');
    }
    logger.debug(`collectLocalDependencies: ${safeStringify(result)}`);
    return result;
}

async function collectNodeDependencies(packageManager: string): Promise<LocalDependencies[]>  {
    const emptyDeps: LocalDependencies[] = [];
    try {
        
        const { stdout, stderr } = packageManager === 'npm' ? 
            await execPromise('npm ls -a --json', { cwd: options.dir, maxBuffer: 10485760 }) :
            await execPromise('yarn list --json', { cwd: options.dir, maxBuffer: 10485760 })

        if (stderr?.includes('"error"')) {
            logger.error(`Error determining ${packageManager} dependencies: ${stderr}`);
            throw new Error(stderr);
        }

        try {
            const result = JSON.parse(stdout);
            logger.debug(`collectNodeDependencies ${packageManager}: ${JSON.stringify(result)}`);
            return packageManager === 'npm' ? 
            processNpmDependencies(result) :
            processYarnDependencies(result)

        } catch (e) {
            logger.error(`Error parsing ${packageManager} dependencies: ${e}`);
            throw new Error(stderr);
        }
    } catch (e: any) {
        let message = `Error determining ${packageManager} dependencies: ${e}`;

        if (e.message?.includes('ELSPROBLEMS')) {
            message += `\nError determining ${packageManager} dependencies: did you forget to run '${packageManager} install' first?`;
        }
        logger.error(message);
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
    
    if (!archetypeConfig.facts.includes('repoDependencyFacts')) {
        logger.warn('getDependencyVersionFacts: dependencyVersionFacts is not enabled for this archetype');
        return [];
    }
    const localDependencies = await collectLocalDependencies();
    const minimumDependencyVersions = archetypeConfig.config.minimumDependencyVersions;

    if (!localDependencies || localDependencies.length === 0) {
        logger.warn('getDependencyVersionFacts: no local dependencies found');
        return [];
    }

    const installedDependencyVersions = findPropertiesInTree(localDependencies, minimumDependencyVersions);
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

    logger.debug({ depGraph }, 'Processing dependency graph');

    function walk(dep: LocalDependencies, parentName = '') {
        const fullName = parentName ? `${parentName}/${dep.name}` : dep.name;
        if (visited.has(fullName)) {
            return; // Skip if already visited to avoid circular references
        }
        visited.add(fullName);

        if (Object.keys(minVersions).some(key => key === dep.name || `@${key}` === dep.name)) {
            const minVersionKey = Object.keys(minVersions).find(key => key === dep.name || `@${key}` === dep.name);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            results.push({ dep: fullName, ver: dep.version, min: minVersions[minVersionKey!] });
        }
        if (dep.dependencies) {
            dep.dependencies.forEach(childDep => {
                walk(childDep, fullName);
            });
        }
    }

    depGraph.forEach(dep => walk(dep));
    logger.debug(`findPropertiesInTree result: ${safeStringify(results)}`);
    return results;
}

export async function repoDependencyAnalysis(params: any, almanac: Almanac) {

    const result: any = {'result': []};
    const fileData: FileData = await almanac.factValue('fileData');

    if (fileData.fileName !== 'REPO_GLOBAL_CHECK') {
        return result;
    }

    const analysis: any = [];
    const dependencyData: any = await almanac.factValue('dependencyData');
    const safeDependencyData = safeClone(dependencyData);

    safeDependencyData.installedDependencyVersions.forEach((versionData: VersionData) => { 
        logger.debug(`outdatedFramework: checking ${versionData.dep}`);

        // Check if the installed version satisfies the required version, supporting both ranges and specific versions
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
    });

    result.result = analysis;

    almanac.addRuntimeFact(params.resultFact, result);

    logger.debug(`repoDependencyAnalysis result: ${safeStringify(result)}`);
    return result;
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
