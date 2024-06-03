import { createLogger, format, transports } from 'winston';

const logger = createLogger({
    level: 'debug',
    format: format.combine(
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS ZZ'
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json(),
        format.prettyPrint()
    ),
    transports: [
        new transports.File({ filename: 'x-fidelity.log'})
    ]
});


export { logger };