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
                        details: result.event?.params
                    });
                }
            }

            if (fileFailures.length > 0) {
                failures.push({ filePath: file.filePath, errors: fileFailures });
            }
        } catch (e) {
            // Get the rule that caused the error
            const failedRuleName = (e as any)?.rule?.name;
            if (failedRuleName) {
                const rule = (engine as any).rules.find((r: any) => r.name === failedRuleName);
                const errorLevel = rule?.errorBehavior === 'fatal' || rule?.event?.type === 'fatality' 
                    ? 'fatality' 
                    : 'error';
                
                logger.error({ 
                    err: e,
                    rule: failedRuleName,
                    type: errorLevel
                }, 'Rule execution failed');

                // Execute error action if specified
                if (rule?.onError?.action) {
                    try {
                        const actionResult = await executeErrorAction(rule.onError.action, {
                            error: e instanceof Error ? e : new Error(String(e)),
                            rule: failedRuleName,
                            level: errorLevel,
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
                    ruleFailure: failedRuleName,
                    level: errorLevel,
                    details: {
                        message: `Rule execution failed: ${e}`,
                        originalError: e
                    }
                });
            } else {
                logger.error(`Error processing file ${file.filePath}: ${e}`);
                fileFailures.push({ 
                    ruleFailure: 'ProcessingError', 
                    level: 'error', 
                    details: { message: `Error processing file: ${e}` } 
                });
            }
            if (fileFailures.length > 0) {
                failures.push({ filePath: file.filePath, errors: fileFailures });
            }
        }
    }

    return failures;
}
