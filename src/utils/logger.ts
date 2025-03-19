import { randomUUID } from 'crypto';
import pino from 'pino';
import { maskSensitiveData } from './maskSensitiveData';
import { options } from '../core/cli';

// Initialize variables
let loggerInstance: pino.Logger | undefined;
let loglevel = process.env.XFI_LOG_LEVEL || 
                  (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
let logPrefix: string = generateLogPrefix();

// Initialize logger and prefix immediately
export function initializeLogger() {
    logPrefix = generateLogPrefix();
    return getLogger();
}

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
function getLogger(force?: boolean): pino.Logger {
    // Determine if color should be enabled
    const useColor = process.env.XFI_LOG_COLOR !== 'false' && options?.color !== false;
    
    if (!loggerInstance || force) {
        const fileTransport = pino.destination({
            dest: 'x-fidelity.log',
            sync: false,
            mkdir: true
        });

        const prettyTransport = pino.transport({
            target: 'pino-pretty',
            options: {
                loglevel: loglevel,
                sync: false,
                colorize: useColor,
                translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l o',
                ignore: 'pid,hostname',
                singleLine: true,
                errorProps: '*'
            }
        });

        const loggerOptions: pino.LoggerOptions = {
            timestamp: pino.stdTimeFunctions.isoTime,
            msgPrefix: `${logPrefix} - `,
            level: 'info',
            formatters: {
                level: (label) => ({ level: label }),
                bindings: (bindings) => bindings,
                log: (object) => ({
                    ...object
                })
            },
            serializers: {
                err: (err) => pino.stdSerializers.err,
                error: (err) => pino.stdSerializers.err,
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
        };

        loggerInstance = pino(
            loggerOptions,
            pino.multistream([
                { level: loglevel, stream: fileTransport },
                { level: loglevel, stream: prettyTransport }
            ])
        );
    }
    return loggerInstance;
}

// For backward compatibility, also export the logger instance directly
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

