import { FactDefn, FileData } from '../../../types/typeDefs';
import { axiosClient } from '../../../utils/axiosClient';
import { logger } from '../../../utils/logger';

export const remoteSubstringValidation: FactDefn = {
    name: 'remoteSubstringValidation',
    fn: async (params: any, almanac: any) => {
        let fileData: FileData | undefined;
        let results: any[] = [];
        try {
            fileData = await almanac.factValue('fileData');
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

            const matchInfo = matches.map(match => ({
                value: match[1] || match[0], // Use capture group if exists, otherwise full match
                lineNumber: (fileData?.fileContent.substring(0, match.index).match(/\n/g) || []).length + 1,
                filePath: fileData?.filePath
            }));

            logger.debug({
                filePath: fileData.filePath,
                pattern: params.pattern,
                matchCount: matchInfo.length
            }, 'Regex extraction complete');

            if (matchInfo.length > 0) {
                for (const match of matchInfo) {
                    const validationParams: ValidationParams = {
                        value: match.value,
                        endpoint: params.validationEndpoint,
                        validationType: params.validationType,
                        options: params.validationOptions
                    };

                    const validationResult = await validateMatch(validationParams);

                    if (!validationResult.isValid) {
                        results.push({match, validationParams, validationResult});
                    }
                }        
            }

            logger.debug({
                filePath: fileData.filePath,
                pattern: params.pattern,
                matchCount: results.length
            }, 'Remote validation complete');

            almanac.addRuntimeFact(params.resultFact, results);

            return { result: results };

        } catch (error) {
            logger.error({
                error,
                pattern: params.pattern,
                filePath: fileData?.filePath
            }, 'Error in remote validation');
            return { result: [] };
        }
    }
};

interface ValidationParams {
    value: string;
    endpoint: string;
    validationType: string;
    options?: Record<string, any>;
}

interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

export async function validateMatch(params: ValidationParams): Promise<ValidationResult> {
    const { value, endpoint, validationType, options = {} } = params;

    try {
        const response = await axiosClient.post(endpoint, {
            value,
            type: validationType,
            options
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Validation-Type': validationType
            },
            timeout: 5000
        });

        logger.debug({
            value,
            validationType,
            response: response.data
        }, 'Validation request complete');

        return {
            isValid: response.data.isValid === true,
            reason: response.data.reason
        };

    } catch (error: any) {
        throw error
        logger.error({
            error,
            value,
            validationType
        }, 'Validation request failed');

        return {
            isValid: false,
            reason: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}