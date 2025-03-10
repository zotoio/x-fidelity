import { OperatorDefn } from '../types/typeDefs';
import { outdatedFramework } from './outdatedFramework';
import { fileContains } from './fileContains';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';
import { openaiAnalysisHighSeverity } from './openaiAnalysisHighSeverity';
import { regexMatch } from './regexMatch';
import { globalPatternRatio } from './globalPatternRatio';
import { globalPatternCount } from './globalPatternCount';
import { astComplexity } from './astComplexity';
import { getOpenAIStatus } from '../utils/openaiUtils';
import { logger } from '../utils/logger';
import { pluginRegistry } from '../core/pluginRegistry';

async function loadOperators(operatorNames: string[]): Promise<OperatorDefn[]> {
    // Get the latest plugin operators
    const allAvailableOperators: Record<string, OperatorDefn> = {
        outdatedFramework,
        fileContains,
        nonStandardDirectoryStructure,
        openaiAnalysisHighSeverity,
        regexMatch,
        globalPatternRatio,
        globalPatternCount,
        ...Object.fromEntries(
            pluginRegistry.getPluginOperators().map(op => [op.name, op])
        )
    };
    const openAIStatus = getOpenAIStatus();
    logger.info(`Loading operators: ${operatorNames.join(', ')}`);
    const loadedOperators: OperatorDefn[] = [];
    const notFoundOperators: string[] = [];
    const pluginOperators = pluginRegistry.getPluginOperators();
    logger.info(`Found ${pluginOperators.length} plugin operators available`);

    for (const name of operatorNames) {
        const operator = allAvailableOperators[name];
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
