import { logger } from '../../utils/logger';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../configManager';
import { ArchetypeConfig, ResultMetadata } from '../../types/typeDefs';
import { isOpenAIEnabled } from '../../utils/openaiUtils';
import { sendTelemetry } from '../../utils/telemetry';
import { collectRepoFileData, repoFileAnalysis } from '../../facts/repoFilesystemFacts';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';
import { getDependencyVersionFacts, repoDependencyAnalysis } from '../../facts/repoDependencyFacts';
import { collectOpenaiAnalysisFacts, openaiAnalysis } from '../../facts/openaiAnalysisFacts';
import { collectTelemetryData } from './telemetryCollector';
import { setupEngine } from './engineSetup';
import { runEngineOnFiles } from './engineRunner';
import { countRuleFailures, safeStringify } from '../../utils/utils';

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
    const fileData = await collectRepoFileData(repoPath, archetypeConfig);
    const repoXFIConfig = await loadRepoXFIConfig(repoPath);

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

    // add functions for dependency and file analysis
    engine.addFact('repoDependencyAnalysis', repoDependencyAnalysis);
    engine.addFact('repoFileAnalysis', repoFileAnalysis);

    // add xfiConfig as a fact
    engine.addFact('repoXFIConfig', repoXFIConfig);

    logger.info({ repoXFIConfig }, 'Added repoXFIConfig as fact');

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
    const errorCount = countRuleFailures(failures, 'error');

    const finishTime = new Date().getTime();

    const resultMetadata: ResultMetadata = {
        XFI_RESULT: {
            archetype,
            telemetryData,
            repoXFIConfig: repoXFIConfig,
            issueDetails: failures,
            startTime: telemetryData.startTime,
            finishTime: finishTime,
            durationSeconds: (finishTime - telemetryData.startTime) / 1000,
            fileCount: fileData.length,
            totalIssues: totalFailureCount,
            warningCount: warningCount,
            fatalityCount: fatalityCount,
            errorCount: errorCount,
            exemptCount: exemptCount,
            options,
            repoPath,
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

