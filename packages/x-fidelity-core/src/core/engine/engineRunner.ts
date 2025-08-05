import { ScanResult, RuleFailure, ErrorLevel, RunEngineOnFilesParams, ILogger, EXECUTION_MODES } from '@x-fidelity/types';
import { Engine } from 'json-rules-engine';
import { REPO_GLOBAL_CHECK } from '../configManager';
import { executeErrorAction } from './errorActionExecutor';
import { createTimingTracker } from '../../utils/timingUtils';
import { pluginRegistry } from '../pluginRegistry';
import { LoggerProvider } from '../../utils/loggerProvider';
import * as path from 'path';

// Rule registry to map event types to rule names
const ruleEventTypeRegistry = new Map<string, { name: string; rule: any }[]>();

/**
 * Registers a rule in our tracking system
 */
export function registerRuleForTracking(rule: any, logger?: ILogger) {
    if (rule && rule.event && rule.event.type && rule.name) {
        const eventType = rule.event.type;
        if (!ruleEventTypeRegistry.has(eventType)) {
            ruleEventTypeRegistry.set(eventType, []);
        }
        ruleEventTypeRegistry.get(eventType)!.push({ name: rule.name, rule });
        if (logger) {
            logger.debug(`Registered rule '${rule.name}' for event type '${eventType}'`);
        }
    }
}

/**
 * Resolves fact details from the almanac based on event details configuration
 */
async function resolveEventDetails(details: any, almanac: any, logger?: ILogger): Promise<any> {
    if (!details || !almanac) {
        return details;
    }

    try {
        // If details is a string, return as-is (legacy behavior)
        if (typeof details === 'string') {
            return details;
        }

        // If details contains a fact reference, resolve it from the almanac
        if (details.fact && typeof details.fact === 'string') {
            if (logger) {
                logger.debug(`Resolving fact '${details.fact}' from almanac`);
            }
            try {
                const factValue = await almanac.factValue(details.fact);
                
                // Enhanced logging for dependency failures to ensure they're captured
                if (factValue && Array.isArray(factValue) && factValue.length > 0 && details.fact === 'repoDependencyAnalysis') {
                    if (logger) {
                        logger.info(`Successfully resolved dependency failures: ${factValue.length} issues found`, {
                            factName: details.fact,
                            dependencyFailureCount: factValue.length,
                            platform: process.platform,
                            dependencyFailures: factValue
                        });
                    }
                }
                
                return factValue;
            } catch (error) {
                if (logger) {
                    logger.error(`Fact '${details.fact}' resolution failed - details may be lost`, {
                        factName: details.fact,
                        error: error instanceof Error ? error.message : String(error),
                        platform: process.platform
                    });
                }
                return details; // Return original details if fact not found
            }
        }

        // If details is an object with other properties, return as-is
        return details;
    } catch (error) {
        if (logger) {
            logger.warn(`Failed to resolve fact details: ${error}`);
        }
        return details;
    }
}

/**
 * Finds the rule that triggered the event using our registry
 */
function findTriggeringRule(engine: any, eventType: string, logger?: ILogger): any {
    try {
        // First, try to get from our registry
        const rulesForEventType = ruleEventTypeRegistry.get(eventType);
        
        if (rulesForEventType && rulesForEventType.length > 0) {
            if (logger) {
                logger.debug(`Found ${rulesForEventType.length} rules for event type '${eventType}'`);
            }
            // Return the first rule (in most cases there should be only one per event type)
            return rulesForEventType[0].rule;
        }
        
        // Fallback: create a basic rule structure with the event type as the name
        if (logger) {
            logger.debug(`No registered rule found for event type '${eventType}', using fallback`);
        }
        return {
            name: eventType,
            event: { type: eventType },
            conditions: {},
            description: 'Rule extracted from event type'
        };
    } catch (error) {
        if (logger) {
            logger.debug(`Could not find triggering rule for event type: ${eventType}, error: ${error}`);
        }
        return null;
    }
}

/**
 * Builds the proper RuleFailure structure according to v3.24.0 contract
 */
async function buildRuleFailure(event: any, rule: any, file: any, almanac: any, repoPath?: string, logger?: ILogger): Promise<RuleFailure> {
    const resolvedDetails = await resolveEventDetails(event.params?.details, almanac, logger);
    
    // Get the rule name - use the rule's name if available, otherwise fall back to event type
    const ruleName = rule?.name || event.type;
    
    // Build condition details - get the first condition that would have failed
    let conditionDetails = null;
    let allConditions: any[] = [];
    let conditionType = 'all';

    if (rule?.conditions) {
        if (rule.conditions.all) {
            conditionType = 'all';
            allConditions = rule.conditions.all;
            // For 'all' conditions, any condition could be the failing one
            // We'll use the first condition as the representative condition
            conditionDetails = rule.conditions.all[0] || null;
        } else if (rule.conditions.any) {
            conditionType = 'any';
            allConditions = rule.conditions.any;
            conditionDetails = rule.conditions.any[0] || null;
        }
    }

    return {
        ruleFailure: ruleName,
        level: event.type as ErrorLevel || event.params?.level || 'error',
        details: {
            message: event.params?.message || '',
            conditionDetails: conditionDetails,
            allConditions: allConditions,
            conditionType: conditionType as 'all' | 'any' | 'unknown',
            ruleDescription: rule?.description || 'No description available',
            recommendations: rule?.recommendations || undefined,
            // Include data from event.params directly in details using v3.24.0 [key: string]: any pattern
            ...event.params?.data,
            filePath: repoPath ? path.relative(repoPath, file.filePath) : file.filePath,
            fileName: file.fileName,
            resultFact: event.params?.resultFact || event.params?.data?.resultFact,
            details: resolvedDetails
        }
    };
}

/**
 * Builds RuleFailure from engine result (temp version approach)
 * This gives us direct access to rule names and proper rule details
 */
async function buildRuleFailureFromResult(result: any, rule: any, file: any, almanac: any, repoPath?: string): Promise<RuleFailure> {
    // Use temp version approach - simple fact resolution only for direct fact references
    let resolvedDetails = result.event?.params?.details;
    
    // Only try to resolve if it's a fact reference
    if (resolvedDetails && typeof resolvedDetails === 'object' && resolvedDetails.fact) {
        try {
            const factValue = await almanac.factValue(resolvedDetails.fact);
            resolvedDetails = factValue;
            
            // Enhanced logging for dependency failures to ensure they're captured
            if (resolvedDetails && Array.isArray(resolvedDetails) && resolvedDetails.length > 0) {
                const logger = LoggerProvider.getLoggerForMode(LoggerProvider.getCurrentExecutionMode());
                logger.debug(`Fact resolution successful for ${result.event?.params?.details?.fact}: captured ${resolvedDetails.length} dependency failures`, {
                    factName: result.event?.params?.details?.fact,
                    dependencyFailureCount: resolvedDetails.length,
                    platform: process.platform,
                    dependencyFailures: resolvedDetails
                });
            }
        } catch (error) {
            // Enhanced logging for fact resolution failures, especially on Mac
            const logger = LoggerProvider.getLoggerForMode(LoggerProvider.getCurrentExecutionMode());
            logger.error(`Fact resolution failed for '${resolvedDetails.fact}' - dependency details may be lost in results`, {
                factName: resolvedDetails.fact,
                error: error instanceof Error ? error.message : String(error),
                platform: process.platform,
                rule: result?.name,
                fileName: file?.fileName
            });
            
            // ✅ Enhanced debugging for fact resolution failures
            try {
                const availableFacts = Object.keys((almanac as any).facts || {});
                const runtimeFacts = Object.keys((almanac as any).runtimeFacts || {});
                
                logger.debug(`Available facts: ${availableFacts.join(', ')}`);
                logger.debug(`Runtime facts: ${runtimeFacts.join(', ')}`);
                
                if (runtimeFacts.includes(resolvedDetails.fact)) {
                    logger.warn(`Runtime fact '${resolvedDetails.fact}' exists but resolution failed - may be a timing issue`);
                } else {
                    logger.warn(`Runtime fact '${resolvedDetails.fact}' not found - may not have been created during rule execution`);
                }
            } catch (debugError) {
                logger.debug(`Could not debug fact resolution: ${debugError}`);
            }
            
            // Keep original details if fact resolution fails
        }
    }
    
    // Extract condition details from the rule (temp version approach)
    let conditionDetails: { fact: string; operator: string; value: any; params?: any } | undefined = undefined;
    let allConditions: any[] = [];
    let conditionType: 'all' | 'any' | 'unknown' = 'unknown';
    
    if (rule) {
        const conditions = rule.conditions.all || rule.conditions.any || [];
        conditionType = rule.conditions.all ? 'all' : 'any';
        
        // Capture all conditions with their parameters (temp version approach)
        allConditions = conditions.map((condition: any) => ({
            fact: condition.fact,
            operator: condition.operator,
            value: condition.value,
            params: condition.params,
            path: condition.path,
            priority: condition.priority
        }));
        
        // Find the first condition with operator and value for backward compatibility
        for (const condition of conditions) {
            if (condition.operator && condition.value !== undefined) {
                conditionDetails = {
                    fact: condition.fact,
                    operator: condition.operator,
                    value: condition.value,
                    params: condition.params
                };
                break;
            }
        }
    }
    
    return {
        ruleFailure: result.name,
        level: result.event?.type as ErrorLevel,
        details: {
            message: result.event?.params?.message || 'Rule failure detected',
            conditionDetails: conditionDetails,
            allConditions: allConditions,
            conditionType: conditionType,
            ruleDescription: rule?.description || 'No description available',
            recommendations: result.event?.params?.recommendations || rule?.recommendations || undefined,
            filePath: repoPath ? path.relative(repoPath, file.filePath) : file.filePath,
            fileName: file.fileName,
            // Spread event params directly like temp version - this should include complexityResult
            ...result.event?.params,
            // Only override details if we successfully resolved a fact, otherwise keep original
            ...(resolvedDetails && resolvedDetails !== result.event?.params?.details ? { details: resolvedDetails } : {})
        }
    };
}

export async function runEngineOnFiles(params: RunEngineOnFilesParams): Promise<ScanResult[]> {
    const { engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure, logger: loggerParam, repoPath } = params;
    // Use the passed logger or fall back to the logger provider
    // Use provided logger or get mode-aware logger with fallback
    const logger = loggerParam || (() => {
        try {
            const currentMode = LoggerProvider.getCurrentExecutionMode();
            return LoggerProvider.getLoggerForMode(currentMode);
        } catch (error) {
            return LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI); // Fallback for test environments
        }
    })();
    const results: ScanResult[] = [];

    // Performance tracking with much more detail
    const timingTracker = createTimingTracker('ENGINE TIMING');

    // Separate iterative files from global check
    const iterativeFiles = fileData.filter(file => file.fileName !== REPO_GLOBAL_CHECK);
    const globalFile = fileData.find(file => file.fileName === REPO_GLOBAL_CHECK);
    
    logger.info(`\n==========================\nRUNNING FILE CHECKS..\n==========================`);
    logger.info(`ENGINE TIMING: Starting engine execution for ${iterativeFiles.length} iterative files + ${globalFile ? '1 global check' : '0 global checks'}`);
    timingTracker.recordTiming('engine_start');

    // Facts will be passed directly to each engine.run() call (temp version approach)
    timingTracker.recordTiming('fact_setup');

    let fileProcessingTime = 0;
    let factExecutionTime = 0;
    let ruleExecutionTime = 0;
    let eventProcessingTime = 0;
    let slowFiles: Array<{file: string, time: number}> = [];

    // Process iterative files first with progress indicators
    for (let i = 0; i < iterativeFiles.length; i++) {
        const file = iterativeFiles[i];
        const fileStartTime = Date.now();
        
        // Show progress for iterative files  
        const displayPath = repoPath ? path.relative(repoPath, file.filePath) : file.filePath;
        logger.info(`analysing (${i + 1} of ${iterativeFiles.length}) ${displayPath} ...`);
        
        try {
            timingTracker.recordDetailedTiming('file_start', i, file.fileName, iterativeFiles.length);
            
            // Use temp version's fact structure - pass facts directly to engine.run()
            // Include file-dependent facts that need immediate access to fileData
            const pluginFacts = pluginRegistry.getPluginFacts();
            const fileDependentFacts: any = {};
            
            // Add AST-based facts that depend on fileData
            const astFacts = pluginFacts.filter((fact: any) => 
                ['ast', 'functionComplexity', 'functionCount', 'codeRhythm'].includes(fact.name)
            );
            
            for (const fact of astFacts) {
                fileDependentFacts[fact.name] = fact.fn;
            }
            
            const facts = {
                fileData: file,
                dependencyData: {
                    installedDependencyVersions,
                    minimumDependencyVersions
                },
                standardStructure,
                ...fileDependentFacts
            };
            timingTracker.recordDetailedTiming('file_fact_structured', i, file.fileName, iterativeFiles.length);
            
            // Run the engine with facts directly (temp version approach)
            const engineRunStart = Date.now();
            const fileResults = await engine.run(facts);
            const engineRunEnd = Date.now();
            const engineRunTime = engineRunEnd - engineRunStart;
            ruleExecutionTime += engineRunTime;
            
            // Process results like temp version - this gives us direct access to rule names
            const engineResults = (fileResults as any).results || [];
            if (engineResults.length > 1) {
                logger.info(`Multiple rules triggered for ${file.fileName}: ${engineResults.map((r: any) => r.name).join(', ')}`);
            }
            
            timingTracker.recordDetailedTiming('engine_run_complete', i, file.fileName, iterativeFiles.length);
            
            if (engineResults.length > 0) {
                logger.trace(`ENGINE DETAILED: File ${file.fileName} generated ${engineResults.length} rule results`);
                
                const eventProcessStart = Date.now();
                // Process results and build proper RuleFailure structures (temp version approach)
                const processedResults: RuleFailure[] = [];
                const seenFailures = new Set<string>();
                
                for (const result of engineResults) {
                    if (result.result) {
                        // Create unique key for deduplication, handling malformed results
                        const resultName = result.name || 'malformed-rule';
                        const eventType = result.event?.type || 'unknown';
                        const eventMessage = result.event?.params?.message || 'no-message';
                        const failureKey = `${resultName}:${eventType}:${eventMessage}`;
                        
                        if (!seenFailures.has(failureKey)) {
                            const eventStart = Date.now();
                            
                            // Find the actual rule from engine (temp version approach)
                            const rule = result.name ? (engine as any).rules.find((r: any) => r.name === result.name) : null;
                            
                            // Build the proper RuleFailure structure with correct rule name
                            const ruleFailure = await buildRuleFailureFromResult(result, rule, file, fileResults.almanac, repoPath);
                            processedResults.push(ruleFailure);
                            
                            const eventEnd = Date.now();
                            logger.trace(`ENGINE DETAILED: Result processing for ${result.name || 'malformed-rule'} took ${eventEnd - eventStart}ms`);
                            
                            seenFailures.add(failureKey);
                        } else {
                            logger.debug(`Skipping duplicate failure: ${failureKey}`);
                        }
                    }
                }
                
                const eventProcessEnd = Date.now();
                eventProcessingTime += (eventProcessEnd - eventProcessStart);

                if (processedResults.length > 0) {
                    results.push({
                        filePath: repoPath ? path.relative(repoPath, file.filePath) : file.filePath,
                        errors: processedResults
                    });
                }
                
                timingTracker.recordDetailedTiming('results_processed', i, file.fileName, iterativeFiles.length);
            } else {
                timingTracker.recordDetailedTiming('no_results', i, file.fileName, iterativeFiles.length);
            }
            
            const fileEndTime = Date.now();
            const totalFileTime = fileEndTime - fileStartTime;
            fileProcessingTime += totalFileTime;
            
            // Track slow files
            if (totalFileTime > 100) { // Files taking more than 100ms
                slowFiles.push({file: file.fileName, time: totalFileTime});
            }
            
            // Log progress every 10 files with more detail
            if ((i + 1) % 10 === 0) {
                const avgTime = Math.round(fileProcessingTime / (i + 1));
                const avgEngineTime = Math.round(ruleExecutionTime / (i + 1));
                logger.info(`ENGINE TIMING: Processed ${i + 1}/${iterativeFiles.length} files. Avg total: ${avgTime}ms, Avg engine: ${avgEngineTime}ms`);
            }
            
            timingTracker.recordDetailedTiming('file_complete', i, file.fileName, iterativeFiles.length);
            
        } catch (error) {
            timingTracker.recordDetailedTiming('file_error', i, file.fileName, iterativeFiles.length);
            
            // Enhanced error logging with comprehensive debugging information
            const errorDetails = {
                file: file.filePath || 'unknown',
                fileName: file.fileName || 'unknown',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fileSize: file.fileContent?.length || 0,
                engineRulesCount: 0, // Engine rule count not available in this version
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                timestamp: new Date().toISOString()
            };
            
            logger.error('Engine execution failed on file:', errorDetails);
            
            // Add structured error result to maintain backwards compatibility
            // This ensures analysis continues and errors are properly tracked
            results.push({
                filePath: file.filePath,
                errors: [{
                    ruleFailure: 'engine-error',
                    level: 'error',
                    details: {
                        message: `Engine failed to process file: ${errorDetails.error}`,
                        conditionDetails: undefined,  // Use undefined instead of null to match interface
                        allConditions: [],
                        conditionType: 'all' as 'all' | 'any' | 'unknown',
                        ruleDescription: 'Engine execution error',
                        recommendations: undefined,
                        filePath: file.filePath,
                        fileName: file.fileName,
                        errorType: errorDetails.errorType,
                        details: undefined
                    }
                } as RuleFailure]
            });
        }
    }

    // Now process global checks if available
    if (globalFile) {
        logger.info(`\n==========================\nRUNNING GLOBAL REPO CHECKS..\n==========================`);
        
        const globalStartTime = Date.now();
        const globalIndex = iterativeFiles.length; // For timing tracking
        
        try {
            timingTracker.recordDetailedTiming('global_start', globalIndex, globalFile.fileName, 1);
            
            // Use temp version's fact structure for global check
            const pluginFacts = pluginRegistry.getPluginFacts();
            const fileDependentFacts: any = {};
            
            // Add AST-based facts that depend on fileData (though global check may not use them)
            const astFacts = pluginFacts.filter((fact: any) => 
                ['ast', 'functionComplexity', 'functionCount', 'codeRhythm'].includes(fact.name)
            );
            
            for (const fact of astFacts) {
                fileDependentFacts[fact.name] = fact.fn;
            }
            
            const facts = {
                fileData: globalFile,
                dependencyData: {
                    installedDependencyVersions,
                    minimumDependencyVersions
                },
                standardStructure,
                ...fileDependentFacts
            };
            timingTracker.recordDetailedTiming('global_fact_structured', globalIndex, globalFile.fileName, 1);
            
            // Run the engine with facts directly (temp version approach)
            const engineRunStart = Date.now();
            const fileResults = await engine.run(facts);
            const engineRunEnd = Date.now();
            const engineRunTime = engineRunEnd - engineRunStart;
            ruleExecutionTime += engineRunTime;
            
            // Process results like temp version - this gives us direct access to rule names
            const engineResults = (fileResults as any).results || [];
            if (engineResults.length > 0) {
                logger.info(`Global checks triggered ${engineResults.length} rule(s): ${engineResults.map((r: any) => r.name).join(', ')}`);
            }
            
            timingTracker.recordDetailedTiming('global_engine_run_complete', globalIndex, globalFile.fileName, 1);
            
            if (engineResults.length > 0) {
                logger.trace(`ENGINE DETAILED: Global check generated ${engineResults.length} rule results`);
                
                const eventProcessStart = Date.now();
                // Process results and build proper RuleFailure structures (temp version approach)
                const processedResults: RuleFailure[] = [];
                const seenFailures = new Set<string>();
                
                for (const result of engineResults) {
                    if (result.result) {
                        // Create unique key for deduplication (temp version approach)
                        const failureKey = `${result.name}:${result.event?.type}:${result.event?.params?.message}`;
                        
                        if (!seenFailures.has(failureKey)) {
                            const eventStart = Date.now();
                            
                            // Find the actual rule from engine (temp version approach)
                            const rule = (engine as any).rules.find((r: any) => r.name === result.name);
                            
                            // Build the proper RuleFailure structure with correct rule name
                            const ruleFailure = await buildRuleFailureFromResult(result, rule, globalFile, fileResults.almanac, repoPath);
                            processedResults.push(ruleFailure);
                            
                            const eventEnd = Date.now();
                            logger.trace(`ENGINE DETAILED: Global result processing for ${result.name} took ${eventEnd - eventStart}ms`);
                            
                            seenFailures.add(failureKey);
                        } else {
                            logger.debug(`Skipping duplicate global failure: ${failureKey}`);
                        }
                    }
                }
                
                const eventProcessEnd = Date.now();
                eventProcessingTime += (eventProcessEnd - eventProcessStart);

                if (processedResults.length > 0) {
                    results.push({
                        filePath: globalFile.filePath,
                        errors: processedResults
                    });
                }
                
                timingTracker.recordDetailedTiming('global_results_processed', globalIndex, globalFile.fileName, 1);
            } else {
                timingTracker.recordDetailedTiming('global_no_results', globalIndex, globalFile.fileName, 1);
            }
            
            const globalEndTime = Date.now();
            const totalGlobalTime = globalEndTime - globalStartTime;
            fileProcessingTime += totalGlobalTime;
            
            logger.info(`ENGINE TIMING: Global checks completed in ${totalGlobalTime}ms`);
            
            timingTracker.recordDetailedTiming('global_complete', globalIndex, globalFile.fileName, 1);
            
        } catch (error) {
            timingTracker.recordDetailedTiming('global_error', globalIndex, globalFile.fileName, 1);
            
            // Enhanced error logging for global check
            const errorDetails = {
                file: globalFile.filePath || 'unknown',
                fileName: globalFile.fileName || 'unknown', 
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fileSize: globalFile.fileContent?.length || 0,
                engineRulesCount: 0,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                timestamp: new Date().toISOString()
            };
            
            logger.error('Engine execution failed on global check:', errorDetails);
            
            // Add structured error result for global check
            results.push({
                filePath: globalFile.filePath,
                errors: [{
                    ruleFailure: 'global-engine-error',
                    level: 'error',
                    details: {
                        message: `Global engine check failed: ${errorDetails.error}`,
                        conditionDetails: undefined,
                        allConditions: [],
                        conditionType: 'all' as 'all' | 'any' | 'unknown',
                        ruleDescription: 'Global engine execution error',
                        recommendations: undefined,
                        filePath: globalFile.filePath,
                        fileName: globalFile.fileName,
                        errorType: errorDetails.errorType,
                        details: undefined
                    }
                } as RuleFailure]
            });
        }
    }

    timingTracker.recordTiming('file_processing');

    // Log detailed timing breakdown with much more information
    timingTracker.logTimingBreakdown('DETAILED ENGINE', iterativeFiles.length + (globalFile ? 1 : 0));
    
    // Log additional engine-specific metrics
    // Calculate actual total execution time from start to now
    const totalExecutionTime = fileProcessingTime; // This represents the actual total time spent processing all files
    
    logger.info(`Rule execution time: ${ruleExecutionTime}ms (${Math.round((ruleExecutionTime / totalExecutionTime) * 100)}%)`);
    logger.info(`Event processing time: ${eventProcessingTime}ms (${Math.round((eventProcessingTime / totalExecutionTime) * 100)}%)`);
    logger.info(`File processing overhead: ${fileProcessingTime - ruleExecutionTime - eventProcessingTime}ms`);
    
    // Show slowest files
    if (slowFiles.length > 0) {
        logger.info('=== SLOWEST FILES (>100ms) ===');
        slowFiles.sort((a, b) => b.time - a.time).slice(0, 10).forEach(({file, time}) => {
            logger.info(`${file}: ${time}ms`);
        });
    }

    return results;
}
