import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import json from 'prettyjson';

// Function to mask sensitive data
const maskSensitiveData = (obj: any): any => {
    const maskedObj = { ...obj };
    if (maskedObj.headers && maskedObj.headers['x-shared-secret']) {
        maskedObj.headers['x-shared-secret'] = '********';
    }
    return maskedObj;
};

// Middleware to log request and response details
export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    // Reset log prefix for each request
    resetLogPrefix();

    // Set log prefix if provided in the request headers
    const requestLogPrefix = req.headers['x-log-prefix'];
    if (requestLogPrefix && typeof requestLogPrefix === 'string') {
        setLogPrefix(requestLogPrefix);
    }
    const { method, url, headers, body: reqBody } = req;

    // Mask sensitive data before logging
    const maskedReq = maskSensitiveData({ method, url, headers, body: reqBody });

    // Log request details
    logger.info( json.render({request: maskedReq}, { keysColor: 'cyan', stringColor: 'white', defaultIndentation: 2}) );
    // Capture the original send function
    const originalSend = res.send;

    res.send = function (body?: any) {
        // Mask sensitive data before logging
        const maskedRes = maskSensitiveData({
            headers: res.getHeaders(),
            statusCode: res.statusCode,
            body: body
        });

        // Log response details
        logger.info( json.render({response: maskedRes}, { keysColor: 'cyan', stringColor: 'white', defaultIndentation: 2}) );

        // Call the original send function
        return originalSend.call(this, body)
    };

    next();
};
