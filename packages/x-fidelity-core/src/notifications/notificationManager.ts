import { 
    NotificationConfig,
    NotificationProvider,
    Notification,
    ResultMetadata
} from '@x-fidelity/types';
import { RepoXFIConfig } from '@x-fidelity/types';
import { logger } from '../utils/logger';
import { execSync } from 'child_process';
import { CodeOwner } from '@x-fidelity/types';
import fs from 'fs';
import { stringify as yamlStringify } from 'yaml';

export class NotificationManager {
    private providers: Map<string, NotificationProvider>;
    private config: NotificationConfig;
    private codeOwners: CodeOwner[] = [];

    constructor(repoXFIConfig?: RepoXFIConfig) {
        this.providers = new Map();
        this.config = {
            notifyOnSuccess: repoXFIConfig?.notifications?.notifyOnSuccess ?? true,
            notifyOnFailure: repoXFIConfig?.notifications?.notifyOnFailure ?? true,
            codeOwners: repoXFIConfig?.notifications?.codeOwners ?? false,
            recipients: repoXFIConfig?.notifications?.recipients,
            providers: repoXFIConfig?.notifications?.providers,
            codeOwnersPath: repoXFIConfig?.notifications?.codeOwnersPath || '.github/CODEOWNERS'
        };
        this.loadCodeOwners();
    }

    public registerProvider(name: string, provider: NotificationProvider): void {
        this.providers.set(name, provider);
    }

    public async notify(type: 'success' | 'failure', results: ResultMetadata): Promise<void> {
        if (!this.shouldNotify(type)) {
            return;
        }

        const notification: Notification = {
            type,
            title: this.getNotificationTitle(type, results),
            message: this.getNotificationMessage(results),
            recipients: await this.getRecipients(results),
            subject: this.getNotificationTitle(type, results),
            content: this.generateReportContent(results),
            metadata: {
                results
            }
        };

        await this.sendNotifications(notification);
    }

    private shouldNotify(type: 'success' | 'failure'): boolean {
        return type === 'success' ? this.config.notifyOnSuccess! : this.config.notifyOnFailure!;
    }

    private getNotificationTitle(type: 'success' | 'failure', results: ResultMetadata): string {
        const status = type === 'success' ? 'Success' : 'Failure';
        return `X-Fidelity Analysis ${status}: ${results.XFI_RESULT.archetype}`;
    }

    private getNotificationMessage(results: ResultMetadata): string {
        const { totalIssues, warningCount, errorCount, fatalityCount } = results.XFI_RESULT;
        return `Found ${totalIssues} issues (${warningCount} warnings, ${errorCount} errors, ${fatalityCount} fatal)`;
    }

    private async sendNotifications(notification: Notification): Promise<void> {
        const promises = Array.from(this.providers.values()).map(async provider => {
            try {
                await provider.send(notification);
            } catch (error) {
                logger.error('Error sending notification:', error);
                // Continue with other providers even if one fails
            }
        });

        await Promise.allSettled(promises);
    }

    private async loadCodeOwners(): Promise<void> {
        if (!this.config.codeOwnersPath) {
            return;
        }

        try {
            const codeOwnersContent = fs.readFileSync(this.config.codeOwnersPath, 'utf8');
            const lines = codeOwnersContent.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const parts = trimmed.split(/\s+/);
                    if (parts.length >= 2) {
                        const path = parts[0];
                        const owners = parts.slice(1).map(owner => owner.replace('@', ''));
                        this.codeOwners.push({ pattern: path, path, owners });
                    }
                }
            }
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
            githubRepo = process.env.GITHUB_REPOSITORY || results.XFI_RESULT.repoUrl || 'unknown'
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

            const result = `<h1>🚨 X-Fidelity Analysis - Issues Detected</h1>

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
            return `<h1>✅ X-Fidelity Analysis - Success!</h1>

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

    async getRecipients(results: ResultMetadata): Promise<string[]> {
        const recipients: string[] = [];
        
        // Add configured recipients - handle both array format and object format
        if (Array.isArray(this.config.recipients)) {
            recipients.push(...this.config.recipients);
        } else if (this.config.recipients?.email) {
            recipients.push(...this.config.recipients.email);
        }
        
        // Add code owners if enabled
        if (this.config.codeOwners && this.codeOwners.length > 0) {
            const affectedFiles = this.getAffectedFiles(results);
            const codeOwnerEmails = this.getCodeOwnersForFiles(affectedFiles);
            recipients.push(...codeOwnerEmails);
        }
        
        return [...new Set(recipients)]; // Remove duplicates
    }
}
