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
    return factNames
        .map(name => allFacts[name])
        .filter(fact => 
            fact && (!fact.name.startsWith('openai') || 
            (isOpenAIEnabled() && fact.name.startsWith('openai')))
        );
}

export { loadFacts };
