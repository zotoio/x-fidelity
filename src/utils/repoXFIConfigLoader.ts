import fs from 'fs';
import path from 'path';
import { isPathInside } from './pathUtils';
import { logger } from './logger';
import { RepoXFIConfig } from '../types/typeDefs';
import { validateXFIConfig, validateRule } from './jsonSchemas';
import { options } from '../core/cli';

export const defaultRepoXFIConfig: RepoXFIConfig = {
  sensitiveFileFalsePositives: [],
  additionalRules: [],
  additionalFacts: [],
  additionalOperators: [],
  additionalPlugins: []
};

export async function loadRepoXFIConfig(repoPath: string): Promise<RepoXFIConfig> {
  try {
    const baseRepo = path.resolve(repoPath);
    const configPath = path.resolve(baseRepo, '.xfi-config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error('No .xfi-config.json file found');
    }

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
            
              let ruleContent: string;
              let rulePaths: string[] = [];
              
              if ('url' in ruleConfig && ruleConfig.url) {
                // Handle remote URL
                const response = await fetch(ruleConfig.url);
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
                }
                ruleContent = await response.text();
                const rule = JSON.parse(ruleContent);
                if (validateRule(rule)) {
                  validatedRules.push(rule);
                  logger.info(`Loaded rule from URL ${ruleConfig.url}`);
                } else {
                  logger.warn(`Invalid rule from URL ${ruleConfig.url}, skipping`);
                }
                continue;
              }

              // Handle local path with potential wildcards
              if ('path' in ruleConfig && ruleConfig.path) {
                const pathPattern = ruleConfig.path;
                
                // Try multiple base directories in order of precedence
                const searchPaths = [
                  options.localConfigPath, // Local config dir first
                  process.cwd(),           // Current working dir second
                  baseRepo                 // Repository root last
                ].filter(Boolean); // Remove undefined/null paths

                for (const basePath of searchPaths) {
                  const fullPattern = path.resolve(basePath, pathPattern);
                  const baseDir = path.dirname(fullPattern);
                  
                  // Check if path is inside allowed directories
                  if (!searchPaths.some(allowedPath => isPathInside(baseDir, allowedPath))) {
                    logger.warn(`Rule path ${pathPattern} resolves outside allowed directories, skipping`);
                    continue;
                  }

                  try {
                    if (pathPattern.includes('*')) {
                      // Handle wildcards using glob pattern
                      const { glob } = await import('glob');
                      const matches = await glob(fullPattern);
                      rulePaths.push(...matches);
                    } else if (fs.existsSync(fullPattern)) {
                      // Single file path
                      rulePaths.push(fullPattern);
                    }
                  } catch (error) {
                    logger.debug(`Error resolving pattern ${pathPattern} in ${basePath}: ${error}`);
                  }
                }

                // Load and validate each rule file
                for (const rulePath of rulePaths) {
                  try {
                    const content = await fs.promises.readFile(rulePath, 'utf8');
                    const rule = JSON.parse(content);
                    if (validateRule(rule)) {
                      validatedRules.push(rule);
                      logger.info(`Loaded rule from ${rulePath}`);
                    } else {
                      logger.warn(`Invalid rule in ${rulePath}, skipping`);
                    }
                  } catch (error) {
                    logger.warn(`Error loading rule from ${rulePath}: ${error}`);
                  }
                }

                if (rulePaths.length === 0) {
                  logger.warn(`No matching rule files found for pattern: ${pathPattern}`);
                }
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
      logger.warn(`Ignoring invalid .xfi-config.json file, returing default config: ${JSON.stringify(defaultRepoXFIConfig)}`);
      return defaultRepoXFIConfig;
    }
  } catch (error) {
    logger.warn(`No .xfi-config.json file found, returing default config: ${JSON.stringify(defaultRepoXFIConfig)}`);
    return defaultRepoXFIConfig;
  }
}
