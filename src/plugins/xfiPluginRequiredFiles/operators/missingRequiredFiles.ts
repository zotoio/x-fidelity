import { OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

export const missingRequiredFiles: OperatorDefn = {
    name: 'missingRequiredFiles',
    fn: (factValue: any, compareValue: boolean) => {
        try {
            logger.debug('missingRequiredFiles: processing..');

            if (factValue?.result?.length > 0) {
                logger.debug('missingRequiredFiles: true');
                return compareValue;
            }

            logger.debug('missingRequiredFiles: false');
            return !compareValue;
        } catch (e) {
            logger.error(`missingRequiredFiles: ${e}`);
            return !compareValue;
        }
    }
};
