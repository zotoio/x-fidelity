import { logger } from './logger';
import fs from 'fs';
import path from 'path';
import { axiosClient } from './axiosClient';
import { isOpenAIEnabled } from './openaiUtils';
import { validateRule } from './jsonSchemas';
import { LoadLocalConfigRuleParams, LoadLocalRuleParams, LoadRemoteRuleParams, LoadRulesParams, RuleConfig } from '../types/typeDefs';

async function loadRules(params: LoadRulesParams): Promise<RuleConfig[]> {
    const { archetype, ruleNames, configServer, logPrefix, localConfigPath } = params;
    const ruleProperties: RuleConfig[] = [];

    for (const ruleName of ruleNames) {

        let rule: RuleConfig | null;

        if (configServer) {
            rule = await loadRemoteRule({ configServer, archetype, ruleName, logPrefix });
        } else if (localConfigPath) {
            rule = await loadLocalConfigRule({ ruleName, localConfigPath });
        } else {
            rule = null;
        }

        if (rule) {
            if (validateRule(rule)) {
                if (!ruleName.startsWith('openai') || (isOpenAIEnabled() && ruleName.startsWith('openai'))) {
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

async function loadRemoteRule(params: LoadRemoteRuleParams): Promise<RuleConfig | null> {
    const { configServer, archetype, ruleName, logPrefix } = params;
    try {
        const url = `${configServer}/archetypes/${archetype}/rules/${ruleName}`;
        logger.info(`fetching remote rule ${url}`);
        const response = await axiosClient.get(url, {
            headers: {
                'X-Log-Prefix': logPrefix || ''
            }
        });
        const rule = response.data;
        logger.debug(`remote rule fetched successfully: ${JSON.stringify(rule)}`);
        return rule;
    } catch (error) {
        logger.error(`error fetching remote rule ${ruleName}`);
        logger.error(JSON.stringify(error));
        throw error;
    }
}

async function loadDefaultRule(params: LoadLocalRuleParams): Promise<RuleConfig | null> {
    const { ruleName } = params;
    const fileName = `${ruleName}-rule.json`;
    const filePath = path.join(__dirname, fileName);
    let result = null

    if (!fileName.startsWith('openai') || (isOpenAIEnabled() && fileName.startsWith('openai'))) {
        try {
            logger.info(`loading default rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            result = JSON.parse(fileContent);
        } catch (error) {
            logger.error(`Error loading default rule file: ${fileName}`);
            logger.error(JSON.stringify(error));
            throw error;
        }
    }
    return result;
}

async function loadLocalConfigRule(params: LoadLocalConfigRuleParams): Promise<RuleConfig | null> {
    const { ruleName, localConfigPath } = params;
    const fileName = `${ruleName}-rule.json`;
    const filePath = path.join(localConfigPath, 'rules', fileName);
    let result = null;

    if (!fileName.startsWith('openai') || (isOpenAIEnabled() && fileName.startsWith('openai'))) {
        try {
            logger.info(`loading local config rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            result = JSON.parse(fileContent);
        } catch (error) {
            logger.error(`error loading local config path rule file: ${fileName}`);
            logger.error(error);
            throw error;
        }
    }
    return result;
}

export { loadRules };
