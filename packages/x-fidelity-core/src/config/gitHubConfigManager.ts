import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { validateUrl } from '../security/urlValidator';
import { SafeGitCommand } from '../security/commandValidator';
import { logger } from '../utils/logger';

export interface GitHubConfigInfo {
  repoUrl: string;      // https://github.com/owner/repo or git@github.com:owner/repo
  branch: string;       // master, main, dev, etc.
  configPath: string;   // packages/x-fidelity-democonfig/src
  originalUrl: string;  // Original tree URL
}

export interface GitHubConfigMetadata {
  repoUrl: string;
  branch: string;
  configPath: string;
  originalUrl: string;
  lastUpdate: string;
  clonedAt: string;
  updateFrequencyMinutes?: number;
}

export class GitHubConfigManager {
  private static readonly METADATA_FILE = 'xfi-metadata.json';
  private static readonly CENTRAL_CONFIG_DIR = 'xfidelity';
  private static readonly CONFIGS_SUBDIR = 'configs';

  /**
   * Get the central config directory path with XDG compliance
   */
  private getCentralConfigDir(): string {
    const homeDir = os.homedir();
    
    // Follow XDG Base Directory specification
    let configHome: string;
    if (process.platform === 'win32') {
      // On Windows, use %APPDATA% or fallback to home directory
      configHome = process.env.APPDATA || path.join(homeDir, '.config');
    } else {
      // On Unix-like systems, use XDG_CONFIG_HOME or ~/.config
      configHome = process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
    }
    
    return path.join(configHome, GitHubConfigManager.CENTRAL_CONFIG_DIR);
  }

  /**
   * Get the central config path for a specific GitHub repo
   */
  private getCentralConfigPathForRepo(configInfo: GitHubConfigInfo): string {
    const centralDir = this.getCentralConfigDir();
    const configsDir = path.join(centralDir, GitHubConfigManager.CONFIGS_SUBDIR);
    
    // Create a safe directory name from repo info
    const repoHash = this.getRepoHash(configInfo.repoUrl, configInfo.branch);
    return path.join(configsDir, `github-${repoHash}`);
  }

  /**
   * Parse GitHub tree URL into components
   * Supports formats:
   * - https://github.com/owner/repo/tree/branch/path/to/config
   * - git@github.com:owner/repo/tree/branch/path/to/config  
   * - https://custom-domain.com/owner/repo/tree/branch/path/to/config
   */
  parseGitHubTreeUrl(treeUrl: string): GitHubConfigInfo {
    if (!treeUrl || typeof treeUrl !== 'string') {
      throw new Error('GitHub tree URL is required and must be a string');
    }

    // Security validation for HTTPS URLs
    if (treeUrl.startsWith('https://') && !validateUrl(treeUrl)) {
      throw new Error(`Invalid or unsafe GitHub URL: ${treeUrl}`);
    }

    // Handle SSH format: git@domain:owner/repo/tree/branch/path
    if (treeUrl.startsWith('git@')) {
      return this.parseSshTreeUrl(treeUrl);
    }

    // Handle HTTPS format: https://domain/owner/repo/tree/branch/path
    if (treeUrl.startsWith('https://')) {
      return this.parseHttpsTreeUrl(treeUrl);
    }

    throw new Error(`Unsupported URL format: ${treeUrl}. Must start with 'https://' or 'git@'`);
  }

  private parseHttpsTreeUrl(treeUrl: string): GitHubConfigInfo {
    try {
      const url = new URL(treeUrl);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Expected format: /owner/repo/tree/branch/path/to/config
      if (pathParts.length < 4 || pathParts[2] !== 'tree') {
        throw new Error(`Invalid GitHub tree URL format. Expected: https://domain/owner/repo/tree/branch/path`);
      }

      const [owner, repo, , branch, ...configPathParts] = pathParts;
      
      if (!owner || !repo || !branch) {
        throw new Error('GitHub URL must include owner, repository, and branch');
      }

      return {
        repoUrl: `${url.protocol}//${url.hostname}/${owner}/${repo}`,
        branch,
        configPath: configPathParts.join('/') || '',
        originalUrl: treeUrl
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid GitHub')) {
        throw error;
      }
      throw new Error(`Failed to parse GitHub HTTPS URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseSshTreeUrl(treeUrl: string): GitHubConfigInfo {
    // Format: git@domain:owner/repo/tree/branch/path/to/config
    const match = treeUrl.match(/^git@([^:]+):(.+)$/);
    if (!match) {
      throw new Error(`Invalid SSH URL format. Expected: git@domain:owner/repo/tree/branch/path`);
    }

    const [, domain, pathWithTree] = match;
    const pathParts = pathWithTree.split('/');
    
    if (pathParts.length < 4 || pathParts[2] !== 'tree') {
      throw new Error(`Invalid GitHub SSH tree URL format. Expected: git@domain:owner/repo/tree/branch/path`);
    }

    const [owner, repo, , branch, ...configPathParts] = pathParts;
    
    if (!owner || !repo || !branch) {
      throw new Error('GitHub SSH URL must include owner, repository, and branch');
    }

    return {
      repoUrl: `git@${domain}:${owner}/${repo}`,
      branch,
      configPath: configPathParts.join('/') || '',
      originalUrl: treeUrl
    };
  }

  async getGitHubConfig(params: {
    githubTreeUrl: string;
    forceUpdate?: boolean;
    updateFrequencyMinutes?: number;
  }): Promise<string> {
    const { githubTreeUrl, forceUpdate = false, updateFrequencyMinutes = 60 } = params;
    
    const configInfo = this.parseGitHubTreeUrl(githubTreeUrl);
    const localPath = await this.ensureRepoCloned(configInfo);
    
    if (this.shouldUpdate(localPath, updateFrequencyMinutes) || forceUpdate) {
      await this.updateRepo(localPath, configInfo.branch);
    }
    
    const finalConfigPath = path.join(localPath, configInfo.configPath);
    
    // Verify config path exists
    if (!fs.existsSync(finalConfigPath)) {
      throw new Error(`Config path does not exist in repository: ${configInfo.configPath}`);
    }
    
    return finalConfigPath;
  }

  private async ensureRepoCloned(configInfo: GitHubConfigInfo): Promise<string> {
    const centralConfigPath = this.getCentralConfigPathForRepo(configInfo);
    const repoHash = this.getRepoHash(configInfo.repoUrl, configInfo.branch);
    const localPath = path.join(centralConfigPath, repoHash);
    
    if (!fs.existsSync(localPath)) {
      await this.cloneRepo(configInfo, localPath);
    } else {
      // Verify it's a valid git repository
      const gitDir = path.join(localPath, '.git');
      if (!fs.existsSync(gitDir)) {
        logger.warn('Invalid git repository found, re-cloning', { localPath });
        await fs.promises.rm(localPath, { recursive: true, force: true });
        await this.cloneRepo(configInfo, localPath);
      }
    }
    
    return localPath;
  }

  private async cloneRepo(configInfo: GitHubConfigInfo, localPath: string): Promise<void> {
    logger.info('Cloning GitHub config repository', { 
      repoUrl: configInfo.repoUrl, 
      branch: configInfo.branch,
      localPath: localPath.replace(require('os').homedir(), '~') // Privacy-friendly logging
    });
    
    try {
      // Ensure parent directory exists
      await fs.promises.mkdir(path.dirname(localPath), { recursive: true });

      const cloneCmd = new SafeGitCommand('clone', [
        '--depth=1',
        '--single-branch',
        '--branch', configInfo.branch,
        configInfo.repoUrl,
        localPath
      ], { timeout: 300000 }); // 5 minute timeout for clone
      
      await cloneCmd.execute();
      await this.updateMetadata(localPath, configInfo);
      
      logger.info('Successfully cloned GitHub config repository', { 
        configPath: path.join(localPath, configInfo.configPath)
      });
    } catch (error) {
      // Clean up failed clone attempt
      if (fs.existsSync(localPath)) {
        await fs.promises.rm(localPath, { recursive: true, force: true });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to clone GitHub config repository', { 
        repoUrl: configInfo.repoUrl,
        branch: configInfo.branch,
        error: errorMessage
      });
      
      throw new Error(`Failed to clone GitHub config repository: ${errorMessage}`);
    }
  }

  private async updateRepo(localPath: string, branch: string): Promise<void> {
    logger.info('Updating GitHub config repository', { 
      localPath: localPath.replace(require('os').homedir(), '~')
    });
    
    try {
      const pullCmd = new SafeGitCommand('pull', ['origin', branch], {
        cwd: localPath,
        timeout: 60000
      });
      
      await pullCmd.execute();
      await this.updateLastUpdateTime(localPath);
      
      logger.info('Successfully updated GitHub config repository');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to update GitHub config repository', { error: errorMessage });
      // Don't throw here - use existing clone
    }
  }

  private shouldUpdate(localPath: string, frequencyMinutes: number): boolean {
    const metadataPath = path.join(localPath, '.git', GitHubConfigManager.METADATA_FILE);
    if (!fs.existsSync(metadataPath)) {
      return true;
    }
    
    try {
      const metadata: GitHubConfigMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      const lastUpdate = new Date(metadata.lastUpdate);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
      
      return diffMinutes >= frequencyMinutes;
    } catch (error) {
      logger.warn('Failed to read update metadata, forcing update', { error });
      return true;
    }
  }

  private getRepoHash(repoUrl: string, branch: string): string {
    // Create a safe directory name from repo URL and branch
    const input = `${repoUrl}#${branch}`;
    return require('crypto')
      .createHash('md5')
      .update(input)
      .digest('hex');
  }

  private async updateMetadata(localPath: string, configInfo: GitHubConfigInfo): Promise<void> {
    const metadataPath = path.join(localPath, '.git', GitHubConfigManager.METADATA_FILE);
    const metadata: GitHubConfigMetadata = {
      repoUrl: configInfo.repoUrl,
      branch: configInfo.branch,
      configPath: configInfo.configPath,
      originalUrl: configInfo.originalUrl,
      lastUpdate: new Date().toISOString(),
      clonedAt: new Date().toISOString()
    };
    
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private async updateLastUpdateTime(localPath: string): Promise<void> {
    const metadataPath = path.join(localPath, '.git', GitHubConfigManager.METADATA_FILE);
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata: GitHubConfigMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        metadata.lastUpdate = new Date().toISOString();
        await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
      } catch (error) {
        logger.warn('Failed to update metadata timestamp', { error });
      }
    }
  }

  /**
   * Get metadata for a cloned repository
   */
  async getRepoMetadata(localPath: string): Promise<GitHubConfigMetadata | null> {
    const metadataPath = path.join(localPath, '.git', GitHubConfigManager.METADATA_FILE);
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    
    try {
      return JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
    } catch (error) {
      logger.warn('Failed to read repository metadata', { localPath, error });
      return null;
    }
  }

  /**
   * Clean up old or invalid repository clones
   */
  async cleanupRepo(localPath: string): Promise<void> {
    if (fs.existsSync(localPath)) {
      logger.info('Cleaning up GitHub config repository', { 
        localPath: localPath.replace(require('os').homedir(), '~')
      });
      await fs.promises.rm(localPath, { recursive: true, force: true });
    }
  }
}