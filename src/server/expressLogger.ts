import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';
import pinoHttp from 'pino-http';

const pinoMiddleware = pinoHttp({
    logger,
    customProps: (req: Request) => {
        return {
            prefix: req.headers['x-log-prefix'] || ''
        };
    },
    serializers: {
        req: (req: Request) => {
            const { method, url, headers, body } = req;
            return maskSensitiveData({ method, url, headers, body });
        },
        res: (res: Response) => {
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
            method: req.method,
            url: req.url,
            requestId: req.headers['x-request-id'] || ''
        }
    });
    
    pinoMiddleware(req, res);
    next();
};
