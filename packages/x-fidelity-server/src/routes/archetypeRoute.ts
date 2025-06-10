import { Request, Response } from 'express';
import { logger, setLogPrefix } from '@x-fidelity/core';
import { validateUrlInput } from '@x-fidelity/core';
import { getCachedData, setCachedData } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { validateArchetype } from '@x-fidelity/core';

export async function archetypeRoute(req: Request, res: Response) {
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateUrlInput(archetype)) {
        logger.error(`invalid archetype name: ${archetype}`);
        return res.status(400).json({ error: 'Invalid archetype name' });
    }
    const cacheKey = `archetype:${archetype}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.info(`serving cached archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
        const archetypeConfig = config.archetype;
        logger.debug(`found archetype ${archetype} config: ${JSON.stringify(archetypeConfig)}`);

        if (!validateArchetype(archetypeConfig)) {
            logger.error(`invalid archetype configuration for ${archetype}`);
            return res.status(400).json({ error: 'invalid archetype requested' });
        }

        setCachedData(cacheKey, archetypeConfig);
        logger.info(`serving fresh archetype ${archetype}`);
        res.json(archetypeConfig);
    } catch (error) {
        logger.error(`error fetching archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'internal server error' });
    }
}
