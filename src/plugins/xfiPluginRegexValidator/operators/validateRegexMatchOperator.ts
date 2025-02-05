import { OperatorDefn } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { validateMatch } from '../utils/matchValidator';

export const validateRegexMatchOperator: OperatorDefn = {
    name: 'validateRegexMatchOperator',
    fn: async (factValue: any, expectedValue: any, params: any) => {
        if (!factValue?.result || !Array.isArray(factValue.result)) {
            return false;
        }

        try {
            const validationEndpoint = process.env.REGEX_VALIDATION_ENDPOINT;
            if (!validationEndpoint) {
                throw new Error('REGEX_VALIDATION_ENDPOINT environment variable not set');
            }

            for (const match of factValue.result) {
                const validationResult = await validateMatch({
                    value: match.value,
                    endpoint: validationEndpoint,
                    validationType: params.validationType,
                    options: params.validationOptions
                });

                if (!validationResult.isValid) {
                    logger.warn({
                        value: match.value,
                        filePath: match.filePath,
                        lineNumber: match.lineNumber,
                        reason: validationResult.reason
                    }, 'Validation failed for regex match');
                    return true; // Return true to trigger the rule
                }
            }
            return false;
        } catch (error) {
            logger.error({
                error,
                validationType: params.validationType
            }, 'Error in regex match validation');
            throw error;
        }
    }
};
