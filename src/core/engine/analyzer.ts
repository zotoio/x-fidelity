import { logger } from '../../utils/logger';
import { FileData } from '../../facts/repoFilesystemFacts';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../../utils/configManager';
import { ArchetypeConfig, ResultMetadata } from '../../types/typeDefs';
import { isOpenAIEnabled } from '../../utils/openaiUtils';
import { sendTelemetry } from '../../utils/telemetry';
import { collectRepoFileData, repoFileAnalysis } from '../../facts/repoFilesystemFacts';
import { getDependencyVersionFacts, repoDependencyAnalysis } from '../../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../../facts/openaiAnalysisFacts';
import { collectTelemetryData } from './telemetryCollector';
import { setupEngine } from './engineSetup';
import { runEngineOnFiles } from './engineRunner';
import { countRuleFailures } from '../../utils/utils';

import { AnalyzeCodebaseParams } from '../../types/typeDefs';
import { options } from '../cli';

export async function analyzeCodebase(params: AnalyzeCodebaseParams): Promise<ResultMetadata> {
    const { repoPath, archetype = 'node-fullstack', configServer = '', localConfigPath = '', executionLogPrefix = '' } = params;
    
    logger.info(`STARTING..`);

    const telemetryData = await collectTelemetryData({ repoPath, configServer});
    const repoUrl = telemetryData.repoUrl;

    const executionConfig = await ConfigManager.getConfig({ archetype, logPrefix: executionLogPrefix });
    const archetypeConfig: ArchetypeConfig = executionConfig.archetype;

    // Send telemetry for analysis start
    await sendTelemetry({
        eventType: 'analysisStart',
        metadata: {
            archetype,
            repoPath,
            telemetryData,
            options
        },
        timestamp: new Date().toISOString()
    }, executionLogPrefix);

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

    const engine = await setupEngine({
        archetypeConfig,
        archetype,
        executionLogPrefix,
        localConfigPath,
        repoUrl
    });

    if (isOpenAIEnabled() && archetypeConfig.facts.includes('openaiAnalysisFacts')) {
        logger.info(`adding additional openai facts to engine..`);
        engine.addFact('openaiAnalysis', openaiAnalysis);
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // add output facts
    engine.addFact('repoDependencyAnalysis', repoDependencyAnalysis);
    engine.addFact('repoFileAnalysis', repoFileAnalysis);

    const failures = await runEngineOnFiles({
        engine,
        fileData,
        installedDependencyVersions,
        minimumDependencyVersions,
        standardStructure,
        repoUrl
    });

    const finishMsg = `\n==========================\nCHECKS COMPLETED..\n==========================`;
    logger.info(finishMsg);

    const totalFailureCount = countRuleFailures(failures);
    logger.info(`${fileData.length} files analyzed. ${totalFailureCount} rule failures.`);

    const fatalityCount = countRuleFailures(failures, 'fatality');
    const warningCount = countRuleFailures(failures, 'warning');
    const exemptCount = countRuleFailures(failures, 'exempt');

    const finishTime = new Date().getTime();

    const resultMetadata: ResultMetadata = {
        XFI_RESULT: {
            archetype,
            repoPath,
            fileCount: fileData.length,
            totalIssues: totalFailureCount,
            warningCount: warningCount,
            fatalityCount: fatalityCount,
            exemptCount: exemptCount,
            issueDetails: failures,
            startTime: telemetryData.startTime,
            finishTime: finishTime,
            durationSeconds: (finishTime - telemetryData.startTime) / 1000,
            telemetryData,
            options
        }
    }
    
    // Send telemetry for analysis end
    await sendTelemetry({
        eventType: 'analysisResults',
        metadata: resultMetadata,
        timestamp: new Date().toISOString()
    }, executionLogPrefix);

    return resultMetadata;
}

