import { OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

export const missingRequiredFiles: OperatorDefn = {
    name: 'missingRequiredFiles',
    fn: (factValue: any) => {
        try {
            logger.debug('missingRequiredFiles: processing..');

            if (factValue?.result?.length > 0) {
                logger.debug('missingRequiredFiles: true');
                return true;
            }

            logger.debug('missingRequiredFiles: false');
            return false;
        } catch (e) {
            logger.error(`missingRequiredFiles: ${e}`);
            return false;
        }
    }
};
