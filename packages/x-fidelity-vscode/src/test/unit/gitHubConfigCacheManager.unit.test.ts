// Jest unit test for GitHubConfigCacheManager
import { GitHubConfigCacheManager, getGitHubConfigCacheManager, disposeGitHubConfigCacheManager } from '../../config/gitHubConfigCacheManager';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    rm: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  dirname: jest.fn((filePath) => filePath.split('/').slice(0, -1).join('/'))
}));

// Mock os module
jest.mock('os', () => ({
  homedir: jest.fn()
}));

// Mock the global logger
jest.mock('../../utils/globalLogger', () => ({
  createComponentLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock vscode module
jest.mock('vscode', () => {
  const { workspace, window, Uri, resetMockConfigStore } = jest.requireActual('../mocks/vscode.mock');
  return {
    workspace,
    window,
    Uri,
    resetMockConfigStore
  };
});

describe('GitHubConfigCacheManager Unit Tests', () => {
  let cacheManager: GitHubConfigCacheManager;
  
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockFsPromises = (fs as any).promises;
  const mockPath = path as jest.Mocked<typeof path>;
  const mockOs = os as jest.Mocked<typeof os>;

  // Mock workspace folders
  const mockWorkspaceFolder = {
    uri: vscode.Uri.file('/test/workspace'),
    name: 'test-workspace',
    index: 0
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (vscode as any).resetMockConfigStore();
    
    // Explicitly clear window mocks
    (vscode.window.showInformationMessage as jest.Mock).mockClear();
    (vscode.window.showWarningMessage as jest.Mock).mockClear();
    
    // Reset singleton
    disposeGitHubConfigCacheManager();
    
    // Setup workspace folders mock
    (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
    
    // Mock require for 'os' module (used in invalidateCentralCache)
    jest.doMock('os', () => ({
      homedir: jest.fn(() => '/test/home'),
      platform: 'linux'
    }));
    
    // Setup environment variables for central cache
    process.env.XDG_CONFIG_HOME = '/test/config';
    
    // Mock process.platform for consistency
    Object.defineProperty(process, 'platform', {
      value: 'linux'
    });
    
    // Setup default configuration mock
    const mockConfig = {
      get: jest.fn()
        .mockImplementation((key: string, defaultValue?: any) => {
          switch (key) {
            case 'githubConfigLocation':
              return '';
            case 'githubConfigUpdateFrequency':
              return 60;
            default:
              return defaultValue;
          }
        })
    };
    
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
    
    // Setup fs mocks
    mockFs.existsSync.mockReturnValue(false);
    mockFsPromises.rm.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue('{"githubConfigLocation":"","githubConfigUpdateFrequency":60}');
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    
    // Setup os mock
    mockOs.homedir.mockReturnValue('/home/user');
    
    // Setup path mocks
    mockPath.join.mockImplementation((...args) => args.join('/'));
    mockPath.dirname.mockImplementation((filePath) => 
      filePath.split('/').slice(0, -1).join('/')
    );
    
    // Setup environment variables
    process.env.XDG_CONFIG_HOME = undefined;
    process.env.APPDATA = undefined;
    
    cacheManager = new GitHubConfigCacheManager();
  });

  afterEach(() => {
    if (cacheManager) {
      cacheManager.dispose();
    }
    disposeGitHubConfigCacheManager();
  });

  describe('Constructor and Initialization', () => {
    test('should create instance and setup configuration watcher', () => {
      expect(cacheManager).toBeInstanceOf(GitHubConfigCacheManager);
      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    test('should load last known settings on initialization', () => {
      expect(mockFs.existsSync).toHaveBeenCalledWith('/test/workspace/.xfiResults/github-settings-cache.json');
    });
  });

  describe('Configuration Changes', () => {
    test('should handle GitHub config location change', async () => {
      // Clear any previous calls
      (vscode.window.showInformationMessage as jest.Mock).mockClear();
      
      // Setup: Set previous settings different from current
      cacheManager['lastKnownSettings'] = {
        githubConfigLocation: 'old-location',
        githubConfigUpdateFrequency: 60
      };

      // Setup: mock configuration change with new location
      const mockConfig = {
        get: jest.fn()
          .mockImplementation((key: string, defaultValue?: any) => {
            switch (key) {
              case 'githubConfigLocation':
                return 'https://github.com/org/repo/tree/main/config';
              case 'githubConfigUpdateFrequency':
                return 60;
              default:
                return defaultValue;
            }
          })
      };
      
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const mockConfigEvent = {
        affectsConfiguration: jest.fn()
          .mockImplementation((section: string) => 
            section === 'xfidelity.githubConfigLocation'
          )
      };

      // Simulate existing cache directory
      mockFs.existsSync.mockReturnValue(true);

      // Get the configuration change handler
      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      // Trigger configuration change
      await configChangeHandler(mockConfigEvent);

      // Verify cache invalidation occurred
      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        '/test/workspace/.xfiResults/github-configs',
        { recursive: true, force: true }
      );
      
      // Verify the core functionality: cache invalidation works when config changes
      expect(mockFsPromises.rm).toHaveBeenCalled();
    });

    test('should handle GitHub config update frequency change', async () => {
      const mockConfigEvent = {
        affectsConfiguration: jest.fn()
          .mockImplementation((section: string) => 
            section === 'xfidelity.githubConfigUpdateFrequency'
          )
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      await configChangeHandler(mockConfigEvent);

      // Should save settings but not invalidate cache (frequency change doesn't require cache invalidation)
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });

    test('should not trigger cache invalidation if config location unchanged', async () => {
      // Setup: mock previous settings that match current
      cacheManager['lastKnownSettings'] = {
        githubConfigLocation: '',
        githubConfigUpdateFrequency: 60
      };

      const mockConfigEvent = {
        affectsConfiguration: jest.fn()
          .mockImplementation((section: string) => 
            section === 'xfidelity.githubConfigLocation'
          )
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      await configChangeHandler(mockConfigEvent);

      // Should not invalidate cache since location didn't change
      expect(mockFsPromises.rm).not.toHaveBeenCalled();
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate workspace cache when location changes', async () => {
      // Setup: mock different config location
      const mockConfig = {
        get: jest.fn()
          .mockImplementation((key: string, defaultValue?: any) => {
            switch (key) {
              case 'githubConfigLocation':
                return 'https://github.com/org/repo/tree/main/config';
              case 'githubConfigUpdateFrequency':
                return 60;
              default:
                return defaultValue;
            }
          })
      };
      
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);
      
      // Set previous settings different from current
      cacheManager['lastKnownSettings'] = {
        githubConfigLocation: '',
        githubConfigUpdateFrequency: 60
      };

      mockFs.existsSync.mockReturnValue(true);

      const mockConfigEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      await configChangeHandler(mockConfigEvent);

      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        '/test/workspace/.xfiResults/github-configs',
        { recursive: true, force: true }
      );
    });

    test('should invalidate central cache on Windows', async () => {
      // Mock Windows platform
      Object.defineProperty(process, 'platform', { value: 'win32' });
      process.env.APPDATA = '/Users/test/AppData';
      
      mockFs.existsSync.mockReturnValue(true);

      await cacheManager.forceInvalidate();

      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        '/Users/test/AppData/.xfidelity/cache',
        { recursive: true, force: true }
      );
    });

    test('should invalidate central cache on Unix-like systems', async () => {
      // Mock Unix platform
      Object.defineProperty(process, 'platform', { value: 'linux' });
      process.env.XDG_CONFIG_HOME = '/home/user/.config';
      
      mockFs.existsSync.mockReturnValue(true);

      await cacheManager.forceInvalidate();

      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        '/home/user/.config/.xfidelity/cache',
        { recursive: true, force: true }
      );
    });

    test('should handle cache invalidation errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.rm.mockRejectedValue(new Error('Permission denied'));

      await cacheManager.forceInvalidate();

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Failed to clear GitHub config cache. You may need to restart VSCode for changes to take effect.'
      );
    });

    test('should skip cache invalidation when no workspace folders', async () => {
      // Remove workspace folders
      (vscode.workspace as any).workspaceFolders = [];

      await cacheManager.forceInvalidate();

      expect(mockFsPromises.rm).not.toHaveBeenCalled();
    });
  });

  describe('Settings Persistence', () => {
    test('should save current settings to file', async () => {
      const mockConfigEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      await configChangeHandler(mockConfigEvent);

      expect(mockFsPromises.writeFile).toHaveBeenCalledWith(
        '/test/workspace/.xfiResults/github-settings-cache.json',
        expect.stringContaining('"githubConfigLocation"')
      );
    });

    test('should create directory when saving settings', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const mockConfigEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      await configChangeHandler(mockConfigEvent);

      expect(mockFsPromises.mkdir).toHaveBeenCalledWith(
        '/test/workspace/.xfiResults',
        { recursive: true }
      );
    });

    test('should load existing settings from file', async () => {
      const existingSettings = {
        githubConfigLocation: 'https://github.com/org/repo/tree/main/config',
        githubConfigUpdateFrequency: 120
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(existingSettings));

      const newManager = new GitHubConfigCacheManager();

      expect(mockFsPromises.readFile).toHaveBeenCalledWith(
        '/test/workspace/.xfiResults/github-settings-cache.json',
        'utf8'
      );

      newManager.dispose();
    });

    test('should handle settings load errors gracefully', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockRejectedValue(new Error('File read error'));

      const newManager = new GitHubConfigCacheManager();

      // Should not throw error and continue with null settings
      expect(newManager).toBeInstanceOf(GitHubConfigCacheManager);

      newManager.dispose();
    });

    test('should handle settings save errors gracefully', async () => {
      mockFsPromises.writeFile.mockRejectedValue(new Error('Write error'));

      const mockConfigEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      // Should not throw error
      await expect(async () => {
        await configChangeHandler(mockConfigEvent);
      }).not.toThrow();
    });
  });

  describe('Configuration Retrieval', () => {
    test('should get current settings from workspace configuration', () => {
      const mockConfig = {
        get: jest.fn()
          .mockImplementation((key: string, defaultValue?: any) => {
            switch (key) {
              case 'githubConfigLocation':
                return 'https://github.com/org/repo/tree/main/config';
              case 'githubConfigUpdateFrequency':
                return 120;
              default:
                return defaultValue;
            }
          })
      };
      
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

      const settings = cacheManager['getCurrentSettings']();

      expect(settings).toEqual({
        githubConfigLocation: 'https://github.com/org/repo/tree/main/config',
        githubConfigUpdateFrequency: 120
      });

      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('xfidelity');
    });
  });

  describe('Disposal', () => {
    test('should dispose all event listeners', () => {
      const mockDisposable = { dispose: jest.fn() };
      cacheManager['disposables'] = [mockDisposable];

      cacheManager.dispose();

      expect(mockDisposable.dispose).toHaveBeenCalled();
      expect(cacheManager['disposables']).toHaveLength(0);
    });
  });

  describe('Singleton Management', () => {
    test('should return same instance from getGitHubConfigCacheManager', () => {
      const instance1 = getGitHubConfigCacheManager();
      const instance2 = getGitHubConfigCacheManager();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(GitHubConfigCacheManager);
    });

    test('should dispose singleton instance', () => {
      const instance = getGitHubConfigCacheManager();
      const disposeSpy = jest.spyOn(instance, 'dispose');

      disposeGitHubConfigCacheManager();

      expect(disposeSpy).toHaveBeenCalled();
    });

    test('should create new instance after disposal', () => {
      const instance1 = getGitHubConfigCacheManager();
      disposeGitHubConfigCacheManager();
      const instance2 = getGitHubConfigCacheManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle no workspace folders during initialization', () => {
      // Remove workspace folders before creating manager
      (vscode.workspace as any).workspaceFolders = undefined;

      const newManager = new GitHubConfigCacheManager();

      // Should not crash
      expect(newManager).toBeInstanceOf(GitHubConfigCacheManager);

      newManager.dispose();
    });

    test('should handle empty workspace folders array', () => {
      (vscode.workspace as any).workspaceFolders = [];

      const newManager = new GitHubConfigCacheManager();

      expect(newManager).toBeInstanceOf(GitHubConfigCacheManager);

      newManager.dispose();
    });

    test('should handle configuration changes with no previous settings', async () => {
      // Ensure no previous settings
      cacheManager['lastKnownSettings'] = null;

      const mockConfigEvent = {
        affectsConfiguration: jest.fn().mockReturnValue(true)
      };

      const configChangeHandler = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
      
      // Should not throw error and should not try to invalidate cache
      await expect(async () => {
        await configChangeHandler(mockConfigEvent);
      }).not.toThrow();
      expect(mockFsPromises.rm).not.toHaveBeenCalled();
    });

    test('should handle central cache invalidation with missing environment variables', async () => {
      // Clear environment variables
      delete process.env.XDG_CONFIG_HOME;
      delete process.env.APPDATA;
      
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockFs.existsSync.mockReturnValue(true);

      await cacheManager.forceInvalidate();

      // Should use fallback path
      expect(mockFsPromises.rm).toHaveBeenCalledWith(
        '/home/user/.config/.xfidelity/cache',
        { recursive: true, force: true }
      );
    });
  });
});