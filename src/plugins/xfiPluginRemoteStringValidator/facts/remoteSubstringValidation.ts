import { AxiosResponse } from 'axios';
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

            const regex = new RegExp(params.pattern, params.flags || 'gi');
            const matches = [...fileData.fileContent.matchAll(regex)];

            const matchInfo = matches.map(match => ({
                value: match[1] || match[0], // Use capture group if exists, otherwise full match
                lineNumber: (fileData?.fileContent.substring(0, match.index).match(/\n/g) || []).length + 1,
                filePath: fileData?.filePath
            }));

            logger.debug({
                filePath: fileData.filePath,
                pattern: params.pattern,
                matchInfo
            }, 'Regex extraction complete');

            if (matchInfo.length > 0) {
                for (const match of matchInfo) {
                    const validationParams: RemoteValidationParams = {
                        url: params.validationParams.url,
                        value: match.value,
                        method: params.validationParams.method || 'GET',
                        headers: params.validationParams.headers || {},
                        body: params.validationParams.body || {},
                        responseJsonPath: params.validationParams.responseJsonPath || '',
                        responseJsonPathValue: params.validationParams.responseJsonPathValue || ''
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
                matchInfo
            }, 'Remote validation complete');

            almanac.addRuntimeFact(params.resultFact, results);

            return { result: results };

        } catch (error) {
            logger.error({
                error,
                pattern: params.pattern,
                filePath: fileData?.filePath
            }, 'Error in remote validation');
            return { result: error };
        }
    }
};

interface RemoteValidationParams {
    value: string;
    url: string;
    method: string;
    headers: object;
    body: object;
    responseJsonPath: string;
    responseJsonPathValue: string;
}

interface RemoteValidationResult {
    isValid: boolean;
    reason?: string;
}

export async function validateMatch(params: RemoteValidationParams): Promise<RemoteValidationResult> {
    const { value, url, method, headers, body, responseJsonPath, responseJsonPathValue } = params;

    logger.debug({
        params,
    }, 'making validation request');

    let response: AxiosResponse<any, any>;
    let validatorUrl = url.replace('#MATCH#', value);

    try {
        if (method.toUpperCase() === 'POST') {
            response = await axiosClient.post(validatorUrl, body, { headers });

        } else if (method.toUpperCase() === 'GET') {
            response = await axiosClient.get(validatorUrl, { headers });

        } else {
            throw new Error(`invalid method: ${method}`);
        }

        logger.debug({
            params,
            response
        }, 'Validation request complete');

        if (response.status !== 200) {
            throw new Error(`invalid status code: ${response.status}`);
        }

        if (responseJsonPath) {
            const jsonPathValue = response.data[responseJsonPath];
            if (jsonPathValue !== responseJsonPathValue) {
                throw new Error(`invalid response value: ${jsonPathValue}`);
            }
        }

        return {
            isValid: response.data.isValid === true,
            reason: response.data.reason
        };

    } catch (error: any) {
        
        logger.error({
            error,
            value,
            params
        }, 'Validation request failed');

        return {
            isValid: false,
            reason: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}