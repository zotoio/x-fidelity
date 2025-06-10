import { logger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

const hasFilesWithMultiplePatterns: OperatorDefn = {
    'name': 'hasFilesWithMultiplePatterns',
    'description': 'Checks if there are files with multiple patterns',
    'fn': (factValue: any) => {
        try {
            logger.debug(`hasFilesWithMultiplePatterns: processing ${JSON.stringify(factValue)}`);

            if (!factValue || !Array.isArray(factValue)) {
                logger.debug('hasFilesWithMultiplePatterns: factValue is not an array');
                return false;
            }

            const result = factValue.length > 0;
            logger.debug(`hasFilesWithMultiplePatterns: result is ${result}`);
            return result;
        } catch (e) {
            logger.error(`hasFilesWithMultiplePatterns error: ${e}`);
            return false;
        }
    }
};

export { hasFilesWithMultiplePatterns }; 