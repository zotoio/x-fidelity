import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GitHubConfigManager, GitHubConfigInfo } from './gitHubConfigManager';
import { logger } from '../utils/logger';
import { validateDirectoryPath } from '../security/pathValidator';

export interface CentralConfigMetadata {
  githubConfigLocation?: string;
  archetype?: string;
  alias?: string;
  setupDate: string;
  configPath: string;
  type: 'github' | 'local';
}

export interface CentralConfigInfo {
  name: string;
  path: string;
  type: 'github' | 'local';
  metadata?: CentralConfigMetadata;
}

export class CentralConfigManager {
  private static readonly CENTRAL_CONFIG_DIR = 'xfidelity';
  private static readonly CONFIGS_SUBDIR = 'configs';
  private static readonly METADATA_FILE = 'xfi-metadata.json';
  
  private static instance?: CentralConfigManager;
  private githubConfigManager: GitHubConfigManager;

  constructor() {
    this.githubConfigManager = new GitHubConfigManager();
  }

  static getInstance(): CentralConfigManager {
    if (!CentralConfigManager.instance) {
      CentralConfigManager.instance = new CentralConfigManager();
    }
    return CentralConfigManager.instance;
  }

  /**
   * Get the central config directory path with XDG compliance
   */
  getCentralConfigDir(): string {
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
    
    return path.join(configHome, CentralConfigManager.CENTRAL_CONFIG_DIR);
  }

  /**
   * Enhanced config resolution with central home directory support
   * Resolution order:
   * 1. Explicit user configuration (configServer, localConfigPath, or githubConfigLocation)
   * 2. Environment variable XFI_CONFIG_PATH (deployment-specific override)
   * 3. Central home directory config (~/.config/xfidelity/configs/[archetype|default])
   * 4. Demo config (last resort)
   */
  async resolveConfigPath(params: {
    archetype: string;
    configServer?: string;
    localConfigPath?: string;
    githubConfigLocation?: string;
    workspaceRoot?: string;
  }): Promise<{ path: string; source: string }> {
    const { archetype, configServer, localConfigPath, githubConfigLocation, workspaceRoot } = params;

    // 1. Explicit user configuration takes precedence
    if (configServer) {
      logger.info('Using explicit config server', { configServer });
      return { path: '', source: 'configServer' }; // Handled by caller
    }

    if (githubConfigLocation) {
      logger.info('Using explicit GitHub config location', { githubConfigLocation });
      const resolvedPath = await this.resolveGitHubConfig(githubConfigLocation, workspaceRoot || process.cwd());
      return { path: resolvedPath, source: 'explicit-github' };
    }

    if (localConfigPath) {
      logger.info('Using explicit local config path', { localConfigPath });
      return { path: localConfigPath, source: 'explicit-local' };
    }

    // 2. Check environment variable (deployment-specific override)
    if (process.env.XFI_CONFIG_PATH && fs.existsSync(process.env.XFI_CONFIG_PATH)) {
      logger.info('Using environment variable config path (XFI_CONFIG_PATH)', { 
        path: process.env.XFI_CONFIG_PATH 
      });
      return { path: process.env.XFI_CONFIG_PATH, source: 'environment' };
    }

    // 3. Check central home directory config (user preference)
    const centralConfigResult = await this.findCentralConfig(archetype);
    if (centralConfigResult) {
      logger.info('Using central home directory config', { 
        archetype, 
        path: centralConfigResult.path.replace(os.homedir(), '~'), // Privacy-friendly logging
        source: centralConfigResult.source
      });
      return centralConfigResult;
    }

    // 4. Demo config (last resort)
    logger.info('Using demo config as fallback', { archetype });
    const demoPath = this.getDemoConfigPath();
    return { path: demoPath, source: 'demo' };
  }

  /**
   * Find central config in home directory
   * Automatically updates GitHub-based configs with git pull before use
   */
  private async findCentralConfig(archetype: string): Promise<{ path: string; source: string } | null> {
    const centralDir = this.getCentralConfigDir();
    const configsDir = path.join(centralDir, CentralConfigManager.CONFIGS_SUBDIR);

    // Check archetype-specific config first
    const archetypeConfigPath = path.join(configsDir, archetype);
    const archetypeResult = await this.checkAndUpdateCentralConfig(archetypeConfigPath, archetype);
    if (archetypeResult) {
      return { path: archetypeResult, source: 'central-archetype' };
    }

    // Check default config
    const defaultConfigPath = path.join(configsDir, 'default');
    const defaultResult = await this.checkAndUpdateCentralConfig(defaultConfigPath, 'default');
    if (defaultResult) {
      return { path: defaultResult, source: 'central-default' };
    }

    return null;
  }

  /**
   * Check if config exists, and if it's a GitHub config, update it first
   */
  private async checkAndUpdateCentralConfig(configPath: string, configName: string): Promise<string | null> {
    if (!(await this.isValidConfigDir(configPath))) {
      return null;
    }

    const metadataPath = path.join(configPath, CentralConfigManager.METADATA_FILE);
    
    // Check if this is a GitHub-based config that needs updating
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata: CentralConfigMetadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
        
        if (metadata.type === 'github' && metadata.githubConfigLocation) {
          logger.info('Found central GitHub config, updating before use', { 
            configName, 
            githubUrl: metadata.githubConfigLocation 
          });
          
          try {
            await this.updateCentralConfig(configName);
            logger.info('Successfully updated central GitHub config', { configName });
          } catch (error) {
            logger.warn('Failed to update central GitHub config, using existing version', { 
              configName, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
            // Continue with existing config even if update fails
          }
        }
      } catch (error) {
        logger.debug('Failed to read config metadata, treating as local config', { configPath, error });
      }
    }

    return configPath;
  }

  /**
   * Resolve GitHub config location and clone/update as needed
   */
  private async resolveGitHubConfig(githubConfigLocation: string, workspaceRoot: string): Promise<string> {
    // For explicit GitHub configs, still use central location for consistency
    const configInfo = this.githubConfigManager.parseGitHubTreeUrl(githubConfigLocation);
    const centralConfigPath = this.getCentralConfigPathForRepo(configInfo);

    return await this.githubConfigManager.getGitHubConfig({
      githubTreeUrl: githubConfigLocation,
      forceUpdate: false,
      updateFrequencyMinutes: 60
    });
  }

  /**
   * Get the central config path for a specific GitHub repo
   */
  private getCentralConfigPathForRepo(configInfo: GitHubConfigInfo): string {
    const centralDir = this.getCentralConfigDir();
    const configsDir = path.join(centralDir, CentralConfigManager.CONFIGS_SUBDIR);
    
    // Create a safe directory name from repo info
    const repoHash = require('crypto')
      .createHash('md5')
      .update(`${configInfo.repoUrl}#${configInfo.branch}`)
      .digest('hex');
    
    return path.join(configsDir, `github-${repoHash}`);
  }

  /**
   * Check if a directory contains valid X-Fidelity configuration
   */
  private async isValidConfigDir(configPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(configPath)) {
        return false;
      }

      // Security validation
      if (!validateDirectoryPath(configPath)) {
        logger.warn('Central config directory failed security validation', { configPath });
        return false;
      }

      // Check for required subdirectories or config files
      const requiredPaths = [
        path.join(configPath, 'archetypes'),
        path.join(configPath, 'rules'),
        // exemptions is optional
      ];

      // At least one required path should exist
      const hasValidStructure = requiredPaths.some(reqPath => fs.existsSync(reqPath));
      
      if (!hasValidStructure) {
        logger.debug('Config directory missing required structure', { 
          configPath, 
          requiredPaths 
        });
      }
      
      return hasValidStructure;
    } catch (error) {
      logger.warn('Error validating central config directory', { configPath, error });
      return false;
    }
  }

  /**
   * Set up a GitHub config location in the central directory
   */
  async setupCentralGitHubConfig(params: {
    githubConfigLocation: string;
    archetype?: string;
    alias?: string;
  }): Promise<string> {
    const { githubConfigLocation, archetype, alias } = params;
    
    try {
      const configInfo = this.githubConfigManager.parseGitHubTreeUrl(githubConfigLocation);
      
      // Determine target directory
      const centralDir = this.getCentralConfigDir();
      const configsDir = path.join(centralDir, CentralConfigManager.CONFIGS_SUBDIR);
      
      const targetDir = alias ? 
        path.join(configsDir, alias) :
        archetype ? 
          path.join(configsDir, archetype) :
          path.join(configsDir, 'default');

      // Ensure target directory exists
      await fs.promises.mkdir(targetDir, { recursive: true });

      // Clone the config
      const configPath = await this.githubConfigManager.getGitHubConfig({
        githubTreeUrl: githubConfigLocation,
        forceUpdate: true,
        updateFrequencyMinutes: 60
      });

      // Save metadata about this setup
      await this.saveCentralConfigMetadata(targetDir, {
        githubConfigLocation,
        archetype,
        alias,
        setupDate: new Date().toISOString(),
        configPath,
        type: 'github'
      });

      logger.info('Central GitHub config setup complete', {
        githubConfigLocation,
        targetDir: targetDir.replace(os.homedir(), '~'),
        archetype,
        alias
      });

      return targetDir;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to setup central GitHub config', { 
        githubConfigLocation, 
        archetype, 
        alias, 
        error: errorMessage 
      });
      throw new Error(`Failed to setup central GitHub config: ${errorMessage}`);
    }
  }

  /**
   * List available central configs
   */
  async listCentralConfigs(): Promise<CentralConfigInfo[]> {
    const centralDir = this.getCentralConfigDir();
    const configsDir = path.join(centralDir, CentralConfigManager.CONFIGS_SUBDIR);

    if (!fs.existsSync(configsDir)) {
      return [];
    }

    const configs: CentralConfigInfo[] = [];
    
    try {
      const entries = await fs.promises.readdir(configsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const configPath = path.join(configsDir, entry.name);
          const metadataPath = path.join(configPath, CentralConfigManager.METADATA_FILE);
          
          let metadata: CentralConfigMetadata | undefined = undefined;
          let type: 'github' | 'local' = 'local';

          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
              type = metadata?.type || (metadata?.githubConfigLocation ? 'github' : 'local');
            } catch (error) {
              logger.warn('Failed to read config metadata', { configPath, error });
            }
          }

          configs.push({
            name: entry.name,
            path: configPath,
            type,
            metadata
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to list central configs', { configsDir, error });
    }

    return configs;
  }

  /**
   * Remove a central config
   */
  async removeCentralConfig(name: string): Promise<void> {
    const centralDir = this.getCentralConfigDir();
    const configsDir = path.join(centralDir, CentralConfigManager.CONFIGS_SUBDIR);
    const configPath = path.join(configsDir, name);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Central config '${name}' does not exist`);
    }

    // Security validation
    if (!validateDirectoryPath(configPath)) {
      throw new Error(`Invalid config path for removal: ${name}`);
    }

    logger.info('Removing central config', { 
      name, 
      path: configPath.replace(os.homedir(), '~') 
    });

    await fs.promises.rm(configPath, { recursive: true, force: true });
  }

  /**
   * Update a central config from its GitHub source
   */
  async updateCentralConfig(name: string): Promise<void> {
    const configs = await this.listCentralConfigs();
    const config = configs.find(c => c.name === name);

    if (!config) {
      throw new Error(`Central config '${name}' not found`);
    }

    if (config.type !== 'github' || !config.metadata?.githubConfigLocation) {
      throw new Error(`Central config '${name}' is not a GitHub config`);
    }

    logger.info('Updating central GitHub config', { 
      name, 
      githubUrl: config.metadata.githubConfigLocation 
    });

    // Force update the GitHub config
    await this.githubConfigManager.getGitHubConfig({
      githubTreeUrl: config.metadata.githubConfigLocation,
      forceUpdate: true,
      updateFrequencyMinutes: 60
    });
  }

  private async saveCentralConfigMetadata(configDir: string, metadata: CentralConfigMetadata): Promise<void> {
    const metadataPath = path.join(configDir, CentralConfigManager.METADATA_FILE);
    await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private getDemoConfigPath(): string {
    // CRITICAL: Priority order for demo config resolution
    // 1. VSCode extension embedded demo config (when running from VSCode)
    // 2. Bundled demo config (for CLI installations)
    // 3. Monorepo structure (for development)
    
    logger.debug('Resolving demo config path', { 
      __dirname, 
      'current working directory': process.cwd(),
      'XFI_VSCODE_MODE': process.env.XFI_VSCODE_MODE,
      'XFI_VSCODE_EXTENSION_PATH': process.env.XFI_VSCODE_EXTENSION_PATH
    });

    // 1. VSCode extension embedded demo config (highest priority)
    // When running from VSCode, use the extension's embedded demo config
    if (process.env.XFI_VSCODE_MODE === 'true' && process.env.XFI_VSCODE_EXTENSION_PATH) {
      const vscodeEmbeddedPaths = [
        // VSCode extension dist/demoConfig
        path.join(process.env.XFI_VSCODE_EXTENSION_PATH, 'dist', 'demoConfig'),
        // VSCode extension CLI embedded demoConfig
        path.join(process.env.XFI_VSCODE_EXTENSION_PATH, 'dist', 'cli', 'demoConfig'),
        // Legacy path structure
        path.join(process.env.XFI_VSCODE_EXTENSION_PATH, 'cli', 'demoConfig')
      ];
      
      for (const embeddedPath of vscodeEmbeddedPaths) {
        if (fs.existsSync(embeddedPath)) {
          logger.debug('Using VSCode embedded demo config', { 
            path: embeddedPath 
          });
          return embeddedPath;
        }
      }
      
      logger.warn('VSCode mode detected but embedded demo config not found', {
        extensionPath: process.env.XFI_VSCODE_EXTENSION_PATH,
        checkedPaths: vscodeEmbeddedPaths
      });
    }

    // 2. Try bundled config in same directory as bundle (for CLI installations)
    const bundledPathSameDir = path.resolve(__dirname, '..', '..', 'demoConfig');
    if (fs.existsSync(bundledPathSameDir)) {
      logger.debug('Using bundled demo config (same dir)', { 
        path: bundledPathSameDir 
      });
      return bundledPathSameDir;
    }
    
    // Try bundled config one level up (for some build configurations)
    const bundledPathParent = path.resolve(__dirname, '..', '..', '..', 'demoConfig');
    if (fs.existsSync(bundledPathParent)) {
      logger.debug('Using bundled demo config (parent dir)', { 
        path: bundledPathParent 
      });
      return bundledPathParent;
    }
    
    // 3. Fall back to monorepo structure (for development)
    // Find workspace root by looking for the packages directory
    let workspaceRoot = process.cwd();
    let currentDir = process.cwd();
    
    // First, try to find workspace root from current working directory
    while (currentDir !== path.dirname(currentDir)) {
      const packagesDir = path.join(currentDir, 'packages');
      if (fs.existsSync(packagesDir)) {
        workspaceRoot = currentDir;
        break;
      }
      currentDir = path.dirname(currentDir);
    }
    
    // If we couldn't find it from cwd, try from __dirname
    if (!fs.existsSync(path.join(workspaceRoot, 'packages'))) {
      currentDir = __dirname;
      while (currentDir !== path.dirname(currentDir)) {
        // Look for workspace root that contains packages/ directory
        const testRoot = path.resolve(currentDir, '..', '..', '..');
        if (fs.existsSync(path.join(testRoot, 'packages'))) {
          workspaceRoot = testRoot;
          break;
        }
        currentDir = path.dirname(currentDir);
      }
    }
    
    const demoConfigPath = path.join(workspaceRoot, 'packages', 'x-fidelity-democonfig', 'src');
    logger.debug('Using workspace demo config (development mode)', { 
      workspaceRoot, 
      demoConfigPath 
    });
    
    return demoConfigPath;
  }

  /**
   * Update allowed paths for security validation to include central config
   */
  static updateSecurityAllowedPaths(allowedPaths: string[]): string[] {
    try {
      const centralManager = CentralConfigManager.getInstance();
      const centralConfigDir = centralManager.getCentralConfigDir();
      const configsDir = path.join(centralConfigDir, 'configs');
      
      // Get all existing config directories
      const additionalPaths = [
        centralConfigDir,
        // Allow all subdirectories of central config
        configsDir
      ];

      // Add all individual config directories
      if (fs.existsSync(configsDir)) {
        try {
          const configEntries = fs.readdirSync(configsDir, { withFileTypes: true });
          for (const entry of configEntries) {
            if (entry.isDirectory()) {
              additionalPaths.push(path.join(configsDir, entry.name));
            }
          }
        } catch (error) {
          logger.debug('Could not read config directories for security paths', { error });
        }
      }
      
      return [
        ...allowedPaths,
        ...additionalPaths
      ];
    } catch (error) {
      logger.warn('Failed to update security allowed paths with central config', { error });
      return allowedPaths;
    }
  }

  /**
   * Initialize central config directory structure
   */
  async initializeCentralConfig(): Promise<void> {
    const centralDir = this.getCentralConfigDir();
    
    try {
      // Create directory structure
      const dirsToCreate = [
        centralDir,
        path.join(centralDir, CentralConfigManager.CONFIGS_SUBDIR)
      ];

      for (const dir of dirsToCreate) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      logger.debug('Central config directory structure initialized', { centralDir });
    } catch (error) {
      logger.warn('Failed to initialize central config directory', { centralDir, error });
    }
  }
}