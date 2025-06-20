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
    
    // Create a child logger with request context including execution ID
    const requestLogger = logger.child({ 
        executionId,
        requestId: requestLogPrefix, 
        route: 'archetype', 
        archetype 
    });
    
    if (!validateUrlInput(archetype)) {
        requestLogger.error(`invalid archetype name: ${archetype}`);
        return res.status(400).json({ error: 'Invalid archetype name' });
    }
    const cacheKey = `archetype:${archetype}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        requestLogger.info(`serving cached archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
        const archetypeConfig = config.archetype;
        requestLogger.debug(`found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`);

        if (!validateArchetype(archetypeConfig)) {
            requestLogger.error(`invalid archetype configuration for ${archetype}`);
            return res.status(400).json({ error: 'invalid archetype requested' });
        }

        setCachedData(cacheKey, archetypeConfig);
        requestLogger.info(`serving fresh archetype ${archetype}`);
        res.json(archetypeConfig);
    } catch (error) {
        requestLogger.error(`error fetching archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'internal server error' });
    }
}
