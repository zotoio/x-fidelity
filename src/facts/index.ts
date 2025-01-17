import { collectRepoFileData } from './repoFilesystemFacts';
import { getDependencyVersionFacts } from './repoDependencyFacts';
import { openaiAnalysis } from './openaiAnalysisFacts';
import { pluginRegistry } from '../core/pluginRegistry';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { FactDefn } from '../types/typeDefs';

const allFacts: Record<string, FactDefn> = {
    repoFilesystemFacts: { 
        name: 'fileData', 
        fn: collectRepoFileData 
    },
    repoDependencyFacts: { 
        name: 'dependencyData', 
        fn: getDependencyVersionFacts 
    },
    openaiAnalysisFacts: { 
        name: 'openaiAnalysis', 
        fn: openaiAnalysis 
    },
    ...Object.fromEntries(
        pluginRegistry.getPluginFacts().map(fact => [fact.name, fact])
    )
};

async function loadFacts(factNames: string[]): Promise<FactDefn[]> {
    logger.info(`Loading facts: ${factNames.join(', ')}`);
    const pluginFacts = pluginRegistry.getPluginFacts();
    logger.info(`Found ${pluginFacts.length} plugin facts available`);
    
    return factNames
        .map(name => {
            const fact = allFacts[name];
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
