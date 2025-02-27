import { collectRepoFileData } from './repoFilesystemFacts';
import { getDependencyVersionFacts } from './repoDependencyFacts';
import { openaiAnalysis } from './openaiAnalysisFacts';
import { globalFileAnalysis } from './globalFileAnalysisFacts';
import { pluginRegistry } from '../core/pluginRegistry';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { FactDefn } from '../types/typeDefs';
import { logger } from '../utils/logger';

async function loadFacts(factNames: string[]): Promise<FactDefn[]> {
    // Get the latest facts including plugins
    const allAvailableFacts: Record<string, FactDefn> = {
        repoFilesystemFacts: { 
            name: 'fileData', 
            fn: collectRepoFileData,
            priority: 100 
        },
        repoDependencyFacts: { 
            name: 'dependencyData', 
            fn: getDependencyVersionFacts 
        },
        openaiAnalysisFacts: { 
            name: 'openaiAnalysis', 
            fn: openaiAnalysis 
        },
        globalFileAnalysisFacts: {
            name: 'globalFileAnalysis',
            fn: globalFileAnalysis.fn,
            priority: 50 // Set priority to run after globalFileMetadata
        },
        ...Object.fromEntries(
            pluginRegistry.getPluginFacts().map(fact => [fact.name, fact])
        )
    };

    logger.info(`Loading facts: ${factNames.join(', ')}`);
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
