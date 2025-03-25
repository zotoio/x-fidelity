import fs from 'fs';
import path from 'path';
import { isPathInside } from './pathUtils';
import { logger } from './logger';
import { RepoXFIConfig } from '../types/typeDefs';
import { validateXFIConfig, validateRule } from './jsonSchemas';

const defaultXFIConfig: RepoXFIConfig = {
  sensitiveFileFalsePositives: [],
  additionalRules: []
};

export async function loadRepoXFIConfig(repoPath: string): Promise<RepoXFIConfig> {
  try {
    const baseRepo = path.resolve(repoPath);
    const configPath = path.resolve(baseRepo, '.xfi-config.json');
    if (!isPathInside(configPath, baseRepo)) {
        throw new Error('Resolved config path is outside allowed directory');
    }
    const configContent = await fs.promises.readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(configContent);

    if (validateXFIConfig(parsedConfig)) {
      logger.info('Loaded .xfi-config.json file from repo..');

      // Add the repoPath prefix to the relative paths
      if (parsedConfig.sensitiveFileFalsePositives) {
        parsedConfig.sensitiveFileFalsePositives = parsedConfig.sensitiveFileFalsePositives.map((filePath: any) => {
          filePath = path.join(repoPath, filePath);
          return filePath;
        });
      }

      // Validate and load additional rules if present
      if (parsedConfig.additionalRules && Array.isArray(parsedConfig.additionalRules)) {
        const validatedRules = [];
        for (const ruleConfig of parsedConfig.additionalRules) {
          if ('path' in ruleConfig || 'url' in ruleConfig) {
            // Handle rule reference
            try {
              let ruleContent: string;
              
              if ('url' in ruleConfig && ruleConfig.url) {
                // Handle remote URL
                const response = await fetch(ruleConfig.url);
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                ruleContent = await response.text();
              } else if ('path' in ruleConfig && ruleConfig.path) {
                // Handle local path - try different base directories
                let rulePath: string | null = null;
                
                // Try relative to config dir first
                const localConfigPath = process.env.LOCAL_CONFIG_PATH;
                if (localConfigPath) {
                  const configDirPath = path.resolve(localConfigPath, ruleConfig.path);
                  if (fs.existsSync(configDirPath)) {
                    rulePath = configDirPath;
                  }
                }
                
                // Then try relative to repo dir
                if (!rulePath) {
                  const repoDirPath = path.resolve(baseRepo, ruleConfig.path);
                  if (isPathInside(repoDirPath, baseRepo) && fs.existsSync(repoDirPath)) {
                    rulePath = repoDirPath;
                  }
                }

                if (!rulePath) {
                  throw new Error(`Could not resolve rule path: ${ruleConfig.path}`);
                }

                ruleContent = await fs.promises.readFile(rulePath, 'utf8');
              } else {
                throw new Error('Rule reference must have either url or path');
              }

              const rule = JSON.parse(ruleContent);
              if (validateRule(rule)) {
                validatedRules.push(rule);
              } else {
                logger.warn(`Invalid rule in referenced file ${ruleConfig.path || ruleConfig.url}, skipping`);
              }
            } catch (error) {
              logger.warn(`Error loading rule from ${ruleConfig.path || ruleConfig.url}: ${error}`);
            }
          } else {
            // Handle inline rule
            if (validateRule(ruleConfig)) {
              validatedRules.push(ruleConfig);
            } else {
              const ruleName = (ruleConfig as any)?.name || 'unnamed';
              logger.warn(`Invalid inline rule ${ruleName} in .xfi-config.json, skipping`);
            }
          }
        }
        parsedConfig.additionalRules = validatedRules;
      }

      return parsedConfig;
    } else {
      logger.warn(`Ignoring invalid .xfi-config.json file, returing default config: ${JSON.stringify(defaultXFIConfig)}`);
      return defaultXFIConfig;
    }
  } catch (error) {
    logger.warn(`No .xfi-config.json file found, returing default config: ${JSON.stringify(defaultXFIConfig)}`);
    return defaultXFIConfig;
  }
}
