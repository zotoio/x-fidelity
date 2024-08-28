import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const outdatedFramework: OperatorDefn = {
    'name': 'outdatedFramework', 
    'fn': (repoDependencyAnalysis: any) => {
        let result = false;
        
        try {
            logger.debug(`outdatedFramework: processing ${JSON.stringify(repoDependencyAnalysis)}`);

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
