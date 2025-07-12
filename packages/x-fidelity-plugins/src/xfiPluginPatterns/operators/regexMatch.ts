import { pluginLogger } from '@x-fidelity/core';
import { OperatorDefn } from '@x-fidelity/types';

const regexMatch: OperatorDefn = {
    'name': 'regexMatch',
    'description': 'Matches fact values against regex patterns with enhanced logging',
    'fn': (factValue: any, regexPattern: string) => {
        const logger = pluginLogger.createOperatorLogger('xfi-plugin-patterns', 'regexMatch');
        
        try {
            logger.debug('Executing regex match operator', {
                factValueType: typeof factValue,
                patternLength: regexPattern?.length || 0,
                pattern: regexPattern?.substring(0, 100) + (regexPattern?.length > 100 ? '...' : '')
            });
            
            if (factValue === undefined || factValue === null) {
                logger.debug('Regex match: factValue is undefined or null');
                return false;
            }

            if (typeof regexPattern !== 'string') {
                logger.debug('Regex match: regexPattern is not a string', { 
                    patternType: typeof regexPattern 
                });
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
                logger.debug('Regex match: extracted pattern with flags', { 
                    originalPattern: regexPattern,
                    extractedPattern: pattern, 
                    flags 
                });
            }

            const regex = new RegExp(pattern, flags);
            const result = regex.test(String(factValue));
            
            logger.debug('Regex match completed', { 
                result,
                patternUsed: pattern,
                flagsUsed: flags,
                factValueLength: String(factValue).length
            });
            
            return result;
        } catch (e) {
            logger.error('Regex match error:', e);
            return false;
        }
    }
};

export { regexMatch }; 