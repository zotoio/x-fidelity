import { ValidationResult } from '../types/typeDefs';
import { logger } from './logger';

export function validateInput(input: string | undefined): ValidationResult {
    if (input == null) {
        return { isValid: false, error: 'Input is undefined or null' };
    }

    if (input.includes('..') || input.includes('~')) {
        return { isValid: false, error: 'Potential directory traversal attempt detected' };
    }

    const suspiciousChars = /[;&|`$]/;
    if (suspiciousChars.test(input)) {
        return { isValid: false, error: 'Potential command injection attempt detected' };
    }

    if (input.length > 1000) {
        return { isValid: false, error: 'Excessively long input detected' };
    }

    return { isValid: true };
}

export function validateUrlInput(input: string): ValidationResult {
    if (!/^[a-zA-Z0-9-_]{1,50}$/.test(input)) {
        return { isValid: false, error: 'Invalid URL input: must be 1-50 alphanumeric characters, hyphens, or underscores' };
    }
    return { isValid: true };
}    

export const validateTelemetryData = (data: any): ValidationResult => {
    if (typeof data.eventType !== 'string') {
        return { isValid: false, error: 'Invalid eventType: must be a string' };
    }
    if (typeof data.metadata !== 'object') {
        return { isValid: false, error: 'Invalid metadata: must be an object' };
    }
    if (typeof data.timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data.timestamp)) {
        return { isValid: false, error: 'Invalid timestamp: must be a string in ISO 8601 format' };
    }
    return { isValid: true };
};

export function logValidationError(functionName: string, input: any, error: string): void {
    logger.warn({
        msg: 'Validation error occurred',
        function: functionName,
        error,
        input: JSON.stringify(input)
    });
}

