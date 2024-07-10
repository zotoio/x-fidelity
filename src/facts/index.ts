import { collectRepoFileData } from './repoFilesystemFacts';
import { getDependencyVersionFacts } from './repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from './openaiAnalysisFacts';

const allFacts: Record<string, { name: string, fn: Function }> = {
    repoFilesystemFacts: { name: 'fileData', fn: collectRepoFileData },
    repoDependencyFacts: { name: 'dependencyData', fn: getDependencyVersionFacts },
    openaiAnalysisFacts: { name: 'openaiAnalysis', fn: openaiAnalysis }
};

async function loadFacts(factNames: string[]): Promise<{ name: string, fn: Function }[]> {
    return factNames.map(name => allFacts[name]).filter(Boolean);
}

export { loadFacts };
