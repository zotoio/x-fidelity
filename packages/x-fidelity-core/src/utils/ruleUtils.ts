import { logger } from './logger';
import fs from 'fs';
import path from 'path';
import { axiosClient } from './axiosClient';
import { isOpenAIEnabled } from './openaiUtils';
import { validateRule } from './jsonSchemas';
import { LoadLocalConfigRuleParams, LoadRemoteRuleParams, LoadRulesParams, RuleConfig } from '@x-fidelity/types';

async function loadRules(params: LoadRulesParams): Promise<RuleConfig[]> {
    const { archetype, ruleNames, configServer, logPrefix, localConfigPath } = params;
    const ruleProperties: RuleConfig[] = [];

    if (!ruleNames) {
        return ruleProperties;
    }

    for (const ruleName of ruleNames) {
        let rule: RuleConfig | undefined;

        if (configServer) {
            rule = await loadRemoteRule({ configServer, archetype, ruleName, rule: ruleName });
        } else if (localConfigPath) {
            rule = await loadLocalConfigRule({ archetype, ruleName, rule: ruleName, localConfigPath });
        }

        if (rule) {
            if (validateRule(rule)) {
                if (!ruleName.startsWith('openai') || (isOpenAIEnabled() && ruleName.startsWith('openai'))) {
                    ruleProperties.push(rule);
                }
            } else {
                logger.error(`${logPrefix || ''}invalid rule configuration for ${ruleName}`);
            }
        }
    }
    
    logger.info(`${logPrefix || ''}loaded ${ruleProperties.length} rules`);
    
    return ruleProperties;
}

export async function loadRemoteRule(params: LoadRemoteRuleParams): Promise<RuleConfig | undefined> {
    const { configServer, archetype, rule } = params;

    try {
        const response = await axiosClient.get(`${configServer}/archetype/${archetype}/rule/${rule}`);
        return response.data;
    } catch (error) {
        logger.error(`Failed to load remote rule ${rule} for archetype ${archetype}`);
        return undefined;
    }
}

async function loadLocalConfigRule(params: LoadLocalConfigRuleParams): Promise<RuleConfig | undefined> {
    const { archetype, rule, localConfigPath } = params;
    const fileName = `${rule}-rule.json`;
    const filePath = path.join(localConfigPath || '', 'rules', fileName);

    if (!rule || (!rule.startsWith('openai') || (isOpenAIEnabled() && rule.startsWith('openai')))) {
        try {
            logger.info(`loading local config rule file: ${filePath}`);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            logger.error(`error loading local config path rule file: ${fileName}`);
            logger.error(error);
            return undefined;
        }
    }
    return undefined;
}

// Function to validate custom rules
function validateCustomRules(rules: any[]): RuleConfig[] {
    const validRules: RuleConfig[] = [];
    
    for (const rule of rules) {
        if (validateRule(rule)) {
            validRules.push(rule);
        } else {
            logger.error(`Invalid custom rule: ${rule.name || 'unnamed'}`);
        }
    }
    
    return validRules;
}

export { loadRules, validateCustomRules };
