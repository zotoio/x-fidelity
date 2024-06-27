import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import * as fs from 'fs';
import * as path from 'path';

let rules: RuleProperties[] = [];

// import each json file in local directory and add to rules array as a RuleProperties object
async function loadRules() {
    logger.debug(`loading json rules..`);
    const ruleFiles = (await fs.promises.readdir(__dirname)).filter(file => file.endsWith('.json'));
    
    logger.debug(`found ${ruleFiles.length} rule files to load.`);
    const rules = await Promise.all(ruleFiles.map(async file => {
        try {
            logger.debug(`loading ${file}...`);
            const rule = await import(path.join(__dirname, file));
            return rule;
        } catch (e) {     
            logger.error(`FATAL: Error loading rule file: ${file}`);
            logger.error(e);
            console.error(e);
        }       
    }));
    return rules.filter(rule => rule !== undefined);
}


export { loadRules };
