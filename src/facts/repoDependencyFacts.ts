import { logger } from '../utils/logger';
import _ from 'lodash';
import { execSync } from 'child_process';
import { LocalDependencies, MinimumDepVersions, VersionData } from '../typeDefs';
import { collectMinimumDependencyVersions } from '../utils/config';

/**
 * Collects the local dependencies.
 * @returns The local dependencies.
 */
export function collectLocalDependencies(): LocalDependencies {
    let result: LocalDependencies = {};
    try {
        let stdout = execSync('npm ls -a --json');
        result = JSON.parse(stdout.toString());
    } catch (e) {
        logger.error(`exec error: ${e}`);
        //console.error(`exec error: ${e}`);
    }
    return result;
}

/**
 * Gets the installed dependency versions.
 * @returns The installed dependency versions.
 */
export async function getDependencyVersionFacts() {
    const localDependencies = await collectLocalDependencies();
    const minimumDependencyVersions = await collectMinimumDependencyVersions();

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
    let results: VersionData[] = [];

    logger.debug(`depGraph: ${depGraph}`);

    function walk(depGraph: LocalDependencies) {
        if (_.isObject(depGraph) && !_.isArray(depGraph)) {
            for (let depName in depGraph) {
                if (Object.keys(minVersions).includes(depName)) {
                    results.push({ dep: depName, ver: depGraph[depName].version, min: minVersions[depName] });
                }
                if (_.isObject(depGraph[depName])) {
                    walk(depGraph[depName] as unknown as LocalDependencies);
                }
            }
        } else if (_.isArray(depGraph)) {
            for (let item of depGraph) {
                walk(item);
            }
        }
    }

    walk(depGraph);
    return results;
}
