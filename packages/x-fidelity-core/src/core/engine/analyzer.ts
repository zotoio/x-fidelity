import fs from 'fs/promises';
import path from 'path';
import { getFormattedDate } from '../../utils/utils';
import { DefaultLogger } from '../../utils/defaultLogger';
import { LoggerProvider } from '../../utils/loggerProvider';
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
import { createTimingTracker } from '../../utils/timingUtils';
import { logger } from '../../utils/logger';
import { ExecutionContext } from '../../utils/executionContext';

export async function analyzeCodebase(params: AnalyzeCodebaseParams): Promise<ResultMetadata> {
    // Start execution context for consistent logging
    const executionId = ExecutionContext.startExecution({
        component: 'Core',
        operation: 'analyzeCodebase',
        archetype: params.archetype,
        repoPath: params.repoPath,
        metadata: {
            configServer: params.configServer,
            localConfigPath: params.localConfigPath
        }
    });

    // Use the standard logger since execution ID is already in prefix
    const execLogger = LoggerProvider.getLogger();

    execLogger.info('🚀 Starting codebase analysis', {
        repoPath: params.repoPath,
        archetype: params.archetype
    });

    const { repoPath, archetype = 'node-fullstack', configServer = '', localConfigPath = '', executionLogPrefix = '', logger: injectedLogger } = params;
    
    // Use injected logger or create default logger
    const logger = injectedLogger || new DefaultLogger('[X-Fidelity-Core]');
    
    // Inject the logger into the provider so all core and plugin code uses it
    if (injectedLogger) {
        LoggerProvider.setLogger(injectedLogger);
    }
    
    // Create .xfiResults directory
    const resultsDir = path.join(repoPath, '.xfiResults');
    await fs.mkdir(resultsDir, { recursive: true });
    
    // Performance tracking
    const timingTracker = createTimingTracker('ANALYZER TIMING');
    
    // Reset metrics at start of analysis
    factMetricsTracker.reset();
    
    logger.info(`STARTING..`);
    timingTracker.recordTiming('startup');

    const telemetryData = await collectTelemetryData({ repoPath, configServer});
    timingTracker.recordTiming('telemetry_collection');
    
    const repoUrl = telemetryData.repoUrl;

    // CRITICAL BUG FIX: ConfigManager.getConfig() uses options.localConfigPath, 
    // but analyzeCodebase() receives localConfigPath as a parameter.
    // We need to temporarily set options.localConfigPath to ensure the correct config is loaded.
    const originalLocalConfigPath = options.localConfigPath;
    if (localConfigPath) {
        options.localConfigPath = localConfigPath;
        logger.info(`ANALYZER: Using provided localConfigPath: ${localConfigPath}`);
    }
    
    try {
        const executionConfig = await ConfigManager.getConfig({ archetype, logPrefix: executionLogPrefix });
        timingTracker.recordTiming('config_loading');
        
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
        timingTracker.recordTiming('telemetry_send');

        // Get plugin functions for data collection
        const pluginFacts = pluginRegistry.getPluginFacts();
        timingTracker.recordTiming('plugin_facts_loading');
        
        // Find and call dependency version facts
        const dependencyFact = pluginFacts.find(f => f.name === 'repoDependencyVersions');
        const installedDependencyVersions = dependencyFact 
            ? await dependencyFact.fn({ archetypeConfig }, undefined)
            : [];
        timingTracker.recordTiming('dependency_analysis');
        
        // Find and call repo file data collection
        const repoFilesFact = pluginFacts.find(f => f.name === 'repoFilesystemFacts');
        const fileData = repoFilesFact 
            ? await repoFilesFact.fn({ repoPath, archetypeConfig }, undefined)
            : [];
        timingTracker.recordTiming('file_data_collection');
        
        logger.info(`ANALYZER TIMING: File data collection found ${fileData.length} files`);
        
        // Add REPO_GLOBAL_CHECK to fileData, which is the trigger for global checks
        fileData.push({
            fileName: REPO_GLOBAL_CHECK,
            filePath: REPO_GLOBAL_CHECK,
            fileContent: REPO_GLOBAL_CHECK,
            content: REPO_GLOBAL_CHECK
        });
        
        const repoXFIConfig = await loadRepoXFIConfig(repoPath);
        timingTracker.recordTiming('repo_config_loading');
        
        // Load additional plugins from repo config
        if (repoXFIConfig.additionalPlugins && repoXFIConfig.additionalPlugins.length > 0) {
            logger.info(`Loading additional plugins from repo config: ${repoXFIConfig.additionalPlugins.join(', ')}`);
            try {
                await ConfigManager.loadPlugins(repoXFIConfig.additionalPlugins);
            } catch (error) {
                logger.warn(`Error loading additional plugins from repo config: ${error}`);
            }
        }
        timingTracker.recordTiming('additional_plugins_loading');
        
        // Get minimum dependency versions from archetype config
        const minimumDependencyVersions = archetypeConfig.minimumDependencyVersions || {};
        const standardStructure = archetypeConfig.config?.standardStructure || false;
        timingTracker.recordTiming('config_merging');

        const engine = await setupEngine({
            archetypeConfig,
            archetype,
            executionLogPrefix,
            localConfigPath,
            repoUrl,
            rules: executionConfig.rules,
            exemptions: executionConfig.exemptions
        });
        timingTracker.recordTiming('engine_setup');

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
                    // Cast rule to any to safely access name property
                    const ruleName = (rule as any)?.name || 'unnamed rule';
                    logger.warn(`Invalid custom rule in repo config: ${ruleName}`);
                }
            }
        }
        timingTracker.recordTiming('additional_rules_loading');

        if (isOpenAIEnabled()) {
            logger.info(`adding additional openai facts to engine..`);
            // Add fact execution tracking wrapper for openaiAnalysis
            const openaiAnalysisFact = pluginFacts.find(f => f.name === 'openaiAnalysis');
            if (openaiAnalysisFact) {
                engine.addFact('openaiAnalysis', async (params: any, almanac: any) => {
                    return factMetricsTracker.trackFactExecution('openaiAnalysis', 
                        () => openaiAnalysisFact.fn(params, almanac)
                    );
                }, { priority: openaiAnalysisFact.priority || 1 });
            }
            
            // Add OpenAI system prompt from plugin if available
            const collectOpenaiAnalysisFacts = pluginFacts.find(f => f.name === 'collectOpenaiAnalysisFacts');
            if (collectOpenaiAnalysisFacts) {
                const openaiSystemPrompt = await collectOpenaiAnalysisFacts.fn(fileData, undefined);
                engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
            }
        }
        
        // Add fact execution tracking wrappers for core analysis facts
        const repoDependencyAnalysisFact = pluginFacts.find(f => f.name === 'repoDependencyAnalysis');
        if (repoDependencyAnalysisFact) {
            engine.addFact('repoDependencyAnalysis', async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution('repoDependencyAnalysis', 
                    () => repoDependencyAnalysisFact.fn(params, almanac)
                );
            }, { priority: repoDependencyAnalysisFact.priority || 1 });
        }
        
        const repoFileAnalysisFact = pluginFacts.find(f => f.name === 'repoFileAnalysis');
        if (repoFileAnalysisFact) {
            engine.addFact('repoFileAnalysis', async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution('repoFileAnalysis', 
                    () => repoFileAnalysisFact.fn(params, almanac)
                );
            }, { priority: repoFileAnalysisFact.priority || 1 });
        }
        
        timingTracker.recordTiming('openai_setup');

        // Static data doesn't need execution tracking
        engine.addFact('globalFileMetadata', fileData, { priority: 50 });

        logger.trace(fileData, 'Added globalFileData as fact');

        // add xfiConfig as a fact
        engine.addFact('repoXFIConfig', repoXFIConfig);

        logger.debug('Added repoXFIConfig as fact', { repoXFIConfig });
        timingTracker.recordTiming('fact_setup');

        const failures = await runEngineOnFiles({
            engine,
            fileData,
            installedDependencyVersions: Object.fromEntries(installedDependencyVersions.map((v: any) => [v.name, v.version])),
            minimumDependencyVersions,
            standardStructure,
            repoUrl
        });
        timingTracker.recordTiming('engine_execution');

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
        timingTracker.recordTiming('result_assembly');

        // Log detailed timing breakdown
        timingTracker.logTimingBreakdown('ANALYZER', fileData.length - 1);

        const resultMetadata: ResultMetadata = {
            XFI_RESULT: {
                repoXFIConfig,
                issueDetails: failures.map(f => ({
                    filePath: f.filePath || '',
                    errors: f.errors
                })),
                telemetryData,
                memoryUsage: {
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                    rss: memoryUsage.rss
                },
                factMetrics: factMetricsTracker.getMetrics(),
                options,
                startTime: telemetryData.startTime,
                finishTime,
                durationSeconds: (finishTime - telemetryData.startTime) / 1000,
                xfiVersion: version,
                archetype,
                fileCount: fileData.length - 1,
                totalIssues: totalFailureCount,
                warningCount,
                errorCount,
                fatalityCount,
                exemptCount,
                repoPath,
                repoUrl
            }
        };
        
        // Generate reports
        try {
            // Save JSON report
            const jsonReportPath = path.join(resultsDir, `xfi-report-${getFormattedDate()}.json`);
            await fs.writeFile(
                jsonReportPath,
                JSON.stringify(resultMetadata, null, 2)
            );
            logger.info(`JSON report saved to: ${jsonReportPath}`);

            // Generate and save markdown report
            const generator = new XFiReportGenerator(resultMetadata);
            const markdownReportPath = path.join(resultsDir, `xfi-report-${getFormattedDate()}.md`);
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

        // Log completion with execution ID
        execLogger.info('✅ Codebase analysis completed', {
            duration: (finishTime - telemetryData.startTime) / 1000,
            totalIssues: totalFailureCount,
            fileCount: fileData.length - 1
        });

        // End execution context
        ExecutionContext.endExecution();

        return resultMetadata;
    } finally {
        // Restore the original localConfigPath
        options.localConfigPath = originalLocalConfigPath;
    }
}

export async function analyzeFiles(engine: Engine, files: FileData[], logger?: import('@x-fidelity/types').ILogger): Promise<any[]> {
    const results = [];
    const loggerInstance = logger || new DefaultLogger('[X-Fidelity-Core]');

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
            loggerInstance.debug(`Running rules for file: ${file.filePath}`);
            const result = await engine.run(file);
            results.push(result);
        } catch (error) {
            loggerInstance.error(`Error running rules for file ${file.filePath}:`, error);
        }
    }

    return results;
}

