import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function loadRules(ruleNames: string[], baseUrl?: string): Promise<RuleProperties[]> {
    console.log(`loading json rules..`);
    const ruleProperties: RuleProperties[] = [];

    for (const ruleName of ruleNames) {
        let rule: RuleProperties | null;

        if (baseUrl) {
            try {
                const response = await axios.get(`${baseUrl}/rules/${ruleName}`);
                rule = response.data;
            } catch (error) {
                logger.error(`Error fetching remote rule ${ruleName}: ${error}`);
                // If remote fetch fails, fall back to local file
                rule = await loadLocalRule(ruleName);
            }
        } else {
            rule = await loadLocalRule(ruleName);
        }

        if (rule) {
            ruleProperties.push(rule);
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
            console.error(error);
            return null;
        }
    }
    return null;
}

export { loadRules };
