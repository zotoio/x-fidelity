import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

const outdatedFramework: OperatorDefn = {
    'name': 'outdatedFramework',
    'description': 'Checks if project uses outdated framework versions',
    'fn': (factValue: any) => {
        try {
            logger.debug(`outdatedFramework: processing ${JSON.stringify(factValue)}`);

            if (!factValue || !Array.isArray(factValue)) {
                logger.debug('outdatedFramework: factValue is not an array');
                return false;
            }

            const result = factValue.length > 0;
            logger.debug(`outdatedFramework: result is ${result}`);
            return result;
        } catch (e) {
            logger.error(`outdatedFramework error: ${e}`);
            return false;
        }
    }
};

export { outdatedFramework }; 