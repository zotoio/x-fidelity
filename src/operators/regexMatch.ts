import { logger } from '../utils/logger';
import { OperatorDefn } from '../types/typeDefs';

/**
 * Operator that tests if a string matches a regular expression pattern
 * 
 * @param factValue - The string to test against the regex pattern
 * @param regexPattern - The regex pattern to test against (as a string)
 * @returns true if the string matches the pattern, false otherwise
 */
const regexMatch: OperatorDefn = {
    'name': 'regexMatch',
    'fn': (factValue: any, regexPattern: string) => {
        try {
            logger.debug(`regexMatch: testing ${factValue} against pattern ${regexPattern}`);
            
            if (factValue === undefined || factValue === null) {
                logger.debug('regexMatch: factValue is undefined or null');
                return false;
            }

            if (typeof regexPattern !== 'string') {
                logger.debug(`regexMatch: regexPattern is not a string: ${typeof regexPattern}`);
                return false;
            }

            // Extract flags if they exist (pattern/flags format)
            let flags = '';
            let pattern = regexPattern;
            
            // Check if the pattern is in /pattern/flags format
            const regexFormatMatch = /^\/(.+)\/([gimsuyd]*)$/.exec(regexPattern);
            if (regexFormatMatch) {
                pattern = regexFormatMatch[1];
                flags = regexFormatMatch[2];
                logger.debug(`regexMatch: extracted pattern "${pattern}" with flags "${flags}"`);
            }

            const regex = new RegExp(pattern, flags);
            const result = regex.test(String(factValue));
            
            logger.debug(`regexMatch: result is ${result}`);
            return result;
        } catch (e) {
            logger.error(`regexMatch error: ${e}`);
            return false;
        }
    }
};

export { regexMatch };
