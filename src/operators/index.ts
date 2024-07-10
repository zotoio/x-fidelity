import { OperatorDefn } from '../typeDefs';
import { outdatedFramework } from './outdatedFramework';
import { fileContains } from './fileContains';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';
import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';

const allOperators: Record<string, OperatorDefn> = {
    outdatedFramework,
    fileContains,
    nonStandardDirectoryStructure,
    openaiAnalysisHighSeverity
};

async function loadOperators(operatorNames: string[]): Promise<OperatorDefn[]> {
    return operatorNames.map(name => allOperators[name]).filter(Boolean);
}

export { loadOperators };
