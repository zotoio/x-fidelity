import { logger } from '../utils/logger';
import { execSync } from 'child_process';
import { LocalDependencies, MinimumDepVersions, VersionData, ArchetypeConfig } from '../types/typeDefs';
import { Almanac } from 'json-rules-engine';
import * as semver from 'semver';
import { FileData } from './repoFilesystemFacts';
import { options } from '../core/cli';
import fs from 'fs';
import path from 'path';

/**
 * Collects the local dependencies.
 * @returns The local dependencies.
 */
export function collectLocalDependencies(): LocalDependencies[] {
    let result:LocalDependencies[] = [];
    if (fs.existsSync(path.join(options.dir, 'yarn.lock'))) {
        result = collectYarnDependencies();
    } else if (fs.existsSync(path.join(options.dir, 'package-lock.json'))) {
        result = collectNpmDependencies();
    } else {
        logger.error('No yarn.lock or package-lock.json found');
        throw new Error('Unsupported package manager');
    }
    logger.info(`collectLocalDependencies: ${JSON.stringify(result)}`);
    return result;
}

function collectYarnDependencies(): LocalDependencies[] {
    try {
        const stdout = execSync(`yarn list --json --cwd ${options.dir}`);
        const result = JSON.parse(stdout.toString());
        logger.debug(`collectYarnDependencies: ${JSON.stringify(result)}`);
        return processYarnDependencies(result);
    } catch (e) {
        logger.error(`Error collecting Yarn dependencies: ${e}`);
        throw e;
    }
}

function collectNpmDependencies(): LocalDependencies[] {
    try {
        const stdout = execSync(`npm ls -a --json --prefix ${options.dir}`);
        const result = JSON.parse(stdout.toString());
        logger.debug(`collectNpmDependencies: ${JSON.stringify(result)}`);
        return processNpmDependencies(result);
    } catch (e) {
        logger.error(`Error collecting NPM dependencies: ${e}`);
        throw e;
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
            const parts = nameAndVersion.split('@');
            return { name: parts[0], version: parts[1] };
        }
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
export function getDependencyVersionFacts(archetypeConfig: ArchetypeConfig): VersionData[] {
    const localDependencies = collectLocalDependencies();
    const minimumDependencyVersions = archetypeConfig.config.minimumDependencyVersions;

    if (!localDependencies || localDependencies.length === 0) {
        logger.error('getDependencyVersionFacts: no local dependencies found');
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

    logger.info(`depGraph: ${JSON.stringify(depGraph)}`);

    function walk(dep: LocalDependencies, parentName = '') {
        const fullName = parentName ? `${parentName}/${dep.name}` : dep.name;
        if (Object.keys(minVersions).includes(dep.name)) {
            results.push({ dep: fullName, ver: dep.version, min: minVersions[dep.name] });
        }
        if (dep.dependencies) {
            dep.dependencies.forEach(childDep => {
                walk(childDep, fullName);
            });
        }
    }

    depGraph.forEach(dep => walk(dep));
    logger.info(JSON.stringify(results))
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

    dependencyData.installedDependencyVersions.map((versionData: VersionData) => { 
        logger.debug(`outdatedFramework: checking ${versionData.dep}`);

        const isValid = semver.satisfies(versionData.ver, versionData.min);
        if (!isValid) {
            const dependencyFailure = {
                'dependency': versionData.dep,
                'currentVersion': versionData.ver,
                'requiredVersion': versionData.min
            };
            
            logger.error(`dependencyFailure: ${JSON.stringify(dependencyFailure)}`);
            analysis.push(dependencyFailure);
        }
    });

    result.result = analysis;

    almanac.addRuntimeFact(params.resultFact, result);

    return result;
}
