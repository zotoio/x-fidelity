import { collectRepoFileData } from './repoFilesystemFacts';
import { getDependencyVersionFacts } from './repoDependencyFacts';
import { openaiAnalysis } from './openaiAnalysisFacts';
import { pluginRegistry } from '../core/pluginRegistry';

// eslint-disable-next-line @typescript-eslint/ban-types
const allFacts: Record<string, { name: string, fn: Function }> = {
    repoFilesystemFacts: { name: 'fileData', fn: collectRepoFileData },
    repoDependencyFacts: { name: 'dependencyData', fn: getDependencyVersionFacts },
    openaiAnalysisFacts: { name: 'openaiAnalysis', fn: openaiAnalysis },
    ...Object.fromEntries(
      pluginRegistry.getPluginFacts().map(fact => [fact.name, fact])
    )
};

// eslint-disable-next-line @typescript-eslint/ban-types
async function loadFacts(factNames: string[]): Promise<{ name: string, fn: Function }[]> {
    return factNames
        .map(name => allFacts[name])
        .filter(fact => 
            fact && (!fact.name.startsWith('openai') || 
            (isOpenAIEnabled() && fact.name.startsWith('openai')))
        );
}

export { loadFacts };
import { isOpenAIEnabled } from '../utils/openaiUtils';
