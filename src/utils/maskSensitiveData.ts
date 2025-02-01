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
    
    // If no specific match position provided, mask intermittently
    if (matchStart === undefined || matchLength === undefined) {
        if (value.length <= 4) return '*'.repeat(value.length);
        
        // Show first and last 2 chars, mask rest intermittently
        const result = value.split('').map((char, i) => {
            if (i < 2 || i >= value.length - 2) return char;
            // Mask every other character in the middle
            return i % 2 === 0 ? '*' : char;
        });
        return result.join('');
    }

    // For matched portions, mask intermittently
    const beforeMatch = value.slice(0, matchStart);
    const match = value.slice(matchStart, matchStart + matchLength);
    const afterMatch = value.slice(matchStart + matchLength);
    
    // Mask matched portion with intermittent pattern
    const maskedMatch = match.split('').map((char, i) => {
        if (i < 2 || i >= match.length - 2) return char;
        return i % 2 === 0 ? '*' : char;
    }).join('');
    
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
