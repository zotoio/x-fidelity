import { Engine, Event } from 'json-rules-engine';
import { logger } from '../../utils/logger';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { loadRules } from '../../rules';
import { options } from '../../core/cli';
import { sendTelemetry } from '../../utils/telemetry';

import { SetupEngineParams } from '../../types/typeDefs';

export async function setupEngine(params: SetupEngineParams): Promise<Engine> {
    const { archetypeConfig, archetype, executionLogPrefix, localConfigPath } = params;
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
    const rules = await loadRules({ archetype, ruleNames: archetypeConfig.rules, configServer: options.configServer, logPrefix: executionLogPrefix, localConfigPath });
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
                    fileCount: 0,
                    failureCount: 0,
                    fatalityCount: 0,
                    failureDetails: [],
                    startTime: Date.now(),
                    finishTime: Date.now(),
                    durationSeconds: 0,
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
                    repoPath: '',
                    fileCount: 0,
                    failureCount: 0,
                    fatalityCount: 0,
                    failureDetails: [],
                    startTime: Date.now(),
                    finishTime: Date.now(),
                    durationSeconds: 0,
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
