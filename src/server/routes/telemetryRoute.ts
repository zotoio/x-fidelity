import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../../utils/logger';
import { validateTelemetryData } from '../../utils/inputValidation';

export function telemetryRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateTelemetryData(req.body)) {
        return res.status(400).json({ error: 'Invalid telemetry data' });
    }
    logger.debug(`accepting telemetry data: ${JSON.stringify(req.body)}`);
    // Here you can process and store the telemetry data as needed
    res.status(200).json({ message: 'telemetry data received successfully' });
}
