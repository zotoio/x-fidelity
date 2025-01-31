import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';
import pino from 'pino-http';

const pinoHttp = pino({
    logger,
    customProps: (req) => {
        return {
            prefix: req.headers['x-log-prefix'] || ''
        };
    },
    serializers: {
        req: (req) => {
            const { method, url, headers, body } = req;
            return maskSensitiveData({ method, url, headers, body });
        },
        res: (res) => {
            return maskSensitiveData({
                headers: res.getHeaders(),
                statusCode: res.statusCode
            });
        }
    }
});

export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    resetLogPrefix();

    const requestLogPrefix = req.headers['x-log-prefix'];
    if (requestLogPrefix && typeof requestLogPrefix === 'string') {
        setLogPrefix(requestLogPrefix);
    }

    const child = logger.child({ 
        req: {
            id: req.id,
            method: req.method,
            url: req.url
        }
    });
    
    pinoHttp({ logger: child })(req, res);
    next();
};
