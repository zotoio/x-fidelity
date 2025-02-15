import fs from 'fs';
import path from 'path';
import { isPathInside } from './pathUtils';
import { logger } from './logger';
import { RepoXFIConfig } from '../types/typeDefs';
import { validateXFIConfig } from './jsonSchemas';

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
