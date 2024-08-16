#!/usr/bin/env node
import { logger } from './utils/logger';
import json from 'prettyjson';
import { options } from "./core/cli"; 
import { analyzeCodebase } from "./core/engine/analyzer";
import { startServer } from './server/configServer';

logger.debug(`startup options: ${options}`);

try {
    if (options.mode === 'server') {
        startServer(options.port);
    } else {
        (async () => {
            const results = await analyzeCodebase({
                repoPath: options.dir,
                archetype: options.archetype,
                configServer: options.configServer,
                localConfigPath: options.localConfigPath
            });

            // if results are found, there were warning level issues found in the codebase
            if (results.length > 0) {
                logger.warn('WARNING: lo-fi attributes detected in codebase!');
                logger.warn(JSON.stringify(results));
                console.log(`\n${json.render(results)}`);
            } else {
                // an empty array means no issues were found
                logger.info('SUCCESS! hi-fi codebase detected.');
            }
            
        })().catch((e) => {
            // analyzeCodebase failed which can mean a fatal issue was found in the codebase
            logger.error('FATAL: lo-fi attributes detected in codebase!');
            logger.error(e.message);
            logger.error(`\n${json.render(JSON.parse(e.message))}`);
            setTimeout(() => process.exit(1), 1000);
        });
    }    

} catch(e) {
    console.error(JSON.stringify(e));
    process.exit(1);
}
