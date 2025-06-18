import crypto from 'crypto';
import pino from 'pino';
import { maskSensitiveData } from '@x-fidelity/core';

// Initialize variables
let loggerInstance: pino.Logger | undefined;
let loglevel = process.env.XFI_LOG_LEVEL || 
                  (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
let logPrefix: string = generateLogPrefix();
let logFilePath: string = 'x-fidelity.log'; // Default log file path

// Initialize logger and prefix immediately
export function initializeLogger() {
    logPrefix = generateLogPrefix();
    return getLogger();
}

// Function to set the log file path (should be called with workspace root)
export function setLogFilePath(filePath: string): void {
    logFilePath = filePath;
    // Force logger recreation to use new file path
    if (loggerInstance) {
        loggerInstance = undefined;
        getLogger(true);
    }
}

// Function to get current log file path
export function getLogFilePath(): string {
    return logFilePath;
}

/**
 * Generate a unique log prefix for this logger instance
 * This is used to correlate log messages from the same execution
 * @returns {string} A unique prefix for log messages
 */
export function generateLogPrefix(): string {
    try {
        // Try to use crypto.randomUUID if available (Node.js 14.17.0+)
        if (crypto.randomUUID) {
            return crypto.randomUUID().substring(0, 8);
        }
        // Fallback to randomBytes if available
        if (crypto.randomBytes) {
            return crypto.randomBytes(4).toString('hex');
        }
    } catch (error) {
        // Fall through to simple fallback
    }
    
    // Simple fallback for test environments or when crypto is not available
    return Math.random().toString(36).substring(2, 10);
}

export function resetLogPrefix(): void {
    logPrefix = generateLogPrefix();
}

export function setLogPrefix(prefix: string): void {
    logPrefix = prefix;
}

export function getLogPrefix(): string {
    return logPrefix;
}

export function appendLogPrefix(suffix: string): void {
    logPrefix = `${logPrefix}:${suffix}`;
}

export function withLogPrefix<T>(prefix: string, fn: () => T): T {
    const originalPrefix = getLogPrefix();
    setLogPrefix(`${originalPrefix}:${prefix}`);
    try {
        return fn();
    } finally {
        setLogPrefix(originalPrefix);
    }
}

// VSCode-specific logger implementation that avoids transport issues
function getLogger(force?: boolean): pino.Logger {
    // Use a simple check for test environment
    const isTestEnv = process.env.NODE_ENV === 'test' || 
                     (typeof (globalThis as any).jest !== 'undefined');
    
    if (!loggerInstance || force) {
        const loggerOptions: pino.LoggerOptions = {
            timestamp: pino.stdTimeFunctions.isoTime,
            msgPrefix: `${logPrefix} - `,
            level: loglevel,
            formatters: {
                level: (label) => ({ level: label }),
                bindings: (bindings) => bindings,
                log: (object) => ({
                    ...object
                })
            },
            serializers: {
                err: pino.stdSerializers.err,
                error: pino.stdSerializers.err,
                req: (req: any) => maskSensitiveData(pino.stdSerializers.req(req)),
                res: (res: any) => maskSensitiveData(pino.stdSerializers.res(res)),
                '*': (obj: any) => maskSensitiveData(obj)
            },
            redact: {
                paths: [
                    'password',
                    'apiKey',
                    'authorization',
                    'cookie',
                    'req.headers.authorization',
                    'req.headers.cookie',
                    'req.body.password',
                    'res.headers["set-cookie"]',
                    '*.password',
                    '*.apiKey',
                    '*.secret',
                    '*.token'
                ],
                censor: '********'
            }
        };

        // For VSCode extension, use a simple file destination to avoid transport issues
        if (isTestEnv) {
            // In test environment, use default console output
            loggerInstance = pino(loggerOptions);
        } else {
            // In VSCode extension, use simple file destination only
            try {
                const fileDestination = pino.destination({
                    dest: logFilePath,
                    sync: false
                });
                loggerInstance = pino(loggerOptions, fileDestination);
            } catch (error) {
                // Fallback to console if file logging fails
                console.warn('Failed to create file logger, falling back to console:', error);
                loggerInstance = pino(loggerOptions);
            }
        }
    }
    return loggerInstance;
}

// Export the logger instance
export const logger: pino.Logger = getLogger();

// Add a way to reset the logger (mainly for testing)
export function resetLogger(): void {
    loggerInstance = getLogger(true);
}

export function setLogLevel(level: string): void {
    if (loggerInstance) {
        loggerInstance.level = level.toLowerCase();
    }
} 