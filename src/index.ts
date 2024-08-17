#!/usr/bin/env node
import { generateLogPrefix, logger, setLogPrefix } from './utils/logger';
import json from 'prettyjson';
import { options } from "./core/cli"; 
import { analyzeCodebase } from "./core/engine/analyzer";
import { startServer } from './server/configServer';
import { sendTelemetry } from './utils/telemetry';
import { countRuleFailures, findKeyValuePair } from './utils/utils';

const executionLogPrefix = generateLogPrefix();
setLogPrefix(executionLogPrefix);

logger.debug(`startup options: ${options}`);
(async () => {
try {
    if (options.mode === 'server') {
        startServer({ customPort: options.port, executionLogPrefix });
    } else {
        (async () => {
            const resultMetadata = await analyzeCodebase({
                repoPath: options.dir,
                archetype: options.archetype,
                configServer: options.configServer,
                localConfigPath: options.localConfigPath,
                executionLogPrefix
            });

            // if results are found, there were issues found in the codebase
            if (resultMetadata.failureCount > 0) {
                logger.warn('WARNING: lo-fi attributes detected in codebase!');
                logger.warn(JSON.stringify(resultMetadata.failureDetails));

                if (resultMetadata.fatalityCount > 0) {
                    logger.error(`${resultMetadata.fatalityCount} FATAL ERRORS TO BE IMMEDIATELY ADDRESSED!`);
                }
                console.log(`\n${json.render(resultMetadata.failureDetails)}`);
            } else {
                // an empty array means no issues were found
                logger.info('SUCCESS! hi-fi codebase detected.');
            }
            
        })().catch((e) => {
            // analyzeCodebase failed 
            logger.error('FATAL: execution failed!');
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
            ...options,
            error: e
        },
        timestamp: new Date().toISOString()
    }, executionLogPrefix);
    logger.error(JSON.stringify(e));
    setTimeout(() => process.exit(1), 1000);
}

})();