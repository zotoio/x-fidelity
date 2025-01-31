import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';
import pinoHttp from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { Logger } from 'pino';

import type { Options } from 'pino-http';

const pinoOptions: Options = {
    logger,
    autoLogging: true,
    customLogLevel: (req: IncomingMessage, res: ServerResponse<IncomingMessage>, error?: Error) => {
        if (error) return 'error';
        if (res.statusCode >= 400 && res.statusCode < 500) return 'warn';
        if (res.statusCode >= 500) return 'error';
        return 'info';
    },
    customProps: (req: IncomingMessage) => ({
        prefix: req.headers['x-log-prefix'] || ''
    }),
    serializers: {
        req: (request) => {
            const { method, url, headers } = request;
            return maskSensitiveData({ method, url, headers });
        },
        res: (response) => {
            return maskSensitiveData({
                headers: (response as any).getHeaders?.() || {},
                statusCode: response.statusCode || 500
            });
        }
    }
};

const pinoMiddleware = pinoHttp(pinoOptions);

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
