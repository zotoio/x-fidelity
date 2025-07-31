import { runMainAnalysis } from './mainAnalysis';
import { options } from './cli';
import { setOptions, ConfigSetManager } from '@x-fidelity/core';

jest.setTimeout(30000);

// Mock dependencies
jest.mock('./cli', () => ({
  options: {
    dir: '',
    archetype: '',
    configServer: undefined,
    localConfigPath: undefined,
    githubConfigLocation: undefined,
    openaiEnabled: false,
    telemetryCollector: undefined,
    mode: 'cli',
    port: undefined,
    jsonTTL: undefined,
    extraPlugins: [],
    examine: false,
    zapFiles: undefined,
    fileCacheTTL: 60,
    outputFormat: undefined,
    outputFile: undefined,
    enableTreeSitterWorker: false,
    enableTreeSitterWasm: false,
    enableFileLogging: false
  },
  DEMO_CONFIG_PATH: '/path/to/demo/config'
}));

jest.mock('@x-fidelity/core', () => ({
  setOptions: jest.fn(),
  ConfigSetManager: {
    getInstance: jest.fn()
  }
}));

jest.mock('./index', () => ({
  main: jest.fn()
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockProcessExit = jest.spyOn(process, 'exit').mockImplementation();

describe('mainAnalysis', () => {
  let mockConfigSetManager: any;
  let mockMain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConfigSetManager = {
      writeConfigSet: jest.fn(),
      mergeOptionsWithConfigSet: jest.fn()
    };

    (ConfigSetManager.getInstance as jest.MockedFunction<any>)
      .mockReturnValue(mockConfigSetManager);

    mockMain = jest.fn();
    jest.doMock('./index', () => ({ main: mockMain }));

    // Reset options
    Object.assign(options, {
      dir: '',
      archetype: '',
      configServer: undefined,
      localConfigPath: undefined,
      githubConfigLocation: undefined,
      openaiEnabled: false,
      telemetryCollector: undefined,
      mode: 'cli',
      port: undefined,
      jsonTTL: undefined,
      extraPlugins: [],
      examine: false,
      zapFiles: undefined,
      fileCacheTTL: 60,
      outputFormat: undefined,
      outputFile: undefined,
      enableTreeSitterWorker: false,
      enableTreeSitterWasm: false,
      enableFileLogging: false
    });
  });

  describe('config set write operations', () => {
    it('should write config set with default alias', async () => {
      const mockOpts = { writeConfigSet: true, archetype: 'test-archetype' };
      mockConfigSetManager.writeConfigSet.mockResolvedValue('/path/to/config');

      await runMainAnalysis('.', mockOpts);

      expect(mockConfigSetManager.writeConfigSet).toHaveBeenCalledWith({
        alias: 'default',
        options: mockOpts,
        description: expect.stringContaining('Config set created from CLI on')
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Writing config set: default');
      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Config set 'default' saved successfully!");
    });

    it('should write config set with custom alias', async () => {
      const mockOpts = { writeConfigSet: 'custom-alias', archetype: 'test-archetype' };
      mockConfigSetManager.writeConfigSet.mockResolvedValue('/path/to/config');

      await runMainAnalysis('.', mockOpts);

      expect(mockConfigSetManager.writeConfigSet).toHaveBeenCalledWith({
        alias: 'custom-alias',
        options: mockOpts,
        description: expect.stringContaining('Config set created from CLI on')
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('📝 Writing config set: custom-alias');
    });

    it('should handle config set write errors', async () => {
      const mockOpts = { writeConfigSet: 'test-alias' };
      const error = new Error('Write failed');
      mockConfigSetManager.writeConfigSet.mockRejectedValue(error);

      await runMainAnalysis('.', mockOpts);

      expect(mockConsoleError).toHaveBeenCalledWith("❌ Failed to write config set 'test-alias':");
      expect(mockConsoleError).toHaveBeenCalledWith('   Write failed');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should return early after writing config set', async () => {
      const mockOpts = { writeConfigSet: true };
      mockConfigSetManager.writeConfigSet.mockResolvedValue('/path/to/config');

      await runMainAnalysis('.', mockOpts);

      expect(mockMain).not.toHaveBeenCalled();
    });
  });

  describe('config set read operations', () => {
    it('should read config set with default alias', async () => {
      const mockOpts = { readConfigSet: true, archetype: 'original' };
      const mergedOpts = { ...mockOpts, archetype: 'merged' };
      mockConfigSetManager.mergeOptionsWithConfigSet.mockResolvedValue(mergedOpts);

      await runMainAnalysis('.', mockOpts);

      expect(mockConfigSetManager.mergeOptionsWithConfigSet).toHaveBeenCalledWith({
        directOptions: mockOpts,
        configSetAlias: 'default'
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('📖 Loading config set: default');
      expect(mockConsoleLog).toHaveBeenCalledWith("✅ Config set 'default' loaded successfully!");
    });

    it('should read config set with custom alias', async () => {
      const mockOpts = { readConfigSet: 'custom-alias' };
      const mergedOpts = { ...mockOpts };
      mockConfigSetManager.mergeOptionsWithConfigSet.mockResolvedValue(mergedOpts);

      await runMainAnalysis('.', mockOpts);

      expect(mockConfigSetManager.mergeOptionsWithConfigSet).toHaveBeenCalledWith({
        directOptions: mockOpts,
        configSetAlias: 'custom-alias'
      });
    });

    it('should handle config set read errors', async () => {
      const mockOpts = { readConfigSet: 'missing-alias' };
      const error = new Error('Config set not found');
      mockConfigSetManager.mergeOptionsWithConfigSet.mockRejectedValue(error);

      await runMainAnalysis('.', mockOpts);

      expect(mockConsoleError).toHaveBeenCalledWith("❌ Failed to load config set 'missing-alias':");
      expect(mockConsoleError).toHaveBeenCalledWith('   Config set not found');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('zap files parsing', () => {
    it('should parse valid zap files JSON', async () => {
      const zapFiles = ['file1.ts', 'file2.ts'];
      const mockOpts = { zap: JSON.stringify(zapFiles) };

      await runMainAnalysis('.', mockOpts);

      expect(options.zapFiles).toEqual(zapFiles);
      expect(setOptions).toHaveBeenCalledWith(
        expect.objectContaining({ zapFiles })
      );
    });

    it('should handle invalid zap files JSON', async () => {
      const mockOpts = { zap: 'invalid-json' };

      await runMainAnalysis('.', mockOpts);

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON in --zap option:')
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it('should handle non-array zap files', async () => {
      const mockOpts = { zap: '"not-an-array"' };

      await runMainAnalysis('.', mockOpts);

      expect(mockConsoleError).toHaveBeenCalledWith(
        '--zap option must be a JSON array of file paths'
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });

  describe('options merging and updating', () => {
    it('should update global options with provided values', async () => {
      const mockOpts = {
        archetype: 'custom-archetype',
        configServer: 'https://config.example.com',
        localConfigPath: '/custom/config',
        openaiEnabled: true,
        mode: 'server',
        port: '3000',
        enableFileLogging: true
      };

      await runMainAnalysis('/custom/dir', mockOpts);

      expect(options).toMatchObject({
        dir: '/custom/dir',
        archetype: 'custom-archetype',
        configServer: 'https://config.example.com',
        localConfigPath: '/custom/config',
        openaiEnabled: true,
        mode: 'server',
        port: 3000,
        enableFileLogging: true
      });
    });

    it('should use default values for undefined options', async () => {
      const mockOpts = {};

      await runMainAnalysis('.', mockOpts);

      expect(options).toMatchObject({
        dir: '.',
        archetype: 'node-fullstack',
        openaiEnabled: false,
        mode: 'cli',
        extraPlugins: [],
        fileCacheTTL: 60,
        enableTreeSitterWorker: false,
        enableTreeSitterWasm: false,
        enableFileLogging: false
      });
    });

    it('should parse numeric options correctly', async () => {
      const mockOpts = {
        port: '8080',
        fileCacheTTL: '120'
      };

      await runMainAnalysis('.', mockOpts);

      expect(options.port).toBe(8080);
      expect(options.fileCacheTTL).toBe(120);
    });

    it('should call setOptions with core options', async () => {
      const mockOpts = {
        archetype: 'test-archetype',
        configServer: 'https://test.com',
        openaiEnabled: true
      };

      await runMainAnalysis('/test/dir', mockOpts);

      expect(setOptions).toHaveBeenCalledWith({
        dir: '/test/dir',
        archetype: 'test-archetype',
        configServer: 'https://test.com',
        localConfigPath: undefined,
        githubConfigLocation: undefined,
        openaiEnabled: true,
        telemetryCollector: undefined,
        mode: 'cli',
        port: undefined,
        jsonTTL: undefined,
        extraPlugins: [],
        enableTreeSitterWorker: false,
        enableTreeSitterWasm: false,
        zapFiles: undefined,
        fileCacheTTL: 60,
        outputFormat: undefined,
        outputFile: undefined,
        enableFileLogging: false
      });
    });
  });

  describe('main analysis execution', () => {
    beforeEach(() => {
      // Reset the mock before each test
      jest.resetModules();
    });

    it('should call main with skipCLIInit=true', async () => {
      const mockOpts = {};
      
      // We need to dynamically import and mock the main function
      const mockMainFunction = jest.fn();
      jest.doMock('./index', () => ({
        main: mockMainFunction
      }));

      await runMainAnalysis('.', mockOpts);

      expect(mockMainFunction).toHaveBeenCalledWith(true);
    });

    it('should handle merged options from config set', async () => {
      const directOpts = { archetype: 'original' };
      const mergedOpts = { 
        archetype: 'merged-archetype',
        configServer: 'https://merged.com',
        dir: '/merged/dir'
      };
      
      mockConfigSetManager.mergeOptionsWithConfigSet.mockResolvedValue(mergedOpts);

      const mockMainFunction = jest.fn();
      jest.doMock('./index', () => ({
        main: mockMainFunction
      }));

      await runMainAnalysis('.', { ...directOpts, readConfigSet: 'test-alias' });

      expect(options).toMatchObject({
        dir: '/merged/dir',
        archetype: 'merged-archetype',
        configServer: 'https://merged.com'
      });

      expect(mockMainFunction).toHaveBeenCalledWith(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty directory parameter', async () => {
      const mockOpts = {};

      await runMainAnalysis('', mockOpts);

      expect(options.dir).toBe('.');
    });

    it('should handle undefined directory parameter', async () => {
      const mockOpts = {};

      await runMainAnalysis(undefined as any, mockOpts);

      expect(options.dir).toBe('.');
    });

    it('should use directory from options if provided', async () => {
      const mockOpts = { dir: '/opts/dir' };

      await runMainAnalysis('/param/dir', mockOpts);

      expect(options.dir).toBe('/opts/dir');
    });

    it('should handle non-Error exceptions in config set operations', async () => {
      const mockOpts = { writeConfigSet: true };
      mockConfigSetManager.writeConfigSet.mockRejectedValue('String error');

      await runMainAnalysis('.', mockOpts);

      expect(mockConsoleError).toHaveBeenCalledWith('   Unknown error');
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });
  });
});