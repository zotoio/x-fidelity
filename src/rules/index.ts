import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import * as fs from 'fs';
import * as path from 'path';

async function loadRules(ruleNames: string[]): Promise<RuleProperties[]> {
    console.log(`loading json rules..`);
    const ruleFiles = (await fs.promises.readdir(__dirname)).filter(file => file.endsWith('-rule.json') && ruleNames.includes(file.split('-')[0]));
    
    logger.debug(`found ${ruleFiles.length} rule files to load. ${JSON.stringify(ruleFiles)}`);
    const ruleProperties: Promise<RuleProperties>[] = [];
    
    await Promise.all(ruleFiles.map(async file => {
        if (!file.startsWith('openai') || (process.env.OPENAI_API_KEY && file.startsWith('openai'))) {
            try {
                logger.debug(`loading ${__dirname} ${file}...`);
                const rule = await import(path.join(__dirname, file));
                ruleProperties.push(rule);
            } catch (e) {     
                logger.error(`FATAL: Error loading rule file: ${file}`);
                logger.error(e);
                console.error(e);
            }      
        }     
    }));
    
    return await Promise.all(ruleProperties);
}

export { loadRules };
