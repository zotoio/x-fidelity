import fs from 'fs/promises';
import path from 'path';
import { getFormattedDate } from '../../utils/utils';
import { DefaultLogger } from '../../utils/defaultLogger';
import { LoggerProvider } from '../../utils/loggerProvider';
import { ConfigManager, REPO_GLOBAL_CHECK } from '../configManager';
import { ReportGenerator as XFiReportGenerator } from '../../notifications/reportGenerator';
import { FileCacheManager } from '../../utils/fileCacheManager';
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
    
    // ✅ NEW: Perform startup cleanup of old result files
    await FileCacheManager.performStartupCleanup(resultsDir, {
        maxFilesPerPrefix: 10,
        maxAgeHours: 168, // 7 days
        dryRun: false
    });
    timingTracker.recordTiming('startup_cleanup');
    
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
        
        // Get minimum dependency versions from archetype config early
        const dependencyVersionRequirements = archetypeConfig.minimumDependencyVersions || {};
        
        // Find and call dependency version facts with proper parameters
        const dependencyFact = pluginFacts.find(f => f.name === 'repoDependencyVersions');
        const installedDependencyVersions = dependencyFact 
            ? await dependencyFact.fn({ repoPath, archetypeConfig }, undefined)
            : [];
        timingTracker.recordTiming('dependency_analysis');
        
        // Find and call repo file data collection
        const repoFilesFact = pluginFacts.find(f => f.name === 'repoFilesystemFacts');
        const rawFileData = repoFilesFact 
            ? await repoFilesFact.fn({ repoPath, archetypeConfig }, undefined)
            : [];
        timingTracker.recordTiming('file_data_collection');
        
        logger.info(`ANALYZER TIMING: File data collection found ${rawFileData.length} files`);

        // ✅ NEW: Initialize file cache manager
        const fileCache = FileCacheManager.getInstance(resultsDir);
        
        // ✅ NEW: Handle targeted file analysis (zap files)
        let fileData: FileData[] = rawFileData;
        if (options.zapFiles && options.zapFiles.length > 0) {
            logger.info(`🎯 Targeted analysis mode: ${options.zapFiles.length} specific files`);
            
            // Resolve zap files to absolute paths
            const zapFilesAbsolute = options.zapFiles.map((file: string) => 
                path.isAbsolute(file) ? file : path.resolve(options.dir || repoPath, file)
            );
            
            // Filter file data to only include zap files
            fileData = rawFileData.filter((file: FileData) => {
                const absolutePath = path.resolve(file.filePath);
                return zapFilesAbsolute.includes(absolutePath);
            });
            
            logger.info(`🎯 Filtered to ${fileData.length} files for targeted analysis`);
            
            // Validate that all zap files were found
            const foundFiles = fileData.map(f => path.resolve(f.filePath));
            const missingFiles = zapFilesAbsolute.filter(f => !foundFiles.includes(f));
            if (missingFiles.length > 0) {
                logger.warn(`⚠️ Zap files not found: ${missingFiles.join(', ')}`);
            }
        }

        // ✅ NEW: Apply file change detection for performance optimization
        const filePaths = fileData.map(f => f.filePath);
        const changedFiles = await fileCache.getChangedFiles(filePaths);
        
        // If we're not doing targeted analysis and most files haven't changed, 
        // we can optimize by only processing changed files
        if (!options.zapFiles && changedFiles.length < fileData.length * 0.8) {
            logger.info(`🚀 Performance optimization: Only ${changedFiles.length}/${fileData.length} files changed`);
            
            // Filter to only changed files for iterative analysis
            // But keep all files for global analysis context
            const unchangedFiles = fileData.filter(f => !changedFiles.includes(f.filePath));
            
            // For unchanged files, try to get cached results
            for (const file of unchangedFiles) {
                const cachedResult = fileCache.getCachedResult(file.filePath);
                if (cachedResult) {
                    // Attach cached result to file for potential reuse
                    (file as any).cachedAnalysisResult = cachedResult;
                }
            }
            
            logger.info(`📊 Cache hit rate: ${unchangedFiles.filter(f => (f as any).cachedAnalysisResult).length}/${unchangedFiles.length} files had cached results`);
        }
        
        timingTracker.recordTiming('file_cache_processing');
        
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
        
        // Get standard structure setting from archetype config
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

        // ✅ NEW: Enhanced generic fact handling system
        logger.info('Processing facts by type...');
        
        // Separate facts by their execution pattern
        const globalPrecomputedFacts = pluginFacts.filter(f => f.type === 'global');
        const globalFunctionFacts = pluginFacts.filter(f => f.type === 'global-function');
        const iterativeFunctionFacts = pluginFacts.filter(f => f.type === 'iterative-function' || !f.type); // Default to iterative-function for backward compatibility
        
        const globalFactResults: { [name: string]: any } = {};
        
        // Create a minimal almanac for global fact computation
        const globalAlmanac = {
            factValue: async (factName: string) => {
                // Provide access to basic global data for fact computation
                switch (factName) {
                    case 'fileData':
                        return { fileName: 'REPO_GLOBAL_CHECK' }; // Global context marker
                    case 'dependencyData':
                        return {
                            installedDependencyVersions: Object.fromEntries(installedDependencyVersions.map((v: any) => [v.name, v.version])),
                            minimumDependencyVersions: dependencyVersionRequirements
                        };
                    case 'globalFileMetadata':
                        return fileData;
                    case 'openaiSystemPrompt':
                        // Special case for OpenAI system prompt
                        const collectOpenaiAnalysisFacts = pluginFacts.find(f => f.name === 'collectOpenaiAnalysisFacts');
                        if (collectOpenaiAnalysisFacts) {
                            return await collectOpenaiAnalysisFacts.fn(fileData, undefined);
                        }
                        return null;
                    default:
                        return globalFactResults[factName] || null;
                }
            },
            addRuntimeFact: (name: string, value: any) => {
                globalFactResults[name] = value;
            }
        };

        // 1️⃣ Handle 'global' facts: precompute once and cache as static data
        for (const fact of globalPrecomputedFacts) {
            try {
                logger.debug(`Precomputing global fact: ${fact.name}`);
                // ✅ Pass correct parameters structure for global facts
                const globalParams = { repoPath, archetypeConfig };
                const result = await factMetricsTracker.trackFactExecution(fact.name, 
                    () => fact.fn(globalParams, globalAlmanac)
                );
                globalFactResults[fact.name] = result;
                
                // Add the precomputed result as static data to the engine with priority
                engine.addFact(fact.name, result, { priority: fact.priority || 1 });
                logger.debug(`✅ Global fact ${fact.name} precomputed and cached`);
            } catch (error) {
                logger.error(`❌ Failed to precompute global fact ${fact.name}:`, error);
                // Add empty result to prevent failures
                engine.addFact(fact.name, { result: [] }, { priority: fact.priority || 1 });
            }
        }

        // 2️⃣ Handle 'global-function' facts: functions that run once per repo but with different params per rule
        for (const fact of globalFunctionFacts) {
            logger.debug(`Adding global-function fact: ${fact.name}`);
            engine.addFact(fact.name, async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution(fact.name, 
                    () => fact.fn(params, almanac)
                );
            }, { priority: fact.priority || 1 });
            logger.debug(`✅ Global-function fact ${fact.name} added to engine`);
        }

        // Special case: Add OpenAI system prompt for global-function facts
        if (isOpenAIEnabled()) {
            logger.info(`Adding OpenAI facts to engine...`);
            // Add OpenAI system prompt if available
            const openaiSystemPrompt = globalFactResults['openaiSystemPrompt'] || 
                await (async () => {
                    const collectOpenaiAnalysisFacts = pluginFacts.find(f => f.name === 'collectOpenaiAnalysisFacts');
                    if (collectOpenaiAnalysisFacts) {
                        return await collectOpenaiAnalysisFacts.fn(fileData, undefined);
                    }
                    return null;
                })();
            
            if (openaiSystemPrompt) {
                engine.addFact('openaiSystemPrompt', openaiSystemPrompt);
            }
        }
        
        // 3️⃣ Handle 'iterative-function' facts: functions that run once per file (default behavior)
        for (const fact of iterativeFunctionFacts) {
            logger.debug(`Adding iterative-function fact: ${fact.name}`);
            engine.addFact(fact.name, async (params: any, almanac: any) => {
                return factMetricsTracker.trackFactExecution(fact.name, 
                    () => fact.fn(params, almanac)
                );
            }, { priority: fact.priority || 1 });
            logger.debug(`✅ Iterative-function fact ${fact.name} added to engine`);
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
            minimumDependencyVersions: dependencyVersionRequirements,
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
        
        // ✅ NEW: Enhanced report generation with per-type retention and caching
        try {
            // Update file cache with analysis results for processed files
            const processedFiles = fileData.filter(f => f.fileName !== REPO_GLOBAL_CHECK);
            for (const file of processedFiles) {
                await fileCache.updateFileCache(file.filePath, {
                    analysisMetadata: resultMetadata,
                    processedAt: finishTime
                });
            }
            
            // Save multiple report formats with enhanced management using readable dates
            const reportFormats = [
                {
                    content: JSON.stringify(resultMetadata, null, 2),
                    prefix: 'xfi-result',
                    extension: 'json'
                }
            ];
            
            // Generate and save markdown report
            try {
                const generator = new XFiReportGenerator(resultMetadata);
                const markdownReportPath = path.join(resultsDir, `temp-xfi-report-${Date.now()}.md`);
                await generator.saveReportToFile(markdownReportPath);
                
                // Read the generated markdown content
                const markdownContent = await fs.readFile(markdownReportPath, 'utf8');
                reportFormats.push({
                    content: markdownContent,
                    prefix: 'xfi-report',
                    extension: 'md'
                });
                
                // Clean up temp file
                await fs.unlink(markdownReportPath);
            } catch (error) {
                logger.warn('Failed to generate markdown report:', error);
            }

            // Save all reports with the new system
            const savedFiles: any[] = [];
            for (const format of reportFormats) {
                try {
                    // Since we're in core and ResultFileManager is in VSCode package,
                    // we'll implement the same logic here with the new naming system
                    const now = new Date();
                    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
                    const timestamp = now.getTime();
                    const filename = `${format.prefix}-${dateStr}-${timestamp}.${format.extension}`;
                    const fullPath = path.join(resultsDir, filename);
                    
                    // Write timestamped file
                    await fs.writeFile(fullPath, format.content, 'utf8');
                    logger.info(`${format.extension.toUpperCase()} report saved: ${filename}`);
                    
                    savedFiles.push({ 
                        filename, 
                        fullPath, 
                        prefix: format.prefix, 
                        extension: format.extension 
                    });
                    
                    // Cleanup old files for this prefix/extension combination
                    await cleanupOldResultsByPrefix(resultsDir, format.prefix, format.extension);
                } catch (error) {
                    logger.error(`Failed to save ${format.extension} report:`, error);
                }
            }
            
            // Always maintain latest result copy for JSON files
            const jsonFile = savedFiles.find(f => f.extension === 'json');
            if (jsonFile) {
                const latestResultPath = path.join(resultsDir, 'XFI_RESULT.json');
                await fs.writeFile(latestResultPath, reportFormats.find(f => f.extension === 'json')?.content || '{}', 'utf8');
                logger.info('Latest result updated: XFI_RESULT.json');
            }
            
            // Always maintain latest result copy for markdown files
            const mdFile = savedFiles.find(f => f.extension === 'md');
            if (mdFile) {
                const latestMdPath = path.join(resultsDir, 'XFI_RESULT.md');
                await fs.writeFile(latestMdPath, reportFormats.find(f => f.extension === 'md')?.content || '', 'utf8');
                logger.info('Latest result updated: XFI_RESULT.md');
            }
            
            // Save file cache to disk
            await fileCache.saveCacheToDisk();
            
            // Ensure .gitignore is updated
            try {
                await ensureGitIgnoreEntry(repoPath);
            } catch (error) {
                logger.warn('Failed to update .gitignore:', error);
            }
            
        } catch (error) {
            logger.error('Failed to save enhanced analysis reports - continuing with execution', error);
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

/**
 * Helper function to clean up old result files by type
 */
async function cleanupOldResultsByType(resultsDir: string, fileType: string): Promise<void> {
    const MAX_FILES_PER_TYPE = 10;
    
    try {
        const files = await fs.readdir(resultsDir);
        const pattern = new RegExp(`^xfi-result-(\\d+)\\.${fileType}$`);
        
        const matchingFiles = files
            .map(filename => {
                const match = filename.match(pattern);
                if (match) {
                    return {
                        filename,
                        timestamp: parseInt(match[1]),
                        fullPath: path.join(resultsDir, filename)
                    };
                }
                return null;
            })
            .filter(f => f !== null)
            .sort((a, b) => b!.timestamp - a!.timestamp); // Sort by timestamp (newest first)
        
        if (matchingFiles.length > MAX_FILES_PER_TYPE) {
            const filesToDelete = matchingFiles.slice(MAX_FILES_PER_TYPE);
            
            for (const file of filesToDelete) {
                if (file) {
                    await fs.unlink(file.fullPath);
                    logger.debug(`Cleaned up old ${fileType} result: ${file.filename}`);
                }
            }
            
            logger.info(`Cleaned up ${filesToDelete.length} old ${fileType} result files`);
        }
    } catch (error) {
        logger.error(`Failed to cleanup old ${fileType} results:`, error);
    }
}

/**
 * Helper function to clean up old result files by prefix and extension
 */
async function cleanupOldResultsByPrefix(resultsDir: string, prefix: string, extension: string): Promise<void> {
    const MAX_FILES_PER_PREFIX = 10;
    
    try {
        const files = await fs.readdir(resultsDir);
        
        // Match pattern: prefix-YYYY-MM-DD-timestamp.extension or prefix-timestamp.extension
        const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-\\d{4}-\\d{2}-\\d{2})?-(\\d+)\\.${extension}$`);
        
        const matchingFiles = files
            .map(filename => {
                const match = filename.match(pattern);
                if (match) {
                    return {
                        filename,
                        timestamp: parseInt(match[1]),
                        fullPath: path.join(resultsDir, filename)
                    };
                }
                return null;
            })
            .filter(f => f !== null)
            .sort((a, b) => b!.timestamp - a!.timestamp); // Sort by timestamp (newest first)
        
        if (matchingFiles.length > MAX_FILES_PER_PREFIX) {
            const filesToDelete = matchingFiles.slice(MAX_FILES_PER_PREFIX);
            
            for (const file of filesToDelete) {
                if (file) {
                    await fs.unlink(file.fullPath);
                    logger.debug(`Cleaned up old file: ${file.filename}`);
                }
            }
            
            logger.info(`Cleaned up ${filesToDelete.length} old ${extension} files with prefix '${prefix}'`);
        }
    } catch (error) {
        logger.error(`Failed to cleanup old files by prefix:`, { prefix, extension, error });
    }
}

/**
 * Helper function to ensure .xfiResults is in .gitignore
 */
async function ensureGitIgnoreEntry(repoRoot: string): Promise<void> {
    try {
        const gitignorePath = path.join(repoRoot, '.gitignore');
        const xfiResultsEntry = '.xfiResults/';
        
        let gitignoreContent = '';
        try {
            gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
        } catch {
            // File doesn't exist, that's fine
        }

        // Check if .xfiResults is already in .gitignore
        if (!gitignoreContent.includes('.xfiResults')) {
            const newContent = gitignoreContent.trim() + '\n\n# X-Fidelity analysis results\n.xfiResults/\n';
            await fs.writeFile(gitignorePath, newContent, 'utf8');
            logger.info('Added .xfiResults/ to .gitignore');
        }

    } catch (error) {
        logger.warn('Failed to update .gitignore:', error);
    }
}

