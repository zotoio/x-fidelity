import { logger } from '../utils/logger';
import { OperatorDefn, VersionData } from '../typeDefs';
import * as semver from 'semver';

const currentDependencies: OperatorDefn = {
    'name': 'currentDependencies', 
    'fn': (filePath: any, dependencyData: any) => {
        let result = false;

        // this is a special rule we only run on the root package.json, however it checks the entire dependency tree.
        if (filePath !== 'package.json') {
            return true;
        }
        logger.debug(`currentDependencies: working..`);
        
        try {
            logger.debug(`currentDependencies: processing ${dependencyData.installedDependencyVersions}`);
            
            dependencyData.installedDependencyVersions.map((versionData: VersionData) => { 
                logger.debug(`currentDependencies: checking ${versionData.dep}`);

                const requiredRange = new semver.Range(versionData.min);
                if (!semver.gtr(versionData.ver, requiredRange)) {
                    let msg = `dependency ${versionData.dep} is outdated. Current version: ${versionData.ver}, required: ${versionData.min}`;
                    logger.error(`currentDependencies: ${msg}`);
                    throw new Error(msg);
                }
            });
            result = true;
        } catch (e) {
        
            result = false;
        }
        logger.debug(`currentDependencies: ${result}`);
        return result;
        
    }
}

export { currentDependencies };