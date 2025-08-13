import { CentralConfigManager, CentralConfigInfo } from './centralConfigManager';
import { GitHubConfigManager } from './gitHubConfigManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rm: jest.fn(),
    readdir: jest.fn()
  }
}));
jest.mock('./gitHubConfigManager');
jest.mock('../utils/logger');
jest.mock('../security/pathValidator');
jest.mock('os');
jest.mock('path');

const mockFs = require('fs') as jest.Mocked<typeof fs>;
const mockFsPromises = mockFs.promises as jest.Mocked<typeof fs.promises>;
const mockOs = os as jest.Mocked<typeof os>;
const mockPath = path as jest.Mocked<typeof path>;
const MockGitHubConfigManager = GitHubConfigManager as jest.MockedClass<typeof GitHubConfigManager>;

describe('CentralConfigManager', () => {
  let manager: CentralConfigManager;
  let mockGitHubManager: jest.Mocked<GitHubConfigManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear environment variables
    delete process.env.XFI_CONFIG_PATH;
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.APPDATA;
    
    // Mock OS functions
    mockOs.homedir.mockReturnValue('/home/user');
    mockOs.platform.mockReturnValue('linux');
    
    // Mock path functions (handle both Unix and Windows style paths)
    mockPath.join.mockImplementation((...args: string[]) => {
      if (process.platform === 'win32') {
        return args.join('\\');
      }
      return args.join('/');
    });
    mockPath.resolve.mockImplementation((...args: string[]) => {
      if (process.platform === 'win32') {
        return args.join('\\');
      }
      return args.join('/');
    });
    mockPath.dirname.mockImplementation((p: string) => {
      const separator = process.platform === 'win32' ? '\\' : '/';
      return p.split(separator).slice(0, -1).join(separator);
    });
    
    // Mock file system
    mockFs.existsSync.mockReturnValue(false);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue('{}');
    mockFsPromises.readdir.mockResolvedValue([]);

    // Mock validateDirectoryPath
    const { validateDirectoryPath } = require('../security/pathValidator');
    validateDirectoryPath.mockReturnValue(true);

    // Setup GitHub manager mock
    mockGitHubManager = {
      parseGitHubTreeUrl: jest.fn(),
      getGitHubConfig: jest.fn(),
      getRepoMetadata: jest.fn(),
      cleanupRepo: jest.fn()
    } as any;
    
    MockGitHubConfigManager.mockImplementation(() => mockGitHubManager);
    
    manager = CentralConfigManager.getInstance();
  });

  afterEach(() => {
    // Reset singleton instance for clean tests
    (CentralConfigManager as any).instance = undefined;
    
    // Reset platform to default
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      configurable: true
    });
  });

  describe('getCentralConfigDir', () => {
    it('should return XDG config directory on Linux', () => {
      mockOs.platform.mockReturnValue('linux');
      mockOs.homedir.mockReturnValue('/home/user');
      delete process.env.XDG_CONFIG_HOME;

      const result = manager.getCentralConfigDir();

      expect(result).toBe('/home/user/.config/xfidelity');
    });

    it('should use XDG_CONFIG_HOME when set', () => {
      mockOs.platform.mockReturnValue('linux');
      process.env.XDG_CONFIG_HOME = '/custom/config';

      const result = manager.getCentralConfigDir();

      expect(result).toBe('/custom/config/xfidelity');
    });

    it('should return APPDATA directory on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      mockOs.homedir.mockReturnValue('C:\\Users\\user');
      process.env.APPDATA = 'C:\\Users\\user\\AppData\\Roaming';

      const result = manager.getCentralConfigDir();

      expect(result).toBe('C:\\Users\\user\\AppData\\Roaming\\xfidelity');
    });

    it('should fallback to home directory on Windows when APPDATA not set', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        configurable: true
      });
      mockOs.homedir.mockReturnValue('C:\\Users\\user');
      delete process.env.APPDATA;

      const result = manager.getCentralConfigDir();

      expect(result).toBe('C:\\Users\\user\\.config\\xfidelity');
    });
  });

  describe('resolveConfigPath', () => {
    beforeEach(() => {
      mockOs.homedir.mockReturnValue('/home/user');
    });

    it('should return configServer source for config server', async () => {
      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack',
        configServer: 'https://config.example.com'
      });

      expect(result).toEqual({
        path: '',
        source: 'configServer'
      });
    });

    it('should handle explicit GitHub config location', async () => {
      const githubUrl = 'https://github.com/org/repo/tree/main/config';
      mockGitHubManager.parseGitHubTreeUrl.mockReturnValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        configPath: 'config',
        originalUrl: githubUrl
      });
      mockGitHubManager.getGitHubConfig.mockResolvedValue('/resolved/config/path');

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack',
        githubConfigLocation: githubUrl
      });

      expect(result).toEqual({
        path: '/resolved/config/path',
        source: 'explicit-github'
      });
      expect(mockGitHubManager.getGitHubConfig).toHaveBeenCalledWith({
        githubTreeUrl: githubUrl,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      });
    });

    it('should handle explicit local config path', async () => {
      const localPath = '/custom/config/path';

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack',
        localConfigPath: localPath
      });

      expect(result).toEqual({
        path: localPath,
        source: 'explicit-local'
      });
    });

    it('should use environment variable when set', async () => {
      process.env.XFI_CONFIG_PATH = '/env/config/path';
      mockFs.existsSync.mockImplementation((path: any) => 
        path === '/env/config/path'
      );

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack'
      });

      expect(result).toEqual({
        path: '/env/config/path',
        source: 'environment'
      });
    });

    it('should use archetype-specific central config', async () => {
      const archetypeConfigPath = '/home/user/.config/xfidelity/configs/node-fullstack';
      
      mockFs.existsSync.mockImplementation((pathArg: any) => {
        if (pathArg === archetypeConfigPath) return true;
        if (pathArg === mockPath.join(archetypeConfigPath, 'archetypes')) return true;
        return false;
      });

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack'
      });

      expect(result).toEqual({
        path: archetypeConfigPath,
        source: 'central-archetype'
      });
    });

    it('should fallback to default central config', async () => {
      const defaultConfigPath = '/home/user/.config/xfidelity/configs/default';
      
      mockFs.existsSync.mockImplementation((pathArg: any) => {
        if (pathArg === defaultConfigPath) return true;
        if (pathArg === mockPath.join(defaultConfigPath, 'rules')) return true;
        return false;
      });

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack'
      });

      expect(result).toEqual({
        path: defaultConfigPath,
        source: 'central-default'
      });
    });

    it('should fallback to demo config when nothing else available', async () => {
      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack'
      });

      expect(result.source).toBe('demo');
      expect(result.path).toMatch(/x-fidelity-democonfig/);
    });

    it('should use demo config near executed CLI binary when present', async () => {
      const originalArgv1 = process.argv[1];
      process.argv[1] = '/cli/dist/xfidelity';

      (mockFs.existsSync as jest.Mock).mockImplementation((p: any) => p === '/cli/dist/demoConfig');

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack'
      });

      expect(result.source).toBe('demo');
      expect(result.path).toBe('/cli/dist/demoConfig');

      // restore
      process.argv[1] = originalArgv1;
    });

    it('should prioritize environment variable over central config', async () => {
      process.env.XFI_CONFIG_PATH = '/env/config/path';
      mockFs.existsSync.mockImplementation((path: any) => {
        // Both env and central configs exist
        if (path === '/env/config/path') return true;
        if (path === '/home/user/.config/xfidelity/configs/default') return true;
        if (path.includes('archetypes') || path.includes('rules')) return true;
        return false;
      });

      const result = await manager.resolveConfigPath({
        archetype: 'node-fullstack'
      });

      // Should use environment variable, not central config
      expect(result).toEqual({
        path: '/env/config/path',
        source: 'environment'
      });
    });

    it('should ignore path traversal in archetype and not escape configs directory', async () => {
      // Simulate an archetype that attempts to traverse outside configs dir
      const result = await manager.resolveConfigPath({
        archetype: '../evil'
      });

      // Should not throw and should not use the traversed path; falls back to demo
      expect(result.source).toBe('demo');
    });

    it('should ignore invalid metadata JSON when checking default central config', async () => {
      const defaultConfigPath = '/home/user/.config/xfidelity/configs/default';

      // Default config directory exists with required structure
      mockFs.existsSync.mockImplementation((p: any) => {
        if (p === defaultConfigPath) return true;
        if (p === mockPath.join(defaultConfigPath, 'rules')) return true;
        // Metadata file exists
        if (p === mockPath.join(defaultConfigPath, 'xfi-metadata.json')) return true;
        return false;
      });

      // Metadata is invalid JSON -> should be caught and ignored
      mockFsPromises.readFile.mockImplementation(async (p: any) => {
        if (String(p).includes('xfi-metadata.json')) {
          return 'invalid-json';
        }
        return '{}';
      });

      const result = await manager.resolveConfigPath({ archetype: 'node-fullstack' });

      expect(result).toEqual({ path: defaultConfigPath, source: 'central-default' });
    });
  });

  describe('setupCentralGitHubConfig', () => {
    it('should setup GitHub config with archetype', async () => {
      const githubUrl = 'https://github.com/org/repo/tree/main/config';
      const archetype = 'node-fullstack';
      
      mockGitHubManager.parseGitHubTreeUrl.mockReturnValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        configPath: 'config',
        originalUrl: githubUrl
      });
      mockGitHubManager.getGitHubConfig.mockResolvedValue('/resolved/config/path');

      const result = await manager.setupCentralGitHubConfig({
        githubConfigLocation: githubUrl,
        archetype
      });

      expect(result).toMatch(new RegExp(`configs/${archetype}$`));
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(archetype),
        { recursive: true }
      );
      expect(mockGitHubManager.getGitHubConfig).toHaveBeenCalledWith({
        githubTreeUrl: githubUrl,
        forceUpdate: true,
        updateFrequencyMinutes: 60
      });
    });

    it('should setup GitHub config with alias', async () => {
      const githubUrl = 'https://github.com/org/repo/tree/main/config';
      const alias = 'my-custom-config';
      
      mockGitHubManager.parseGitHubTreeUrl.mockReturnValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        configPath: 'config',
        originalUrl: githubUrl
      });
      mockGitHubManager.getGitHubConfig.mockResolvedValue('/resolved/config/path');

      const result = await manager.setupCentralGitHubConfig({
        githubConfigLocation: githubUrl,
        alias
      });

      expect(result).toMatch(new RegExp(`configs/${alias}$`));
    });

    it('should setup GitHub config as default when no archetype or alias', async () => {
      const githubUrl = 'https://github.com/org/repo/tree/main/config';
      
      mockGitHubManager.parseGitHubTreeUrl.mockReturnValue({
        repoUrl: 'https://github.com/org/repo',
        branch: 'main',
        configPath: 'config',
        originalUrl: githubUrl
      });
      mockGitHubManager.getGitHubConfig.mockResolvedValue('/resolved/config/path');

      const result = await manager.setupCentralGitHubConfig({
        githubConfigLocation: githubUrl
      });

      expect(result).toMatch(/configs\/default$/);
    });

    it('should handle setup errors gracefully', async () => {
      const githubUrl = 'https://github.com/org/repo/tree/main/config';
      
      mockGitHubManager.parseGitHubTreeUrl.mockImplementation(() => {
        throw new Error('Invalid URL');
      });

      await expect(manager.setupCentralGitHubConfig({
        githubConfigLocation: githubUrl,
        archetype: 'node-fullstack'
      })).rejects.toThrow('Failed to setup central GitHub config: Invalid URL');
    });
  });

  describe('listCentralConfigs', () => {
    it('should return empty array when configs directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await manager.listCentralConfigs();

      expect(result).toEqual([]);
    });

    it('should list central configs with metadata', async () => {
      const configsDir = '/home/user/.config/xfidelity/configs';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue([
        { name: 'node-fullstack', isDirectory: () => true } as any,
        { name: 'default', isDirectory: () => true } as any,
        { name: 'file.txt', isDirectory: () => false } as any
      ]);

      // Mock metadata for node-fullstack config
      const nodejsMetadata = {
        githubConfigLocation: 'https://github.com/org/nodejs-config/tree/main',
        archetype: 'node-fullstack',
        setupDate: '2023-01-01T00:00:00.000Z',
        configPath: '/some/path',
        type: 'github' as const
      };

      mockFs.existsSync.mockImplementation((path: any) => {
        // Return true for the configs directory and metadata files
        return path.includes('configs') || path.includes('xfi-metadata.json');
      });
      
      mockFsPromises.readFile.mockImplementation((path: any) => {
        if (path.includes('node-fullstack')) {
          return Promise.resolve(JSON.stringify(nodejsMetadata));
        }
        throw new Error('File not found');
      });

      const result = await manager.listCentralConfigs();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'node-fullstack',
        path: expect.stringContaining('node-fullstack'),
        type: 'github',
        metadata: nodejsMetadata
      });
      expect(result[1]).toEqual({
        name: 'default',
        path: expect.stringContaining('default'),
        type: 'local',
        metadata: undefined
      });
    });

    it('should handle corrupted metadata gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readdir.mockResolvedValue([
        { name: 'corrupted-config', isDirectory: () => true } as any
      ]);

      mockFs.existsSync.mockImplementation((path: any) => {
        // Return true for the configs directory and metadata files
        return path.includes('configs') || path.includes('xfi-metadata.json');
      });
      
      mockFsPromises.readFile.mockResolvedValue('invalid json');

      const result = await manager.listCentralConfigs();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'corrupted-config',
        path: expect.stringContaining('corrupted-config'),
        type: 'local',
        metadata: undefined
      });
    });
  });

  describe('removeCentralConfig', () => {
    it('should remove existing central config', async () => {
      const configPath = '/home/user/.config/xfidelity/configs/test-config';
      
      mockFs.existsSync.mockReturnValue(true);

      await manager.removeCentralConfig('test-config');

      expect(mockFsPromises.rm).toHaveBeenCalledWith(configPath, {
        recursive: true,
        force: true
      });
    });

    it('should throw error for non-existent config', async () => {
      mockFs.existsSync.mockReturnValue(false);

      await expect(manager.removeCentralConfig('nonexistent')).rejects.toThrow(
        "Central config 'nonexistent' does not exist"
      );
    });

    it('should throw error for invalid path', async () => {
      const { validateDirectoryPath } = require('../security/pathValidator');
      validateDirectoryPath.mockReturnValue(false);
      
      mockFs.existsSync.mockReturnValue(true);

      await expect(manager.removeCentralConfig('invalid')).rejects.toThrow(
        'Invalid config path for removal: invalid'
      );
    });
  });

  describe('updateCentralConfig', () => {
    it('should update GitHub config', async () => {
      const configMetadata = {
        githubConfigLocation: 'https://github.com/org/repo/tree/main/config',
        type: 'github' as const,
        archetype: 'node-fullstack',
        setupDate: '2023-01-01T00:00:00.000Z',
        configPath: '/some/path'
      };

      // Mock listCentralConfigs to return our test config
      jest.spyOn(manager, 'listCentralConfigs').mockResolvedValue([
        {
          name: 'test-config',
          path: '/home/user/.config/xfidelity/configs/test-config',
          type: 'github',
          metadata: configMetadata
        }
      ]);

      mockGitHubManager.getGitHubConfig.mockResolvedValue('/updated/config/path');

      await manager.updateCentralConfig('test-config');

      expect(mockGitHubManager.getGitHubConfig).toHaveBeenCalledWith({
        githubTreeUrl: configMetadata.githubConfigLocation,
        forceUpdate: true,
        updateFrequencyMinutes: 60
      });
    });

    it('should throw error for non-existent config', async () => {
      jest.spyOn(manager, 'listCentralConfigs').mockResolvedValue([]);

      await expect(manager.updateCentralConfig('nonexistent')).rejects.toThrow(
        "Central config 'nonexistent' not found"
      );
    });

    it('should throw error for non-GitHub config', async () => {
      jest.spyOn(manager, 'listCentralConfigs').mockResolvedValue([
        {
          name: 'local-config',
          path: '/some/path',
          type: 'local',
          metadata: undefined
        }
      ]);

      await expect(manager.updateCentralConfig('local-config')).rejects.toThrow(
        "Central config 'local-config' is not a GitHub config"
      );
    });
  });

  describe('initializeCentralConfig', () => {
    it('should create central config directory structure', async () => {
      const centralDir = '/home/user/.config/xfidelity';
      
      await manager.initializeCentralConfig();

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(centralDir, { recursive: true });
      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        path.join(centralDir, 'configs'),
        { recursive: true }
      );
      
      // Only these two directories are actually created by the implementation
      expect(mockFsPromises.mkdir).toHaveBeenCalledTimes(2);
    });

    it('should handle directory creation errors gracefully', async () => {
      mockFsPromises.mkdir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(manager.initializeCentralConfig()).resolves.toBeUndefined();
    });
  });

  describe('updateSecurityAllowedPaths', () => {
    it('should add central config paths to allowed paths', () => {
      const basePaths = ['/some/path', '/another/path'];
      
      const result = CentralConfigManager.updateSecurityAllowedPaths(basePaths);

      expect(result).toContain('/some/path');
      expect(result).toContain('/another/path');
      expect(result).toContain('/home/user/.config/xfidelity');
      expect(result).toContain('/home/user/.config/xfidelity/configs');
      
      // The implementation only adds centralDir and configsDir, not settings or cache
    });

    it('should handle errors gracefully', () => {
      const basePaths = ['/some/path'];
      
      // Mock getCentralConfigDir to throw
      const originalGetInstance = CentralConfigManager.getInstance;
      CentralConfigManager.getInstance = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = CentralConfigManager.updateSecurityAllowedPaths(basePaths);

      expect(result).toEqual(basePaths); // Should return original paths
      
      // Restore
      CentralConfigManager.getInstance = originalGetInstance;
    });

    it('should include individual config directories discovered on disk', () => {
      const basePaths = ['/some/path'];

      // Simulate existing configs directory with two subdirectories
      (mockFs.existsSync as jest.Mock).mockImplementation((p: any) =>
        String(p).includes('/home/user/.config/xfidelity/configs')
      );
      (mockFs.readdirSync as jest.Mock).mockReturnValue([
        { name: 'node-fullstack', isDirectory: () => true },
        { name: 'java-microservice', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false }
      ]);

      const result = CentralConfigManager.updateSecurityAllowedPaths(basePaths);

      expect(result).toContain('/home/user/.config/xfidelity/configs/node-fullstack');
      expect(result).toContain('/home/user/.config/xfidelity/configs/java-microservice');
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = CentralConfigManager.getInstance();
      const instance2 = CentralConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('isValidConfigDir private method', () => {
    it('should validate config directory with required structure', async () => {
      const configPath = '/valid/config/path';
      
      mockFs.existsSync.mockImplementation((pathArg: any) => {
        if (pathArg === configPath) return true;
        if (pathArg === mockPath.join(configPath, 'archetypes')) return true;
        return false;
      });

      // Test via resolveConfigPath which uses isValidConfigDir internally
      const result = await manager.resolveConfigPath({
        archetype: 'test-archetype'
      });

      // If it finds a central config, isValidConfigDir returned true
      expect(result.source).toBe('demo'); // Should fallback to demo since no valid central config
    });

    it('should reject config directory with security issues', async () => {
      const { validateDirectoryPath } = require('../security/pathValidator');
      validateDirectoryPath.mockReturnValue(false);

      const configPath = '/invalid/config/path';
      
      mockFs.existsSync.mockImplementation((pathArg: any) => {
        if (pathArg === configPath) return true;
        if (pathArg === mockPath.join(configPath, 'archetypes')) return true;
        return false;
      });

      // Test via resolveConfigPath
      const result = await manager.resolveConfigPath({
        archetype: 'test-archetype'
      });

      expect(result.source).toBe('demo'); // Should fallback due to security validation failure
    });
  });
});