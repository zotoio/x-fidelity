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
          
          try {
            const validatedRules: any[] = [];

            for (const ruleConfig of parsedConfig.additionalRules) {
              // Handle inline rules first
              if (!('path' in ruleConfig) && !('url' in ruleConfig)) {
                if (validateRule(ruleConfig)) {
                  validatedRules.push(ruleConfig);
                  continue;
                } else {
                  const ruleName = (ruleConfig as any)?.name || 'unnamed';
                  logger.warn(`Invalid inline rule ${ruleName} in .xfi-config.json, skipping`);
                  continue;
                }
              }

              // Handle remote URL
              if ('url' in ruleConfig && ruleConfig.url) {
                try {
                  const response = await fetch(ruleConfig.url);
                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }
                  const ruleContent = await response.text();
                  const rule = JSON.parse(ruleContent);
                  if (validateRule(rule)) {
                    validatedRules.push(rule);
                    logger.info(`Loaded rule from URL ${ruleConfig.url}`);
                  } else {
                    logger.warn(`Invalid rule from URL ${ruleConfig.url}, skipping`);
                  }
                } catch (error) {
                  logger.warn(`Error loading rule from URL ${ruleConfig.url}: ${error}`);
                }
                continue;
              }

              // Handle local path with potential wildcards
              if ('path' in ruleConfig && ruleConfig.path) {
                const pathPattern = ruleConfig.path;
                let foundValidRule = false;
                
                // Try multiple base directories in order of precedence
                const searchPaths = [
                  options.localConfigPath, // Local config dir first
                  process.cwd(),           // Current working dir second
                  baseRepo                 // Repository root last
                ].filter(Boolean); // Remove undefined/null paths

                for (const basePath of searchPaths) {
                  if (foundValidRule) break; // Stop once we find a valid rule

                  const fullPattern = path.resolve(basePath, pathPattern);
                  const baseDir = path.dirname(fullPattern);
                  
                  // Check if path is inside allowed directories
                  if (!searchPaths.some(allowedPath => isPathInside(baseDir, allowedPath))) {
                    logger.warn(`Rule path ${pathPattern} resolves outside allowed directories, skipping`);
                    continue;
                  }

                  try {
                    let rulePaths: string[] = [];
                    if (pathPattern.includes('*')) {
                      // Handle wildcards using glob pattern
                      const { glob } = await import('glob');
                      rulePaths = await glob(fullPattern);
                    } else if (fs.existsSync(fullPattern)) {
                      // Single file path
                      rulePaths = [fullPattern];
                    }

                    // Load and validate each rule file
                    for (const rulePath of rulePaths) {
                      try {
                        const content = await fs.promises.readFile(rulePath, 'utf8');
                        const rule = JSON.parse(content);
                        if (validateRule(rule)) {
                          validatedRules.push(rule);
                          logger.info(`Loaded rule from ${rulePath}`);
                          foundValidRule = true;
                          break; // Take first valid rule found
                        } else {
                          logger.warn(`Invalid rule in ${rulePath}, skipping`);
                        }
                      } catch (error) {
                        logger.warn(`Error loading rule from ${rulePath}: ${error}`);
                      }
                    }
                  } catch (error) {
                    logger.debug(`Error resolving pattern ${pathPattern} in ${basePath}: ${error}`);
                  }
                }

                if (!foundValidRule) {
                  logger.warn(`No valid rules found for pattern: ${pathPattern}`);
                }
              }
            }

            parsedConfig.additionalRules = validatedRules;
            return parsedConfig;
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
