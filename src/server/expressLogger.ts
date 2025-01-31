import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';
import pinoHttp from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from 'pino';

const pinoMiddleware = pinoHttp({
    logger,
    reqCustomProps: (req: IncomingMessage) => ({
        prefix: req.headers['x-log-prefix'] || ''
    }),
    customLogLevel: (_req: IncomingMessage, res: ServerResponse) => {
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
        if (res.statusCode >= 500) return 'error';
        return 'info';
    },
    serializers: {
        req: (request: IncomingMessage) => {
            const { method, url, headers } = request;
            return maskSensitiveData({ method, url, headers });
        },
        res: (response: ServerResponse) => {
            return maskSensitiveData({
                headers: (response as any).getHeaders?.() || {},
                statusCode: response.statusCode || 500
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
