import { Engine, Event, RuleProperties } from 'json-rules-engine';
import { logger } from '../../utils/logger';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { sendTelemetry } from '../../utils/telemetry';
import { isExempt } from '../../utils/exemptionUtils';
import { SetupEngineParams } from '../../types/typeDefs';
import { ConfigManager } from '../configManager';

export async function setupEngine(params: SetupEngineParams): Promise<Engine> {
    const { archetypeConfig, archetype, executionLogPrefix, repoUrl } = params;
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
    const config = await ConfigManager.getConfig({ archetype, logPrefix: executionLogPrefix });
        
    logger.debug(`rules loaded: ${config.rules}`);

    const addedRules = new Set();
    config.rules.forEach((rule) => {
        try {
            if (rule && rule.name) {
                // Check if rule is already registered
                if (addedRules.has(rule.name)) {
                    logger.warn(`Skipping duplicate rule: ${rule.name}`);
                    return;
                }

                logger.info(`adding rule: ${rule.name}`);
                
                // Check for exemption
                if (isExempt({ exemptions: config.exemptions, repoUrl, ruleName: rule.name, logPrefix: executionLogPrefix })) {
                    // clone the rule to avoid modifying the original rule
                    const exemptRule = JSON.parse(JSON.stringify(rule));
                    // update the rule event type to 'exempt' if it is exempted
                    exemptRule.event.type = 'exempt';
                    engine.addRule(exemptRule as RuleProperties);
                } else {
                    engine.addRule(rule as RuleProperties);
                }
                
                // Track added rule
                addedRules.add(rule.name);
            } else {
                logger.error('Invalid rule configuration: rule or rule name is undefined');
            }
        } catch (e: any) {
            logger.error(`Error loading rule: ${rule?.name || 'unknown'}`);
            logger.error(e.message);
        }
    });

    engine.on('success', async ({ type, params }: Event) => {
        if (type === 'warning') {
            logger.warn(`warning detected: ${JSON.stringify(params)}`);
            await sendTelemetry({
                eventType: 'warning',
                metadata: {
                    archetype,
                    repoPath: '',
                    ...params
                },
                timestamp: new Date().toISOString()
            }, executionLogPrefix);
        }
        if (type === 'fatality') {
            logger.error(`fatality detected: ${JSON.stringify(params)}`);
            await sendTelemetry({
                eventType: 'fatality',
                metadata: {
                    archetype,
                    repoPath: '',
                    ...params
                },
                timestamp: new Date().toISOString()
            }, executionLogPrefix);
        }
        if (type === 'exempt') {
            logger.error(`exemption detected: ${JSON.stringify(params)}`);
            await sendTelemetry({
                eventType: 'exempt',
                metadata: {
                    archetype,
                    repoPath: '',
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
            engine.addFact(fact.name, fact.fn, { priority: fact.priority || 1 });
        }
    });

    return engine;
}
