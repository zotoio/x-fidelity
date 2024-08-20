import { Request, Response, NextFunction } from 'express';
import { validateUrlInput as validateUrl } from '../../utils/inputValidation';

export function validateUrlInput(req: Request, res: Response, next: NextFunction) {
    if (!validateUrl(req.params.archetype) || (req.params.rule && !validateUrl(req.params.rule))) {
        return res.status(400).json({ error: 'Invalid input' });
    }
    next();
}
