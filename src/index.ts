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

                const resultString = JSON.stringify(resultMetadata);
                const prettyResult = json.render(resultMetadata.XFI_RESULT);

                // Add debug logging before notification check
                logger.debug({
                    notificationsEnabled: process.env.NOTIFICATIONS_ENABLED,
                    notificationConfig: notificationConfig,
                    hasNotificationManager: !!notificationManager
                }, 'Checking notification status');

                // Send notifications if enabled
                if (notificationConfig.enabled) {
                    logger.debug('Notifications are enabled, preparing to send report');
                    logger.debug({
                        affectedFilesCount: resultMetadata.XFI_RESULT.issueDetails.length
                    }, 'Preparing notification data');
                    
                    // Pass the repo config to the notification manager
                    await notificationManager.sendReport(
                        resultMetadata
                    );
                }

                // if results are found, there were issues found in the codebase
                if (resultMetadata.XFI_RESULT.totalIssues > 0) {
                    logger.warn(`WARNING: lo-fi attributes detected in codebase. ${resultMetadata.XFI_RESULT.warningCount} are warnings, ${resultMetadata.XFI_RESULT.fatalityCount} are fatal.`);
                    logger.warn(resultString);

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

if (require.main === module) {
    main();
}
