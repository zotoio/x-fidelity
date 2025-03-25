import { loadRepoXFIConfig, defaultRepoXFIConfig } from './repoXFIConfigLoader';
import { validateRule } from './jsonSchemas';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';
import { RepoXFIConfig } from '../types/typeDefs';

jest.mock('fs', () => ({
    open: jest.fn(),
  existsSync: jest.fn(),
  promises: {
    readFile: jest.fn()
  }
}));
jest.mock('./jsonSchemas');
jest.mock('./logger');

describe('loadRepoXFIConfig', () => {
  const mockRepoPath = '/test/repo';
  const mockConfigPath = path.join(mockRepoPath, '.xfi-config.json');

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (validateRule as unknown as jest.Mock).mockReturnValue(true);
  });

  it('should return default config when no config file exists', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    const result = await loadRepoXFIConfig(mockRepoPath);
    
    expect(result).toEqual(defaultRepoXFIConfig);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('should load and validate basic config', async () => {
    const mockConfig = {
      sensitiveFileFalsePositives: ['/src/test.ts'],
      additionalRules: []
    };
    
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
    
    const result = await loadRepoXFIConfig(mockRepoPath);
    
    expect(result.sensitiveFileFalsePositives).toEqual([path.join(mockRepoPath, '/src/test.ts')]);
  });

  it('should process inline rules', async () => {
    const mockConfig = {
      additionalRules: [{
        name: 'test-rule',
        conditions: {},
        event: {}
      }]
    };
    
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
    
    const result = await loadRepoXFIConfig(mockRepoPath) as RepoXFIConfig;
    
    expect(result.additionalRules).toHaveLength(1);
    expect(result.additionalRules?.[0]?.name).toBe('test-rule');
  });

  it('should handle invalid config JSON', async () => {
    (fs.promises.readFile as jest.Mock).mockResolvedValue('invalid json');
    
    const result = await loadRepoXFIConfig(mockRepoPath);
    
    expect(result).toEqual(defaultRepoXFIConfig);
    expect(logger.error).toHaveBeenCalled();
  });

  it('should prevent path traversal attempts', async () => {
    const mockConfig = {
      additionalRules: [{
        path: '../../../etc/passwd'
      }]
    };
    
    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
    
    const result = await loadRepoXFIConfig(mockRepoPath);
    
    expect(result.additionalRules).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalled();
  });
});
