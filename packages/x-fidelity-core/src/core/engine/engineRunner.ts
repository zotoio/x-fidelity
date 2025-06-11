import { ScanResult, RuleFailure, ErrorLevel, RunEngineOnFilesParams } from '@x-fidelity/types';
import { Engine } from 'json-rules-engine';
import { logger } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../configManager';
import { executeErrorAction } from './errorActionExecutor';

// Rule registry to map event types to rule names
const ruleEventTypeRegistry = new Map<string, { name: string; rule: any }[]>();

/**
 * Registers a rule in our tracking system
 */
export function registerRuleForTracking(rule: any) {
    if (rule && rule.event && rule.event.type && rule.name) {
        const eventType = rule.event.type;
        if (!ruleEventTypeRegistry.has(eventType)) {
            ruleEventTypeRegistry.set(eventType, []);
        }
        ruleEventTypeRegistry.get(eventType)!.push({ name: rule.name, rule });
        logger.debug(`Registered rule '${rule.name}' for event type '${eventType}'`);
    }
}

/**
 * Resolves fact details from the almanac based on event details configuration
 */
async function resolveEventDetails(details: any, almanac: any): Promise<any> {
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
            logger.debug(`Resolving fact '${details.fact}' from almanac`);
            const factValue = await almanac.factValue(details.fact);
            
            return factValue;
        }

        // If details is an object with other properties, return as-is
        return details;
    } catch (error) {
        logger.warn(`Failed to resolve fact details: ${error}`);
        return details;
    }
}

/**
 * Finds the rule that triggered the event using our registry
 */
function findTriggeringRule(engine: any, eventType: string): any {
    try {
        // First, try to get from our registry
        const rulesForEventType = ruleEventTypeRegistry.get(eventType);
        
        if (rulesForEventType && rulesForEventType.length > 0) {
            logger.debug(`Found ${rulesForEventType.length} rules for event type '${eventType}'`);
            // Return the first rule (in most cases there should be only one per event type)
            return rulesForEventType[0].rule;
        }
        
        // Fallback: create a basic rule structure with the event type as the name
        logger.debug(`No registered rule found for event type '${eventType}', using fallback`);
        return {
            name: eventType,
            event: { type: eventType },
            conditions: {},
            description: 'Rule extracted from event type'
        };
    } catch (error) {
        logger.debug(`Could not find triggering rule for event type: ${eventType}, error: ${error}`);
        return null;
    }
}

/**
 * Builds the proper RuleFailure structure according to v3.24.0 contract
 */
async function buildRuleFailure(event: any, rule: any, file: any, almanac: any): Promise<RuleFailure> {
    const resolvedDetails = await resolveEventDetails(event.params?.details, almanac);
    
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
        level: event.params?.level || 'error',
        message: event.params?.message || '',
        data: {
            ...event.params?.data,
            filePath: file.filePath,
            fileName: file.fileName,
            resultFact: event.params?.resultFact || event.params?.data?.resultFact
        },
        details: {
            message: event.params?.message || '',
            conditionDetails: conditionDetails,
            allConditions: allConditions,
            conditionType: conditionType,
            ruleDescription: rule?.description || 'No description available',
            recommendations: rule?.recommendations || undefined,
            details: resolvedDetails
        }
    };
}

export async function runEngineOnFiles(params: RunEngineOnFilesParams): Promise<ScanResult[]> {
    const { engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure } = params;
    const results: ScanResult[] = [];

    // Add configuration facts to the engine that are needed by rules
    engine.addFact('standardStructure', standardStructure, { priority: 50 });
    engine.addFact('installedDependencyVersions', installedDependencyVersions, { priority: 50 });
    engine.addFact('minimumDependencyVersions', minimumDependencyVersions, { priority: 50 });

    for (const file of fileData) {
        try {
            // Add the current file as a fact to the engine
            engine.addFact('fileData', file, { priority: 100 });
            
            // Run the engine with empty context since fileData is now a fact
            const fileResults = await engine.run({});
            if (fileResults.events.length > 0) {
                // Process events and build proper RuleFailure structures
                const processedEvents = await Promise.all(
                    fileResults.events.map(async (event: any) => {
                        // Find the rule that triggered this event
                        const triggeringRule = findTriggeringRule(engine, event.type);
                        
                        // Build the proper RuleFailure structure
                        return buildRuleFailure(event, triggeringRule, file, fileResults.almanac);
                    })
                );

                results.push({
                    filePath: file.filePath,
                    errors: processedEvents
                });
            }
        } catch (error) {
            // Enhanced error logging with comprehensive debugging information
            const errorDetails = {
                file: file.filePath || 'unknown',
                fileName: file.fileName || 'unknown',
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fileSize: file.fileContent?.length || 0,
                engineRulesCount: engine.prioritizedRules?.length || 0,
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
                    message: `Engine failed to process file: ${errorDetails.error}`,
                    data: { 
                        filePath: file.filePath,
                        fileName: file.fileName,
                        errorType: errorDetails.errorType
                    },
                                            details: {
                            message: `Engine failed to process file: ${errorDetails.error}`,
                            conditionDetails: null,
                            allConditions: [],
                            conditionType: 'all',
                            ruleDescription: 'Engine execution error',
                            recommendations: undefined,
                            details: null
                        }
                } as RuleFailure]
            });
        }
    }

    return results;
}
