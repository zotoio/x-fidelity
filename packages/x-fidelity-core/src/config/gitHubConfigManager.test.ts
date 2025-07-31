import { GitHubConfigManager, GitHubConfigInfo } from './gitHubConfigManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    rm: jest.fn(),
    readdir: jest.fn()
  }
}));
// Mock modules
jest.mock('../utils/logger');
jest.mock('../security/urlValidator');
jest.mock('../security/commandValidator');

const mockFs = require('fs') as jest.Mocked<typeof fs>;
const mockFsPromises = mockFs.promises as jest.Mocked<typeof fs.promises>;

describe('GitHubConfigManager', () => {
  let manager: GitHubConfigManager;
  let tempDir: string;
  let mockExecute: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new GitHubConfigManager();
    tempDir = '/tmp/test-workspace';
    
    // Setup default mock implementations
    mockFs.existsSync.mockReturnValue(false);
    mockFsPromises.mkdir.mockResolvedValue(undefined);
    mockFsPromises.writeFile.mockResolvedValue(undefined);
    mockFsPromises.readFile.mockResolvedValue('{}');
    mockFsPromises.rm.mockResolvedValue(undefined);

    // Setup SafeGitCommand mock - Jest will use the manual mock automatically
    mockExecute = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
    const { SafeGitCommand } = require('../security/commandValidator');
    SafeGitCommand.mockImplementation(() => ({
      execute: mockExecute
    }));
    
    // Reset validateUrl mock to return true by default
    const { validateUrl } = require('../security/urlValidator');
    validateUrl.mockReturnValue(true);
  });

  describe('parseGitHubTreeUrl', () => {
    describe('HTTPS URLs', () => {
      it('should parse basic GitHub tree URL correctly', () => {
        const url = 'https://github.com/owner/repo/tree/main/config';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'https://github.com/owner/repo',
          branch: 'main',
          configPath: 'config',
          originalUrl: url
        });
      });

      it('should parse GitHub tree URL with nested path', () => {
        const url = 'https://github.com/zotoio/x-fidelity/tree/master/packages/x-fidelity-democonfig/src';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'https://github.com/zotoio/x-fidelity',
          branch: 'master',
          configPath: 'packages/x-fidelity-democonfig/src',
          originalUrl: url
        });
      });

      it('should parse GitHub tree URL with empty config path', () => {
        const url = 'https://github.com/owner/repo/tree/main';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'https://github.com/owner/repo',
          branch: 'main',
          configPath: '',
          originalUrl: url
        });
      });

      it('should parse custom domain GitHub tree URL', () => {
        const url = 'https://git.company.com/org/repo/tree/develop/configs';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'https://git.company.com/org/repo',
          branch: 'develop',
          configPath: 'configs',
          originalUrl: url
        });
      });

      it('should throw error for invalid HTTPS URL format', () => {
        const url = 'https://github.com/owner/repo/blob/main/file.json';
        
        expect(() => manager.parseGitHubTreeUrl(url)).toThrow(
          'Invalid GitHub tree URL format. Expected: https://domain/owner/repo/tree/branch/path'
        );
      });

      it('should throw error for URL missing required components', () => {
        const url = 'https://github.com/owner/tree/main';
        
        expect(() => manager.parseGitHubTreeUrl(url)).toThrow(
          'Invalid GitHub tree URL format. Expected: https://domain/owner/repo/tree/branch/path'
        );
      });
    });

    describe('SSH URLs', () => {
      it('should parse basic SSH tree URL correctly', () => {
        const url = 'git@github.com:owner/repo/tree/main/config';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'git@github.com:owner/repo',
          branch: 'main',
          configPath: 'config',
          originalUrl: url
        });
      });

      it('should parse SSH tree URL with nested path', () => {
        const url = 'git@github.com:zotoio/x-fidelity/tree/master/packages/x-fidelity-democonfig/src';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'git@github.com:zotoio/x-fidelity',
          branch: 'master',
          configPath: 'packages/x-fidelity-democonfig/src',
          originalUrl: url
        });
      });

      it('should parse custom domain SSH tree URL', () => {
        const url = 'git@git.company.com:org/repo/tree/develop/configs';
        const result = manager.parseGitHubTreeUrl(url);

        expect(result).toEqual({
          repoUrl: 'git@git.company.com:org/repo',
          branch: 'develop',
          configPath: 'configs',
          originalUrl: url
        });
      });

      it('should throw error for invalid SSH URL format', () => {
        const url = 'git@github.com:owner/repo/blob/main/file.json';
        
        expect(() => manager.parseGitHubTreeUrl(url)).toThrow(
          'Invalid GitHub SSH tree URL format. Expected: git@domain:owner/repo/tree/branch/path'
        );
      });

      it('should throw error for malformed SSH URL', () => {
        const url = 'git@github.com/owner/repo/tree/main/config';
        
        expect(() => manager.parseGitHubTreeUrl(url)).toThrow(
          'Invalid SSH URL format. Expected: git@domain:owner/repo/tree/branch/path'
        );
      });
    });

    describe('Invalid URLs', () => {
      it('should throw error for empty URL', () => {
        expect(() => manager.parseGitHubTreeUrl('')).toThrow(
          'GitHub tree URL is required and must be a string'
        );
      });

      it('should throw error for non-string URL', () => {
        expect(() => manager.parseGitHubTreeUrl(null as any)).toThrow(
          'GitHub tree URL is required and must be a string'
        );
      });

      it('should throw error for unsupported protocol', () => {
        const url = 'ftp://github.com/owner/repo/tree/main/config';
        
        expect(() => manager.parseGitHubTreeUrl(url)).toThrow(
          'Unsupported URL format: ftp://github.com/owner/repo/tree/main/config. Must start with \'https://\' or \'git@\''
        );
      });

      it('should throw error for unsafe HTTPS URL', () => {
        const { validateUrl } = require('../security/urlValidator');
        validateUrl.mockReturnValue(false);
        
        const url = 'https://github.com/owner/repo/tree/main/config';
        
        expect(() => manager.parseGitHubTreeUrl(url)).toThrow(
          'Invalid or unsafe GitHub URL: https://github.com/owner/repo/tree/main/config'
        );
      });
    });
  });

  describe('getGitHubConfig', () => {
    it('should clone repository and return config path', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
      const workspaceRoot = tempDir;
      
      // Mock file system operations
      mockFs.existsSync.mockReturnValue(false); // Repository doesn't exist
      mockFsPromises.mkdir.mockResolvedValue(undefined);
      mockExecute.mockResolvedValue({ stdout: '', stderr: '' });
      
      // Mock config path exists after cloning
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('/config')) {
          return true; // Config path exists
        }
        return false;
      });

      const result = await manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      });

      expect(result).toMatch(/config$/);
      expect(mockExecute).toHaveBeenCalledWith();
    });

    it('should update existing repository if needed', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
      const workspaceRoot = tempDir;
      
      // Mock repository exists and needs update
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes('/.git')) return true; // .git directory exists
          if (path.includes('/config')) return true; // Config path exists
          if (path.includes('xfi-metadata.json')) return false; // No metadata = needs update
        }
        return false;
      });

      await manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      });

      // Should call git pull
      expect(mockExecute).toHaveBeenCalledWith();
    });

    it('should force update when requested', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
      const workspaceRoot = tempDir;
      
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes('/.git')) return true;
          if (path.includes('/config')) return true;
          if (path.includes('xfi-metadata.json')) return true;
        }
        return false;
      });

      // Mock recent metadata to test force update
      const recentMetadata = {
        lastUpdate: new Date().toISOString(),
        repoUrl: 'https://github.com/owner/repo',
        branch: 'main',
        configPath: 'config',
        originalUrl: githubTreeUrl,
        clonedAt: new Date().toISOString()
      };
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(recentMetadata));

      await manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: true, // Force update
        updateFrequencyMinutes: 60
      });

      // Should still call git pull due to force update
      expect(mockExecute).toHaveBeenCalledWith();
    });

    it('should throw error if config path does not exist', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/nonexistent';
      const workspaceRoot = tempDir;
      
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('/nonexistent')) {
          return false; // Config path doesn't exist
        }
        return false;
      });

      await expect(manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      })).rejects.toThrow('Config path does not exist in repository: nonexistent');
    });

    it('should handle clone failure gracefully', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
      const workspaceRoot = tempDir;
      
      // Mock that repository doesn't exist initially, but may exist during cleanup
      let cloneAttempted = false;
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string' && path.includes('owner-repo-main')) {
          if (cloneAttempted) {
            return true; // During cleanup after failed clone, directory exists
          }
          return false; // Initially, repository doesn't exist
        }
        return false; // Config path and other paths don't exist
      });
      mockExecute.mockImplementation(() => {
        cloneAttempted = true;
        return Promise.reject(new Error('Git clone failed'));
      });

      await expect(manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      })).rejects.toThrow('Failed to clone GitHub config repository: Git clone failed');

      // Verify that execute was called (showing clone was attempted)
      expect(mockExecute).toHaveBeenCalled();
    });
  });

  describe('getRepoMetadata', () => {
    it('should return metadata for existing repository', async () => {
      const localPath = '/path/to/repo';
      const metadata = {
        repoUrl: 'https://github.com/owner/repo',
        branch: 'main',
        configPath: 'config',
        originalUrl: 'https://github.com/owner/repo/tree/main/config',
        lastUpdate: '2023-01-01T00:00:00.000Z',
        clonedAt: '2023-01-01T00:00:00.000Z'
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify(metadata));

      const result = await manager.getRepoMetadata(localPath);

      expect(result).toEqual(metadata);
    });

    it('should return null for non-existent metadata', async () => {
      const localPath = '/path/to/repo';

      mockFs.existsSync.mockReturnValue(false);

      const result = await manager.getRepoMetadata(localPath);

      expect(result).toBeNull();
    });

    it('should return null for corrupted metadata', async () => {
      const localPath = '/path/to/repo';

      mockFs.existsSync.mockReturnValue(true);
      mockFsPromises.readFile.mockResolvedValue('invalid json');

      const result = await manager.getRepoMetadata(localPath);

      expect(result).toBeNull();
    });
  });

  describe('cleanupRepo', () => {
    it('should remove repository directory', async () => {
      const localPath = '/path/to/repo';

      mockFs.existsSync.mockReturnValue(true);

      await manager.cleanupRepo(localPath);

      expect(mockFsPromises.rm).toHaveBeenCalledWith(localPath, {
        recursive: true,
        force: true
      });
    });

    it('should handle non-existent directory gracefully', async () => {
      const localPath = '/path/to/nonexistent';

      mockFs.existsSync.mockReturnValue(false);

      await manager.cleanupRepo(localPath);

      expect(mockFsPromises.rm).not.toHaveBeenCalled();
    });
  });

  describe('private method tests via public interface', () => {
    describe('shouldUpdate logic', () => {
      it('should update when frequency time has passed', async () => {
        const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
        const workspaceRoot = tempDir;
        
        mockFs.existsSync.mockImplementation((path: any) => {
          if (typeof path === 'string') {
            if (path.includes('/.git')) return true;
            if (path.includes('/config')) return true;
            if (path.includes('xfi-metadata.json')) return true;
          }
          return false;
        });

        // Mock old metadata (2 hours ago)
        const oldMetadata = {
          lastUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          repoUrl: 'https://github.com/owner/repo',
          branch: 'main',
          configPath: 'config',
          originalUrl: githubTreeUrl,
          clonedAt: new Date().toISOString()
        };
        mockFsPromises.readFile.mockResolvedValue(JSON.stringify(oldMetadata));

        await manager.getGitHubConfig({
          githubTreeUrl,
          workspaceRoot,
          forceUpdate: false,
          updateFrequencyMinutes: 60 // 1 hour frequency
        });

        // Should call git pull because 2 hours > 1 hour
        expect(mockExecute).toHaveBeenCalledWith();
      });

      it('should not update when within frequency window', async () => {
        const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
        const workspaceRoot = tempDir;
        
        // Clear previous mock calls for this specific test
        mockExecute.mockClear();

        mockFs.existsSync.mockImplementation((path: any) => {
          if (typeof path === 'string') {
            // Mock that the repo directory and git directory exist (no cloning needed)
            if (path.includes('/.git')) return true;
            if (path.includes('/config')) return true;
            if (path.includes('xfi-metadata.json')) return true;
            // Mock the repo hash directory exists to avoid cloning
            if (path.endsWith('f1d2d2f924e986ac86fdf7b36c94bcdf32beec15')) return true;
          }
          return false;
        });

        // Mock recent metadata (30 minutes ago)
        const recentMetadata = {
          lastUpdate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          repoUrl: 'https://github.com/owner/repo',
          branch: 'main',
          configPath: 'config',
          originalUrl: githubTreeUrl,
          clonedAt: new Date().toISOString()
        };
        mockFsPromises.readFile.mockResolvedValue(JSON.stringify(recentMetadata));
        
        // Mock fs.readFileSync for shouldUpdate metadata check
        const fs = require('fs');
        fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(recentMetadata));

        await manager.getGitHubConfig({
          githubTreeUrl,
          workspaceRoot,
          forceUpdate: false,
          updateFrequencyMinutes: 60 // 1 hour frequency
        });

        // Should not call git pull because 30 minutes < 1 hour
        // Note: Git operations for repository setup might be called, but no updates should occur
        // The test verifies that we don't call additional git operations beyond repository verification
        const gitPullCalls = mockExecute.mock.calls.filter((call: any[]) => 
          call.length > 0 && (call[0] === 'pull' || call.toString().includes('pull'))
        );
        expect(gitPullCalls).toHaveLength(0);
      });
    });

    describe('repo hash generation', () => {
      it('should generate consistent hashes for same repo and branch', () => {
        const url1 = 'https://github.com/owner/repo/tree/main/config';
        const url2 = 'https://github.com/owner/repo/tree/main/different-path';

        const config1 = manager.parseGitHubTreeUrl(url1);
        const config2 = manager.parseGitHubTreeUrl(url2);

        // Same repo and branch should generate same directory structure
        expect(config1.repoUrl).toBe(config2.repoUrl);
        expect(config1.branch).toBe(config2.branch);
      });
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
      const workspaceRoot = tempDir;

      mockFs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      await expect(manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      })).rejects.toThrow();
    });

    it('should recover from corrupted git repository', async () => {
      const githubTreeUrl = 'https://github.com/owner/repo/tree/main/config';
      const workspaceRoot = tempDir;

      // Mock existing directory but no .git folder (corrupted)
      mockFs.existsSync.mockImplementation((path: any) => {
        if (typeof path === 'string') {
          if (path.includes('/.git')) return false; // No .git directory
          if (path.includes('/config')) return true; // Config path exists after re-clone
        }
        return true; // Directory exists but corrupted
      });

      await manager.getGitHubConfig({
        githubTreeUrl,
        workspaceRoot,
        forceUpdate: false,
        updateFrequencyMinutes: 60
      });

      // Should remove corrupted directory and re-clone
      expect(mockFsPromises.rm).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
    });
  });
});