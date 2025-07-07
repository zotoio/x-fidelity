import { ValidationResult, PluginError } from '@x-fidelity/types';
import { logger } from './logger';

function createError(message: string): PluginError {
    return {
        message,
        level: 'error',
        stack: new Error().stack
    };
}

// Security patterns to detect various attack vectors
const SECURITY_PATTERNS = {
    // Directory traversal patterns
    directoryTraversal: [
        /\.\./,
        /~\//,
        /\.\.\\/,
        /C:\\Windows/i,
        /\/etc\/passwd/i,
        /%2e%2e%2f/i,
        /%252f/i,
        /%c0%af/i
    ],
    
    // Command injection patterns
    commandInjection: [
        /[;&|`$(){}[\]<>*?]/,
        /\$\(/,
        /`[^`]*`/,
        /\$\{[^}]*\}/,
        /&&/,
        /\|\|/
    ],
    
    // SQL injection patterns
    sqlInjection: [
        /['";]/,
        /\bDROP\s+TABLE\b/i,
        /\bUNION\s+SELECT\b/i,
        /\bWAITFOR\s+DELAY\b/i,
        /\bOR\s+['"]?1['"]?\s*=\s*['"]?1['"]?/i
    ],
    
    // XSS patterns
    xss: [
        /<script[^>]*>/i,
        /javascript:/i,
        /onerror\s*=/i,
        /onload\s*=/i,
        /alert\s*\(/i,
        /"><script/i,
        /'><script/i
    ],
    
    // Template injection patterns
    templateInjection: [
        /\$\{[^}]*\}/,
        /\{\{[^}]*\}\}/,
        /<%[^%]*%>/,
        /\$\{process\.env\}/i
    ],
    
    // NoSQL injection patterns
    nosqlInjection: [
        /\{\s*['"]\$gt['"]\s*:/,
        /\{\s*['"]\$ne['"]\s*:/,
        /\{\s*['"]\$where['"]\s*:/
    ],
    
    // LDAP injection patterns
    ldapInjection: [
        /\*\)\(uid=\*\)\)\(\|\(uid=\*/,
        /\*\)\(\|\(objectclass=\*/,
        /\*\)\(\|\(password=\*/
    ],
    
    // XML injection patterns
    xmlInjection: [
        /<!DOCTYPE[^>]*>/i,
        /<!ENTITY[^>]*>/i,
        /<\?xml[^>]*>/i
    ],
    
    // Null byte injection
    nullByte: [
        /\0/,
        /%00/,
        /\u0000/
    ],
    
    // Unicode normalization issues (simplified check)
    unicodeNormalization: [
        /ﬁ/,  // Ligatures
        /[\u0300-\u036F]/  // Combining characters
    ],
    
    // Homograph attacks (simplified check for Cyrillic)
    homograph: [
        /[а-я]/i  // Cyrillic characters
    ]
};

const VALID_URL_PROTOCOLS = ['http:', 'https:'];
const VALID_TELEMETRY_EVENT_TYPES = ['test', 'execution', 'error', 'warning', 'info'];
const SENSITIVE_KEYS = ['password', 'apikey', 'token', 'secret', 'key', 'auth'];

export function validateInput(input: any): ValidationResult {
    if (input === undefined || input === null) {
        return { isValid: false, errors: ['Input is undefined or null'] };
    }

    if (typeof input !== 'string') {
        return { isValid: false, errors: ['Input must be a string'] };
    }

    // Check for buffer overflow attempts
    if (input.length > 1000) {
        return { isValid: false, errors: ['Input exceeds maximum length'] };
    }

    // Check against all security patterns
    for (const [category, patterns] of Object.entries(SECURITY_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(input)) {
                logger.warn(`Potential ${category} attack detected in input`);
                return { 
                    isValid: false, 
                    errors: [`Potential ${category} attack detected`] 
                };
            }
        }
    }

    // Additional regex DoS protection
    if (/\(.*\+.*\)\+/.test(input) || /\(.*\|.*\+.*\)\+/.test(input)) {
        return { isValid: false, errors: ['Potential regex DoS pattern detected'] };
    }
    
    // Check for potential DoS via repeated characters
    if (/(.)\1{99,}/.test(input)) {
        return { isValid: false, errors: ['Potential DoS via repeated characters detected'] };
    }

    return { isValid: true };
}

export function validateUrlInput(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
        return { isValid: false, errors: ['URL is required and must be a string'] };
    }

    try {
        const urlObj = new URL(url);
        
        // Check protocol
        if (!VALID_URL_PROTOCOLS.includes(urlObj.protocol)) {
            return { isValid: false, errors: ['Invalid URL protocol'] };
        }
        
        // Check for XSS in URL
        if (SECURITY_PATTERNS.xss.some(pattern => pattern.test(url))) {
            return { isValid: false, errors: ['Potential XSS detected in URL'] };
        }
        
        // Check for path traversal in URL
        if (SECURITY_PATTERNS.directoryTraversal.some(pattern => pattern.test(url))) {
            return { isValid: false, errors: ['Potential path traversal detected in URL'] };
        }
        
        return { isValid: true };
    } catch (error) {
        return { isValid: false, errors: ['Invalid URL format'] };
    }
}

export function validateTelemetryData(data: any): ValidationResult {
    if (!data || typeof data !== 'object') {
        return { isValid: false, errors: ['Telemetry data must be an object'] };
    }

    // Check event type
    if (!data.eventType || typeof data.eventType !== 'string' || data.eventType.trim() === '') {
        return { isValid: false, errors: ['Event type is required'] };
    }

    if (!VALID_TELEMETRY_EVENT_TYPES.includes(data.eventType)) {
        return { isValid: false, errors: ['Invalid event type'] };
    }

    // Check metadata
    if (data.metadata !== undefined) {
        if (typeof data.metadata !== 'object' || data.metadata === null) {
            return { isValid: false, errors: ['Metadata must be an object'] };
        }

        // Check for sensitive information
        const keys = Object.keys(data.metadata).map(k => k.toLowerCase());
        for (const sensitiveKey of SENSITIVE_KEYS) {
            if (keys.some(key => key.includes(sensitiveKey))) {
                return { isValid: false, errors: ['Sensitive information detected in metadata'] };
            }
        }
    }

    return { isValid: true };
}

export function logValidationError(functionName: string, input: any, error: string): void {
    logger.warn({
        msg: 'Validation error occurred',
        function: functionName,
        error,
        input: JSON.stringify(input)
    });
}

