import { Engine, Event } from 'json-rules-engine';
import { logger } from '../../utils/logger';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { loadRules } from '../../rules';
import { ArchetypeConfig } from '../../types/typeDefs';
import { ConfigManager } from '../../config/configManager';
import { sendTelemetry } from '../../utils/telemetry';

export async function setupEngine(
    archetypeConfig: ArchetypeConfig, 
    archetype: string, 
    configManager: ConfigManager, 
    executionLogPrefix: string
): Promise<Engine> {
    const engine = new Engine([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });

    // Add operators to engine
    logger.info(`=== loading custom operators..`);
    const operators = await loadOperators(archetypeConfig.operators);
    operators.forEach((operator) => {
        if (!operator?.name?.includes('openai') || (process.env.OPENAI_API_KEY && operator?.name?.includes('openai'))) {
            logger.info(`adding custom operator: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }
    });

    // Add rules to engine
    logger.info(`=== loading json rules..`);
    const rules = await loadRules(archetype, archetypeConfig.rules, configManager.configServer, executionLogPrefix, configManager.localConfigPath);
    logger.debug(rules);

    rules.forEach((rule) => {
        try {
            logger.info(`adding rule: ${rule?.name}`);
            engine.addRule(rule);
        } catch (e: any) {
            console.error(`Error loading rule: ${rule?.name}`);
            logger.error(e.message);
        }
    });

    engine.on('success', async ({ type, params }: Event) => {
        if (type === 'violation') {
            logger.warn(`violation detected: ${JSON.stringify(params)}}`);
            await sendTelemetry({
                eventType: 'violation',
                metadata: {
                    archetype,
                    repoPath: '',
                    repoPath: '',
                    ...params
                },
                timestamp: new Date().toISOString()
            }, executionLogPrefix);
        }
        if (type === 'fatality') {
            logger.error(`fatality detected: ${JSON.stringify(params)}}`);
            await sendTelemetry({
                eventType: 'fatality',
                metadata: {
                    archetype,
                    ...params
                },
                timestamp: new Date().toISOString()
            }, executionLogPrefix);
        }
    });

    // Add facts to engine
    logger.info(`=== loading facts..`);
    const facts = await loadFacts(archetypeConfig.facts);
    facts.forEach((fact) => {
        if (!fact?.name?.includes('openai') || (process.env.OPENAI_API_KEY && fact?.name?.includes('openai'))) {
            logger.info(`adding fact: ${fact.name}`);
            engine.addFact(fact.name, fact.fn);
        }
    });

    return engine;
}
