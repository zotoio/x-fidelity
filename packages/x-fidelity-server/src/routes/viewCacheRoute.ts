import { Request, Response } from 'express';
import { logger, setLogPrefix } from '@x-fidelity/core';
import { getCacheContent } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';

export function viewCacheRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    logger.info('Viewing cache');
    const cacheContent = {
        ...getCacheContent(),
        loadedConfigs: ConfigManager.getLoadedConfigs()
    };
    res.status(200).json(cacheContent);
}
