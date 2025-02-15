import { AxiosResponse } from 'axios';
import { FactDefn, FileData } from '../../../types/typeDefs';
import { axiosClient } from '../../../utils/axiosClient';
import { logger } from '../../../utils/logger';
import { JSONPath as jp } from 'jsonpath-plus'; 

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
                        checkJsonPath: params.validationParams.checkJsonPath || ''
                    };

                    const interpolatedValidationParams = JSON.parse(JSON.stringify(validationParams).replace(/#MATCH#/g, match.value));

                    const validationResult = await validateMatch(interpolatedValidationParams);

                    if (!validationResult.isValid) {
                        results.push({match, interpolatedValidationParams, validationResult});
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
    checkJsonPath: string;
}

interface RemoteValidationResult {
    isValid: boolean;
    reason?: string;
}

export async function validateMatch(params: RemoteValidationParams): Promise<RemoteValidationResult> {
    const { value, url, method, headers, body, checkJsonPath } = params;

    logger.debug({
        params,
    }, 'making validation request');

    let response: AxiosResponse<any, any>;
    let validatorUrl = url.replace('#MATCH#', value);
    let validationResult: RemoteValidationResult  = { isValid: false };

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
        }, 'Remote validation request complete');

        if (response.status !== 200) {
            throw new Error(`invalid status code: ${response.status}`);
        }

        const idToCheck = value;
        const validationJsonPath = checkJsonPath.replace('#MATCH#', idToCheck);
            
        let jsonpathResult;
        if (response) {
            jsonpathResult = jp({ path: validationJsonPath, json: response.data });
        }
        
        if (jsonpathResult?.length === 0) {
            validationResult = {
                isValid: false,
                reason: `jsonPath check failed: ${{response, validationJsonPath}}}`
            };
        } else {
            validationResult = {
                isValid: true
            };
        }

        return validationResult;

    } catch (error: any) {
        
        logger.error({
            error,
            value,
            params
        }, 'Remote validation request failed');

        return {
            isValid: false,
            reason: error instanceof Error ? error.message : 'Remote validation request failed: Unknown error occurred'
        };
    }
}