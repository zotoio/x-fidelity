import { Request, Response } from 'express';
import { logger } from '../utils/serverLogger';
import { validateUrlInput, ExecutionContext } from '@x-fidelity/core';
import { getCachedData, setCachedData } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { validateArchetype } from '@x-fidelity/core';

export async function archetypeRoute(req: Request, res: Response) {
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    
    // Start execution context for this request if we don't have a log prefix
    let executionId = requestLogPrefix;
    if (!executionId) {
        executionId = ExecutionContext.startExecution({
            component: 'Server',
            operation: 'archetype-fetch',
            archetype,
            metadata: { route: 'archetype' }
        });
    }
    
    // Create context for logging
    const logContext = { 
        executionId,
        requestId: requestLogPrefix, 
        route: 'archetype', 
        archetype 
    };
    
    if (!validateUrlInput(archetype)) {
        logger.error(`[archetype] invalid archetype name: ${archetype}`, logContext);
        return res.status(400).json({ error: 'Invalid archetype name' });
    }
    const cacheKey = `archetype:${archetype}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.info(`[archetype] serving cached archetype ${archetype}`, logContext);
        return res.json(cachedData);
    }

    try {
        const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
        const archetypeConfig = config.archetype;
        logger.debug(`[archetype] found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`, logContext);

        if (!validateArchetype(archetypeConfig)) {
            logger.error(`[archetype] invalid archetype configuration for ${archetype}`, logContext);
            return res.status(400).json({ error: 'invalid archetype requested' });
        }

        setCachedData(cacheKey, archetypeConfig);
        logger.info(`[archetype] serving fresh archetype ${archetype}`, logContext);
        res.json(archetypeConfig);
    } catch (error) {
        logger.error(`[archetype] error fetching archetype ${archetype}: ${error}`, logContext);
        res.status(500).json({ error: 'internal server error' });
    }
}
