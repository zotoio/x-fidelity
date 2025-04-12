#!/usr/bin/env node
import { logger, getLogPrefix, setLogLevel } from './utils/logger';
import { options, initCLI } from "./core/cli";
if (require.main === module) {
    setLogLevel(process.env.XFI_LOG_LEVEL || 'info');
    initCLI();
}

const executionLogPrefix = getLogPrefix();

import json from 'prettyjson';
import { analyzeCodebase } from "./core/engine/analyzer";
import { startServer } from './server/configServer';
import { sendTelemetry } from './utils/telemetry';
import { ResultMetadata } from './types/typeDefs';
import { initializeNotifications } from './notifications';
import { NotificationConfig } from './types/notificationTypes';

// Function to handle errors and send telemetry
const handleError = async (error: Error) => {
    await sendTelemetry({
        eventType: 'execution failure',
        metadata: {
            archetype: options.archetype,
            repoPath: options.dir,
            options,
            errorMessage: error.message,
            errorStack: error.stack
        },
        timestamp: new Date().toISOString()
    }, executionLogPrefix);
    logger.error(error, 'Execution failure');
};

const outcomeMessage = (message: string) => `\n
==========================================================================
${message}
==========================================================================`;

logger.debug({ options }, 'Startup options');

export async function main() {
    try { 
        // Initialize notification system
        const notificationConfig: NotificationConfig = {
            enabled: process.env.NOTIFICATIONS_ENABLED === 'true',
            providers: (process.env.NOTIFICATION_PROVIDERS || '').split(',').filter(Boolean),
            codeOwnersPath: process.env.CODEOWNERS_PATH || '.github/CODEOWNERS',
            codeOwnersEnabled: process.env.CODEOWNERS_ENABLED !== 'false', // Default to true
            notifyOnSuccess: process.env.NOTIFY_ON_SUCCESS === 'true',
            notifyOnFailure: process.env.NOTIFY_ON_FAILURE !== 'false', // Default to true
        };
        
        const notificationManager = await initializeNotifications(notificationConfig);
        
        if (options.examine && process.env.NODE_ENV !== 'test') {
            const { validateArchetypeConfig } = await import('./core/validateConfig');
            validateArchetypeConfig();
        } else {
            if (options.mode === 'server') {
                await startServer({ customPort: options.port, executionLogPrefix });
            } else {
                const resultMetadata: ResultMetadata = await analyzeCodebase({
                    repoPath: options.dir,
                    archetype: options.archetype,
                    configServer: options.configServer,
                    localConfigPath: options.localConfigPath,
                    executionLogPrefix
                });

                logger.info(`PERFORMANCE: Rule executions took ${resultMetadata.XFI_RESULT.durationSeconds} seconds`);

                const reportGenerationStartTime = new Date().getTime();

                let resultString = JSON.stringify(resultMetadata);
                let prettyResult = json.render(resultMetadata.XFI_RESULT);

                const reportGenerationdurationSeconds = ((new Date().getTime()) - reportGenerationStartTime) / 1000;
                logger.info(`PERFORMANCE: Report generation took ${reportGenerationdurationSeconds} seconds`);

                // Add debug logging before notification check
                logger.debug({
                    notificationsEnabled: process.env.NOTIFICATIONS_ENABLED,
                    notificationConfig: notificationConfig,
                    hasNotificationManager: !!notificationManager
                }, 'Checking notification status');

                // Send notifications if enabled
                if (notificationConfig.enabled) {
                    const notificationStartTime = new Date().getTime()

                    logger.debug('Notifications are enabled, preparing to send report');
                    logger.debug({
                        affectedFilesCount: resultMetadata.XFI_RESULT.issueDetails.length
                    }, 'Preparing notification data');
                    
                    // Pass the repo config to the notification manager
                    await notificationManager.sendReport(
                        resultMetadata
                    );

                    const notificationDurationSeconds = ((new Date().getTime()) - notificationStartTime) / 1000;
                    logger.info(`PERFORMANCE: Notifications took ${notificationDurationSeconds} seconds`);
                }

                // // update overall duration and end time in XFI_RESULT
                // const endTime = new Date().getTime();
                // resultMetadata.XFI_RESULT.durationSeconds = (endTime - resultMetadata.XFI_RESULT.startTime) / 1000;
                // resultMetadata.XFI_RESULT.finishTime = endTime; 

                // // change the finishTime value in the resultString to be endTimestamp
                // const resultStringWithEndTimestamp = resultString.replace(/("finishTime"):([\s]+)*([\d\.]+)/g, `$1:${endTime}`);

                // // change the durationSeconds value in the resultString to be the overall duration
                // resultString = resultStringWithEndTimestamp.replace(/("durationSeconds"):([\s]+)*([\d\.]+)/g, `$1:${resultMetadata.XFI_RESULT.durationSeconds}`);

                // // change the finishTime value in the prettyResult to be endTimestamp
                // const prettyResultWithEndTimestamp = prettyResult.replace(/(.*finishTime.*34m)(\d*)(.*)/g, `$1$${endTime}$3`);

                // // change the durationSeconds value in the prettyResult to be the overall duration
                // prettyResult = prettyResultWithEndTimestamp.replace(/(.*durationSeconds.*34m)(\d*)(.*)/g, `$1${resultMetadata.XFI_RESULT.durationSeconds}$3`);

                // if results are found, there were issues found in the codebase
                if (resultMetadata.XFI_RESULT.totalIssues > 0) {
                    logger.warn(`WARNING: lo-fi attributes detected in codebase. ${resultMetadata.XFI_RESULT.warningCount} are warnings, ${resultMetadata.XFI_RESULT.fatalityCount} are fatal.`);
                    
                    // Create a more detailed summary of issues
                    const issuesSummary = {
                        totalIssues: resultMetadata.XFI_RESULT.totalIssues,
                        warningCount: resultMetadata.XFI_RESULT.warningCount,
                        fatalityCount: resultMetadata.XFI_RESULT.fatalityCount,
                        errorCount: resultMetadata.XFI_RESULT.errorCount,
                        exemptCount: resultMetadata.XFI_RESULT.exemptCount,
                        topIssues: resultMetadata.XFI_RESULT.issueDetails
                            .slice(0, 5)
                            .map(detail => ({
                                filePath: detail.filePath,
                                errors: detail.errors.map(err => ({
                                    rule: err.ruleFailure,
                                    level: err.level,
                                    message: err.details?.message
                                }))
                            }))
                    };
                    
                    logger.warn(JSON.stringify(issuesSummary, null, 2));

                    if (resultMetadata.XFI_RESULT.errorCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        logger.error(`\n${prettyResult}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        process.exit(1);
                    }

                    if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        logger.error(`\n${prettyResult}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        process.exit(1);
                    } else {
                        logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
                        logger.warn(`\n${prettyResult}\n\n`);
                        logger.warn(outcomeMessage('No fatal errors were found, however please review the above warnings.'));
                    }
                } else {
                    logger.info(outcomeMessage('SUCCESS! hi-fi codebase detected.'));
                    logger.info(resultString);
                    logger.info(`\n${prettyResult}\n\n`);
                    logger.info(outcomeMessage('SUCCESS! hi-fi codebase detected.'));
                }
            }
        }    
    } catch (e: any) {
        
        await handleError(e);
        if (process.env.NODE_ENV !== 'test') {
            setTimeout(() => process.exit(1), 3000);
        }
    }
}

export { repoDir } from './core/configManager';
export * from './utils/logger';
export * from './types';
export { options } from './core/cli';
export { analyzeCodebase } from './core/engine/analyzer';

if (require.main === module) {
    main();
}
