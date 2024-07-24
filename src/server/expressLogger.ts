import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import { logger } from '../utils/logger';
import json from 'prettyjson';

const app = express();

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Middleware to log request and response details
export const expressLogger = (req: Request, res: Response, next: NextFunction) => {
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