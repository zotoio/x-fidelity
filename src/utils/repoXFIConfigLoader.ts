import fs from 'fs';
import path from 'path';
import { isPathInside } from './pathUtils';
import { logger } from './logger';
import { RepoXFIConfig } from '../types/typeDefs';
import { validateXFIConfig, validateRule } from './jsonSchemas';

const defaultXFIConfig: RepoXFIConfig = {
  sensitiveFileFalsePositives: []};

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

      // Validate additional rules if present
      if (parsedConfig.additionalRules && Array.isArray(parsedConfig.additionalRules)) {
        for (let i = 0; i < parsedConfig.additionalRules.length; i++) {
          if (!validateRule(parsedConfig.additionalRules[i])) {
            logger.warn(`Invalid rule at index ${i} in .xfi-config.json, removing it`);
            parsedConfig.additionalRules.splice(i, 1);
            i--;
          }
        }
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
