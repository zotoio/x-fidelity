import { axiosClient } from '../../../utils/axiosClient';
import { logger } from '../../../utils/logger';

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

    } catch (error) {
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
