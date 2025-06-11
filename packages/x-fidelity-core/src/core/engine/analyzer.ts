import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';
import { getFormattedDate } from '../../utils/utils';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../configManager';
import { ReportGenerator as XFiReportGenerator } from '../../notifications/reportGenerator';
import { 
    ArchetypeConfig, 
    ResultMetadata, 
    FileData, 
    AnalyzeCodebaseParams, 
    VersionData,
    RuleConfig, 
    RuleCondition, 
    RepoXFIConfig 
} from '@x-fidelity/types';
import { version } from '../../../package.json';
import { isOpenAIEnabled } from '../../utils/openaiUtils';
import { sendTelemetry } from '../../utils/telemetry';
import { factMetricsTracker } from '../../utils/factMetricsTracker';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';
import { collectTelemetryData } from './telemetryCollector';
import { setupEngine } from './engineSetup';
import { runEngineOnFiles, registerRuleForTracking } from './engineRunner';
import { countRuleFailures, safeStringify } from '../../utils/utils';
import { validateRule } from '../../utils/jsonSchemas';
import { pluginRegistry } from '../pluginRegistry';
import { Engine } from 'json-rules-engine';
import { options } from '../options';
import { ScanResult, RuleFailure, ErrorLevel } from '@x-fidelity/types';

export async function analyzeCodebase(params: AnalyzeCodebaseParams): Promise<ResultMetadata> {
    const { repoPath, archetype = 'node-fullstack', configServer = '', localConfigPath = '', executionLogPrefix = '' } = params;
    
    // Reset metrics at start of analysis
    factMetricsTracker.reset();
    
    logger.info(`STARTING..`);

    const telemetryData = await collectTelemetryData({ repoPath, configServer});
    const repoUrl = telemetryData.repoUrl;

    const executionConfig = await ConfigManager.getConfig({ archetype, logPrefix: executionLogPrefix });
    const archetypeConfig: ArchetypeConfig = executionConfig.archetype;

    // Send telemetry for analysis start
        await sendTelemetry({
        eventType: 'analysisStart',
        eventData: {
            archetype,
            repoPath,
            telemetryData,
            options
        },
        metadata: {
            archetype,
            repoPath,
            telemetryData,
            options
        },
        timestamp: new Date().toISOString()
    });

    // Get plugin functions for data collection
    const pluginFacts = pluginRegistry.getPluginFacts();
    
    // Find and call dependency version facts
    const dependencyFact = pluginFacts.find(f => f.name === 'repoDependencyVersions');
    const installedDependencyVersions = dependencyFact 
        ? await dependencyFact.fn({ archetypeConfig }, undefined)
        : [];
    
    // Find and call repo file data collection
    const repoFilesFact = pluginFacts.find(f => f.name === 'repoFilesystemFacts');
    const fileData = repoFilesFact 
        ? await repoFilesFact.fn({ repoPath, archetypeConfig }, undefined)
        : [];
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
        archetypeConfig.facts = archetypeConfig.facts || [];
        archetypeConfig.facts = [...new Set([...archetypeConfig.facts, ...repoXFIConfig.additionalFacts])];
        logger.info(`Added additional facts from repo config: ${repoXFIConfig.additionalFacts.join(', ')}`);
    }
    
    if (repoXFIConfig.additionalOperators) {
        archetypeConfig.operators = archetypeConfig.operators || [];
        archetypeConfig.operators = [...new Set([...archetypeConfig.operators, ...repoXFIConfig.additionalOperators])];
        logger.info(`Added additional operators from repo config: ${repoXFIConfig.additionalOperators.join(', ')}`);
    }

    // add REPO_GLOBAL_CHECK to fileData, which is the trigger for global checks
    fileData.push({
        fileName: REPO_GLOBAL_CHECK,
        filePath: REPO_GLOBAL_CHECK,
        fileContent: REPO_GLOBAL_CHECK,
        content: REPO_GLOBAL_CHECK
    });

    const { minimumDependencyVersions, standardStructure } = archetypeConfig.config;

    let openaiSystemPrompt; 
    if (isOpenAIEnabled()) {
        // Find and call OpenAI analysis fact
        const openAIFact = pluginFacts.find(f => f.name === 'openaiAnalysisFacts');
        openaiSystemPrompt = openAIFact 
            ? await openAIFact.fn({ fileData }, undefined)
            : null;
    }

    const engine = await setupEngine({
        archetypeConfig,
        archetype,
        executionLogPrefix,
        localConfigPath,
        repoUrl,
        rules: executionConfig.rules
    });

    // Add plugin facts and operators directly to the engine
    if (repoXFIConfig.additionalFacts) {
        const pluginFacts = pluginRegistry.getPluginFacts();
        for (const factName of repoXFIConfig.additionalFacts) {
            const fact = pluginFacts.find(f => f.name === factName);
            if (fact) {
                logger.info(`Adding custom fact to engine: ${fact.name}`);
                engine.addFact(fact.name, fact.fn, { priority: fact.priority || 1 });
            }
        }
    }

    if (repoXFIConfig.additionalOperators) {
        const pluginOperators = pluginRegistry.getPluginOperators();
        for (const operatorName of repoXFIConfig.additionalOperators) {
            const operator = pluginOperators.find(o => o.name === operatorName);
            if (operator) {
                logger.info(`Adding custom operator to engine: ${operator.name}`);
                engine.addOperator(operator.name, operator.fn);
            }
        }
    }

    // Load additional rules from repo config
    if (repoXFIConfig.additionalRules && repoXFIConfig.additionalRules.length > 0) {
        logger.info(`Loading additional rules from repo config: ${repoXFIConfig.additionalRules.length} rules`);
        for (const ruleConfig of repoXFIConfig.additionalRules) {
            if (validateRule(ruleConfig)) {
                logger.info(`Adding custom rule from repo config: ${ruleConfig.name}`);
                // Convert RuleConfig to RuleProperties for Engine
                const ruleProperties = {
                    name: ruleConfig.name,
                    conditions: ruleConfig.conditions.all ? { all: ruleConfig.conditions.all } : { any: ruleConfig.conditions.any || [] },
                    event: ruleConfig.event
                };
                engine.addRule(ruleProperties);
                // Register the rule for proper name tracking (v3.24.0 contract)
                registerRuleForTracking(ruleProperties);
            } else {
                logger.warn(`Invalid custom rule in repo config: ${(ruleConfig as any)?.name || 'unnamed rule'}`);
            }
        }
    }

    if (isOpenAIEnabled() && openaiSystemPrompt) {
        logger.info(`adding OpenAI system prompt to engine..`);
        // Static data doesn't need execution tracking
        engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
    }

    // Static data doesn't need execution tracking
    engine.addFact('globalFileMetadata', fileData, { priority: 50 });

    logger.trace(fileData, 'Added globalFileData as fact');

    // add xfiConfig as a fact
    engine.addFact('repoXFIConfig', repoXFIConfig);

    logger.info({ repoXFIConfig }, 'Added repoXFIConfig as fact');

    const failures = await runEngineOnFiles({
        engine,
        fileData,
        installedDependencyVersions: Object.fromEntries(installedDependencyVersions.map((v: any) => [v.name, v.version])),
        minimumDependencyVersions,
        standardStructure
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
            fileCount: fileData.length - 1,
            totalIssues: totalFailureCount,
            warningCount,
            errorCount,
            fatalityCount,
            exemptCount,
            issueDetails: failures.map(f => ({
                filePath: f.filePath || '',
                errors: f.errors
            })),
            durationSeconds: (finishTime - telemetryData.startTime) / 1000,
            telemetryData,
            memoryUsage: {
                heapTotal: memoryUsage.heapTotal,
                heapUsed: memoryUsage.heapUsed,
                external: memoryUsage.external,
                rss: memoryUsage.rss
            },
            repoXFIConfig,
            factMetrics: factMetricsTracker.getMetrics(),
            startTime: telemetryData.startTime,
            finishTime,
            options,
            repoPath,
            repoUrl,
            xfiVersion: version
        }
    }
    
    // Generate reports
    try {
        // Save JSON report
        const jsonReportPath = path.join(process.cwd(), `xfi-report-${getFormattedDate()}.json`);
        await fs.writeFile(
            jsonReportPath,
            JSON.stringify(resultMetadata, null, 2)
        );
        logger.info(`JSON report saved to: ${jsonReportPath}`);

        // Generate and save markdown report
        const generator = new XFiReportGenerator(resultMetadata);
        const markdownReportPath = path.join(process.cwd(), `xfi-report-${getFormattedDate()}.md`);
        try {
            await generator.saveReportToFile(markdownReportPath);
        } catch (error) {
            logger.error(`Failed to generate markdown report: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    } catch (error) {
        logger.error('Failed to save analysis reports - continuing with execution');
    }
    
    // Send telemetry for analysis end
    await sendTelemetry({
        eventType: 'analysisResults',
        eventData: resultMetadata,
        metadata: resultMetadata,
        timestamp: new Date().toISOString()
    });

    return resultMetadata;
}

export async function analyzeFiles(engine: Engine, files: FileData[]): Promise<any[]> {
    const results = [];

    // Add a global check file
    files.push({
        fileName: REPO_GLOBAL_CHECK,
        filePath: REPO_GLOBAL_CHECK,
        fileContent: REPO_GLOBAL_CHECK,
        content: REPO_GLOBAL_CHECK
    });

    // Run rules for each file
    for (const file of files) {
        try {
            logger.debug(`Running rules for file: ${file.filePath}`);
            const result = await engine.run(file);
            results.push(result);
        } catch (error) {
            logger.error(`Error running rules for file ${file.filePath}:`, error);
        }
    }

    return results;
}

