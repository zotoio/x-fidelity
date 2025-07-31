import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ConfigSetManager, ConfigSet, SAVEABLE_OPTIONS, TRANSIENT_OPTIONS } from './configSetManager';
import { StandardErrorFactory } from '@x-fidelity/types';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
}));

// Mock os module
jest.mock('os');

// Mock path module  
jest.mock('path');

// Mock logger
jest.mock('../utils/loggerProvider');

describe('ConfigSetManager', () => {
  let configSetManager: ConfigSetManager;
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockOs = os as jest.Mocked<typeof os>;
  const mockPath = path as jest.Mocked<typeof path>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton instance
    (ConfigSetManager as any).instance = null;
    
    // Setup OS mocks
    mockOs.homedir.mockReturnValue('/home/testuser');
    
    // Setup path mocks
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));
    
    // Setup default mocks before creating instance
    mockFs.existsSync.mockReturnValue(true);
    mockFs.promises.mkdir.mockResolvedValue(undefined);
    mockFs.promises.writeFile.mockResolvedValue();
    mockFs.promises.readFile.mockResolvedValue('{}');
    mockFs.promises.readdir.mockResolvedValue([]);
    mockFs.promises.unlink.mockResolvedValue(undefined);
    
    configSetManager = ConfigSetManager.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ConfigSetManager.getInstance();
      const instance2 = ConfigSetManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConfigSetsDir', () => {
    it('should return correct config sets directory path', () => {
      const expected = path.join('/home/testuser', '.config/xfidelity/configs');
      expect(configSetManager.getConfigSetsDir()).toBe(expected);
    });
  });

  describe('initializeConfigSetsDir', () => {
    it('should create config sets directory', async () => {
      await configSetManager.initializeConfigSetsDir();
      
      expect(mockFs.promises.mkdir).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs',
        { recursive: true }
      );
    });

    it('should throw StandardError on mkdir failure', async () => {
      const error = new Error('Permission denied');
      
      // Reset and setup the mock for this specific test case
      mockFs.promises.mkdir.mockImplementation(() => Promise.reject(error));

      const promise = configSetManager.initializeConfigSetsDir();
      await expect(promise).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to initialize config sets directory/)
      });
    });
  });

  describe('writeConfigSet', () => {
    const testOptions = {
      archetype: 'node-fullstack',
      openaiEnabled: true,
      extraPlugins: ['plugin1', 'plugin2'],
      dir: './test', // This should be filtered out
      examine: true, // This should be filtered out
    };

    it('should write config set successfully', async () => {
      const params = {
        alias: 'test-config',
        options: testOptions,
        description: 'Test config',
        tags: ['test', 'demo'],
      };

      const result = await configSetManager.writeConfigSet(params);

      expect(mockFs.promises.mkdir).toHaveBeenCalled();
      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs/test-config.json',
        expect.stringContaining('"alias": "test-config"'),
        'utf8'
      );
      expect(result).toBe('/home/testuser/.config/xfidelity/configs/test-config.json');
    });

    it('should filter options correctly', async () => {
      const params = {
        alias: 'test-config',
        options: testOptions,
      };

      await configSetManager.writeConfigSet(params);

      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      
      // Should include saveable options
      expect(writtenContent.options.archetype).toBe('node-fullstack');
      expect(writtenContent.options.openaiEnabled).toBe(true);
      expect(writtenContent.options.extraPlugins).toEqual(['plugin1', 'plugin2']);
      
      // Should exclude transient options
      expect(writtenContent.options.dir).toBeUndefined();
      expect(writtenContent.options.examine).toBeUndefined();
    });

    it('should include proper metadata', async () => {
      const params = {
        alias: 'test-config',
        options: testOptions,
        description: 'Test description',
        tags: ['tag1', 'tag2'],
      };

      await configSetManager.writeConfigSet(params);

      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      
      expect(writtenContent.alias).toBe('test-config');
      expect(writtenContent.description).toBe('Test description');
      expect(writtenContent.tags).toEqual(['tag1', 'tag2']);
      expect(writtenContent.created).toBeDefined();
      expect(writtenContent.updated).toBeDefined();
    });

    it('should throw StandardError on write failure', async () => {
      const error = new Error('Write failed');
      
      // Ensure mkdir succeeds but writeFile fails
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.writeFile.mockImplementation(() => Promise.reject(error));

      const params = {
        alias: 'test-config',
        options: testOptions,
      };

      await expect(configSetManager.writeConfigSet(params)).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to write config set/)
      });
    });
  });

  describe('readConfigSet', () => {
    const mockConfigSet: ConfigSet = {
      alias: 'test-config',
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      description: 'Test config',
      tags: ['test'],
      options: {
        archetype: 'node-fullstack',
        openaiEnabled: true,
      },
    };

    it('should read config set successfully', async () => {
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfigSet));

      const result = await configSetManager.readConfigSet({ alias: 'test-config' });

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs/test-config.json'
      );
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs/test-config.json',
        'utf8'
      );
      expect(result).toEqual(mockConfigSet);
    });

    it('should return null for non-existent config set', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await configSetManager.readConfigSet({ alias: 'non-existent' });

      expect(result).toBeNull();
    });

    it('should resolve inheritance', async () => {
      const parentConfig: ConfigSet = {
        alias: 'parent-config',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        options: {
          archetype: 'base',
          openaiEnabled: false,
          extraPlugins: ['base-plugin'],
        },
      };

      const childConfig: ConfigSet = {
        alias: 'child-config',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        extends: 'parent-config',
        options: {
          openaiEnabled: true, // Override parent
          telemetryCollector: 'http://example.com', // Add new option
        },
      };

      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(childConfig))
        .mockResolvedValueOnce(JSON.stringify(parentConfig));

      const result = await configSetManager.readConfigSet({ alias: 'child-config' });

      expect(result?.options).toEqual({
        archetype: 'base', // From parent
        openaiEnabled: true, // Overridden by child
        extraPlugins: ['base-plugin'], // From parent
        telemetryCollector: 'http://example.com', // From child
      });
    });

    it('should throw StandardError on read failure', async () => {
      const error = new Error('Read failed');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockImplementation(() => Promise.reject(error));

      await expect(configSetManager.readConfigSet({ alias: 'test-config' })).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to read config set/)
      });
    });
  });

  describe('listConfigSets', () => {
    it('should list config sets successfully', async () => {
      const configSet1: ConfigSet = {
        alias: 'config1',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        options: { archetype: 'node-fullstack' },
      };

      const configSet2: ConfigSet = {
        alias: 'config2',
        created: '2023-01-02T00:00:00.000Z',
        updated: '2023-01-02T00:00:00.000Z',
        options: { archetype: 'microservice' },
      };

      mockFs.promises.readdir.mockResolvedValue(['config1.json', 'config2.json', 'other.txt'] as any);
      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(configSet1))
        .mockResolvedValueOnce(JSON.stringify(configSet2));

      const result = await configSetManager.listConfigSets();

      expect(result).toHaveLength(2);
      expect(result[0].alias).toBe('config1');
      expect(result[1].alias).toBe('config2');
      expect(mockFs.promises.readdir).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs'
      );
    });

    it('should return empty array when no config sets exist', async () => {
      mockFs.promises.readdir.mockResolvedValue([]);

      const result = await configSetManager.listConfigSets();

      expect(result).toEqual([]);
    });

    it('should sort config sets by alias', async () => {
      const configSetB: ConfigSet = {
        alias: 'config-b',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        options: {},
      };

      const configSetA: ConfigSet = {
        alias: 'config-a',
        created: '2023-01-02T00:00:00.000Z',
        updated: '2023-01-02T00:00:00.000Z',
        options: {},
      };

      mockFs.promises.readdir.mockResolvedValue(['config-b.json', 'config-a.json'] as any);
      mockFs.promises.readFile
        .mockResolvedValueOnce(JSON.stringify(configSetB))
        .mockResolvedValueOnce(JSON.stringify(configSetA));

      const result = await configSetManager.listConfigSets();

      expect(result[0].alias).toBe('config-a');
      expect(result[1].alias).toBe('config-b');
    });

    it('should throw StandardError on readdir failure', async () => {
      const error = new Error('Read directory failed');
      
      // Setup mocks
      mockFs.promises.mkdir.mockResolvedValue(undefined);
      mockFs.promises.readdir.mockImplementation(() => Promise.reject(error));

      await expect(configSetManager.listConfigSets()).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to list config sets/)
      });
    });
  });

  describe('removeConfigSet', () => {
    it('should remove config set successfully', async () => {
      await configSetManager.removeConfigSet({ alias: 'test-config' });

      expect(mockFs.existsSync).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs/test-config.json'
      );
      expect(mockFs.promises.unlink).toHaveBeenCalledWith(
        '/home/testuser/.config/xfidelity/configs/test-config.json'
      );
    });

    it('should throw StandardError for non-existent config set', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(configSetManager.removeConfigSet({ alias: 'non-existent' })).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to remove config set/)
      });
    });

    it('should throw StandardError on unlink failure', async () => {
      const error = new Error('Unlink failed');
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.unlink.mockImplementation(() => Promise.reject(error));

      await expect(configSetManager.removeConfigSet({ alias: 'test-config' })).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to remove config set/)
      });
    });
  });

  describe('exportConfigSet', () => {
    const mockConfigSet: ConfigSet = {
      alias: 'test-config',
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      options: { archetype: 'node-fullstack' },
    };

    it('should export config set successfully', async () => {
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfigSet));
      const outputPath = '/tmp/exported-config.json';

      const result = await configSetManager.exportConfigSet({ 
        alias: 'test-config', 
        outputPath 
      });

      expect(mockFs.promises.writeFile).toHaveBeenCalledWith(
        outputPath,
        JSON.stringify(mockConfigSet, null, 2),
        'utf8'
      );
      expect(result).toBe(outputPath);
    });

    it('should use default output path when not provided', async () => {
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfigSet));

      const result = await configSetManager.exportConfigSet({ alias: 'test-config' });

      expect(result).toBe(path.join(process.cwd(), 'test-config-configset.json'));
    });

    it('should throw StandardError for non-existent config set', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(configSetManager.exportConfigSet({ alias: 'non-existent' })).rejects.toMatchObject({
        message: expect.stringMatching(/Config set.*not found/)
      });
    });
  });

  describe('importConfigSet', () => {
    const mockConfigSet: ConfigSet = {
      alias: 'imported-config',
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      options: { archetype: 'node-fullstack' },
    };

    it('should import config set successfully', async () => {
      const filePath = '/tmp/config.json';
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfigSet));

      const result = await configSetManager.importConfigSet({ filePath });

      expect(mockFs.existsSync).toHaveBeenCalledWith(filePath);
      expect(mockFs.promises.readFile).toHaveBeenCalledWith(filePath, 'utf8');
      expect(mockFs.promises.writeFile).toHaveBeenCalled();
      expect(result).toBe('/home/testuser/.config/xfidelity/configs/imported-config.json');
    });

    it('should use custom alias when provided', async () => {
      const filePath = '/tmp/config.json';
      const customAlias = 'custom-alias';
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfigSet));

      await configSetManager.importConfigSet({ filePath, alias: customAlias });

      const writeCall = mockFs.promises.writeFile.mock.calls[0];
      const writtenContent = JSON.parse(writeCall[1] as string);
      expect(writtenContent.alias).toBe(customAlias);
    });

    it('should throw StandardError for non-existent file', async () => {
      const filePath = '/tmp/non-existent.json';
      mockFs.existsSync.mockReturnValue(false);

      await expect(configSetManager.importConfigSet({ filePath })).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to import config set/)
      });
    });

    it('should throw StandardError for invalid JSON', async () => {
      const filePath = '/tmp/invalid.json';
      mockFs.existsSync.mockReturnValue(true);
      mockFs.promises.readFile.mockResolvedValue('invalid json');

      await expect(configSetManager.importConfigSet({ filePath })).rejects.toMatchObject({
        message: expect.stringMatching(/Failed to import config set/)
      });
    });
  });

  describe('validateConfigSet', () => {
    it('should validate correct config set', async () => {
      const validConfigSet: ConfigSet = {
        alias: 'valid-config',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        options: { archetype: 'node-fullstack' },
      };

      const result = await configSetManager.validateConfigSet(validConfigSet);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing alias', async () => {
      const invalidConfigSet = {
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        options: {},
      } as ConfigSet;

      const result = await configSetManager.validateConfigSet(invalidConfigSet);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Config set must have a valid alias');
    });

    it('should detect missing options', async () => {
      const invalidConfigSet = {
        alias: 'test',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
      } as ConfigSet;

      const result = await configSetManager.validateConfigSet(invalidConfigSet);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Config set must have options object');
    });

    it('should warn about non-saveable options', async () => {
      const configSetWithWarnings: ConfigSet = {
        alias: 'test-config',
        created: '2023-01-01T00:00:00.000Z',
        updated: '2023-01-01T00:00:00.000Z',
        options: {
          archetype: 'node-fullstack', // Valid
          customOption: 'value', // Should generate warning
        },
      };

      const result = await configSetManager.validateConfigSet(configSetWithWarnings);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Option 'customOption' is not in the list of saveable options");
    });
  });

  describe('mergeOptionsWithConfigSet', () => {
    const mockConfigSet: ConfigSet = {
      alias: 'test-config',
      created: '2023-01-01T00:00:00.000Z',
      updated: '2023-01-01T00:00:00.000Z',
      options: {
        archetype: 'base-archetype',
        openaiEnabled: false,
        extraPlugins: ['base-plugin'],
      },
    };

    it('should merge options with config set', async () => {
      mockFs.promises.readFile.mockResolvedValue(JSON.stringify(mockConfigSet));

      const directOptions = {
        archetype: 'override-archetype', // Should override config set
        telemetryCollector: 'http://example.com', // Should be added
        dir: './test', // Should be filtered out
      };

      const result = await configSetManager.mergeOptionsWithConfigSet({
        directOptions,
        configSetAlias: 'test-config',
      });

      expect(result).toEqual({
        archetype: 'override-archetype', // Overridden
        openaiEnabled: false, // From config set
        extraPlugins: ['base-plugin'], // From config set
        telemetryCollector: 'http://example.com', // Added by direct options
        // dir should be filtered out
      });
    });

    it('should return direct options when no config set specified', async () => {
      const directOptions = {
        archetype: 'test-archetype',
        openaiEnabled: true,
        dir: './test', // Should be filtered out
      };

      const result = await configSetManager.mergeOptionsWithConfigSet({
        directOptions,
      });

      expect(result).toEqual({
        archetype: 'test-archetype',
        openaiEnabled: true,
        // dir should be filtered out
      });
    });

    it('should handle non-existent config set gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const directOptions = {
        archetype: 'test-archetype',
        openaiEnabled: true,
      };

      const result = await configSetManager.mergeOptionsWithConfigSet({
        directOptions,
        configSetAlias: 'non-existent',
      });

      expect(result).toEqual({
        archetype: 'test-archetype',
        openaiEnabled: true,
      });
    });
  });

  describe('SAVEABLE_OPTIONS and TRANSIENT_OPTIONS', () => {
    it('should have correct saveable options', () => {
      const expectedSaveableOptions = [
        'configServer',
        'localConfigPath',
        'githubConfigLocation',
        'archetype',
        'openaiEnabled',
        'extraPlugins',
        'enableTreeSitterWorker',
        'enableTreeSitterWasm',
        'outputFormat',
        'telemetryCollector',
        'jsonTTL',
        'fileCacheTTL',
        'enableFileLogging',
        'wasmPath',
        'wasmLanguagesPath',
        'wasmTimeout',
      ];

      expect(SAVEABLE_OPTIONS).toEqual(expectedSaveableOptions);
    });

    it('should have correct transient options', () => {
      const expectedTransientOptions = [
        'dir',
        'zap',
        'examine',
        'help',
        'version',
        'outputFile',
        'mode',
        'port',
        'writeConfigSet',
        'readConfigSet',
      ];

      expect(TRANSIENT_OPTIONS).toEqual(expectedTransientOptions);
    });

    it('should not have overlapping options', () => {
      const saveableSet = new Set(SAVEABLE_OPTIONS);
      const transientSet = new Set(TRANSIENT_OPTIONS);
      
      for (const option of SAVEABLE_OPTIONS) {
        expect(transientSet.has(option)).toBe(false);
      }
      
      for (const option of TRANSIENT_OPTIONS) {
        expect(saveableSet.has(option)).toBe(false);
      }
    });
  });

  describe('updateSecurityAllowedPaths', () => {
    it('should add config sets directory to allowed paths', () => {
      const existingPaths = ['/tmp', '/home/user'];
      
      const result = ConfigSetManager.updateSecurityAllowedPaths(existingPaths);
      
      expect(result).toContain('/tmp');
      expect(result).toContain('/home/user');
      expect(result).toContain('/home/testuser/.config/xfidelity/configs');
      expect(result).toContain('/home/testuser');
    });
  });
});