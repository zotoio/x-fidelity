import { logger } from '../utils/logger';
import { OperatorDefn, VersionData } from '../types/typeDefs';
import { REPO_GLOBAL_CHECK } from '../utils/config';

const outdatedFramework: OperatorDefn = {
    'name': 'outdatedFramework', 
    'fn': (repoDependencyAnalysis: any, repoDependencyFacts: any) => {
        let result = false;
        
        try {
            logger.debug(`outdatedFramework: processing ${repoDependencyAnalysis}`);

            if (repoDependencyAnalysis?.result?.length > 0) {
                return true;
            }
            
        } catch (e) {
            logger.error(`outdatedFramework: ${e}`);
            result = true;
        }
        logger.debug(`outdatedFramework: ${result}`);
        return result;
        
    }
}

export { outdatedFramework };
