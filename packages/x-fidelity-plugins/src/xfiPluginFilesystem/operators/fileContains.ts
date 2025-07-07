import { OperatorDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

// Export the function for testing
export const fileContainsFn = (factValue: any, pattern: string) => {
    try {
        logger.debug(`fileContains: processing ${JSON.stringify(factValue)} with pattern ${pattern}`);
        
        if (!factValue || !factValue.files) {
            logger.debug('fileContains: factValue is null/undefined or has no files');
            return false;
        }

        const files = factValue.files;
        if (!Array.isArray(files)) {
            logger.debug('fileContains: files is not an array');
            return false;
        }

        // Check if pattern is valid
        if (pattern === null || pattern === undefined) {
            logger.debug('fileContains: pattern is null/undefined');
            return false;
        }

        // Convert pattern to string if it's not already
        const patternStr = String(pattern);
        
        // Handle empty pattern - matches everything
        if (patternStr === '') {
            return true;
        }

        // Check if any file contains the pattern
        for (const file of files) {
            if (!file || typeof file.fileContent !== 'string') {
                continue;
            }

            try {
                // Use regex to check if content matches the pattern
                const regex = new RegExp(patternStr);
                if (regex.test(file.fileContent)) {
                    logger.debug(`fileContains: found match in ${file.fileName}`);
                    return true;
                }
            } catch (regexError) {
                // If regex fails, fall back to string contains
                if (file.fileContent.includes(patternStr)) {
                    logger.debug(`fileContains: found string match in ${file.fileName}`);
                    return true;
                }
            }
        }

        logger.debug('fileContains: no matches found');
        return false;
    } catch (e) {
        logger.error(`fileContains error: ${e}`);
        return false;
    }
};

export const fileContains: OperatorDefn = {
    name: 'fileContains',
    description: 'Checks if a file contains a specific pattern',
    fn: (factValue: any, expectedValue: boolean) => {
        try {
            logger.debug(`fileContains: processing ${JSON.stringify(factValue)} with expected ${expectedValue}`);
            
            if (!factValue) {
                logger.debug('fileContains: factValue is null/undefined');
                return false;
            }

            // Handle different fact value structures
            let hasMatches = false;
            
            // If factValue is an object with a 'result' property (from repoFileAnalysis)
            if (factValue.result && Array.isArray(factValue.result)) {
                hasMatches = factValue.result.length > 0;
                logger.debug(`fileContains: found ${factValue.result.length} matches in result array`);
            }
            // If factValue is directly an array of matches
            else if (Array.isArray(factValue)) {
                hasMatches = factValue.length > 0;
                logger.debug(`fileContains: found ${factValue.length} matches in direct array`);
            }
            // If factValue is a string (legacy behavior)
            else if (typeof factValue === 'string') {
                hasMatches = factValue.length > 0;
                logger.debug(`fileContains: treating factValue as string with length ${factValue.length}`);
            }
            // If factValue is a boolean
            else if (typeof factValue === 'boolean') {
                hasMatches = factValue;
                logger.debug(`fileContains: treating factValue as boolean: ${factValue}`);
            }
            else {
                logger.debug(`fileContains: unexpected factValue type: ${typeof factValue}`);
                return false;
            }

            const result = hasMatches === expectedValue;
            logger.debug(`fileContains: hasMatches=${hasMatches}, expectedValue=${expectedValue}, result=${result}`);
            return result;
        } catch (e) {
            logger.error(`fileContains error: ${e}`);
            return false;
        }
    }
}; 