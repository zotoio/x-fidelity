import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../utils/serverLogger';

export function telemetryRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    logger.debug({ 
        telemetryData: req.body,
        type: 'telemetry-received'
    }, 'Accepting telemetry data');
    // Here you can process and store the telemetry data as needed
    res.status(200).json({ message: 'telemetry data received successfully' });
}
