import { randomUUID } from 'crypto';
import pino from 'pino';
import { XFiLogger } from '../types/typeDefs';
import { maskSensitiveData } from './maskSensitiveData';
import 'source-map-support/register';

interface ErrorLocation {
    file?: string;
    line?: number;
    column?: number;
    function?: string;
    method?: string;
}

function extractErrorLocation(error: Error): ErrorLocation {
    try {
        const stackLines = error.stack?.split('\n');
        if (!stackLines || stackLines.length < 2) return {};

        const callerFrame = stackLines.find(line => 
            !line.includes('node_modules') && 
            !line.includes('internal/') &&
            !line.includes('/logger.ts')
        ) || stackLines[1];

        const match = callerFrame.match(/at (?:(.+?)\s+\()?(?:(.+?):(\d+):(\d+))\)?/);
        if (!match) return {};

        const [, functionName, file, line, column] = match;
        
        let method, func;
        if (functionName) {
            const methodMatch = functionName.match(/(.+?)\.(.+)/);
            if (methodMatch) {
                [, method, func] = methodMatch;
            } else {
                func = functionName;
            }
        }

        return {
            file: file,
            line: parseInt(line),
            column: parseInt(column),
            function: func,
            method: method
        };
    } catch {
        return {};
    }
}

function enhanceError(obj: any): any {
    if (!obj) return obj;

    if (obj instanceof Error) {
        const location = extractErrorLocation(obj);
        return {
            message: obj.message,
            name: obj.name,
            stack: obj.stack,
            ...location
        };
    }

    if (typeof obj === 'object') {
        const enhanced = { ...obj };
        
        for (const key in enhanced) {
            if (enhanced[key] instanceof Error) {
                enhanced[key] = enhanceError(enhanced[key]);
            } else if (key === 'err' || key === 'error') {
                enhanced[key] = enhanceError(enhanced[key]);
            }
        }
        
        return enhanced;
    }

    return obj;
}

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
                messageFormat: '{prefix} - {msg}',
                singleLine: true,
                errorProps: '*'
            }
        });

        const loggerOptions: pino.LoggerOptions = {
            level: process.env.XFI_LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level: (label) => ({ level: label }),
                bindings: (bindings) => bindings,
                log: (object) => {
                    const enhanced = enhanceError(object);
                    return {
                        prefix: logPrefix,
                        ...enhanced
                    };
                }
            },
            serializers: {
                err: (err) => enhanceError(err),
                error: (err) => enhanceError(err),
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
                { stream: fileTransport },
                { stream: prettyTransport }
            ])
        );
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

