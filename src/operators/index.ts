import { OperatorDefn } from '../types/typeDefs';
import { outdatedFramework } from './outdatedFramework';
import { fileContains } from './fileContains';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';
import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';
import { getOpenAIStatus } from '../utils/openaiUtils';
import { logger } from '../utils/logger';
import { pluginRegistry } from '../core/pluginRegistry';

const allOperators: Record<string, OperatorDefn> = {
    outdatedFramework,
    fileContains,
    nonStandardDirectoryStructure,
    openaiAnalysisHighSeverity,
    ...Object.fromEntries(
      pluginRegistry.getPluginOperators().map(op => [op.name, op])
    )
};

async function loadOperators(operatorNames: string[]): Promise<OperatorDefn[]> {
    const openAIStatus = getOpenAIStatus();
    const loadedOperators: OperatorDefn[] = [];
    const notFoundOperators: string[] = [];

    for (const name of operatorNames) {
        const operator = allOperators[name];
        if (operator) {
            if (operator.name.startsWith('openai')) {
                if (openAIStatus.isEnabled) {
                    loadedOperators.push(operator);
                } else {
                    logger.warn(`OpenAI operator ${name} not loaded: ${openAIStatus.reason}`);
                }
            } else {
                loadedOperators.push(operator);
            }
        } else {
            notFoundOperators.push(name);
        }
    }

    if (notFoundOperators.length > 0) {
        logger.warn(`The following operators were not found: ${notFoundOperators.join(', ')}`);
    }

    return loadedOperators;
}

export { loadOperators };
