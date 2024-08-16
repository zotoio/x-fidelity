import { logger } from '../utils/logger';
import { RuleProperties } from 'json-rules-engine';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { isOpenAIEnabled } from '../utils/openaiUtils';
import { options } from '../core/cli';
import { validateRule } from '../utils/jsonSchemas';

interface LoadRulesParams {
    archetype: string;
    ruleNames: string[];
    configServer?: string;
    logPrefix?: string;
    localConfigPath?: string;
}

interface LoadRemoteRuleParams {
    configServer: string;
    archetype: string;
    ruleName: string;
    logPrefix?: string;
}

interface LoadLocalRuleParams {
    ruleName: string;
}

interface LoadLocalConfigRuleParams {
    ruleName: string;
    localConfigPath: string;
}

async function loadRules(params: LoadRulesParams): Promise<RuleProperties[]> {
    const { archetype, ruleNames, configServer, logPrefix, localConfigPath } = params;
    const ruleProperties: RuleProperties[] = [];

    for (const ruleName of ruleNames) {
        let rule: RuleProperties | null;

        if (configServer) {
            rule = await loadRemoteRule({ configServer, archetype, ruleName, logPrefix });
        } else if (localConfigPath) {
            rule = await loadLocalConfigRule({ ruleName, localConfigPath });
        } else {
            rule = await loadLocalRule({ ruleName });
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

async function loadRemoteRule(params: LoadRemoteRuleParams): Promise<RuleProperties | null> {
    const { configServer, archetype, ruleName, logPrefix } = params;
    try {
        const url = `${configServer}/archetypes/${archetype}/rules/${ruleName}`;
        logger.info(`fetching remote rule ${url}`);
        const response = await axios.get(url, {
            headers: {
                'X-Log-Prefix': logPrefix || ''
            }
        });
        const rule = response.data;
        logger.debug(`remote rule fetched successfully: ${JSON.stringify(rule)}`);
        return rule;
    } catch (error) {
        logger.error(`error fetching remote rule ${ruleName}: ${error}`);
        // If remote fetch fails, fall back to local file
        return await loadLocalRule({ ruleName });
    }
}

async function loadLocalRule(params: LoadLocalRuleParams): Promise<RuleProperties | null> {
    const { ruleName } = params;
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

async function loadLocalConfigRule(params: LoadLocalConfigRuleParams): Promise<RuleProperties | null> {
    const { ruleName, localConfigPath } = params;
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

export { loadRules };
