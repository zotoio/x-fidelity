import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';
import pinoHttp from 'pino-http';

const pinoMiddleware = pinoHttp({
    logger,
    customProps: (_req) => ({
        prefix: _req.headers['x-log-prefix'] || ''
    }),
    customLogLevel: (req, res) => {
        const status = res.statusCode || 500;
        if (status >= 400 && status < 500) return 'warn';
        if (status >= 500) return 'error';
        return 'info';
    },
    serializers: {
        req: (request) => {
            const { method, url, headers, body } = request;
            return maskSensitiveData({ method, url, headers, body });
        },
        res: (response) => {
            return maskSensitiveData({
                headers: response.getHeaders?.() || {},
                statusCode: response.statusCode || 500
            });
        },
        err: pino.stdSerializers.err
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
