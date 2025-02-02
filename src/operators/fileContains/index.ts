import { logger } from '../../utils/logger';
import { OperatorDefn } from '../../types/typeDefs';

export const fileContains: OperatorDefn = {
    'name': 'fileContains', 
    'fn': (repoFileAnalysis: any) => {
        try {
            logger.debug(`fileContains: processing..`);

            if (repoFileAnalysis?.result?.length > 0) {
                logger.debug(`fileContains: true`);
                return true;
            }
        
        } catch (e) {
            logger.error(`fileContains: ${e}`);
            return false;
        }
        logger.debug(`fileContains: false`);
        return false;
    }
}
