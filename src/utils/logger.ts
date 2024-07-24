import { randomUUID } from 'crypto';
import { createLogger, format, transports } from 'winston';

let logPrefix: string = randomUUID().substring(0, 8);

const resetLogPrefix = () => {
    logPrefix = randomUUID().substring(0, 8);
};

const setLogPrefix = (prefix: string) => {
    logPrefix = prefix;
};

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
            level: 'info', // Set the minimum level of messages to log
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

export { logger, logPrefix, resetLogPrefix, setLogPrefix };
