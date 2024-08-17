import { randomUUID } from 'crypto';
import { createLogger, format, transports } from 'winston';

const generateLogPrefix = (): string => {
    return randomUUID().substring(0, 8);
};

let logPrefix: string = generateLogPrefix()

const resetLogPrefix = () => {
    logPrefix = generateLogPrefix()
};

const setLogPrefix = (prefix: string) => {
    logPrefix = prefix;
};

const getLogPrefix = () => {
    return logPrefix;
}   

const logger = createLogger({
    //level: 'debug',
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
        new transports.File({ filename: 'x-fidelity.log', level: 'debug', handleExceptions: true }),
        new transports.Console({
            level: 'info', 
            handleExceptions: true, // Handle exceptions
            format: format.combine(
                format.colorize(),
                format.printf(({ level, message, timestamp }) => {
                    return `${timestamp} [${level}]:[${logPrefix}] ${message}`;
                })
            )
        })
    ]
});

export { logger, resetLogPrefix, setLogPrefix, generateLogPrefix, getLogPrefix };

