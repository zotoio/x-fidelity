import { collectRepoFileData } from './repoFilesystemFacts';
import { getDependencyVersionFacts } from './repoDependencyFacts';
import { openaiAnalysis } from './openaiAnalysisFacts';
import { globalFileAnalysis } from './globalFileAnalysisFacts';
import { pluginRegistry } from '../core/pluginRegistry';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { FactDefn } from '../types/typeDefs';
import { logger } from '../utils/logger';
import { factMetricsTracker } from '../utils/factMetricsTracker';

async function loadFacts(factNames: string[]): Promise<FactDefn[]> {
    // Get the latest facts including plugins
    const allAvailableFacts: Record<string, FactDefn> = {
        repoFilesystemFacts: { 
            name: 'fileData', 
            fn: async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution('fileData', 
                    () => collectRepoFileData(params, almanac)
                );
            },
            priority: 100 
        },
        repoDependencyFacts: { 
            name: 'dependencyData', 
            fn: async (params: any, almanac: any) => {
                const archetypeConfig = await almanac.factValue('archetypeConfig');
                return factMetricsTracker.trackFactExecution('dependencyData', 
                    () => getDependencyVersionFacts(archetypeConfig)
                );
            }
        },
        openaiAnalysisFacts: { 
            name: 'openaiAnalysis', 
            fn: async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution('openaiAnalysis', 
                    () => openaiAnalysis(params, almanac)
                );
            }
        },
        globalFileAnalysisFacts: {
            name: 'globalFileAnalysis',
            fn: async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution('globalFileAnalysis', 
                    () => globalFileAnalysis.fn(params, almanac)
                );
            },
            priority: 50
        },
        ...Object.fromEntries(
            pluginRegistry.getPluginFacts().map(fact => [
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
        )
    };

    logger.info(`Loading facts: ${factNames.join(',')}`);
    const pluginFacts = pluginRegistry.getPluginFacts();
    logger.info(`Found ${pluginFacts.length} plugin facts available`);
    
    return factNames
        .map(name => {
            const fact = allAvailableFacts[name];
            if (!fact) {
                logger.warn(`Fact not found: ${name}`);
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
