import { randomUUID } from 'crypto';
import pino from 'pino';

// Create a singleton logger instance
let loggerInstance: pino.Logger | null = null;
let logPrefix: string = generateLogPrefix();

export function generateLogPrefix(): string {
    return randomUUID().substring(0, 8);
}

export function resetLogPrefix(): void {
    logPrefix = generateLogPrefix();
    if (loggerInstance) {
        loggerInstance = loggerInstance.child({ prefix: logPrefix });
    }
}

export function setLogPrefix(prefix: string): void {
    logPrefix = prefix;
    if (loggerInstance) {
        loggerInstance = loggerInstance.child({ prefix: logPrefix });
    }
}

export function getLogPrefix(): string {
    return logPrefix;
}   

// Initialize logger function that will create the singleton if it doesn't exist
function initializeLogger(): pino.Logger {
    if (!loggerInstance) {
        loggerInstance = pino({
            level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
                    ignore: 'pid,hostname',
                    messageFormat: '{prefix} {msg}',
                }
            },
            base: {
                prefix: logPrefix
            }
        }, pino.destination({
            dest: 'x-fidelity.log', // Write to file
            sync: false // Asynchronous logging
        }));
    }
    return loggerInstance;
}

// Export the logger getter function
export function getLogger(): pino.Logger {
    return initializeLogger();
}

// For backward compatibility, also export the logger instance directly
export const logger = getLogger();

// Add a way to reset the logger (mainly for testing)
export function resetLogger(): void {
    loggerInstance = null;
}

