import { logger, setLogPrefix, generateLogPrefix } from '../../utils/logger';
import { FileData } from '../../facts/repoFilesystemFacts';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../../utils/config';
import { ArchetypeConfig } from '../../types/typeDefs';
import { isOpenAIEnabled } from '../../utils/openaiUtils';
import { sendTelemetry } from '../../utils/telemetry';
import { collectRepoFileData } from '../../facts/repoFilesystemFacts';
import { getDependencyVersionFacts, repoDependencyAnalysis } from '../../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../../facts/openaiAnalysisFacts';
import { collectTelemetryData } from './telemetryCollector';
import { setupEngine } from './engineSetup';
import { runEngineOnFiles } from './engineRunner';
import { findKeyValuePair } from './utils';

export async function analyzeCodebase(repoPath: string, archetype = 'node-fullstack', configServer = '', localConfigPath = ''): Promise<any[]> {
    const executionLogPrefix = generateLogPrefix();
    setLogPrefix(executionLogPrefix);
    logger.info(`INITIALISING..`);

    const telemetryData = await collectTelemetryData(repoPath, configServer);

    // Send telemetry for analysis start
    await sendTelemetry({
        eventType: 'analysisStart',
        metadata: {
            archetype,
            repoPath,
            ...telemetryData
        },
        timestamp: new Date().toISOString()
    }, executionLogPrefix);

    const executionConfig = await ConfigManager.getConfig({ archetype, logPrefix: executionLogPrefix });
    const archetypeConfig: ArchetypeConfig = executionConfig.archetype;

    const installedDependencyVersions = await getDependencyVersionFacts(archetypeConfig);
    const fileData: FileData[] = await collectRepoFileData(repoPath, archetypeConfig);

    // add REPO_GLOBAL_CHECK to fileData, which is the trigger for global checks
    fileData.push({
        fileName: REPO_GLOBAL_CHECK,
        filePath: REPO_GLOBAL_CHECK,
        fileContent: REPO_GLOBAL_CHECK
    });

    const { minimumDependencyVersions, standardStructure } = archetypeConfig.config;

    let openaiSystemPrompt; 
    if (isOpenAIEnabled()) {
        openaiSystemPrompt = await collectOpenaiAnalysisFacts(fileData);
    }

    const engine = await setupEngine(archetypeConfig, archetype, ConfigManager, executionLogPrefix, localConfigPath);

    if (isOpenAIEnabled() && archetypeConfig.facts.includes('openaiAnalysisFacts')) {
        logger.info(`adding additional openai facts to engine..`);
        engine.addFact('openaiAnalysis', openaiAnalysis);
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // add output facts
    engine.addFact('repoDependencyAnalysis', repoDependencyAnalysis);

    const failures = await runEngineOnFiles(engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure);

    const finishMsg = `\n==========================\nCHECKS COMPLETED..\n==========================`;
    logger.info(finishMsg);
    logger.info(`${fileData.length} files analyzed. ${failures.length} files with errors.`)

    const fatalities = findKeyValuePair(failures, 'level', 'fatality');

    // Send telemetry for analysis end
    await sendTelemetry({
        eventType: 'analysisEnd',
        metadata: {
            archetype,
            repoPath,
            ...telemetryData,
            fileCount: fileData.length,
            failureCount: failures.length,
            fatalityCount: fatalities.length
        },
        timestamp: new Date().toISOString()
    }, executionLogPrefix);

    if (fatalities.length > 0) {
        throw new Error(JSON.stringify(fatalities));
    }
    return failures;
}

// ... (rest of the helper functions)
