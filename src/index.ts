#!/usr/bin/env node
import { logger } from './utils/logger';
let json = require('format-json');
import { options } from "./core/cli"; 
import { analyzeCodebase } from "./core/engine";


//console.log(`analyzing repo at path: [${options.dir}]`);

try {
    (async () => {
        let results = await analyzeCodebase(options.dir, options.configUrl);
        if (results.length > 0) {
            //console.log('WARNING: lo-fi attributes detected in codebase!');
            //console.log(results);
        } else {
            //console.log('hi-fi codebase detected!');
        }
        logger.info(results);
        console.log(JSON.stringify(results));
        //console.log(`opinionated codebase analysis completed with ${results.length} failed checks.`);
    })().catch((e) => {console.log(e)});
} catch(e) {
    console.log(e)
}
