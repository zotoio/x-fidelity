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

    // Early return if no config file
    if (!fs.existsSync(configPath)) {
      logger.warn(`No .xfi-config.json file found, returning default config`);
      return defaultRepoXFIConfig;
    }

    if (!isPathInside(configPath, baseRepo)) {
      throw new Error('Resolved config path is outside allowed directory');
    }

    // Load and parse config
    const parsedConfig = await loadAndValidateConfig(configPath);
    if (!parsedConfig) return defaultRepoXFIConfig;

    // Process paths
    parsedConfig.sensitiveFileFalsePositives = processFilePaths(parsedConfig.sensitiveFileFalsePositives, repoPath);

    // Initialize arrays
    initializeArrays(parsedConfig);

    // Process additional rules
    if (parsedConfig.additionalRules?.length) {
      parsedConfig.additionalRules = await processAdditionalRules(parsedConfig.additionalRules, baseRepo);
    }

    return parsedConfig;

  } catch (error) {
    logger.error(`Error loading repo config: ${error}`);
    return defaultRepoXFIConfig;
  }
}

async function loadAndValidateConfig(configPath: string): Promise<RepoXFIConfig | null> {
  try {
    const configContent = await fs.promises.readFile(configPath, 'utf8');
    const parsedConfig = JSON.parse(configContent);

    if (!validateXFIConfig(parsedConfig)) {
      logger.warn('Invalid .xfi-config.json schema');
      return null;
    }

    return parsedConfig;
  } catch (error) {
    logger.error(`Error reading/parsing config: ${error}`);
    return null;
  }
}

function processFilePaths(paths: string[] = [], repoPath: string): string[] {
  return paths.map(filePath => path.join(repoPath, filePath));
}

function initializeArrays(config: RepoXFIConfig): void {
  config.additionalRules = config.additionalRules || [];
  config.additionalFacts = config.additionalFacts || [];
  config.additionalOperators = config.additionalOperators || [];
  config.additionalPlugins = config.additionalPlugins || [];
}

async function processAdditionalRules(rules: any[], baseRepo: string): Promise<any[]> {
  const validatedRules: any[] = [];

  for (const rule of rules) {
    try {
      // Handle inline rules first
      if (!('path' in rule) && !('url' in rule)) {
        if (validateRule(rule)) {
          validatedRules.push(rule);
          continue;
        } else {
          const ruleName = (rule as any)?.name || 'unnamed';
          logger.warn(`Invalid inline rule ${ruleName} in .xfi-config.json, skipping`);
          continue;
        }
      }

      // Handle remote URL
      if ('url' in rule && rule.url) {
        await processRemoteRule(rule, validatedRules);
        continue;
      }

      // Handle local path with potential wildcards
      if ('path' in rule && rule.path) {
        await processLocalRule(rule, baseRepo, validatedRules);
      }
    } catch (error) {
      logger.error(`Error processing rule: ${error}`);
    }
  }

  return validatedRules;
}

async function processRemoteRule(rule: any, validatedRules: any[]): Promise<void> {
  try {
    const response = await fetch(rule.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const ruleContent = await response.text();
    const remoteRule = JSON.parse(ruleContent);
    if (validateRule(remoteRule)) {
      validatedRules.push(remoteRule);
      logger.info(`Loaded rule from URL ${rule.url}`);
    } else {
      logger.warn(`Invalid rule from URL ${rule.url}, skipping`);
    }
  } catch (error) {
    logger.warn(`Error loading rule from URL ${rule.url}: ${error}`);
  }
}

async function processLocalRule(rule: any, baseRepo: string, validatedRules: any[]): Promise<void> {
  const pathPattern = rule.path;
  let foundValidRule = false;

  // Try multiple base directories in order of precedence
  const searchPaths = [
    options.localConfigPath, // Local config dir first
    process.cwd(),           // Current working dir second
    baseRepo                 // Repository root last
  ].filter(Boolean); // Remove undefined/null paths

  for (const basePath of searchPaths) {
    if (foundValidRule) break;

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

