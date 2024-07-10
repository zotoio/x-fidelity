import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import * as fs from 'fs';
import * as path from 'path';

async function loadRules(ruleNames: string[]): Promise<RuleProperties[]> {
    logger.debug(`loading json rules..`);
    const ruleFiles = (await fs.promises.readdir(__dirname)).filter(file => file.endsWith('-rule.json'));
    
    logger.debug(`found ${ruleFiles.length} rule files to load.`);
    const allRules: Record<string, RuleProperties> = {};

    await Promise.all(ruleFiles.map(async file => {
        try {
            logger.debug(`loading ${file}...`);
            const rule = await import(path.join(__dirname, file));
            allRules[rule.name] = rule;
        } catch (e) {     
            logger.error(`FATAL: Error loading rule file: ${file}`);
            logger.error(e);
            console.error(e);
        }       
    }));

    return ruleNames.map(name => allRules[name]).filter(Boolean);
}

export { loadRules };
