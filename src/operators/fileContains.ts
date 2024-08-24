import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

const fileContains: OperatorDefn = {
    'name': 'fileContains', 
    'fn': (repoFileAnalysis: any) => {
        let result = false;
        
        try {
            logger.debug(`fileContains: processing..`);

            if (repoFileAnalysis?.result?.length > 0) {
                return true;
            }
            
        } catch (e) {
            logger.error(`fileContains: ${e}`);
            result = true;
        }
        logger.debug(`fileContains: ${result}`);
        return result;
        
    }
}

export { fileContains };