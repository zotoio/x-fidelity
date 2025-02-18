#!/usr/bin/env node
import { logger, initializeLogger, getLogPrefix, setLogLevel } from './utils/logger';
initializeLogger()
const executionLogPrefix = getLogPrefix();
setLogLevel(process.env.XFI_LOG_LEVEL || 'info');

import json from 'prettyjson';
import { options } from "./core/cli";
import { analyzeCodebase } from "./core/engine/analyzer";
import { startServer } from './server/configServer';
import { sendTelemetry } from './utils/telemetry';
import { ResultMetadata } from './types/typeDefs';

// Function to handle errors and send telemetry
const handleError = async (error: Error) => {
    await sendTelemetry({
        eventType: 'execution failure',
        metadata: {
            archetype: options.archetype,
            repoPath: options.dir,
            options,
            errorMessage: error.message
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

                // if results are found, there were issues found in the codebase
                if (resultMetadata.XFI_RESULT.totalIssues > 0) {
                    logger.warn(`WARNING: lo-fi attributes detected in codebase. ${resultMetadata.XFI_RESULT.warningCount} are warnings, ${resultMetadata.XFI_RESULT.fatalityCount} are fatal.`);
                    logger.warn(JSON.stringify(resultMetadata));

                    if (resultMetadata.XFI_RESULT.errorCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        logger.error(`\n${json.render(resultMetadata.XFI_RESULT)}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.errorCount} UNEXPECTED ERRORS!`));
                        process.exit(1);
                    }

                    if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        logger.error(`\n${json.render(resultMetadata.XFI_RESULT)}\n\n`);
                        logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                        process.exit(1);
                    } else {
                        logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
                        logger.warn(`\n${json.render(resultMetadata.XFI_RESULT)}\n\n`);
                        logger.warn(outcomeMessage('No fatal errors were found, however please review the above warnings.'));
                    }
                } else {
                    logger.info(outcomeMessage('SUCCESS! hi-fi codebase detected.'));
                    logger.info(JSON.stringify(resultMetadata));
                    logger.info(`\n${json.render(resultMetadata)}\n\n`);
                    logger.info(outcomeMessage('SUCCESS! hi-fi codebase detected.'));
                }
            }
        }    
    } catch (e: any) {
        await handleError(e).then(() => {
            // give some time async ops to finish if not handled directly
            if (process.env.NODE_ENV !== 'test') {
                setTimeout(() => {
                    process.exit(1);
                }, 3000);
            }
        });    
    }
}

export * from './utils/axiosClient';
export * from './core/configManager';
export * from './utils/logger';
export * from './core/engine/analyzer';
export * from './types';

if (require.main === module) {
    main();
}
