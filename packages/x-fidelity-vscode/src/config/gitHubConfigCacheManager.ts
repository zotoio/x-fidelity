import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createComponentLogger } from '../utils/globalLogger';

/**
 * Manages GitHub configuration cache invalidation in VSCode
 * When GitHub config settings change, this clears the local cache
 * to ensure fresh configurations are pulled from the repository
 */
export class GitHubConfigCacheManager implements vscode.Disposable {
  private static readonly CACHE_DIR = '.xfiResults/github-configs';
  private static readonly SETTINGS_CACHE_FILE =
    '.xfiResults/github-settings-cache.json';

  private readonly logger = createComponentLogger('GitHubConfigCacheManager');
  private disposables: vscode.Disposable[] = [];
  private lastKnownSettings: GitHubConfigSettings | null = null;

  constructor() {
    this.setupConfigWatcher();
    this.loadLastKnownSettings();
  }

  private setupConfigWatcher(): void {
    // Watch for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration(e => {
        if (
          e.affectsConfiguration('xfidelity.githubConfigLocation') ||
          e.affectsConfiguration('xfidelity.githubConfigUpdateFrequency')
        ) {
          this.handleGitHubConfigChange();
        }
      })
    );
  }

  private async handleGitHubConfigChange(): Promise<void> {
    const currentSettings = this.getCurrentSettings();
    const previousSettings = this.lastKnownSettings;

    this.logger.info('GitHub configuration settings changed', {
      previous: previousSettings,
      current: currentSettings
    });

    // Check if the GitHub config location changed (requires cache invalidation)
    if (
      previousSettings &&
      previousSettings.githubConfigLocation !==
        currentSettings.githubConfigLocation
    ) {
      this.logger.info('GitHub config location changed, invalidating cache', {
        oldLocation: previousSettings.githubConfigLocation,
        newLocation: currentSettings.githubConfigLocation
      });

      await this.invalidateCache();
    }

    // Save current settings for next comparison
    this.lastKnownSettings = currentSettings;
    await this.saveCurrentSettings(currentSettings);
  }

  private getCurrentSettings(): GitHubConfigSettings {
    const config = vscode.workspace.getConfiguration('xfidelity');
    return {
      githubConfigLocation: config.get<string>('githubConfigLocation', ''),
      githubConfigUpdateFrequency: config.get<number>(
        'githubConfigUpdateFrequency',
        60
      )
    };
  }

  private async invalidateCache(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        this.logger.debug(
          'No workspace folders found, skipping cache invalidation'
        );
        return;
      }

      // Invalidate cache for each workspace
      for (const folder of workspaceFolders) {
        const cacheDir = path.join(
          folder.uri.fsPath,
          GitHubConfigCacheManager.CACHE_DIR
        );

        if (fs.existsSync(cacheDir)) {
          this.logger.debug('Removing GitHub config cache directory', {
            cacheDir
          });
          await fs.promises.rm(cacheDir, { recursive: true, force: true });
        }
      }

      // Also invalidate central config cache if it exists
      await this.invalidateCentralCache();

      this.logger.info('GitHub configuration cache successfully invalidated');

      // Show user notification about cache invalidation
      vscode.window.showInformationMessage(
        'GitHub configuration changed. Cache cleared for fresh config retrieval.'
      );
    } catch (error) {
      this.logger.error('Failed to invalidate GitHub config cache', { error });
      vscode.window.showWarningMessage(
        'Failed to clear GitHub config cache. You may need to restart VSCode for changes to take effect.'
      );
    }
  }

  private async invalidateCentralCache(): Promise<void> {
    try {
      const os = require('os');
      const homeDir = os.homedir();

      let configHome: string;
      if (process.platform === 'win32') {
        configHome = process.env.APPDATA || path.join(homeDir, '.config');
      } else {
        configHome =
          process.env.XDG_CONFIG_HOME || path.join(homeDir, '.config');
      }

      const centralCacheDir = path.join(configHome, '.xfidelity', 'cache');

      if (fs.existsSync(centralCacheDir)) {
        this.logger.debug('Removing central GitHub config cache', {
          centralCacheDir
        });
        await fs.promises.rm(centralCacheDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate central config cache', { error });
    }
  }

  private async loadLastKnownSettings(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
      }

      const settingsFile = path.join(
        workspaceFolders[0].uri.fsPath,
        GitHubConfigCacheManager.SETTINGS_CACHE_FILE
      );

      if (fs.existsSync(settingsFile)) {
        const settingsData = await fs.promises.readFile(settingsFile, 'utf8');
        this.lastKnownSettings = JSON.parse(settingsData);
        this.logger.debug('Loaded last known GitHub config settings', {
          settings: this.lastKnownSettings
        });
      }
    } catch (error) {
      this.logger.debug(
        'Failed to load last known settings (this is normal on first run)',
        { error }
      );
      this.lastKnownSettings = null;
    }
  }

  private async saveCurrentSettings(
    settings: GitHubConfigSettings
  ): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
      }

      const settingsFile = path.join(
        workspaceFolders[0].uri.fsPath,
        GitHubConfigCacheManager.SETTINGS_CACHE_FILE
      );

      const settingsDir = path.dirname(settingsFile);
      if (!fs.existsSync(settingsDir)) {
        await fs.promises.mkdir(settingsDir, { recursive: true });
      }

      await fs.promises.writeFile(
        settingsFile,
        JSON.stringify(settings, null, 2)
      );
      this.logger.debug('Saved current GitHub config settings', { settings });
    } catch (error) {
      this.logger.warn('Failed to save current settings', { error });
    }
  }

  async forceInvalidate(): Promise<void> {
    this.logger.info('Force invalidating GitHub config cache');
    await this.invalidateCache();
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

interface GitHubConfigSettings {
  githubConfigLocation: string;
  githubConfigUpdateFrequency: number;
}

let gitHubConfigCacheManager: GitHubConfigCacheManager | undefined;

export function getGitHubConfigCacheManager(): GitHubConfigCacheManager {
  if (!gitHubConfigCacheManager) {
    gitHubConfigCacheManager = new GitHubConfigCacheManager();
  }
  return gitHubConfigCacheManager;
}

export function disposeGitHubConfigCacheManager(): void {
  if (gitHubConfigCacheManager) {
    gitHubConfigCacheManager.dispose();
    gitHubConfigCacheManager = undefined;
  }
}
