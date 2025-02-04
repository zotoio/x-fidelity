import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../../utils/logger';
import { ConfigManager } from '../../core/configManager';

export async function exemptionsRoute(req: Request, res: Response) {
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    logger.info('Fetching exemptions');
    const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
    const exemptions = config.exemptions
    res.status(200).json(exemptions);
}
