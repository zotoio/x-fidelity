import { Request, Response, NextFunction } from 'express';
import { validateUrlInput as validateUrl, logValidationError } from '../../utils/inputValidation';

export function validateUrlInput(req: Request, res: Response, next: NextFunction) {
    const archetypeValidation = validateUrl(req.params.archetype);
    if (!archetypeValidation.isValid) {
        logValidationError('validateUrlInput', req.params.archetype, archetypeValidation.error || 'Invalid archetype');
        return res.status(400).json({ error: 'Invalid input', details: archetypeValidation.error });
    }

    if (req.params.rule) {
        const ruleValidation = validateUrl(req.params.rule);
        if (!ruleValidation.isValid) {
            logValidationError('validateUrlInput', req.params.rule, ruleValidation.error || 'Invalid rule');
            return res.status(400).json({ error: 'Invalid input', details: ruleValidation.error });
        }
    }

    next();
}
