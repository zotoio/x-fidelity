import { logger } from '../utils/logger';
import { execSync } from 'child_process';
import { ResultMetadata, RepoXFIConfig } from '../types/typeDefs';
import { stringify as yamlStringify } from 'yaml';
import { Notification, NotificationProvider, NotificationConfig, CodeOwner } from '../types/notificationTypes';
import fs from 'fs';

export class NotificationManager {
  private static instance: NotificationManager;
  private providers: Map<string, NotificationProvider> = new Map();
  private config: NotificationConfig;
  private codeOwners: CodeOwner[] = [];

  private constructor(config: NotificationConfig) {
    this.config = config;
    this.loadCodeOwners();
  }

  public static getInstance(config: NotificationConfig): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager(config);
    } else {
      // Update config if it changes
      NotificationManager.instance.config = {
        ...NotificationManager.instance.config,
        ...config
      };
    }
    return NotificationManager.instance;
  }

  public registerProvider(provider: NotificationProvider): void {
    this.providers.set(provider.name, provider);
    logger.info(`Registered notification provider: ${provider.name}`);
  }

  public async sendReport(results: ResultMetadata, affectedFiles: string[], repoXFIConfig?: RepoXFIConfig): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('Notifications are disabled');
      return;
    }

    // Merge global config with repo-specific config
    const notifyConfig = this.mergeNotificationConfig(repoXFIConfig);

    // Determine if we should send notification based on results
    const hasIssues = results.XFI_RESULT.totalIssues > 0;
    if (hasIssues && !notifyConfig.notifyOnFailure) {
      logger.debug('Skipping notification for failure as notifyOnFailure is disabled');
      return;
    }
    if (!hasIssues && !notifyConfig.notifyOnSuccess) {
      logger.debug('Skipping notification for success as notifyOnSuccess is disabled');
      return;
    }

    // Get recipients from multiple sources
    const recipients = this.getRecipients(affectedFiles, repoXFIConfig, notifyConfig);
    if (Object.values(recipients).every(list => list.length === 0)) {
      logger.warn('No recipients found for notification');
      return;
    }

    // Generate report content
    const subject = hasIssues 
      ? `[X-Fidelity] Issues found in your codebase (${results.XFI_RESULT.totalIssues})`
      : '[X-Fidelity] Your codebase passed all checks';
    
    const content = this.generateReportContent(results, affectedFiles);

    // Send through all configured providers
    for (const providerName of this.config.providers) {
      const provider = this.providers.get(providerName);
      if (provider) {
        try {
          // Only send to recipients configured for this provider
          const providerRecipients = recipients[providerName] || [];
          if (providerRecipients.length === 0) {
            logger.debug(`No recipients configured for ${providerName}`);
            continue;
          }

          const notification: Notification = {
            recipients: providerRecipients,
            subject,
            content,
            metadata: { 
              results,
              ciRunUrl: process.env.CI_RUN_URL || process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID 
                ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
                : undefined
            }
          };

          await provider.send(notification);
          logger.info(`Sent notification via ${providerName} to ${providerRecipients.join(', ')}`);
        } catch (error) {
          logger.error(error, `Failed to send notification via ${providerName}`);
        }
      } else {
        logger.warn(`Notification provider not found: ${providerName}`);
      }
    }
  }

  private mergeNotificationConfig(repoXFIConfig?: RepoXFIConfig): NotificationConfig {
    if (!repoXFIConfig?.notifications) {
      return this.config;
    }

    return {
      ...this.config,
      notifyOnSuccess: repoXFIConfig.notifications.notifyOnSuccess !== undefined 
        ? repoXFIConfig.notifications.notifyOnSuccess 
        : this.config.notifyOnSuccess,
      notifyOnFailure: repoXFIConfig.notifications.notifyOnFailure !== undefined 
        ? repoXFIConfig.notifications.notifyOnFailure 
        : this.config.notifyOnFailure,
      // Use codeOwners setting from repo config if specified
      codeOwnersEnabled: repoXFIConfig.notifications.codeOwners !== undefined 
        ? repoXFIConfig.notifications.codeOwners 
        : this.config.codeOwnersEnabled
    };
  }

  private getRecipients(
    affectedFiles: string[], 
    repoXFIConfig?: RepoXFIConfig, 
    notifyConfig?: NotificationConfig
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {
      email: [],
      slack: [],
      teams: []
    };

    // Add recipients from repo config
    if (repoXFIConfig?.notifications?.recipients) {
      const configRecipients = repoXFIConfig.notifications.recipients;
      if (configRecipients.email) {
        result.email.push(...configRecipients.email);
      }
      if (configRecipients.slack) {
        result.slack.push(...configRecipients.slack);
      }
      if (configRecipients.teams) {
        result.teams.push(...configRecipients.teams);
      }
    }

    // Add code owners if enabled
    if (notifyConfig?.codeOwnersEnabled) {
      const codeOwners = this.getCodeOwnersForFiles(affectedFiles);
      // Add code owners to all provider types
      for (const key of Object.keys(result)) {
        result[key].push(...codeOwners);
      }
    }

    // Deduplicate recipients
    for (const key of Object.keys(result)) {
      result[key] = [...new Set(result[key])];
    }

    return result;
  }

  private loadCodeOwners(): void {
    if (!this.config.codeOwnersPath) {
      logger.warn('No CODEOWNERS file path specified');
      return;
    }

    try {
      const codeOwnersContent = fs.readFileSync(this.config.codeOwnersPath, 'utf8');
      const lines = codeOwnersContent.split('\n');
      
      for (const line of lines) {
        // Skip comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '') continue;
        
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const path = parts[0];
          const owners = parts.slice(1).map(owner => {
            // Remove @ from GitHub usernames if present
            return owner.startsWith('@') ? owner.substring(1) : owner;
          });
          
          this.codeOwners.push({ path, owners });
        }
      }
      
      logger.info(`Loaded ${this.codeOwners.length} code owner entries`);
    } catch (error) {
      logger.error(error, `Failed to load CODEOWNERS file from ${this.config.codeOwnersPath}`);
    }
  }

  private getCodeOwnersForFiles(files: string[]): string[] {
    const owners = new Set<string>();
    
    for (const file of files) {
      for (const codeOwner of this.codeOwners) {
        // Simple glob matching (can be enhanced with proper glob matching)
        if (this.matchesGlob(file, codeOwner.path)) {
          codeOwner.owners.forEach(owner => owners.add(owner));
        }
      }
    }
    
    return Array.from(owners);
  }

  private matchesGlob(filePath: string, pattern: string): boolean {
    // Simple implementation - can be replaced with a proper glob matching library
    if (pattern === '*') return true;
    if (pattern.endsWith('/*')) {
      const dir = pattern.slice(0, -2);
      return filePath.startsWith(dir + '/');
    }
    if (pattern.endsWith('/**')) {
      const dir = pattern.slice(0, -3);
      return filePath.startsWith(dir + '/');
    }
    return filePath === pattern;
  }


  private generateReportContent(results: ResultMetadata, affectedFiles: string[]): string {
    // Get GitHub details from git commands with fallbacks to env vars
    let githubServer = '';
    let githubRepo = '';
    let githubBranch = '';
    
    try {
      // Get remote URL and extract server/repo
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      if (remoteUrl) {
        const match = remoteUrl.match(/^(?:https?:\/\/|git@)([^/:]+)[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
        if (match) {
          githubServer = process.env.GITHUB_SERVER_URL || `https://${match[1]}`;
          githubRepo = process.env.GITHUB_REPOSITORY || match[2];
        }
      }

      // Get current branch
      githubBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      logger.warn('Failed to get git details, falling back to defaults', { error });
      githubServer = process.env.GITHUB_SERVER_URL || 'https://github.com';
      githubRepo = process.env.GITHUB_REPOSITORY || results.XFI_RESULT.repoUrl
          .replace(/\.git$/, '')
          .replace(/^git@([^:]+):/, 'https://$1/')
          .replace(/^https?:\/\/[^\/]+\//, '');
      githubBranch = process.env.GITHUB_REF_NAME || 'main';
    }

    const githubUrl = `${githubServer}/${githubRepo}/blob/${githubBranch}`;

    if (results.XFI_RESULT.totalIssues > 0) {
        // Failure template
        const fileDetails = affectedFiles.map(file => {
            // Remove local path prefix from file paths
            const relativePath = file.replace(results.XFI_RESULT.repoPath + '/', '');
            const fileIssues = results.XFI_RESULT.issueDetails.find(detail => detail.filePath === file);
            
            // Start with file name as bold list item with link
            let output = `<li><strong><a href="${githubUrl}/${relativePath}">${relativePath}</a></strong><ul>`;
            
            // Add rule failures with severity-based colors and line links
            const ruleDetails = fileIssues?.errors.map(e => {
                const lineNumber = e.details?.lineNumber;
                const lineLink = lineNumber ? `${githubUrl}/${relativePath}#L${lineNumber}` : `${githubUrl}/${relativePath}`;
                const color = e.level === 'fatality' ? '#f20707' : 
                             e.level === 'error' ? '#53046c' : 
                             e.level === 'warning' ? '#944801' : '#1a1818';
                
                return `<li><span style="color: ${color};font-weight:bold">${e.ruleFailure}</span>${lineNumber ? ` - <a href="${lineLink}">Line ${lineNumber}</a>` : ''}</li>`;
            }).join('');
            
            return output + ruleDetails + '</ul></li>';
        }).join('');

        return `<h1>🚨 Issues Detected</h1>

<p>X-Fidelity found issues in your codebase:</p>

<h2>📊 Summary</h2>
<ul>
  <li><strong>Archetype:</strong> <code>${results.XFI_RESULT.archetype}</code></li>
  <li><strong>Files analyzed:</strong> ${results.XFI_RESULT.fileCount}</li>
  <li><strong>Total issues:</strong> ${results.XFI_RESULT.totalIssues}</li>
  <li>⚠️ Warnings: ${results.XFI_RESULT.warningCount}</li>
  <li>❌ Errors: ${results.XFI_RESULT.errorCount}</li>
  <li>🔥 Fatalities: ${results.XFI_RESULT.fatalityCount}</li>
</ul>

<h2>📝 Issues by File</h2>
<ul>
${fileDetails}
</ul>

    // Generate YAML attachment
    const yamlAttachment = yamlStringify(results.XFI_RESULT);
    const yamlSection = `
<h2>📎 Full Results (YAML)</h2>
<pre style="background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto;">
${yamlAttachment}
</pre>`;

${yamlSection}

<p>Please address these issues as soon as possible.</p>`;
    }
<h2>📎 Full Results (YAML)</h2>
<pre style="background-color: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto;">
${yamlAttachment}
</pre>`;

    // Success template
    return `<h1>✅ Success!</h1>

<p>Your codebase passed all X-Fidelity checks.</p>

<h2>📊 Summary</h2>
<ul>
  <li><strong>Archetype:</strong> <code>${results.XFI_RESULT.archetype}</code></li>
  <li><strong>Files analyzed:</strong> ${results.XFI_RESULT.fileCount}</li>
  <li><strong>Execution time:</strong> ${results.XFI_RESULT.durationSeconds} seconds</li>
</ul>

${yamlSection}

<p>🎉 Great job keeping the code clean!</p>`;
  }
}
