import { logger, axiosClient, isAxiosError } from '@x-fidelity/core';
import { AxiosResponse } from 'axios';
import { FactDefn, FileData } from '@x-fidelity/types';
import { RemoteValidationParams, RemoteValidationResult } from '../types';
import { JSONPath as jp } from 'jsonpath-plus'; 

export const remoteSubstringValidationFact: FactDefn = {
    name: 'remoteSubstringValidation',
    description: 'Validates strings against a remote service',
    type: 'iterative-function',  // ✅ Iterative-function fact - runs once per file (default behavior)
    priority: 1,                 // ✅ Default priority for iterative functions
    fn: async (params: unknown): Promise<RemoteValidationResult> => {
        const validationParams = params as RemoteValidationParams;
        const { content, pattern, options } = validationParams;

        if (!content || !pattern) {
            return {
                isValid: false,
                error: 'Missing required parameters: content and pattern'
            };
        }

        try {
            const response: AxiosResponse = await axiosClient.get(pattern, {
                params: { content },
                ...options
            });

            return {
                isValid: response.status === 200,
                matches: response.data?.matches || [],
                error: response.data?.error
            };
        } catch (error) {
            if (isAxiosError(error)) {
                return {
                    isValid: false,
                    error: error.message
                };
            }
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
};

export async function validateMatch(params: RemoteValidationParams): Promise<RemoteValidationResult> {
    const { substring, url, headers, timeout } = params;

    logger.debug('making validation request', { params });

    let response: AxiosResponse<any, any>;
    let validatorUrl = url.replace('#MATCH#', substring);
    let validationResult: RemoteValidationResult = { isValid: false };

    try {
        response = await axiosClient.get(validatorUrl, { 
            headers,
            timeout
        });

        logger.debug('Remote validation request complete', { params, response });

        if (response.status !== 200) {
            throw new Error(`invalid status code: ${response.status}`);
        }

        const idToCheck = substring;
        const validationJsonPath = params.jsonPath?.replace('#MATCH#', idToCheck);
            
        let jsonpathResult;
        if (response && validationJsonPath) {
            jsonpathResult = jp({ path: validationJsonPath, json: response.data });
        }
        
        if (jsonpathResult?.length === 0) {
            validationResult = {
                isValid: false,
                error: `jsonPath check failed: ${{response, validationJsonPath}}}`
            };
        } else {
            validationResult = {
                isValid: true
            };
        }

        return validationResult;

    } catch (error: any) {
        
        logger.error('Remote validation request failed', { error, substring, params });

        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Remote validation request failed: Unknown error occurred'
        };
    }
}