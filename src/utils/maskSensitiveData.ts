import { logger } from './logger';

const sensitivePatterns = [
    /x-shared-secret/gi,
    /password/gi,
    /api[_-]?key/gi,
    /auth[_-]?token/gi,
    /access[_-]?token/gi,
    /secret[_-]?key/gi,
    /private[_-]?key/gi,
    /ssh[_-]?key/gi,
    /oauth[_-]?token/gi,
    /jwt[_-]?token/gi,
    /db[_-]?password/gi,
    /connection[_-]?string/gi,
    /credentials/gi,
    /session[_-]?token/gi,
    /bearer/gi
];

function maskValue(value: string): string {
    if (value.length <= 8) return '****';
    const visibleStart = value.slice(0, 4);
    const visibleEnd = value.slice(-4);
    return `${visibleStart}****${visibleEnd}`;
}

export function maskSensitiveData(obj: any): any {
    // Handle string input directly
    if (typeof obj === 'string') {
        if (sensitivePatterns.some(pattern => pattern.test(obj))) {
            return maskValue(obj);
        }
        return obj;
    }

    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const maskedObj: { [key: string]: any } = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Check if key matches any sensitive pattern
            if (sensitivePatterns.some(pattern => pattern.test(key))) {
                maskedObj[key] = typeof obj[key] === 'string' ? 
                    maskValue(obj[key]) : 
                    maskValue(JSON.stringify(obj[key]));
            } else if (typeof obj[key] === 'string' && 
                      sensitivePatterns.some(pattern => pattern.test(obj[key]))) {
                // Also check string values for sensitive patterns
                maskedObj[key] = maskValue(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                maskedObj[key] = maskSensitiveData(obj[key]);
            } else {
                maskedObj[key] = obj[key];
            }
        }
    }

    logger.debug({ maskedData: maskedObj }, 'Masked sensitive data');

    return maskedObj;
}
