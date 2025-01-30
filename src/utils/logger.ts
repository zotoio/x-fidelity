import { randomUUID } from 'crypto';
import { createLogger, format, transports, Logger } from 'winston';

// Create a singleton logger instance
let loggerInstance: Logger | null = null;
let logPrefix: string = generateLogPrefix();

export function generateLogPrefix(): string {
    return randomUUID().substring(0, 8);
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

// Initialize logger function that will create the singleton if it doesn't exist
function initializeLogger(): Logger {
    if (!loggerInstance) {
        loggerInstance = createLogger({
            format: format.combine(
                format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS ZZ'
                }),
                format.errors({ stack: true }),
                format.splat(),
                format.json(),
                format.prettyPrint(),
                format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} [${level}]:[${logPrefix}] ${message}`;
                })
            ),
            transports: [
                new transports.File({ 
                    filename: 'x-fidelity.log', 
                    level: 'debug', 
                    handleExceptions: true 
                }),
                new transports.Console({
                    silent: process.env.NODE_ENV === 'test',
                    level: 'info',
                    handleExceptions: true,
                    format: format.combine(
                        format.colorize(),
                        format.printf(({ level, message, timestamp }) => {
                            return `${timestamp} [${level}]:[${logPrefix}] ${message}`;
                        })
                    )
                })
            ]
        });
    }
    return loggerInstance;
}

// Export the logger getter function
export function getLogger(): Logger {
    return initializeLogger();
}

// For backward compatibility, also export the logger instance directly
export const logger = getLogger();

// Add a way to reset the logger (mainly for testing)
export function resetLogger(): void {
    loggerInstance = null;
}

