import axios, { AxiosResponse } from 'axios';
import { FactDefn } from '@x-fidelity/types';
import { RemoteValidationParams, RemoteValidationResult } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { JSONPath as jp } from 'jsonpath-plus'; 

export const remoteSubstringValidationFact: FactDefn = {
    name: 'remoteSubstringValidation',
    description: 'Validates strings against a remote service',
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
            const response: AxiosResponse = await axios.get(pattern, {
                params: { content },
                ...options
            });

            return {
                isValid: response.status === 200,
                matches: response.data?.matches || [],
                error: response.data?.error
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                return {
                    isValid: false,
                    error: error.message
                };
            }
            return {
                isValid: false,
                error: 'Unknown error occurred'
            };
        }
    }
};

export async function validateMatch(params: RemoteValidationParams): Promise<RemoteValidationResult> {
    const { substring, url, headers, timeout } = params;

    console.debug({
        params,
    }, 'making validation request');

    let response: AxiosResponse<any, any>;
    let validatorUrl = url.replace('#MATCH#', substring);
    let validationResult: RemoteValidationResult = { isValid: false };

    try {
        response = await axios.get(validatorUrl, { 
            headers,
            timeout
        });

        console.debug({
            params,
            response
        }, 'Remote validation request complete');

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
        
        console.error({
            error,
            substring,
            params
        }, 'Remote validation request failed');

        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Remote validation request failed: Unknown error occurred'
        };
    }
}