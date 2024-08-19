import { logger } from '../utils/logger';
import _ from 'lodash';
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
export function collectLocalDependencies(): LocalDependencies {
    if (fs.existsSync(path.join(options.dir, 'yarn.lock'))) {
        return collectYarnDependencies();
    } else if (fs.existsSync(path.join(options.dir, 'package-lock.json'))) {
        return collectNpmDependencies();
    } else {
        logger.error('No yarn.lock or package-lock.json found');
        throw new Error('Unsupported package manager');
    }
}

function collectYarnDependencies(): LocalDependencies {
    try {
        const stdout = execSync(`yarn list --json --depth=0 --cwd ${options.dir}`);
        const result = JSON.parse(stdout.toString());
        logger.debug(`collectYarnDependencies: ${JSON.stringify(result)}`);
        return processYarnDependencies(result);
    } catch (e) {
        logger.error(`Error collecting Yarn dependencies: ${e}`);
        throw e;
    }
}

function collectNpmDependencies(): LocalDependencies {
    try {
        const stdout = execSync(`npm ls -a --json --depth=0 --prefix ${options.dir}`);
        const result = JSON.parse(stdout.toString());
        logger.debug(`collectNpmDependencies: ${JSON.stringify(result)}`);
        return processNpmDependencies(result);
    } catch (e) {
        logger.error(`Error collecting NPM dependencies: ${e}`);
        throw e;
    }
}

function processYarnDependencies(yarnOutput: any): LocalDependencies {
    const dependencies: LocalDependencies = { dependencies: {} };
    if (yarnOutput.data && yarnOutput.data.trees) {
        yarnOutput.data.trees.forEach((tree: any) => {
            const name = tree.name.split('@')[0];
            const version = tree.name.split('@')[1];
            dependencies.dependencies[name] = { version };
        });
    }
    return dependencies;
}

function processNpmDependencies(npmOutput: any): LocalDependencies {
    const dependencies: LocalDependencies = { dependencies: {} };
    if (npmOutput.dependencies) {
        Object.entries(npmOutput.dependencies).forEach(([name, info]: [string, any]) => {
            dependencies.dependencies[name] = { version: info.version };
        });
    }
    return dependencies;
}

/**
 * Gets the installed dependency versions.
 * @param archetypeConfig The archetype configuration.
 * @returns The installed dependency versions.
 */
export async function getDependencyVersionFacts(archetypeConfig: ArchetypeConfig) {
    const localDependencies = collectLocalDependencies();
    const minimumDependencyVersions = archetypeConfig.config.minimumDependencyVersions;

    if (!localDependencies) {
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
export function findPropertiesInTree(depGraph: LocalDependencies, minVersions: MinimumDepVersions): VersionData[] {
    const results: VersionData[] = [];

    logger.debug(`depGraph: ${depGraph}`);

    function walk(depGraph: LocalDependencies) {
        if (_.isObject(depGraph) && !_.isArray(depGraph)) {
            for (const depName in depGraph) {
                if (Object.keys(minVersions).includes(depName)) {
                    results.push({ dep: depName, ver: depGraph[depName].version, min: minVersions[depName] });
                }
                if (_.isObject(depGraph[depName])) {
                    walk(depGraph[depName] as unknown as LocalDependencies);
                }
            }
        } else if (_.isArray(depGraph)) {
            for (const item of depGraph) {
                walk(item);
            }
        }
    }

    walk(depGraph);
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

        const requiredRange = new semver.Range(versionData.min);
        if (!semver.gtr(versionData.ver, requiredRange)) {
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
