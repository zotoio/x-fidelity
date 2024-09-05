#!/usr/bin/env node
import { generateLogPrefix, logger, setLogPrefix } from './utils/logger';
import json from 'prettyjson';
import { options } from "./core/cli";
import { analyzeCodebase } from "./core/engine/analyzer";
import { startServer } from './server/configServer';
import { sendTelemetry } from './utils/telemetry';
import { ResultMetadata } from './types/typeDefs';

const executionLogPrefix = generateLogPrefix();
setLogPrefix(executionLogPrefix);

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
    logger.error(JSON.stringify(error));
};

const outcomeMessage = (message: string) => `\n
==========================================================================
${message}
==========================================================================`;

logger.debug(`startup options: ${JSON.stringify(options)}`);

export async function main() {
    try {
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

                if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                    logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                    logger.on('finish', function () {
                        process.exit(1);
                    });
                    logger.error(`\n${json.render(resultMetadata.XFI_RESULT)}\n\n`);
                    logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                    //logger.end();
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
    } catch (e: any) {
        await handleError(e);
        
    }
}

if (require.main === module) {
    main();
}
