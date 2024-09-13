import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const outdatedFramework: OperatorDefn = {
    'name': 'outdatedFramework', 
    'fn': (repoDependencyAnalysis: any) => {
        let result = false;
        
        logger.debug(`outdatedFramework: processing ${JSON.stringify(repoDependencyAnalysis)}`);

        if (repoDependencyAnalysis?.result?.length > 0) {
            result = true;
        }
        
        return result;
    }
}

export { outdatedFramework };
