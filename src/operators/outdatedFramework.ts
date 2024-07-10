import { logger } from '../utils/logger';
import { OperatorDefn, VersionData } from '../typeDefs';
import * as semver from 'semver';
import { REPO_GLOBAL_CHECK } from '../utils/config';

const outdatedFramework: OperatorDefn = {
    'name': 'outdatedFramework', 
    'fn': (fileName: any, dependencyData: any) => {
        let result = true;

        // this is a special rule we only run on the root package.json, however it checks the entire dependency tree.
        if (fileName !== REPO_GLOBAL_CHECK) {
            return false;
        }
        console.log(`running global dependency currency checks..`);
        
        try {
            logger.debug(`outdatedFramework: processing ${dependencyData.installedDependencyVersions}`);
            
            dependencyData.installedDependencyVersions.map((versionData: VersionData) => { 
                logger.debug(`outdatedFramework: checking ${versionData.dep}`);

                const requiredRange = new semver.Range(versionData.min);
                if (!semver.gtr(versionData.ver, requiredRange)) {
                    let msg = `dependency ${versionData.dep} is outdated. Current version: ${versionData.ver}, required: ${versionData.min}`;
                    logger.error(`outdatedFramework: ${msg}`);
                    throw new Error(msg);
                }
            });
            result = false;
        } catch (e) {
        
            result = true;
        }
        logger.debug(`outdatedFramework: ${result}`);
        return result;
        
    }
}

export { outdatedFramework };
