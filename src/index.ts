#!/usr/bin/env node
import { logger } from './utils/logger';
let json = require('format-json');
import { options } from "./core/cli"; 
import { analyzeCodebase } from "./core/engine";
//import ora, { oraPromise } from 'ora';

console.log(options);

try {
    (async () => {
        let results = await analyzeCodebase(`${process.env.PWD}/${options.dir}`, options.archetype, options.configServer);
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
