import { ScanResult, RuleFailure, ErrorLevel } from '../../types/typeDefs';
import { logger, setLogPrefix, getLogPrefix } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../configManager';
import { executeErrorAction } from './errorActionExecutor';

import { RunEngineOnFilesParams } from '../../types/typeDefs';

export async function runEngineOnFiles(params: RunEngineOnFilesParams): Promise<ScanResult[]> {
    const { engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure } = params;
    const msg = `\n==========================\nRUNNING FILE CHECKS..\n==========================`;
    logger.info(msg);
    const failures: ScanResult[] = [];
    const fileCount = fileData.length;

    for (let i=0; i < fileCount; i++) {
        const file = fileData[i]
        if (file.fileName === REPO_GLOBAL_CHECK) {
            const msg = `\n==========================\nRUNNING GLOBAL REPO CHECKS..\n==========================`;
            logger.info(msg);
        } else {
            const msg = `analysing (${i+1} of ${fileCount-1}) ${file.filePath} ...`
            logger.info(msg);
        }
        const facts = {
            fileData: file,
            dependencyData: {
                installedDependencyVersions,
                minimumDependencyVersions
            },
            standardStructure
        };
        const fileFailures: RuleFailure[] = [];

        try {
            // Save the original log prefix
            const originalLogPrefix = getLogPrefix();
            
            const { results } = await engine.run(facts);
            const seenFailures = new Set<string>();

            for (const result of results) {
                logger.trace(JSON.stringify(result));
                if (result.result) {
                    // Create unique key for deduplication
                    const failureKey = `${result.name}:${result.event?.type}:${result.event?.params?.message}`;
                    
                    if (!seenFailures.has(failureKey)) {
                        // Set the rule name as log prefix for this failure
                        const ruleName = result.name || 'unknown-rule';
                        setLogPrefix(`${originalLogPrefix}:${ruleName}`);
                        
                        // Extract condition details from the rule
                        let conditionDetails: { fact: string; operator: string; value: any; params?: any } | undefined = undefined;
                        let ruleDescription = null;
                        let recommendations = null;
                        let allConditions: any[] = [];
                        let conditionType = 'unknown';
                        try {
                            // Find the condition that triggered this rule
                            const rule = (engine as any).rules.find((r: any) => r.name === result.name);
                            if (rule) {
                                // Extract rule description if available
                                ruleDescription = rule.description || 'No description available';
                                
                                // Extract recommendations if available
                                if (result.event?.params?.recommendations) {
                                    recommendations = result.event.params.recommendations;
                                } else if (rule.recommendations) {
                                    recommendations = rule.recommendations;
                                }
                                
                                // Extract operator value from the condition
                                const conditions = rule.conditions.all || rule.conditions.any || [];
                                conditionType = rule.conditions.all ? 'all' : 'any';
                                
                                // Capture all conditions with their parameters
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
                        } catch (err) {
                            logger.debug(`Error extracting operator value: ${err}`);
                        }
                        
                        fileFailures.push({
                            ruleFailure: result.name,
                            level: result.event?.type as ErrorLevel,
                            details: {
                                message: result.event?.params?.message || 'Rule failure detected',
                                conditionDetails: conditionDetails,
                                allConditions: allConditions,
                                conditionType: conditionType,
                                ruleDescription: ruleDescription,
                                recommendations: recommendations,
                                ...result.event?.params
                            }
                        });
                        
                        // Restore original log prefix
                        setLogPrefix(originalLogPrefix);
                        // Restore original log prefix before continuing
                        setLogPrefix(originalLogPrefix);
                        seenFailures.add(failureKey);
                    } else {
                        logger.debug(`Skipping duplicate failure: ${failureKey}`);
                    }
                }
            }
        } catch (e) {
            const error = e as Error;
            const failedRuleName = (error as any)?.rule?.name;
            const rule = failedRuleName ? (engine as any).rules.find((r: any) => r.name === failedRuleName) : null;

            // Set the rule name as log prefix for this error
            const originalLogPrefix = getLogPrefix();
            setLogPrefix(`${originalLogPrefix}:${failedRuleName || 'unknown-rule'}`);

            // Determine error source and level
            let errorSource = 'unknown';
            let errorLevel = 'error';
            let handledError: Error | undefined;
            
            if ((error as any)?.pluginError) {
                // Handle plugin errors with their specified level
                errorSource = 'plugin';
                errorLevel = (error as any).pluginError.level || rule?.errorBehavior === 'fatal' ? 'fatality' : 'error';
                handledError = new Error((error as any).pluginError.message);
                if ((error as any).pluginError.details) {
                    (handledError as any).details = (error as any).pluginError.details;
                }
            } else if ((error as any)?.isOperatorError || (error as any)?.operator) {
                errorSource = 'operator';
                errorLevel = rule?.errorBehavior === 'fatal' ? 'fatality' : 'error';
            } else if ((error as any)?.isFactError) {
                errorSource = 'fact'; 
                errorLevel = rule?.errorBehavior === 'fatal' ? 'fatality' : 'error';
            } else if (failedRuleName) {
                errorSource = 'rule';
                errorLevel = rule?.errorBehavior === 'fatal' || rule?.event?.type === 'fatality' ? 'fatality' : 'error';
            }

            logger.error({ 
                index: i,
                file: file.filePath,
                err: handledError || error,
                rule: failedRuleName,
                source: errorSource,
                type: errorLevel,
                stack: (handledError || error).stack,
                details: (error as any)?.pluginError?.details || error.message
            }, `Execution error occurred at file ${file.filePath} (${i + 1} of ${fileCount})`);

            // Execute error action if specified
            if (rule?.onError?.action) {
                try {
                    const actionResult = await executeErrorAction(rule.onError.action, {
                        error: error,
                        rule: failedRuleName,
                        level: errorLevel,
                        source: errorSource as "operator" | "fact" | "plugin" | "rule" | "unknown",
                        params: rule.onError.params || {},
                        file: file
                    });
                    logger.warn({ 
                        rule: failedRuleName,
                        action: rule.onError.action,
                        result: actionResult 
                    }, 'Error action executed');
                } catch (actionError) {
                    logger.error({ 
                        rule: failedRuleName,
                        err: actionError,
                        action: rule.onError.action
                    }, 'Error executing error action');
                }
            }

            fileFailures.push({
                ruleFailure: failedRuleName || 'ExecutionError',
                level: errorLevel as ErrorLevel,
                details: {
                    message: `${errorSource} execution failed: ${(handledError || error).message}`,
                    source: errorSource as "operator" | "fact" | "plugin" | "rule" | "unknown",
                    stack: (handledError || error).stack,
                    details: (error as any)?.pluginError?.details,
                    // Include rule information if available
                    rule: rule ? {
                        name: rule.name,
                        conditions: rule.conditions,
                        event: rule.event
                    } : undefined
                }
            });
            
            // Restore original log prefix before returning
            setLogPrefix(originalLogPrefix);
        }

        if (fileFailures.length > 0) {
            failures.push({ filePath: file.filePath, errors: fileFailures });
        }
    }

    return failures;
}
