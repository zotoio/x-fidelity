import { Engine, Event, RuleProperties } from 'json-rules-engine';
import { logger, setLogPrefix, getLogPrefix } from '../../utils/logger';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { sendTelemetry } from '../../utils/telemetry';
import { isExempt } from '../../utils/exemptionUtils';
import { SetupEngineParams } from '../../types/typeDefs';
import { ConfigManager } from '../configManager';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';

export async function setupEngine(params: SetupEngineParams): Promise<Engine> {
    const { archetypeConfig, archetype, executionLogPrefix, repoUrl, localConfigPath } = params;
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
    
    // Load repo config to get additional rules
    const repoConfig = await loadRepoXFIConfig(localConfigPath);
        
    logger.debug(`rules loaded: ${config.rules}`);

    const addedRules = new Set();

    // First add archetype rules
    config.rules.forEach((rule) => {
        try {
            if (rule && rule.name) {
                // Check if rule is already registered
                if (addedRules.has(rule.name)) {
                    logger.warn(`Skipping duplicate rule: ${rule.name}`);
                    return;
                }

                logger.info(`adding archetype rule: ${rule.name}`);
                
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
            logger.error(`Error loading archetype rule: ${rule?.name || 'unknown'}`);
            logger.error(e.message);
        }
    });

    // Then add additional rules from repo config
    if (repoConfig.additionalRules?.length) {
        repoConfig.additionalRules.forEach((rule) => {
            try {
                if (rule && rule.name) {
                    // Check if rule is already registered
                    if (addedRules.has(rule.name)) {
                        logger.warn(`Skipping duplicate additional rule: ${rule.name}`);
                        return;
                    }

                    logger.info(`adding additional rule: ${rule.name}`);
                    engine.addRule(rule as RuleProperties);
                    addedRules.add(rule.name);
                }
            } catch (e: any) {
                logger.error(`Error loading additional rule: ${rule?.name || 'unknown'}`);
                logger.error(e.message);
            }
        });
    }

    engine.on('success', async ({ type, params, name, conditions }: Event & { name?: string, conditions?: any }) => {
        const originalLogPrefix = getLogPrefix();
        const ruleName = name || 'unknown-rule';
        setLogPrefix(`${originalLogPrefix}:${ruleName}`);
        
        // Extract operator threshold, value, and condition details from conditions
        let operatorThreshold: { operator: string; value: any } | undefined = undefined;
        let operatorValue: any = undefined;
        let conditionDetails: { fact: string; operator: string; value: any; params?: any } | undefined = undefined;
        let allConditions: any[] = [];
        let allConditionOperators: Array<{
            fact: string;
            operator: string;
            value: any;
            params?: any;
        }> = [];
        let conditionType = 'unknown';
        try {
            const rule = (engine as any).rules.find((r: any) => r.name === name);
            if (rule) {
                const conditions = rule.conditions.all || rule.conditions.any || [];
                conditionType = rule.conditions.all ? 'all' : 'any';
                
                // Capture all conditions with their parameters
                allConditions = conditions.map((condition: any) => ({
                    fact: condition.fact,
                    operator: condition.operator,
                    value: condition.value,
                    params: condition.params,
                    path: condition.path,
                    priority: condition.priority
                }));
                
                // Capture all conditions with operator values
                allConditionOperators = conditions
                    .filter((condition: any) => condition.operator && condition.value !== undefined)
                    .map((condition: any) => ({
                        fact: condition.fact,
                        operator: condition.operator,
                        value: condition.value,
                        params: condition.params
                    }));
                
                // Find the first condition with operator and value
                for (const condition of conditions) {
                    if (condition.operator && condition.value !== undefined) {
                        operatorThreshold = {
                            operator: condition.operator,
                            value: condition.value
                        };
                        operatorValue = condition.value;
                        break;
                    }
                }
                
                // Still keep the specific condition that triggered the rule
                for (const condition of conditions) {
                    if (condition.operator && condition.value !== undefined) {
                        operatorThreshold = {
                            operator: condition.operator,
                            value: condition.value
                        };
                        operatorValue = condition.value;
                        break;
                    }
                }
            }
        } catch (err) {
            logger.debug(`Error extracting operator threshold: ${err}`);
        }
        
        if (type === 'warning') {
            logger.warn(`warning detected: ${JSON.stringify(params)}`);
            await sendTelemetry({
                eventType: 'warning',
                metadata: {
                    archetype,
                    repoPath: '',
                    ruleName,
                    operatorThreshold,
                    operatorValue,
                    allConditions,
                    allConditionOperators,
                    conditionType,
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
                    ruleName,
                    operatorThreshold,
                    operatorValue,
                    allConditions,
                    conditionType,
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
                    ruleName,
                    operatorThreshold,
                    operatorValue,
                    allConditions,
                    conditionType,
                    ...params
                },
                timestamp: new Date().toISOString()
            }, executionLogPrefix);
        }
        
        // Restore original log prefix
        setLogPrefix(originalLogPrefix);
        
        // Restore original log prefix
        setLogPrefix(originalLogPrefix);
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
