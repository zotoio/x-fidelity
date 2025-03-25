import { defaultRepoXFIConfig, loadRepoXFIConfig } from './repoXFIConfigLoader';
import { validateRule } from './jsonSchemas';
import { logger } from './logger';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  },
  existsSync: jest.fn()
}));

jest.mock('./jsonSchemas', () => ({
  validateRule: jest.fn(),
  validateXFIConfig: jest.fn().mockReturnValue(true)
}));

jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('loadRepoXFIConfig', () => {
  const mockRepoPath = '/test/repo';

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
  });

  it('should load inline rules from additionalRules', async () => {
    const mockConfig = {
        sensitiveFileFalsePositives: [],
      additionalRules: [
        {
          name: 'inline-rule',
          conditions: { all: [] },
          event: { type: 'warning', params: {} }
        }
      ]
    };

    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
    (validateRule as unknown as jest.Mock).mockReturnValue(true);

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(result.additionalRules).toHaveLength(1);
    expect(result.additionalRules?.[0].name).toBe('inline-rule');
    expect(validateRule).toHaveBeenCalledTimes(1);
  });

  it('should load rules from referenced paths', async () => {
    const mockConfig = {
      additionalRules: [
        {
          name: 'referenced-rule',
          path: 'rules/custom-rule.json'
        }
      ]
    };

    const mockRuleContent = {
      name: 'referenced-rule',
      conditions: { all: [] },
      event: { type: 'warning', params: {} }
    };

    // Mock file system operations
    (fs.promises.readFile as jest.Mock)
      .mockImplementation((path: string) => {
        if (path.endsWith('.xfi-config.json')) {
          return Promise.resolve(JSON.stringify(mockConfig));
        }
        if (path.includes('custom-rule.json')) {
          return Promise.resolve(JSON.stringify(mockRuleContent));
        }
        return Promise.reject(new Error('File not found'));
      });
    
    (fs.existsSync as jest.Mock).mockImplementation(path => {
      return path.endsWith('.xfi-config.json') || path.includes('custom-rule.json');
    });

    (validateRule as unknown as jest.Mock).mockReturnValue(true);

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(result.additionalRules).toHaveLength(1);
    expect(result.additionalRules![0].name).toBe('referenced-rule');
  });

  it('should handle mix of inline and referenced rules', async () => {
    const mockConfig = {
      additionalRules: [
        {
          name: 'inline-rule',
          conditions: { all: [] },
          event: { type: 'warning', params: {} }
        },
        {
          name: 'referenced-rule',
          path: 'rules/custom-rule.json'
        }
      ]
    };

    const mockRuleContent = {
      name: 'referenced-rule',
      conditions: { all: [] },
      event: { type: 'warning', params: {} }
    };

    (fs.promises.readFile as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(mockConfig))
      .mockResolvedValueOnce(JSON.stringify(mockRuleContent));
    (validateRule as unknown as jest.Mock).mockReturnValue(true);
    (fs.existsSync as jest.Mock).mockImplementation(path => path.includes('custom-rule.json'));

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(result.additionalRules).toHaveLength(2);
    expect(result.additionalRules![0].name).toBe('inline-rule');
    expect(result.additionalRules![1].name).toBe('referenced-rule'); 
  });

  it('should skip invalid inline rules', async () => {
    const mockConfig = {
      additionalRules: [
        {
          name: 'invalid-rule',
          // Missing required fields
        }
      ]
    };

    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
    (validateRule as unknown as jest.Mock).mockReturnValue(false);

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(result.additionalRules).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'Invalid inline rule invalid-rule in .xfi-config.json, skipping'
    );
  });

  it('should handle errors loading referenced rules', async () => {
    const mockConfig = {
        sensitiveFileFalsePositives: [],
        additionalRules: [
            {
            name: 'referenced-rule',
            path: 'rules/missing-rule.json'
            }
        ]
    };

    (fs.promises.readFile as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify(mockConfig))
      .mockRejectedValueOnce(new Error('File not found'));

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(result.additionalRules).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'Error loading rule from rules/missing-rule.json: Error: File not found'
    );
  });

  it('should prevent path traversal in referenced rules', async () => {
    const mockConfig = {
      additionalRules: [
        {
          name: 'malicious-rule',
          path: '../../../etc/passwd'
        }
      ]
    };

    (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(result.additionalRules).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith(
      'Rule path ../../../etc/passwd resolves outside allowed directories, skipping'
    );
  });

  it('should handle missing .xfi-config.json', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const result = await loadRepoXFIConfig(mockRepoPath);

    expect(logger.warn).toHaveBeenCalledWith(
      `No .xfi-config.json file found, returing default config: ${JSON.stringify(defaultRepoXFIConfig)}`
    );
  });
});
