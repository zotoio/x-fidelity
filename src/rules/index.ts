import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { options } from '../core/cli';
import { validateRule } from '../utils/jsonSchemas';

async function loadRules(archetype: string, ruleNames: string[], configServer?: string, logPrefix?: string, localConfigPath?: string): Promise<RuleProperties[]> {
    
    const ruleProperties: RuleProperties[] = [];

    for (const ruleName of ruleNames) {
        let rule: RuleProperties | null;

        if (configServer) {
            try {
                const url = `${configServer}/archetypes/${archetype}/rules/${ruleName}`;
                logger.info(`fetching remote rule ${url}`);
                const response = await axios.get(url, {
                    headers: {
                        'X-Log-Prefix': logPrefix || ''
                    }
                });
                rule = response.data;
                logger.debug(`remote rule fetched successfully: ${JSON.stringify(rule)}`);
            } catch (error) {
                logger.error(`error fetching remote rule ${ruleName}: ${error}`);
                // If remote fetch fails, fall back to local file
                rule = await loadLocalRule(ruleName);
            }
        } else if (localConfigPath) {
            rule = await loadLocalConfigRule(ruleName, localConfigPath);
        } else {
            rule = await loadLocalRule(ruleName);
        }

        if (rule) {
            if (validateRule(rule)) {
                if (options.mode === 'server' || !ruleName.startsWith('openai') || (isOpenAIEnabled() && ruleName.startsWith('openai'))) {
                    ruleProperties.push(rule);
                }
            } else {
                logger.error(`invalid rule configuration for ${ruleName}`);
            }
        }
    }
    
    logger.info(`loaded ${ruleProperties.length} rules`);
    
    return ruleProperties;
}

async function loadLocalRule(ruleName: string): Promise<RuleProperties | null> {
    const fileName = `${ruleName}-rule.json`;
    const filePath = path.join(__dirname, fileName);

    if (!fileName.startsWith('openai') || (isOpenAIEnabled() && fileName.startsWith('openai'))) {
        try {
            logger.info(`loading default rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`FATAL: Error loading default rule file: ${fileName}`);
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
            logger.info(`loading local config rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`error loading local config rule file: ${fileName}`);
            logger.error(error);
            return null;
        }
    }
    return null;
}
