import { Request, Response, NextFunction } from 'express';
import { validateTelemetryData as validateData } from '../../utils/inputValidation';

export function validateTelemetryData(req: Request, res: Response, next: NextFunction) {
    if (!validateData(req.body)) {
        return res.status(400).json({ error: 'Invalid telemetry data' });
    }
    next();
}
