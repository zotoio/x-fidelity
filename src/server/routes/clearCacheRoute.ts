import { Request, Response } from 'express';
import { logger, setLogPrefix } from '../../utils/logger';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '../../utils/configManager';

export function clearCacheRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    clearCache();
    ConfigManager.clearLoadedConfigs();
    logger.info('Cache cleared successfully');
    res.status(200).json({ message: 'Cache cleared successfully' });
}
