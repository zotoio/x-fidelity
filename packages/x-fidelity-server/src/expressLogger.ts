import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/serverLogger';
import { maskSensitiveData } from '@x-fidelity/core';
import { IncomingMessage, ServerResponse } from 'http';

export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    const requestLogPrefix = req.headers['x-log-prefix'];
    
    // Create a child logger with request context instead of using setLogPrefix
    const requestLogger = requestLogPrefix && typeof requestLogPrefix === 'string' ? 
        logger.child({ 
            requestId: requestLogPrefix, 
            method: req.method, 
            url: req.url,
            headers: req.headers['x-request-id'] || ''
        }) : 
        logger.child({ 
            method: req.method, 
            url: req.url,
            headers: req.headers['x-request-id'] || ''
        });

    // Log request
    requestLogger.info({
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
        requestLogger.info({
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
