import { IsBlacklistedParams, isWhitelistedParams, RepoXFIConfig } from '@x-fidelity/types';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

export const defaultRepoXFIConfig: RepoXFIConfig = {
    sensitiveFileFalsePositives: [],
    additionalRules: [],
    additionalFacts: [],
    additionalOperators: [],
    archetype: 'default'
};

export async function loadRepoXFIConfig(repoPath: string): Promise<RepoXFIConfig> {
    const configPath = path.join(repoPath, '.xfi-config.json');
    
    try {
        if (!fs.existsSync(configPath)) {
            logger.warn(`No .xfi-config.json found in ${repoPath}, using defaults`);
            return defaultRepoXFIConfig;
        }
        
        const configContent = await fs.promises.readFile(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        // Process relative paths for sensitiveFileFalsePositives
        if (config.sensitiveFileFalsePositives) {
            config.sensitiveFileFalsePositives = config.sensitiveFileFalsePositives.map((filePath: string) => {
                if (filePath.startsWith('/')) {
                    return path.join(repoPath, filePath);
                }
                return path.join(repoPath, filePath);
            });
        }
        
        // Validate and filter rules to prevent path traversal
        if (config.additionalRules) {
            config.additionalRules = config.additionalRules.filter((rule: any) => {
                if (rule.path && rule.path.includes('..')) {
                    logger.warn(`Skipping rule with path traversal attempt: ${rule.path}`);
                    return false;
                }
                return true;
            });
        }
        
        return {
            ...defaultRepoXFIConfig,
            ...config
        };
    } catch (error) {
        logger.error(`Error loading .xfi-config.json: ${error}`);
        return defaultRepoXFIConfig;
    }
}

export function isBlacklisted(params: IsBlacklistedParams): boolean {
    const { filePath, blacklistPatterns } = params;
    return blacklistPatterns.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(filePath);
    });
}

export function isWhitelisted(params: isWhitelistedParams): boolean {
    const { filePath, whitelistPatterns } = params;
    if (whitelistPatterns.length === 0) {
        return true;
    }
    return whitelistPatterns.some(pattern => {
        const regex = new RegExp(pattern);
        return regex.test(filePath);
    });
}