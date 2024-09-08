import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { RepoXFIConfig } from '../types/typeDefs';
import { validateXFIConfig } from './jsonSchemas';

export async function loadRepoXFIConfig(repoPath: string): Promise<RepoXFIConfig> {
  try {
    const configPath = path.join(repoPath, '.xfi-config.json');
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
      logger.warn('Ignoring invalid .xfi-config.json file');
      return {file: 'invalid'};
    }
  } catch (error) {
    logger.warn('No .xfi-config.json file found.');
    return {file: 'not found'};
  }
}
