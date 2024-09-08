import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { RepoXFIConfig } from '../types/typeDefs';
import Ajv from 'ajv';

const ajv = new Ajv();

const xfiConfigSchema = {
  type: 'object',
  properties: {
    sensitiveFileFalsePositives: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  additionalProperties: false
};

const validateXFIConfig = ajv.compile(xfiConfigSchema);

export function loadRepoXFIConfig(repoPath: string): RepoXFIConfig {
  try {
    const configPath = path.join(repoPath, '.xfi-config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const parsedConfig = JSON.parse(configContent);

    if (validateXFIConfig(parsedConfig)) {
      return parsedConfig as RepoXFIConfig;
    } else {
      logger.error('Invalid .xfi-config.json file:', validateXFIConfig.errors);
      return {};
    }
  } catch (error) {
    logger.debug('No .xfi-config.json file found or error reading it');
    return {};
  }
}
