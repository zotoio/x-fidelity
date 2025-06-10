import { logger, isPathInside, REPO_GLOBAL_CHECK, options } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

const nonStandardDirectoryStructure: OperatorDefn = {
    'name': 'nonStandardDirectoryStructure',
    'description': 'Checks if directory structure does not match the standard',
    'fn': (factValue: any, standardStructure: any) => {
        try {
            logger.debug(`nonStandardDirectoryStructure: processing ${JSON.stringify(factValue)} with structure ${JSON.stringify(standardStructure)}`);

            if (!factValue || !Array.isArray(factValue)) {
                logger.debug('nonStandardDirectoryStructure: factValue is not an array');
                return false;
            }

            if (!standardStructure || typeof standardStructure !== 'object') {
                logger.debug('nonStandardDirectoryStructure: standardStructure is not an object');
                return false;
            }

            const paths = factValue.map((file: any) => file.filePath);
            const result = paths.some((path: string) => !isPathInside(path, standardStructure));

            logger.debug(`nonStandardDirectoryStructure: result is ${result}`);
            return result;
        } catch (e) {
            logger.error(`nonStandardDirectoryStructure error: ${e}`);
            return false;
        }
    }
};

export { nonStandardDirectoryStructure }; 