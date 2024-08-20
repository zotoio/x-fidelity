import { logger } from './logger';

export function validateInput(input: string | undefined): boolean {
    // Check if input is undefined or null
    if (input == null) {
        logger.warn(`Invalid input: ${input}`);
        return false;
    }

    // Check for potential directory traversal attempts
    if (input.includes('..') || input.includes('~')) {
        logger.warn(`Potential directory traversal attempt detected: ${input}`);
        return false;
    }

    // Check for unusual characters that might indicate command injection
    const suspiciousChars = /[;&|`$]/;
    if (suspiciousChars.test(input)) {
        logger.warn(`Potential command injection attempt detected: ${input}`);
        return false;
    }

    // Check for excessively long inputs
    if (input.length > 1000) {
        logger.warn(`Excessively long input detected: ${input.substring(0, 100)}...`);
        return false;
    }

    // Add more checks as needed

    return true;
}

export function validateUrlInput(input: string): boolean {
    return /^[a-zA-Z0-9-_]{1,50}$/.test(input)
}    

export const validateTelemetryData = (data: any): boolean => {
    return (
        typeof data.eventType === 'string' &&
        typeof data.metadata === 'object' &&
        typeof data.timestamp === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(data.timestamp)
    );
};

