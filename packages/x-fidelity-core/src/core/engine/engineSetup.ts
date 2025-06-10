import { Engine } from 'json-rules-engine';
import { SetupEngineParams, ArchetypeConfig, ExecutionConfig } from '@x-fidelity/types';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';
import { logger } from '../../utils/logger';
import { pluginRegistry } from '../pluginRegistry';

export async function setupEngine(params: SetupEngineParams): Promise<Engine> {
    const {
        archetype,
        logPrefix = '',
        archetypeConfig,
        executionLogPrefix,
        repoUrl,
        rules
    } = params;

    const engine = new Engine();

    try {
        // Load archetype configuration
        const config = archetypeConfig || await loadRepoXFIConfig(repoUrl || process.cwd());

        // Check for deprecated archetype config arrays and warn users
        if (config.facts && config.facts.length > 0) {
            logger.warn(`DEPRECATED: Archetype config contains facts array. Facts are now dynamically loaded from plugins. Remove 'facts' array from archetype config.`);
        }

        if (config.operators && config.operators.length > 0) {
            logger.warn(`DEPRECATED: Archetype config contains operators array. Operators are now dynamically loaded from plugins. Remove 'operators' array from archetype config.`);
        }

        // Load facts from all registered plugins (dynamic loading)
        const pluginFacts = pluginRegistry.getPluginFacts();
        logger.info(`Dynamically loaded ${pluginFacts.length} facts from registered plugins: ${pluginFacts.map(f => f.name).join(', ')}`);
        
        for (const fact of pluginFacts) {
            logger.debug(`Adding fact to engine: ${fact.name}`);
            engine.addFact(fact.name, fact.fn, { priority: fact.priority || 1 });
        }

        // Load operators from all registered plugins (dynamic loading)
        const pluginOperators = pluginRegistry.getPluginOperators();
        logger.info(`Dynamically loaded ${pluginOperators.length} operators from registered plugins: ${pluginOperators.map(o => o.name).join(', ')}`);
        
        for (const operator of pluginOperators) {
            logger.debug(`Adding operator to engine: ${operator.name}`);
            engine.addOperator(operator.name, operator.fn);
        }

        // Add rules from the passed rules parameter
        if (rules && Array.isArray(rules)) {
            rules.forEach((rule) => {
                // Convert RuleConfig to RuleProperties format
                const ruleProperties = {
                    name: rule.name,
                    conditions: rule.conditions.all ? { all: rule.conditions.all } : { any: rule.conditions.any || [] },
                    event: rule.event
                };
                engine.addRule(ruleProperties);
            });
        }

        // Add exemptions
        if (config.exemptions && Array.isArray(config.exemptions)) {
            engine.addFact('isExempt', (params: any) => {
                // Implement exemption logic
                return false;
            });
        }

        return engine;
    } catch (error) {
        logger.error(`${logPrefix}Error setting up engine:`, error);
        throw error;
    }
}
