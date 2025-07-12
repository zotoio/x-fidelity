import { Request, Response } from 'express';
import { logger } from '../utils/serverLogger';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';

export async function clearCacheRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    
    // Create context for logging
    const logContext = { 
        requestId: requestLogPrefix, 
        route: 'clearCache' 
    };
    
    try {
        clearCache();
        ConfigManager.clearLoadedConfigs();
        logger.info('[clearCache] Cache cleared successfully', logContext);
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        logger.error(`[clearCache] Error clearing cache: ${error}`, logContext);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
}
