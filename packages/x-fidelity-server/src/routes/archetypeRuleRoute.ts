import { Request, Response } from 'express';
import { logger, setLogPrefix } from '@x-fidelity/core';
import { validateUrlInput } from '@x-fidelity/core';
import { getCachedData, setCachedData } from '../cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { validateRule } from '@x-fidelity/core';
import { RuleConfig } from '@x-fidelity/types';

export async function archetypeRuleRoute(req: Request, res: Response) {
    const archetype = req.params.archetype;
    const rule = req.params.rule;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateUrlInput(archetype) || !validateUrlInput(rule)) {
        logger.error(`invalid archetype or rule name: ${archetype}, ${rule}`);
        return res.status(400).json({ error: 'invalid archetype or rule name' });
    }
    const cacheKey = `rule:${archetype}:${rule}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
        logger.info(`serving cached rule ${rule} for archetype ${archetype}`);
        return res.json(cachedData);
    }

    try {
        const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
        const ruleConfigs: RuleConfig[] = config.rules;
        if (ruleConfigs.length > 0 && config.archetype.rules.includes(rule)) {
            const ruleConf = ruleConfigs.find((r) => r.name === rule);

            if (ruleConf && validateRule(ruleConf)) {
                setCachedData(cacheKey, ruleConf);
                logger.info(`serving fresh rule ${req.params.rule} for archetype ${req.params.archetype}`);
                res.json(ruleConf);
            } else {
                logger.error(`invalid rule configuration for ${rule}`);
                res.status(500).json({ error: 'invalid rule configuration' });
            }
        } else {
            res.status(404).json({ error: 'rule not found' });
        }
    } catch (error) {
        logger.error(`error fetching rule ${rule} for archetype ${archetype}: ${error}`);
        res.status(500).json({ error: 'internal server error' });
    }
}
