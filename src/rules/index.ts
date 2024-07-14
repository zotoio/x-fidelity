import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function loadRules(archetype: any, ruleNames: string[], configServer?: string): Promise<RuleProperties[]> {
    
    const ruleProperties: RuleProperties[] = [];

    for (const ruleName of ruleNames) {
        let rule: RuleProperties | null;

        if (configServer) {
            try {
                const url = `${configServer}/archetypes/${archetype}/rules/${ruleName}`;
                console.log(`Fetching remote rule ${url}`);
                const response = await axios.get(url);
                rule = response.data;
                console.log(`Remote rule fetched successfully: ${rule}`);
            } catch (error) {
                console.log(`Error fetching remote rule ${ruleName}: ${error}`);
                // If remote fetch fails, fall back to local file
                rule = await loadLocalRule(ruleName);
            }
        } else {
            rule = await loadLocalRule(ruleName);
        }

        if (rule) {
            if (!ruleName.startsWith('openai') || (process.env.OPENAI_API_KEY && ruleName.startsWith('openai'))) {
                ruleProperties.push(rule);
            }    
        }
    }

    logger.debug(`Loaded ${ruleProperties.length} rules`);
    return ruleProperties;
}

async function loadLocalRule(ruleName: string): Promise<RuleProperties | null> {
    const fileName = `${ruleName}-rule.json`;
    const filePath = path.join(__dirname, fileName);

    if (!fileName.startsWith('openai') || (process.env.OPENAI_API_KEY && fileName.startsWith('openai'))) {
        try {
            logger.debug(`Loading local rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`FATAL: Error loading local rule file: ${fileName}`);
            logger.error(error);
            return null;
        }
    }
    return null;
}

export { loadRules };
