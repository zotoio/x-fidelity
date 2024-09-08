import fs from 'fs';
import path from 'path';
import { logger } from './logger';

interface XFIConfig {
  sensitiveFileFalsePositives?: string[];
}

export function loadXFIConfig(repoPath: string): XFIConfig {
  try {
    const configPath = path.join(repoPath, '.xfi-config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    logger.debug('No .xfi-config.json file found or error reading it');
    return {};
  }
}
