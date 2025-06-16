// Legacy Pino-style interface for backward compatibility
export interface Logger {
    error: (obj: object | string, msg?: string, ...args: any[]) => void;
    info: (obj: object | string, msg?: string, ...args: any[]) => void;
    warn: (obj: object | string, msg?: string, ...args: any[]) => void;
    debug: (obj: object | string, msg?: string, ...args: any[]) => void;
    trace: (obj: object | string, msg?: string, ...args: any[]) => void;
    fatal: (obj: object | string, msg?: string, ...args: any[]) => void;
    level: string;
}

export interface Metrics {
    increment: (key: string) => void;
}

// Re-export types from the central types package for consistency
export type { ILogger, LogLevel, LoggerOptions } from '@x-fidelity/types';

/**
 * Create a Pino-style logger adapter from our standard ILogger
 * This ensures backward compatibility while maintaining the unified interface
 */
export function createPinoStyleLogger(logger: any): Logger {
    return {
        error: (obj: object | string, msg?: string, ...args: any[]) => {
            if (typeof obj === 'string') {
                logger.error(obj, msg);
            } else {
                logger.error(obj, msg || '');
            }
        },
        info: (obj: object | string, msg?: string, ...args: any[]) => {
            if (typeof obj === 'string') {
                logger.info(obj, msg);
            } else {
                logger.info(obj, msg || '');
            }
        },
        warn: (obj: object | string, msg?: string, ...args: any[]) => {
            if (typeof obj === 'string') {
                logger.warn(obj, msg);
            } else {
                logger.warn(obj, msg || '');
            }
        },
        debug: (obj: object | string, msg?: string, ...args: any[]) => {
            if (typeof obj === 'string') {
                logger.debug(obj, msg);
            } else {
                logger.debug(obj, msg || '');
            }
        },
        trace: (obj: object | string, msg?: string, ...args: any[]) => {
            if (typeof obj === 'string') {
                logger.trace(obj, msg);
            } else {
                logger.trace(obj, msg || '');
            }
        },
        fatal: (obj: object | string, msg?: string, ...args: any[]) => {
            if (typeof obj === 'string') {
                logger.fatal(obj, msg);
            } else {
                logger.fatal(obj, msg || '');
            }
        },
        level: logger.getLevel ? logger.getLevel() : 'info'
    };
}
