import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../../utils/logger';
import { ConfigManager } from '../../utils/configManager';

export function exemptionsRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    logger.info('Fetching exemptions');
    const exemptions = ConfigManager.getExemptions();
    res.status(200).json(exemptions);
}
