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
import { validateRule } from '../../utils/jsonSchemas';

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
    
    // Load additional plugins from repo config
    if (repoXFIConfig.additionalPlugins && repoXFIConfig.additionalPlugins.length > 0) {
        logger.info(`Loading additional plugins from repo config: ${repoXFIConfig.additionalPlugins.join(', ')}`);
        try {
            await ConfigManager.loadPlugins(repoXFIConfig.additionalPlugins);
        } catch (error) {
            logger.warn(`Error loading additional plugins from repo config: ${error}`);
        }
    }
    
    // Merge additional components into archetype config
    if (repoXFIConfig.additionalFacts) {
        archetypeConfig.facts = [...new Set([...archetypeConfig.facts, ...repoXFIConfig.additionalFacts])];
        logger.info(`Added additional facts from repo config: ${repoXFIConfig.additionalFacts.join(', ')}`);
    }
    
    if (repoXFIConfig.additionalOperators) {
        archetypeConfig.operators = [...new Set([...archetypeConfig.operators, ...repoXFIConfig.additionalOperators])];
        logger.info(`Added additional operators from repo config: ${repoXFIConfig.additionalOperators.join(', ')}`);
    }

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

    // Load additional rules from repo config
    if (repoXFIConfig.additionalRules && repoXFIConfig.additionalRules.length > 0) {
        logger.info(`Loading additional rules from repo config: ${repoXFIConfig.additionalRules.length} rules`);
        for (const rule of repoXFIConfig.additionalRules) {
            if (validateRule(rule)) {
                logger.info(`Adding custom rule from repo config: ${rule.name}`);
                // Convert RuleConfig to RuleProperties for Engine
                const ruleProperties = {
                    ...rule,
                    conditions: rule.conditions as any
                };
                engine.addRule(ruleProperties);
            } else {
                // Use optional chaining to safely access rule.name
                logger.warn(`Invalid custom rule in repo config: ${rule?.name || 'unnamed rule'}`);
            }
        }
    }

    if (isOpenAIEnabled() && archetypeConfig.facts.includes('openaiAnalysisFacts')) {
        logger.info(`adding additional openai facts to engine..`);
        engine.addFact('openaiAnalysis', openaiAnalysis);
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // add functions for dependency and file analysis
    engine.addFact('repoDependencyAnalysis', repoDependencyAnalysis);
    engine.addFact('repoFileAnalysis', repoFileAnalysis);
    engine.addFact('globalFileMetadata', fileData, { priority: 50 });

    logger.trace(fileData, 'Added globalFileData as fact');

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
    logger.info(`${fileData.length -1} files analyzed. ${totalFailureCount} rule failures.`);

    const fatalityCount = countRuleFailures(failures, 'fatality');
    const warningCount = countRuleFailures(failures, 'warning');
    const exemptCount = countRuleFailures(failures, 'exempt');
    const errorCount = countRuleFailures(failures, 'error');

    const finishTime = new Date().getTime();
    const memoryUsage = process.memoryUsage();

    logger.info('Assemblying result metadata..');

    const resultMetadata: ResultMetadata = {
        XFI_RESULT: {
            archetype,
            telemetryData,
            memoryUsage,
            repoXFIConfig: repoXFIConfig,
            issueDetails: failures,
            startTime: telemetryData.startTime,
            finishTime: finishTime,
            durationSeconds: (finishTime - telemetryData.startTime) / 1000,
            fileCount: fileData.length -1,
            totalIssues: totalFailureCount,
            warningCount: warningCount,
            fatalityCount: fatalityCount,
            errorCount: errorCount,
            exemptCount: exemptCount,
            options,
            repoPath,
            repoUrl
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

