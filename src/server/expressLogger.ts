import { Request, Response, NextFunction } from 'express';
import { logger, resetLogPrefix, setLogPrefix } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';

export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
    resetLogPrefix();

    const requestLogPrefix = req.headers['x-log-prefix'];
    if (requestLogPrefix && typeof requestLogPrefix === 'string') {
        setLogPrefix(requestLogPrefix);
    }
    
    const { method, url, headers, body: reqBody } = req;
    const maskedReq = maskSensitiveData({ method, url, headers, body: reqBody });

    logger.info({ request: maskedReq }, 'Incoming request');

    const originalSend = res.send;

    res.send = function (body?: any) {
        const maskedRes = maskSensitiveData({
            headers: res.getHeaders(),
            statusCode: res.statusCode,
            body: body
        });

        logger.info({ response: maskedRes }, 'Outgoing response');

        return originalSend.call(this, body);
    };

    next();
};
