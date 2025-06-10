import { ValidationResult, PluginError } from '@x-fidelity/types';
import { logger } from './logger';

function createError(message: string): PluginError {
    return {
        message,
        level: 'error',
        stack: new Error().stack
    };
}

export function validateInput(input: any): ValidationResult {
    if (input === undefined || input === null) {
        return { isValid: false, errors: ['Input is undefined or null'] };
    }

    if (typeof input === 'string' && input.includes('..')) {
        return { isValid: false, errors: ['Potential directory traversal attempt detected'] };
    }

    // Check for potential command injection
    if (typeof input === 'string' && /[;&|`$]/.test(input)) {
        return { isValid: false, errors: ['Potential command injection attempt detected'] };
    }

    // Check for excessively long input
    if (typeof input === 'string' && input.length > 10000) {
        return { isValid: false, errors: ['Excessively long input detected'] };
    }

    return { isValid: true, errors: [] };
}

export function validateUrlInput(input: string): ValidationResult {
    if (!/^[a-zA-Z0-9_-]{1,50}$/.test(input)) {
        return { isValid: false, errors: ['Invalid URL input: must be 1-50 alphanumeric characters, hyphens, or underscores'] };
    }
    return { isValid: true, errors: [] };
}

export function validateTelemetryData(data: any): ValidationResult {
    if (typeof data.eventType !== 'string') {
        return { isValid: false, errors: ['Invalid eventType: must be a string'] };
    }

    if (typeof data.metadata !== 'object' || data.metadata === null) {
        return { isValid: false, errors: ['Invalid metadata: must be an object'] };
    }

    if (typeof data.timestamp !== 'string' || !Date.parse(data.timestamp)) {
        return { isValid: false, errors: ['Invalid timestamp: must be a string in ISO 8601 format'] };
    }

    return { isValid: true, errors: [] };
}

export function logValidationError(functionName: string, input: any, error: string): void {
    logger.warn({
        msg: 'Validation error occurred',
        function: functionName,
        error,
        input: JSON.stringify(input)
    });
}

