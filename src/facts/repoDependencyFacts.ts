import { logger } from '../utils/logger';
import _ from 'lodash';
import { execSync } from 'child_process';
import { LocalDependencies, MinimumDepVersions, VersionData, ArchetypeConfig } from '../types/typeDefs';
import { Almanac } from 'json-rules-engine';
import * as semver from 'semver';
import { FileData } from './repoFilesystemFacts';

/**
 * Collects the local dependencies.
 * @returns The local dependencies.
 */
export function collectLocalDependencies(): LocalDependencies {
    let result: LocalDependencies = {};
    try {
        const stdout = execSync('npm ls -a --json');
        result = JSON.parse(stdout.toString());
    } catch (e) {
        logger.error(`exec error: ${e}`);
        //console.error(`exec error: ${e}`);
    }
    return result;
}

/**
 * Gets the installed dependency versions.
 * @param archetypeConfig The archetype configuration.
 * @returns The installed dependency versions.
 */
export async function getDependencyVersionFacts(archetypeConfig: ArchetypeConfig) {
    const localDependencies = collectLocalDependencies();
    const minimumDependencyVersions = archetypeConfig.config.minimumDependencyVersions;

    //console.log(localDependencies);

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