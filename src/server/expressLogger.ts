import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';
import { IncomingMessage, ServerResponse } from 'http';

export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    resetLogPrefix();

    const requestLogPrefix = req.headers['x-log-prefix'];
    if (requestLogPrefix && typeof requestLogPrefix === 'string') {
        setLogPrefix(requestLogPrefix);
    }

    // Log request
    logger.info({
        req: maskSensitiveData({
            method: req.method,
            url: req.url,
            headers: req.headers,
            requestId: req.headers['x-request-id'] || ''
        })
    }, 'Incoming request');

    // Capture response
    const originalSend = res.send;
    res.send = function(body?: any): Response {
        logger.info({
            res: maskSensitiveData({
                statusCode: res.statusCode,
                headers: res.getHeaders(),
                body: body
            })
        }, 'Outgoing response');

        return originalSend.call(this, body);
    };

    next();
};
