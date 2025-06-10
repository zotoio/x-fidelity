import { pluginRegistry } from '../core/pluginRegistry';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { FactDefn } from '@x-fidelity/types';
import { logger } from '../utils/logger';
import { factMetricsTracker } from '../utils/factMetricsTracker';

async function loadFacts(factNames: string[]): Promise<FactDefn[]> {
    // Get facts from plugins only - core facts have been migrated to plugins
    const pluginFacts = pluginRegistry.getPluginFacts();
    const allAvailableFacts: Record<string, FactDefn> = Object.fromEntries(
        pluginFacts.map(fact => [
            fact.name, 
            {
                ...fact,
                fn: async (params: any, almanac: any) => {
                    return factMetricsTracker.trackFactExecution(fact.name, 
                        () => fact.fn(params, almanac)
                    );
                }
            }
        ])
    );

    logger.info(`Loading facts: ${factNames.join(',')}`);
    logger.info(`Found ${pluginFacts.length} plugin facts available`);
    
    return factNames
        .map(name => {
            const fact = allAvailableFacts[name];
            if (!fact) {
                logger.warn(`Fact not found: ${name}. Available facts: ${Object.keys(allAvailableFacts).join(', ')}`);
            } else {
                logger.debug(`Loaded fact: ${name}`);
            }
            return fact;
        })
        .filter(fact => {
            if (!fact) return false;
            if (fact.name.startsWith('openai')) {
                const enabled = isOpenAIEnabled();
                if (!enabled) {
                    logger.warn(`OpenAI fact ${fact.name} not loaded: OpenAI integration disabled`);
                }
                return enabled;
            }
            return true;
        });
}

export { loadFacts };
