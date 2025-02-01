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

function maskValue(value: string, matchStart?: number, matchLength?: number): string {
    if (!value) return '';
    
    // If no specific match position provided, mask the middle portion
    if (matchStart === undefined || matchLength === undefined) {
        if (value.length <= 8) return '*'.repeat(value.length);
        const visibleChars = Math.floor(value.length * 0.3); // Show 30% of chars
        const startVisible = Math.floor(visibleChars / 2);
        const endVisible = visibleChars - startVisible;
        return value.slice(0, startVisible) + 
               '*'.repeat(value.length - visibleChars) + 
               value.slice(-endVisible);
    }

    // Mask only the matched portion
    const beforeMatch = value.slice(0, matchStart);
    const match = value.slice(matchStart, matchStart + matchLength);
    const afterMatch = value.slice(matchStart + matchLength);
    
    // For matched portion, show first and last character if long enough
    const maskedMatch = match.length <= 2 ? 
        '*'.repeat(match.length) :
        match[0] + '*'.repeat(match.length - 2) + match[match.length - 1];
    
    return beforeMatch + maskedMatch + afterMatch;
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
            if (sensitivePatterns.some(pattern => {
                const match = pattern.exec(key);
                if (match) {
                    maskedObj[key] = typeof obj[key] === 'string' ?
                        maskValue(obj[key], match.index, match[0].length) :
                        maskValue(JSON.stringify(obj[key]), match.index, match[0].length);
                    return true;
                }
                return false;
            })) {
                // Key was handled in the some() callback
            } else if (typeof obj[key] === 'string') {
                // Check string values for sensitive patterns
                let value = obj[key];
                let masked = false;
                for (const pattern of sensitivePatterns) {
                    const match = pattern.exec(value);
                    if (match) {
                        value = maskValue(value, match.index, match[0].length);
                        masked = true;
                    }
                }
                maskedObj[key] = masked ? value : obj[key];
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
