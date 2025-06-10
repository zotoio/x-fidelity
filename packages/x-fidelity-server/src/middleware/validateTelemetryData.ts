import { Request, Response, NextFunction } from 'express';
import { validateTelemetryData as validateData, logValidationError } from '@x-fidelity/core';

export function validateTelemetryData(req: Request, res: Response, next: NextFunction) {
    const validationResult = validateData(req.body);
    if (!validationResult.isValid) {
        logValidationError('validateTelemetryData', req.body, validationResult.error || 'Unknown error');
        return res.status(400).json({ error: 'Invalid telemetry data', details: validationResult.error || 'Unknown error' });
    }
    next();
}
