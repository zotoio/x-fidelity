import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ResultMetadata } from '@x-fidelity/types';
import { ConfigManager } from '../configuration/configManager';
// import type { ReportHistoryEntry } from './reportHistoryManager';

export interface ExportOptions {
  format: 'json' | 'csv' | 'excel' | 'pdf' | 'html' | 'markdown' | 'sarif';
  includeHistory?: boolean;
  includeTrends?: boolean;
  filterSeverity?: string[];
  customTemplate?: string;
  destination?: 'file' | 'clipboard' | 'email' | 'slack';
}

export interface ShareOptions {
  platform: 'email' | 'slack' | 'teams' | 'jira' | 'github';
  recipients?: string[];
  channel?: string;
  template?: string;
  includeAttachment?: boolean;
}

export class ExportManager {
  constructor(private configManager: ConfigManager) {}
  
  async exportReport(
    result: ResultMetadata,
    options: ExportOptions,
    outputPath?: string
  ): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }
    
    const timestamp = this.getTimestamp();
    const filename = `xfi-export-${timestamp}.${this.getFileExtension(options.format)}`;
    const filePath = outputPath || path.join(workspaceFolder.uri.fsPath, filename);
    
    let content: string;
    
    switch (options.format) {
      case 'json':
        content = await this.exportJSON(result, options);
        break;
      case 'csv':
        content = await this.exportCSV(result, options);
        break;
      case 'html':
        content = await this.exportHTML(result, options);
        break;
      case 'markdown':
        content = await this.exportMarkdown(result, options);
        break;
      case 'sarif':
        content = await this.exportSARIF(result, options);
        break;
      case 'excel':
        await this.exportExcel(result, options, filePath);
        return filePath;
      case 'pdf':
        await this.exportPDF(result, options, filePath);
        return filePath;
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
    
    // Handle different destinations
    switch (options.destination) {
      case 'clipboard':
        await vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage('Report copied to clipboard');
        return 'clipboard';
        
      case 'file':
      default:
        await fs.writeFile(filePath, content);
        vscode.window.showInformationMessage(`Report exported to: ${filePath}`);
        return filePath;
    }
  }
  
  async shareReport(
    result: ResultMetadata,
    options: ShareOptions
  ): Promise<void> {
    switch (options.platform) {
      case 'email':
        await this.shareViaEmail(result, options);
        break;
      case 'slack':
        await this.shareViaSlack(result, options);
        break;
      case 'teams':
        await this.shareViaTeams(result, options);
        break;
      case 'github':
        await this.shareViaGitHub(result, options);
        break;
      default:
        throw new Error(`Unsupported sharing platform: ${options.platform}`);
    }
  }
  
  async generateBatchReport(
    results: ResultMetadata[],
    options: ExportOptions
  ): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }
    
    const timestamp = this.getTimestamp();
    const filename = `xfi-batch-report-${timestamp}.${this.getFileExtension(options.format)}`;
    const filePath = path.join(workspaceFolder.uri.fsPath, filename);
    
    let content: string;
    
    switch (options.format) {
      case 'csv':
        content = this.generateBatchCSV(results);
        break;
      case 'html':
        content = this.generateBatchHTML(results);
        break;
      default:
        throw new Error(`Batch export not supported for format: ${options.format}`);
    }
    
    await fs.writeFile(filePath, content);
    return filePath;
  }
  
  private async exportJSON(result: ResultMetadata, options: ExportOptions): Promise<string> {
    const exportData: any = {
      timestamp: Date.now(),
      result
    };
    
    if (options.filterSeverity?.length) {
      exportData.result = this.filterResultBySeverity(result, options.filterSeverity);
    }
    
    return JSON.stringify(exportData, null, 2);
  }
  
  private async exportCSV(result: ResultMetadata, options: ExportOptions): Promise<string> {
    const data = options.filterSeverity?.length 
      ? this.filterResultBySeverity(result, options.filterSeverity)
      : result;
    
    const headers = [
      'File',
      'Rule',
      'Severity',
      'Message',
      'Line',
      'Column',
      'Category',
      'Fixable'
    ];
    
    const rows: string[][] = [];
    
    for (const detail of data.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        rows.push([
          detail.filePath,
          error.ruleFailure,
          error.level || 'hint',
          error.details?.message || error.ruleFailure,
          error.details?.lineNumber?.toString() || '',
          error.details?.columnNumber?.toString() || '',
          (error as any).category || '',
          (error as any).fixable ? 'Yes' : 'No'
        ]);
      }
    }
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }
  
  private async exportHTML(result: ResultMetadata, options: ExportOptions): Promise<string> {
    const data = options.filterSeverity?.length 
      ? this.filterResultBySeverity(result, options.filterSeverity)
      : result;
    
    const template = options.customTemplate || this.getDefaultHTMLTemplate();
    
    return this.renderTemplate(template, {
      data: data.XFI_RESULT,
      timestamp: new Date().toISOString(),
      options
    });
  }
  
  private async exportMarkdown(result: ResultMetadata, options: ExportOptions): Promise<string> {
    const data = options.filterSeverity?.length 
      ? this.filterResultBySeverity(result, options.filterSeverity)
      : result;
    
    let md = `# X-Fidelity Analysis Report\n\n`;
    md += `**Generated:** ${new Date().toISOString()}\n`;
    md += `**Repository:** ${data.XFI_RESULT.repoPath}\n`;
    md += `**Archetype:** ${data.XFI_RESULT.archetype}\n\n`;
    
    // Summary
    md += `## Summary\n\n`;
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Issues | ${data.XFI_RESULT.totalIssues} |\n`;
    md += `| Errors | ${data.XFI_RESULT.errorCount} |\n`;
    md += `| Warnings | ${data.XFI_RESULT.warningCount} |\n`;
    md += `| Fatal | ${data.XFI_RESULT.fatalityCount} |\n\n`;
    
    // Issues by severity
    const severityGroups = this.groupIssuesBySeverity(data);
    for (const [severity, issues] of Object.entries(severityGroups)) {
      if (issues.length === 0) {continue;}
      
      md += `## ${severity.toUpperCase()} Issues (${issues.length})\n\n`;
      
      for (const issue of issues) {
        md += `### ${issue.file}\n\n`;
        md += `- **Rule:** \`${issue.rule}\`\n`;
        md += `- **Message:** ${issue.message}\n`;
        if (issue.line) {md += `- **Location:** Line ${issue.line}\n`;}
        md += `\n`;
      }
    }
    
    return md;
  }
  
  private async exportSARIF(result: ResultMetadata, options: ExportOptions): Promise<string> {
    const data = options.filterSeverity?.length 
      ? this.filterResultBySeverity(result, options.filterSeverity)
      : result;
    
    const sarif = {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: 'X-Fidelity',
            version: '4.0.0',
            informationUri: 'https://github.com/zotoio/x-fidelity'
          }
        },
        results: [] as any[]
      }]
    };
    
    for (const detail of data.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        sarif.runs[0].results.push({
          ruleId: error.ruleFailure,
          level: this.mapSeverityToSARIF(error.level || 'hint'),
          message: {
            text: error.details?.message || error.ruleFailure
          },
          locations: [{
            physicalLocation: {
              artifactLocation: {
                uri: detail.filePath
              },
              region: {
                startLine: error.details?.lineNumber || 1,
                startColumn: error.details?.columnNumber || 1
              }
            }
          }]
        });
      }
    }
    
    return JSON.stringify(sarif, null, 2);
  }
  
  private async exportExcel(result: ResultMetadata, _options: ExportOptions, filePath: string): Promise<void> {
    // For now, export as CSV with .xlsx extension and show a message
    const csvContent = await this.exportCSV(result, _options);
    await fs.writeFile(filePath.replace('.xlsx', '.csv'), csvContent);
    
    vscode.window.showWarningMessage(
      'Excel export saved as CSV. Install a proper Excel library for native .xlsx support.',
      'View File'
    ).then(choice => {
      if (choice === 'View File') {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath.replace('.xlsx', '.csv')));
      }
    });
  }
  
  private async exportPDF(result: ResultMetadata, _options: ExportOptions, filePath: string): Promise<void> {
    // Generate HTML and show instructions for PDF conversion
    const htmlContent = await this.exportHTML(result, { format: 'html' });
    const htmlPath = filePath.replace('.pdf', '.html');
    await fs.writeFile(htmlPath, htmlContent);
    
    vscode.window.showInformationMessage(
      'HTML report generated. Use browser\'s "Print to PDF" feature for PDF export.',
      'Open HTML'
    ).then(choice => {
      if (choice === 'Open HTML') {
        vscode.env.openExternal(vscode.Uri.file(htmlPath));
      }
    });
  }
  
  private async shareViaEmail(result: ResultMetadata, options: ShareOptions): Promise<void> {
    const summary = this.generateSummary(result);
    const subject = `X-Fidelity Analysis Report - ${result.XFI_RESULT.repoPath}`;
    const body = this.generateEmailBody(result, summary);
    
    const mailto = `mailto:${options.recipients?.join(';') || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await vscode.env.openExternal(vscode.Uri.parse(mailto));
  }
  
  private async shareViaSlack(result: ResultMetadata, _options: ShareOptions): Promise<void> {
    const summary = this.generateSummary(result);
    const message = this.generateSlackMessage(result, summary);
    
    // Copy to clipboard for manual sharing
    await vscode.env.clipboard.writeText(message);
    vscode.window.showInformationMessage(
      'Slack message copied to clipboard. Paste it in your Slack channel.',
      'Open Slack'
    ).then(choice => {
      if (choice === 'Open Slack') {
        vscode.env.openExternal(vscode.Uri.parse('https://slack.com'));
      }
    });
  }
  
  private async shareViaTeams(result: ResultMetadata, _options: ShareOptions): Promise<void> {
    const summary = this.generateSummary(result);
    const message = this.generateTeamsMessage(result, summary);
    
    await vscode.env.clipboard.writeText(message);
    vscode.window.showInformationMessage(
      'Teams message copied to clipboard. Paste it in your Teams channel.',
      'Open Teams'
    ).then(choice => {
      if (choice === 'Open Teams') {
        vscode.env.openExternal(vscode.Uri.parse('https://teams.microsoft.com'));
      }
    });
  }
  
  private async shareViaGitHub(result: ResultMetadata, _options: ShareOptions): Promise<void> {
    const summary = this.generateSummary(result);
    const issueBody = this.generateGitHubIssueBody(result, summary);
    
    await vscode.env.clipboard.writeText(issueBody);
    vscode.window.showInformationMessage(
      'GitHub issue template copied to clipboard.',
      'Open GitHub'
    ).then(choice => {
      if (choice === 'Open GitHub') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com'));
      }
    });
  }
  
  private filterResultBySeverity(result: ResultMetadata, severities: string[]): ResultMetadata {
    const filtered = JSON.parse(JSON.stringify(result));
    
    filtered.XFI_RESULT.issueDetails = filtered.XFI_RESULT.issueDetails
      .map((detail: any) => ({
        ...detail,
        errors: detail.errors.filter((error: any) => 
          severities.includes(error.level || 'hint')
        )
      }))
      .filter((detail: any) => detail.errors.length > 0);
    
    // Recalculate counts
    filtered.XFI_RESULT.totalIssues = filtered.XFI_RESULT.issueDetails
      .reduce((sum: number, detail: any) => sum + detail.errors.length, 0);
    
    return filtered;
  }
  
  private groupIssuesBySeverity(result: ResultMetadata): Record<string, Array<{file: string, rule: string, message: string, line?: number}>> {
    const groups: Record<string, any[]> = {
      error: [],
      warning: [],
      info: [],
      hint: []
    };
    
    for (const detail of result.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        const severity = error.level || 'hint';
        groups[severity].push({
          file: detail.filePath,
          rule: error.ruleFailure,
          message: error.details?.message || error.ruleFailure,
          line: error.details?.lineNumber
        });
      }
    }
    
    return groups;
  }
  
  private generateSummary(result: ResultMetadata): string {
    const data = result.XFI_RESULT;
    return `${data.totalIssues} issues found (${data.errorCount} errors, ${data.warningCount} warnings)`;
  }
  
  private generateEmailBody(result: ResultMetadata, summary: string): string {
    return `X-Fidelity Analysis Report

Repository: ${result.XFI_RESULT.repoPath}
Archetype: ${result.XFI_RESULT.archetype}
Analysis Date: ${new Date().toISOString()}

Summary: ${summary}

Please see the attached detailed report for more information.`;
  }
  
  private generateSlackMessage(result: ResultMetadata, summary: string): string {
    const data = result.XFI_RESULT;
    return `🔍 *X-Fidelity Analysis Report*

📁 *Repository:* \`${data.repoPath}\`
🏗️ *Archetype:* ${data.archetype}
📅 *Date:* ${new Date().toLocaleDateString()}

📊 *Summary:* ${summary}

${data.errorCount > 0 ? `🔴 ${data.errorCount} errors` : ''}
${data.warningCount > 0 ? `🟡 ${data.warningCount} warnings` : ''}
${data.totalIssues === 0 ? '✅ No issues found!' : ''}`;
  }
  
  private generateTeamsMessage(result: ResultMetadata, summary: string): string {
    return this.generateSlackMessage(result, summary); // Similar format
  }
  
  private generateGitHubIssueBody(result: ResultMetadata, summary: string): string {
    const data = result.XFI_RESULT;
    return `## X-Fidelity Analysis Report

**Repository:** \`${data.repoPath}\`
**Archetype:** ${data.archetype}
**Analysis Date:** ${new Date().toISOString()}

### Summary
${summary}

### Breakdown
- 🔴 Errors: ${data.errorCount}
- 🟡 Warnings: ${data.warningCount}
- ⚠️ Fatal: ${data.fatalityCount}
- ✅ Exempt: ${data.exemptCount}

### Next Steps
- [ ] Review high-priority issues
- [ ] Address critical errors
- [ ] Update exemptions if needed

*Generated by X-Fidelity VS Code Extension*`;
  }
  
  private generateBatchCSV(results: ResultMetadata[]): string {
    const headers = ['Timestamp', 'Repository', 'Archetype', 'Total Issues', 'Errors', 'Warnings', 'Fatal', 'Files'];
    const rows = results.map(result => [
      new Date().toISOString(),
      result.XFI_RESULT.repoPath,
      result.XFI_RESULT.archetype,
      result.XFI_RESULT.totalIssues.toString(),
      result.XFI_RESULT.errorCount.toString(),
      result.XFI_RESULT.warningCount.toString(),
      result.XFI_RESULT.fatalityCount.toString(),
      result.XFI_RESULT.fileCount.toString()
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
  
  private generateBatchHTML(results: ResultMetadata[]): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>X-Fidelity Batch Analysis Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 40px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        .metric { font-weight: bold; }
    </style>
</head>
<body>
    <h1>X-Fidelity Batch Analysis Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    
    <table>
        <thead>
            <tr>
                <th>Repository</th>
                <th>Archetype</th>
                <th>Total Issues</th>
                <th>Errors</th>
                <th>Warnings</th>
                <th>Files</th>
            </tr>
        </thead>
        <tbody>
            ${results.map(result => `
                <tr>
                    <td>${result.XFI_RESULT.repoPath}</td>
                    <td>${result.XFI_RESULT.archetype}</td>
                    <td class="metric">${result.XFI_RESULT.totalIssues}</td>
                    <td>${result.XFI_RESULT.errorCount}</td>
                    <td>${result.XFI_RESULT.warningCount}</td>
                    <td>${result.XFI_RESULT.fileCount}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;
  }
  
  private getDefaultHTMLTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>X-Fidelity Analysis Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .metric { display: inline-block; margin: 10px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .issue { margin: 10px 0; padding: 15px; border-left: 4px solid #ddd; background: #f9f9f9; }
        .error { border-left-color: #dc3545; }
        .warning { border-left-color: #ffc107; }
        .info { border-left-color: #17a2b8; }
    </style>
</head>
<body>
    <div class="header">
        <h1>X-Fidelity Analysis Report</h1>
        <p><strong>Repository:</strong> {{data.repoPath}}</p>
        <p><strong>Generated:</strong> {{timestamp}}</p>
    </div>
    
    <div class="metrics">
        <div class="metric">
            <div class="metric-value">{{data.totalIssues}}</div>
            <div>Total Issues</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{data.errorCount}}</div>
            <div>Errors</div>
        </div>
        <div class="metric">
            <div class="metric-value">{{data.warningCount}}</div>
            <div>Warnings</div>
        </div>
    </div>
    
    <!-- Issues would be rendered here -->
</body>
</html>`;
  }
  
  private renderTemplate(template: string, data: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => obj?.[k], data);
      return value !== undefined ? String(value) : match;
    });
  }
  
  private mapSeverityToSARIF(severity: string): string {
    switch (severity) {
      case 'error':
      case 'fatal':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'note';
      default:
        return 'note';
    }
  }
  
  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      json: 'json',
      csv: 'csv',
      html: 'html',
      markdown: 'md',
      sarif: 'sarif',
      excel: 'xlsx',
      pdf: 'pdf'
    };
    return extensions[format] || 'txt';
  }
  
  private getTimestamp(): string {
    const now = new Date();
    const formatted = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-');
    const timestamp = now.getTime();
    return `${formatted}-${timestamp}`;
  }
} 
