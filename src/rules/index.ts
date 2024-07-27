import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { options } from "../core/cli";

async function loadRules(archetype: string, ruleNames: string[], configServer?: string, logPrefix?: string, localConfigPath?: string): Promise<RuleProperties[]> {
    
    const ruleProperties: RuleProperties[] = [];

    for (const ruleName of ruleNames) {
        let rule: RuleProperties | null;

        if (configServer) {
            try {
                const url = `${configServer}/archetypes/${archetype}/rules/${ruleName}`;
                logger.debug(`Fetching remote rule ${url}`);
                const response = await axios.get(url, {
                    headers: {
                        'X-Log-Prefix': logPrefix || ''
                    }
                });
                rule = response.data;
                logger.info(`Remote rule fetched successfully: ${JSON.stringify(rule)}`);
            } catch (error) {
                logger.error(`Error fetching remote rule ${ruleName}: ${error}`);
                // If remote fetch fails, fall back to local file
                rule = await loadLocalRule(ruleName);
            }
        } else if (localConfigPath) {
            rule = await loadLocalConfigRule(ruleName, localConfigPath);
        } else if (localConfigPath) {
            rule = await loadLocalConfigRule(ruleName, localConfigPath);
        } else {
            rule = await loadLocalRule(ruleName);
        }

        if (rule) {
            if (!ruleName.startsWith('openai') || (process.env.OPENAI_API_KEY && options.openaiEnabled && ruleName.startsWith('openai'))) {
                ruleProperties.push(rule);
            }    
        }
    }
    
    logger.info(`Loaded ${ruleProperties.length} rules`);
    
    return ruleProperties;
}

async function loadLocalRule(ruleName: string): Promise<RuleProperties | null> {
    const fileName = `${ruleName}-rule.json`;
    const filePath = path.join(__dirname, fileName);

    if (!fileName.startsWith('openai') || (process.env.OPENAI_API_KEY && options.openaiEnabled && fileName.startsWith('openai'))) {
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
async function loadLocalConfigRule(ruleName: string, localConfigPath: string): Promise<RuleProperties | null> {
    const fileName = `${ruleName}-rule.json`;
    const filePath = path.join(localConfigPath, 'rules', fileName);

    if (!fileName.startsWith('openai') || (process.env.OPENAI_API_KEY && fileName.startsWith('openai'))) {
        try {
            logger.debug(`Loading local config rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`Error loading local config rule file: ${fileName}`);
            logger.error(error);
            return null;
        }
    }
    return null;
}
