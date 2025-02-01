import { randomUUID } from 'crypto';
import pino from 'pino';
import { XFiLogger } from '../types/typeDefs';
import { maskSensitiveData } from './maskSensitiveData';

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
function initializeLogger(): XFiLogger {
    if (!loggerInstance) {
        const fileTransport = pino.destination({
            dest: 'x-fidelity.log',
            sync: false,
            mkdir: true
        });

        const prettyTransport = pino.transport({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
                ignore: 'pid,hostname',
                messageFormat: '{prefix} {msg}',
                singleLine: true,
                errorProps: '*'
            }
        });

        loggerInstance = pino({
            level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
            timestamp: pino.stdTimeFunctions.isoTime,
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
                req: (req) => maskSensitiveData(pino.stdSerializers.req(req)),
                res: (res) => maskSensitiveData(pino.stdSerializers.res(res)),
                '*': (obj) => maskSensitiveData(obj)
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
        }, pino.multistream([
            { stream: fileTransport },
            { stream: prettyTransport }
        ]));
    }
    return loggerInstance;
}

// Export the logger getter function
export function getLogger(): XFiLogger {
    return initializeLogger();
}

// For backward compatibility, also export the logger instance directly
export const logger: XFiLogger = getLogger();

// Add a way to reset the logger (mainly for testing)
export function resetLogger(): void {
    loggerInstance = null;
}

