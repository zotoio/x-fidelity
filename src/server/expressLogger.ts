import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import json from 'prettyjson';


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

    // Log request details
    logger.info( json.render({request: { method, url, headers, body: reqBody }}, { keysColor: 'cyan', stringColor: 'white', defaultIndentation: 2}) );
    // Capture the original send function
    const originalSend = res.send;

    res.send = function (body?: any) {
        // Log response details
        logger.info( json.render({response: {  headers: res.getHeaders(), statusCode: res.statusCode, body: body }}, { keysColor: 'cyan', stringColor: 'white', defaultIndentation: 2}) );

        // Call the original send function
        return originalSend.call(this, body)
    };

    next();
};
