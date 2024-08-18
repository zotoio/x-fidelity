import { logger } from './logger';

export function validateInput(input: string): boolean {
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
