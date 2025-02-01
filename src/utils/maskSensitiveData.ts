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
    
    // For very short values, mask completely
    if (value.length <= 4) {
        return '*'.repeat(value.length);
    }
    
    // For matched portions or full string masking
    const valueToMask = matchStart !== undefined && matchLength !== undefined 
        ? value.slice(matchStart, matchStart + matchLength)
        : value;
    
    // Keep first 4 and last 4 chars visible, mask the middle
    if (valueToMask.length > 12) {
        return matchStart !== undefined && matchLength !== undefined
            ? value.slice(0, matchStart) + 
              valueToMask.slice(0, 4) + '***' + valueToMask.slice(-4) + 
              value.slice(matchStart + matchLength)
            : valueToMask.slice(0, 4) + '***' + valueToMask.slice(-4);
    }
    
    // For shorter strings, keep first 2 and last 2 visible
    if (valueToMask.length > 6) {
        return matchStart !== undefined && matchLength !== undefined
            ? value.slice(0, matchStart) + 
              valueToMask.slice(0, 2) + '**' + valueToMask.slice(-2) + 
              value.slice(matchStart + matchLength)
            : valueToMask.slice(0, 2) + '**' + valueToMask.slice(-2);
    }
    
    // For very short matches, mask the middle character(s)
    const midPoint = Math.floor(valueToMask.length / 2);
    const maskLength = Math.max(1, valueToMask.length - 4);
    return matchStart !== undefined && matchLength !== undefined
        ? value.slice(0, matchStart) + 
          valueToMask.slice(0, midPoint) + '*'.repeat(maskLength) + valueToMask.slice(-midPoint) + 
          value.slice(matchStart + matchLength)
        : valueToMask.slice(0, midPoint) + '*'.repeat(maskLength) + valueToMask.slice(-midPoint);
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
