import { Request, Response } from 'express';
import { logger } from '../utils/serverLogger';
import { clearCache } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';

export async function clearCacheRoute(req: Request, res: Response) {
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    
    // Create a child logger with request context instead of using setLogPrefix
    const requestLogger = requestLogPrefix ? 
        logger.child({ requestId: requestLogPrefix, route: 'clearCache' }) : 
        logger.child({ route: 'clearCache' });
    
    try {
        clearCache();
        ConfigManager.clearLoadedConfigs();
        requestLogger.info('Cache cleared successfully');
        res.json({ message: 'Cache cleared successfully' });
    } catch (error) {
        requestLogger.error(`Error clearing cache: ${error}`);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
}
