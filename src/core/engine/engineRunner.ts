import { ScanResult, RuleFailure } from '../../types/typeDefs';
import { logger } from '../../utils/logger';
import { REPO_GLOBAL_CHECK } from '../../utils/configManager';
import { executeErrorAction } from './errorActionExecutor';

import { RunEngineOnFilesParams } from '../../types/typeDefs';

export async function runEngineOnFiles(params: RunEngineOnFilesParams): Promise<ScanResult[]> {
    const { engine, fileData, installedDependencyVersions, minimumDependencyVersions, standardStructure } = params;
    const msg = `\n==========================\nRUNNING FILE CHECKS..\n==========================`;
    logger.info(msg);
    const failures: ScanResult[] = [];

    for (const file of fileData) {
        if (file.fileName === REPO_GLOBAL_CHECK) {
            const msg = `\n==========================\nRUNNING GLOBAL REPO CHECKS..\n==========================`;
            logger.info(msg);
        } else {
            const msg = `analysing ${file.filePath} ...`
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
            const { results } = await engine.run(facts);
            for (const result of results) {
                logger.debug(JSON.stringify(result));
                if (result.result) {
                    fileFailures.push({
                        ruleFailure: result.name,
                        level: result.event?.type,
                        details: {
                            message: result.event?.params?.message || 'Rule failure detected',
                            ...result.event?.params
                        }
                    });
                }
            }
        } catch (e) {
            const error = e as Error;
            const failedRuleName = (error as any)?.rule?.name;
            const rule = failedRuleName ? (engine as any).rules.find((r: any) => r.name === failedRuleName) : null;

            // Determine error source and level
            let errorSource = 'unknown';
            let errorLevel = 'error';
            
            if ((error as any)?.pluginError) {
                // Handle plugin errors with their specified level
                errorSource = 'plugin';
                errorLevel = (error as any).pluginError.level;
                let handledError: Error | undefined;
                const pluginError = new Error((error as any).pluginError.message);
                if ((error as any).pluginError.details) {
                    (pluginError as any).details = (error as any).pluginError.details;
                }
                handledError = pluginError;
            } else if ((error as any)?.isOperatorError) {
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
                err: handledError || error,
                rule: failedRuleName,
                source: errorSource,
                type: errorLevel,
                file: file.filePath
            }, 'Execution error occurred');

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
                level: errorLevel,
                details: {
                    message: `${errorSource} execution failed: ${(handledError || error).message}`,
                    source: errorSource as "operator" | "fact" | "plugin" | "rule" | "unknown",
                    originalError: handledError || error,
                    stack: (handledError || error).stack
                }
            });
        }

        if (fileFailures.length > 0) {
            failures.push({ filePath: file.filePath, errors: fileFailures });
        }
    }

    return failures;
}
