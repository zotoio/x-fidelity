import { Engine, Event, RuleProperties } from 'json-rules-engine';
import { SetupEngineParams, ArchetypeConfig, ExecutionConfig } from '@x-fidelity/types';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';
import { logger } from '../../utils/logger';
import { LoggerProvider } from '../../utils/loggerProvider';
import { pluginRegistry } from '../pluginRegistry';
import { registerRuleForTracking } from './engineRunner';
import { isExempt } from '../../utils/exemptionUtils';
import { sendTelemetry } from '../../utils/telemetry';

export async function setupEngine(params: SetupEngineParams): Promise<Engine> {
    const {
        archetype,
        logPrefix = '',
        archetypeConfig,
        executionLogPrefix,
        repoUrl,
        rules,
        exemptions
    } = params;

    const engine = new Engine([], { 
        replaceFactsInEventParams: true, 
        allowUndefinedFacts: true 
    });

    try {
        // Load archetype configuration
        const config = archetypeConfig || await loadRepoXFIConfig(repoUrl || process.cwd());

        // Facts and operators are now dynamically loaded from plugins only

        // Load facts from registered plugins (excluding file-dependent facts)
        const pluginFacts = pluginRegistry.getPluginFacts() || [];
        logger.info(`Available plugin facts: ${pluginFacts.map(f => f.name).join(', ')}`);
        
        // Only add facts that don't depend on fileData at engine setup time
        // File-dependent facts (AST-based) will be available through plugin registry during execution
        const globalFacts = pluginFacts.filter(fact => 
            !['ast', 'functionComplexity', 'functionCount', 'codeRhythm'].includes(fact.name)
        );
        
        logger.info(`Adding ${globalFacts.length} global facts to engine: ${globalFacts.map(f => f.name).join(', ')}`);
        for (const fact of globalFacts) {
            logger.debug(`Adding global fact to engine: ${fact.name}`);
            engine.addFact(fact.name, fact.fn, { priority: fact.priority || 1 });
        }

        // Load operators from all registered plugins (dynamic loading)
        const pluginOperators = pluginRegistry.getPluginOperators() || [];
        logger.info(`Dynamically loaded ${pluginOperators.length} operators from registered plugins: ${pluginOperators.map(o => o.name).join(', ')}`);
        
        for (const operator of pluginOperators) {
            logger.debug(`Adding operator to engine: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }

        // Add rules from the passed rules parameter
        if (rules && Array.isArray(rules)) {
            rules.forEach((rule) => {
                try {
                    if (rule && rule.name) {
                        logger.info(`adding rule: ${rule.name}`);
                        
                        // Check for exemption (v3.24.0 contract)
                        if (exemptions && isExempt({ exemptions, repoUrl: repoUrl || '', ruleName: rule.name, logPrefix: executionLogPrefix || '' })) {
                            // clone the rule to avoid modifying the original rule
                            const exemptRule = JSON.parse(JSON.stringify(rule));
                            // update the rule event type to 'exempt' if it is exempted
                            exemptRule.event.type = 'exempt';
                            
                            // Convert RuleConfig to RuleProperties format
                            const ruleProperties = {
                                name: exemptRule.name,
                                conditions: exemptRule.conditions.all ? { all: exemptRule.conditions.all } : { any: exemptRule.conditions.any || [] },
                                event: exemptRule.event
                            };
                            engine.addRule(ruleProperties);
                            // Register the rule for proper name tracking (v3.24.0 contract)
                            registerRuleForTracking(ruleProperties);
                        } else {
                            // Convert RuleConfig to RuleProperties format
                            const ruleProperties = {
                                name: rule.name,
                                conditions: rule.conditions.all ? { all: rule.conditions.all } : { any: rule.conditions.any || [] },
                                event: rule.event
                            };
                            engine.addRule(ruleProperties);
                            // Register the rule for proper name tracking (v3.24.0 contract)
                            registerRuleForTracking(ruleProperties);
                        }
                    } else {
                        logger.error('Invalid rule configuration: rule or rule name is undefined');
                    }
                } catch (e: any) {
                    logger.error(`Error loading rule: ${rule?.name || 'unknown'}`);
                    logger.error(e.message);
                }
            });
        }

        // Add event handler for rule violations and telemetry
        engine.on('success', async ({ type, params, name, conditions }: Event & { name?: string, conditions?: any }) => {
            const ruleName = name || 'unknown-rule';
            
            // Create a child logger without verbose bindings since execution ID is already in prefix
            const childLogger = LoggerProvider.getLogger();
            
            // Extract condition details from conditions
            let conditionDetails: { fact: string; operator: string; value: any; params?: any } | undefined = undefined;
            let allConditions: any[] = [];
            let conditionType: 'all' | 'any' | 'unknown' = 'unknown';
            
            try {
                const rule = (engine as any).rules.find((r: any) => r.name === name);
                if (rule) {
                    const conditions = rule.conditions.all || rule.conditions.any || [];
                    conditionType = rule.conditions.all ? 'all' as const : 'any' as const;
                    
                    // Capture all conditions with their parameters
                    allConditions = conditions.map((condition: any) => ({
                        fact: condition.fact,
                        operator: condition.operator,
                        value: condition.value,
                        params: condition.params,
                        path: condition.path,
                        priority: condition.priority
                    }));
                    
                    // Find the first condition with operator and value for backward compatibility
                    for (const condition of conditions) {
                        if (condition.operator && condition.value !== undefined) {
                            conditionDetails = {
                                fact: condition.fact,
                                operator: condition.operator,
                                value: condition.value,
                                params: condition.params
                            };
                            break;
                        }
                    }
                }
            } catch (err) {
                childLogger.debug(`Error extracting operator threshold: ${err}`);
            }
            
            // Handle different event types with telemetry
            if (type === 'warning') {
                childLogger.warn(`warning detected: ${JSON.stringify(params)}`);
                await sendTelemetry({
                    eventType: 'warning',
                    metadata: {
                        archetype,
                        repoPath: repoUrl || '',
                        ruleName,
                        conditionDetails,
                        allConditions,
                        conditionType,
                        ...params
                    },
                    timestamp: new Date().toISOString()
                }, executionLogPrefix);
            }
            
            if (type === 'fatality') {
                childLogger.error(`fatality detected: ${JSON.stringify(params)}`);
                await sendTelemetry({
                    eventType: 'fatality',
                    metadata: {
                        archetype,
                        repoPath: repoUrl || '',
                        ruleName,
                        conditionDetails,
                        allConditions,
                        conditionType,
                        ...params
                    },
                    timestamp: new Date().toISOString()
                }, executionLogPrefix);
            }
            
            if (type === 'exempt') {
                childLogger.error(`exemption detected: ${JSON.stringify(params)}`);
                await sendTelemetry({
                    eventType: 'exempt',
                    metadata: {
                        archetype,
                        repoPath: repoUrl || '',
                        ruleName,
                        conditionDetails,
                        allConditions,
                        conditionType,
                        ...params
                    },
                    timestamp: new Date().toISOString()
                }, executionLogPrefix);
            }
        });

        return engine;
    } catch (error) {
        logger.error(`${logPrefix}Error setting up engine:`, error);
        throw error;
    }
}
