import { Request, Response } from 'express';
import { RuleProperties } from 'json-rules-engine';
import { logger, setLogPrefix } from '../../utils/logger';
import { validateUrlInput } from '../../utils/inputValidation';
import { getRuleListCache, setRuleListCache } from '../cacheManager';
import { ConfigManager } from '../../core/configManager';
import { options } from '../../core/cli';

const DEFAULT_TTL = parseInt(options.jsonTTL) * 60 * 1000; // Convert CLI option to milliseconds

export async function archetypeRulesRoute(req: Request, res: Response) {
    const archetype = req.params.archetype;
    const requestLogPrefix = req.headers['x-log-prefix'] as string || '';
    setLogPrefix(requestLogPrefix);
    if (!validateUrlInput(archetype)) {
        logger.error(`invalid archetype name: ${archetype}`);
        return res.status(400).json({ error: 'invalid archetype' });
    }
    const cachedRules = getRuleListCache(archetype);
    if (cachedRules) {
        logger.info(`serving cached rule list for archetype: ${archetype}`);
        return res.json(cachedRules);
    }
    const config = await ConfigManager.getConfig({ archetype, logPrefix: requestLogPrefix });
    const archetypeConfig = config.archetype;
    if (archetypeConfig && archetypeConfig.rules) {
        const rules = config.rules;
        setRuleListCache(archetype, rules as RuleProperties[], DEFAULT_TTL);
        logger.info(`serving fresh rule list for archetype: ${archetype}`);
        res.json(rules);
    } else {
        logger.error(`archetype ${archetype} not found or has no rules`);
        res.status(404).json({ error: 'archetype not found or has no rules' });
    }
}
