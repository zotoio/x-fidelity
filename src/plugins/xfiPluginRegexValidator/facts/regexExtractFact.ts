import { FactDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';

export const regexExtractFact: FactDefn = {
    name: 'regexExtractFact',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData = await almanac.factValue('fileData');
            if (!fileData?.fileContent) {
                logger.debug('No file content available');
                return { result: [] };
            }

            if (!params.pattern) {
                logger.warn('No regex pattern provided');
                return { result: [] };
            }

            const regex = new RegExp(params.pattern, params.flags || 'g');
            const matches = [...fileData.fileContent.matchAll(regex)];

            const results = matches.map(match => ({
                value: match[1] || match[0], // Use capture group if exists, otherwise full match
                lineNumber: (fileData.fileContent.substring(0, match.index).match(/\n/g) || []).length + 1,
                filePath: fileData.filePath
            }));

            logger.debug({
                filePath: fileData.filePath,
                pattern: params.pattern,
                matchCount: results.length
            }, 'Regex extraction complete');

            return { result: results };

        } catch (error) {
            logger.error({
                error,
                pattern: params.pattern,
                filePath: fileData?.filePath
            }, 'Error in regex extraction');
            return { result: [] };
        }
    }
};
