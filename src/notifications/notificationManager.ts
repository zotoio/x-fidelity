import { logger } from '../utils/logger';
import { execSync } from 'child_process';
import { ResultMetadata, RepoXFIConfig } from '../types/typeDefs';
import { Notification, NotificationProvider, NotificationConfig, CodeOwner } from '../types/notificationTypes';
import fs from 'fs';
import { stringify as yamlStringify } from 'yaml';

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

  public async sendReport(results: ResultMetadata): Promise<void> {
    if (!this.config.enabled) {
      logger.debug('Notifications are disabled');
      return;
    }

    // Merge global config with repo-specific config
    const notifyConfig = this.mergeNotificationConfig(results.XFI_RESULT.repoXFIConfig);

    // Determine if we should send notification based on results
    const hasIssues = results.XFI_RESULT.issueDetails.length > 0;
    if (hasIssues && !notifyConfig.notifyOnFailure) {
      logger.debug('Skipping notification for failure as notifyOnFailure is disabled');
      return;
    }
    if (!hasIssues && !notifyConfig.notifyOnSuccess) {
      logger.debug('Skipping notification for success as notifyOnSuccess is disabled');
      return;
    }

    // Get recipients from multiple sources
    const recipients = this.getRecipients(this.getAffectedFiles(results), results.XFI_RESULT.repoXFIConfig, notifyConfig);
    if (Object.values(recipients).every(list => list.length === 0)) {
      logger.warn('No recipients found for notification');
      return;
    }

    // Generate report content
    const subject = hasIssues
      ? `[X-Fidelity] Issues found in your codebase (${results.XFI_RESULT.totalIssues})`
      : '[X-Fidelity] Your codebase passed all checks';

    const content = this.generateReportContent(results);

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

  // Helper function to extract affected files from results
  private getAffectedFiles(results: ResultMetadata): string[] {
    const affectedFiles: string[] = [];

    if (results.XFI_RESULT.issueDetails) {
      for (const issue of results.XFI_RESULT.issueDetails) {
        if (issue.filePath && !affectedFiles.includes(issue.filePath)) {
          affectedFiles.push(issue.filePath);
        }
      }
    }

    return affectedFiles;
  }

  private generateReportContent(results: ResultMetadata): string {
    // Get GitHub details from git commands with fallbacks to env vars
    let githubServer = '';
    let githubRepo = '';
    let githubBranch = '';

    try {
      // Get remote URL and extract server/repo
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8', cwd: results.XFI_RESULT.repoPath })?.toString().trim();
      if (remoteUrl) {
        const match = remoteUrl.match(/^(?:https?:\/\/|git@)([^/:]+)[/:]([^/]+\/[^/.]+)(?:\.git)?$/);
        if (match) {
          githubServer = process.env.GITHUB_SERVER_URL || `https://${match[1]}`;
          githubRepo = process.env.GITHUB_REPOSITORY || match[2];
        }
      }

      // Get current branch
      githubBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8', cwd: results.XFI_RESULT.repoPath })?.toString().trim();
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

    let fileDetails = '';

    if (results.XFI_RESULT.issueDetails.length > 0) {

      try {
        // Failure template
        fileDetails = results.XFI_RESULT.issueDetails.map(issue => {
          logger.trace(issue, `generating report content for issue: ${issue.filePath}`);
          // Remove local path prefix from file paths
          const relativePath = issue.filePath.replace(results.XFI_RESULT.repoPath + '/', '');
          const fileIssues = issue.errors;

          // Start with file name as bold list item with link
          let output = `<li><strong><a href="${githubUrl}/${relativePath}">${relativePath}</a></strong><ul>`;

          // Add rule failures with severity-based colors and line links
          const ruleDetails = fileIssues?.map(error => {
            const ruleName = error.ruleFailure;
            const level = error.level;
            const resultDetails = error?.details;
            const message = resultDetails?.message;

            let output = `<li>
                    <span>${ruleName}: ${level}</span><br>
                    <span>${message}</span><ul>
                  `;

            if (!Array.isArray(resultDetails?.details || !resultDetails?.details?.details[0].lineNumber)) {
              return '</li>' + output + '<pre>' + yamlStringify(resultDetails?.details) + '</pre></li></ul></li>';
            }

            const errorDetails = resultDetails?.details?.map((errorInstance: any) => {
              const lineNumber = errorInstance?.lineNumber;
              const lineLink = lineNumber ? `${githubUrl}/${relativePath}#L${lineNumber}` : `${githubUrl}/${relativePath}`;
              const color = level === 'fatality' ? '#f20707' :
                level === 'error' ? '#53046c' :
                  level === 'warning' ? '#944801' : '#1a1818';

              return `<li><span style="color: ${color};font-weight:bold">${ruleName}</span>${lineNumber ? ` - <a href="${lineLink}">Line ${lineNumber}</a>` : ''}</li>`;
            }).join('');

            return output + errorDetails + '</ul></li>';
          }).join('');

          logger.trace(`fileDetails: ${output + ruleDetails}</ul></li>`);
          return output + ruleDetails + '</ul></li>';
        }).join('');

      } catch (error: any) {
        logger.error(error, 'Failed to generate report content');
        logger.error(JSON.stringify(error))
        logger.error(error.message)
        logger.error(error.stack)
        return '';
      }


      // Generate YAML attachment
      const yamlAttachment = yamlStringify(results.XFI_RESULT);
      const yamlSection = `
<h2>📎 Full Results (YAML)</h2>
<pre style="background-color: #d1e3f6; padding: 16px; border-radius: 6px; overflow-x: auto;">
${yamlAttachment}
</pre>`;

      const result = `<h1>🚨 Issues Detected</h1>

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

<p>Please address these issues as soon as possible.</p>

${yamlSection}
    `
    logger.trace(result)
    return result
    } else {
      // Success template
      return `<h1>✅ Success!</h1>

<p>Your codebase passed all X-Fidelity checks.</p>

<h2>📊 Summary</h2>
<ul>
  <li><strong>Archetype:</strong> <code>${results.XFI_RESULT.archetype}</code></li>
  <li><strong>Files analyzed:</strong> ${results.XFI_RESULT.fileCount}</li>
  <li><strong>Execution time:</strong> ${results.XFI_RESULT.durationSeconds} seconds</li>
</ul>

<p>🎉 Great job keeping the code clean!</p>`;
    }
  }
}
