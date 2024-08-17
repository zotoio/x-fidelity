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

const outcomeMessage = (message: string) => `\n
==========================================================================
${message}
==========================================================================`;

logger.debug(`startup options: ${options}`);
(async () => {
try {
    if (options.mode === 'server') {
        startServer({ customPort: options.port, executionLogPrefix });
    } else {
        (async () => {
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
                logger.warn(JSON.stringify({XFI_RESULT: resultMetadata}));
            
                if (resultMetadata.XFI_RESULT.fatalityCount > 0) {
                    logger.error(outcomeMessage(`THERE WERE ${resultMetadata.XFI_RESULT.fatalityCount} FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!`));
                    setTimeout(() => process.exit(1), 1000);
                } else {
                    logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
                }
                console.log(`\n${json.render(resultMetadata.XFI_RESULT.issueDetails)}\n\n`);
            } else {
                logger.info(outcomeMessage('SUCCESS! hi-fi codebase detected.'));
            }
            
        })().catch((e) => {
            // analyzeCodebase failed 
            logger.error(outcomeMessage('FATAL: execution failed!'));
            logger.error(e.message);
            logger.error(`\n${json.render(JSON.parse(e.message))}`);
            setTimeout(() => process.exit(1), 1000);
        });
    }    

} catch(e: any) {
    await sendTelemetry({
        eventType: 'execution failure',
        metadata: {
            archetype: options.archetype,
            repoPath: options.dir,
            fileCount: 0,
            totalIssues: 0,
            warningCount: 0,
            fatalityCount: 0,
            issueDetails: [],
            startTime: Date.now(),
            finishTime: Date.now(),
            durationSeconds: 0,
            ...options,
            errorMessage: e.message
        },
        timestamp: new Date().toISOString()
    }, executionLogPrefix);
    logger.error(JSON.stringify(e));
    setTimeout(() => process.exit(1), 1000);
}

})();
