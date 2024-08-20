import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

const SHARED_SECRET = process.env.XFI_SHARED_SECRET;
const maskedSecret = SHARED_SECRET ? `${SHARED_SECRET.substring(0, 4)}****${SHARED_SECRET.substring(SHARED_SECRET.length - 4)}` : 'not set';

export function checkSharedSecret(req: Request, res: Response, next: NextFunction) {
    const clientSecret = req.headers['x-shared-secret'];
    if (SHARED_SECRET && clientSecret !== SHARED_SECRET) {
        logger.error(`Unauthorized access attempt with incorrect shared secret: ${maskedSecret}`);
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
}
