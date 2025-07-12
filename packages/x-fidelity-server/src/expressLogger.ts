import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/serverLogger';
import { maskSensitiveData } from '@x-fidelity/core';
import { IncomingMessage, ServerResponse } from 'http';

export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    const requestLogPrefix = req.headers['x-log-prefix'];
    
    // Create context for logging
    const logContext = {
        requestId: requestLogPrefix && typeof requestLogPrefix === 'string' ? requestLogPrefix : undefined,
        method: req.method,
        url: req.url,
        headers: req.headers['x-request-id'] || ''
    };

    // Log request
    logger.info('[express] Incoming request', {
        ...logContext,
        req: maskSensitiveData({
            method: req.method,
            url: req.url,
            headers: req.headers,
            requestId: req.headers['x-request-id'] || ''
        })
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(body?: any): Response {
        logger.info('[express] Outgoing response', {
            ...logContext,
            res: maskSensitiveData({
                statusCode: res.statusCode,
                headers: res.getHeaders(),
                body: body
            })
        });

        return originalSend.call(this, body);
    };

    next();
};
