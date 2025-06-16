import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type { ResultMetadata } from '@x-fidelity/types';
import { ConfigManager, type ReportFormat } from '../configuration/configManager';
import { ReportViewer } from './reportViewer';
import { ReportHistoryManager } from './reportHistoryManager';
import { ExportManager, type ExportOptions, type ShareOptions } from './exportManager';

export class ReportManager {
  private reportViewer: ReportViewer;
  private historyManager: ReportHistoryManager;
  private exportManager: ExportManager;
  
  constructor(
    private configManager: ConfigManager,
    private context: vscode.ExtensionContext
  ) {
    this.reportViewer = new ReportViewer(context, configManager);
    this.historyManager = new ReportHistoryManager(configManager);
    this.exportManager = new ExportManager(configManager);
  }
  
  async generateReports(result: ResultMetadata, workspaceRoot: string): Promise<void> {
    const config = this.configManager.getConfig();
    
    if (!config.generateReports) {
      return;
    }
    
    const outputDir = config.reportOutputDir || workspaceRoot;
    const timestamp = this.getFormattedTimestamp();
    
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });
      
      // Add to history first
      const reportId = await this.historyManager.addReportToHistory(result, workspaceRoot);
      
      // Generate reports in requested formats
      const promises: Promise<void>[] = [];
      
      if (config.reportFormats.includes('json')) {
        promises.push(this.generateJSONReport(result, outputDir, timestamp));
      }
      
      if (config.reportFormats.includes('md')) {
        promises.push(this.generateMarkdownReport(result, outputDir, timestamp));
      }
      
      if (config.reportFormats.includes('html')) {
        promises.push(this.generateHTMLReport(result, outputDir, timestamp));
      }
      
      if (config.reportFormats.includes('csv')) {
        promises.push(this.generateCSVReport(result, outputDir, timestamp));
      }
      
      await Promise.all(promises);
      
      // Clean up old reports if retention is configured
      if (config.reportRetentionDays > 0) {
        await this.cleanupOldReports(outputDir, config.reportRetentionDays);
        await this.historyManager.cleanupOldReports(workspaceRoot);
      }
      
      // Open reports if configured
      if (config.showReportAfterAnalysis) {
        await this.showInteractiveReport(result);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to generate reports: ${errorMessage}`);
    }
  }
  
  private async generateJSONReport(result: ResultMetadata, outputDir: string, timestamp: string): Promise<void> {
    const filename = `xfi-report-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
  }
  
  private async generateMarkdownReport(result: ResultMetadata, outputDir: string, timestamp: string): Promise<void> {
    const filename = `xfi-report-${timestamp}.md`;
    const filepath = path.join(outputDir, filename);
    
    const content = this.generateMarkdownContent(result);
    await fs.writeFile(filepath, content);
  }
  
  private async generateHTMLReport(result: ResultMetadata, outputDir: string, timestamp: string): Promise<void> {
    const filename = `xfi-report-${timestamp}.html`;
    const filepath = path.join(outputDir, filename);
    
    const content = this.generateHTMLContent(result);
    await fs.writeFile(filepath, content);
  }
  
  private async generateCSVReport(result: ResultMetadata, outputDir: string, timestamp: string): Promise<void> {
    const filename = `xfi-report-${timestamp}.csv`;
    const filepath = path.join(outputDir, filename);
    
    const content = this.generateCSVContent(result);
    await fs.writeFile(filepath, content);
  }
  
  private generateMarkdownContent(result: ResultMetadata): string {
    const data = result.XFI_RESULT;
    const date = new Date().toISOString();
    
    let md = `# X-Fidelity Analysis Report\n\n`;
    md += `**Generated:** ${date}\n`;
    md += `**Archetype:** ${data.archetype}\n`;
    md += `**Repository:** ${data.repoPath}\n`;
    md += `**Files Analyzed:** ${data.fileCount}\n`;
    md += `**Analysis Duration:** ${data.durationSeconds.toFixed(2)}s\n\n`;
    
    // Summary
    md += `## Summary\n\n`;
    md += `| Metric | Count |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Issues | ${data.totalIssues} |\n`;
    md += `| Errors | ${data.errorCount} |\n`;
    md += `| Warnings | ${data.warningCount} |\n`;
    md += `| Fatal | ${data.fatalityCount} |\n`;
    md += `| Exempt | ${data.exemptCount} |\n\n`;
    
    // Issues by File
    if (data.issueDetails.length > 0) {
      md += `## Issues by File\n\n`;
      
      for (const detail of data.issueDetails) {
        if (detail.filePath === 'REPO_GLOBAL_CHECK') {
          md += `### Global Issues\n\n`;
        } else {
          md += `### ${detail.filePath}\n\n`;
        }
        
        if (detail.errors.length > 0) {
          for (const error of detail.errors) {
            const level = (error.level || 'unknown').toUpperCase();
            const rule = error.ruleFailure;
            const message = error.details?.message || error.ruleFailure;
            const line = error.details?.lineNumber ? ` (Line ${error.details.lineNumber})` : '';
            
            md += `- **${level}** [${rule}]: ${message}${line}\n`;
          }
        } else {
          md += `*No issues found.*\n`;
        }
        md += `\n`;
      }
    }
    
    // Performance Metrics
    if (data.factMetrics) {
      md += `## Performance Metrics\n\n`;
      md += `| Fact | Executions | Total Time (ms) | Avg Time (ms) |\n`;
      md += `|------|------------|-----------------|---------------|\n`;
      
      for (const [factName, metrics] of Object.entries(data.factMetrics)) {
        const avgTime = (metrics as any).totalExecutionTime / (metrics as any).executionCount;
        md += `| ${factName} | ${(metrics as any).executionCount} | ${(metrics as any).totalExecutionTime} | ${avgTime.toFixed(2)} |\n`;
      }
      md += `\n`;
    }
    
    // Memory Usage
    if (data.memoryUsage) {
      md += `## Memory Usage\n\n`;
      md += `| Metric | Value (MB) |\n`;
      md += `|--------|------------|\n`;
      md += `| Heap Used | ${(data.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} |\n`;
      md += `| Heap Total | ${(data.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} |\n`;
      md += `| RSS | ${(data.memoryUsage.rss / 1024 / 1024).toFixed(2)} |\n\n`;
    }
    
    return md;
  }
  
  private generateHTMLContent(result: ResultMetadata): string {
    const data = result.XFI_RESULT;
    const date = new Date().toISOString();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>X-Fidelity Analysis Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007acc; }
        .metric-label { color: #666; margin-top: 5px; }
        .issue { margin: 10px 0; padding: 15px; border-left: 4px solid #ddd; background: #f9f9f9; }
        .issue.error { border-left-color: #dc3545; }
        .issue.warning { border-left-color: #ffc107; }
        .issue.info { border-left-color: #17a2b8; }
        .file-section { margin: 30px 0; }
        .file-name { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
    </style>
</head>
<body>
    <div class="header">
        <h1>X-Fidelity Analysis Report</h1>
        <p><strong>Generated:</strong> ${date}</p>
        <p><strong>Archetype:</strong> ${data.archetype}</p>
        <p><strong>Repository:</strong> ${data.repoPath}</p>
        <p><strong>Files Analyzed:</strong> ${data.fileCount}</p>
        <p><strong>Analysis Duration:</strong> ${data.durationSeconds.toFixed(2)}s</p>
    </div>
    
    <div class="summary">
        <div class="metric-card">
            <div class="metric-value">${data.totalIssues}</div>
            <div class="metric-label">Total Issues</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${data.errorCount}</div>
            <div class="metric-label">Errors</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${data.warningCount}</div>
            <div class="metric-label">Warnings</div>
        </div>
        <div class="metric-card">
            <div class="metric-value">${data.fatalityCount}</div>
            <div class="metric-label">Fatal</div>
        </div>
    </div>
    
    <h2>Issues by File</h2>
    ${data.issueDetails.map(detail => `
        <div class="file-section">
            <div class="file-name">${detail.filePath === 'REPO_GLOBAL_CHECK' ? 'Global Issues' : detail.filePath}</div>
                         ${detail.errors.map(error => `
                 <div class="issue ${error.level || 'unknown'}">
                     <strong>${(error.level || 'unknown').toUpperCase()}</strong> [${error.ruleFailure}]: 
                     ${error.details?.message || error.ruleFailure}
                     ${error.details?.lineNumber ? ` (Line ${error.details.lineNumber})` : ''}
                 </div>
             `).join('')}
        </div>
    `).join('')}
    
    ${data.memoryUsage ? `
    <h2>Memory Usage</h2>
    <table>
        <tr><th>Metric</th><th>Value (MB)</th></tr>
        <tr><td>Heap Used</td><td>${(data.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}</td></tr>
        <tr><td>Heap Total</td><td>${(data.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}</td></tr>
        <tr><td>RSS</td><td>${(data.memoryUsage.rss / 1024 / 1024).toFixed(2)}</td></tr>
    </table>
    ` : ''}
</body>
</html>`;
  }
  
  private generateCSVContent(result: ResultMetadata): string {
    const data = result.XFI_RESULT;
    let csv = 'File,Rule,Level,Message,Line,Column\n';
    
    for (const detail of data.issueDetails) {
      for (const error of detail.errors) {
        const file = detail.filePath.replace(/"/g, '""');
        const rule = error.ruleFailure.replace(/"/g, '""');
        const level = error.level;
        const message = (error.details?.message || error.ruleFailure).replace(/"/g, '""');
        const line = error.details?.lineNumber || '';
        const column = error.details?.columnNumber || '';
        
        csv += `"${file}","${rule}","${level}","${message}","${line}","${column}"\n`;
      }
    }
    
    return csv;
  }
  
  private getFormattedTimestamp(): string {
    const now = new Date();
    return now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '-');
  }
  
  private async cleanupOldReports(outputDir: string, retentionDays: number): Promise<void> {
    try {
      const files = await fs.readdir(outputDir);
      const reportFiles = files.filter(file => file.startsWith('xfi-report-'));
      const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      
      for (const file of reportFiles) {
        const filepath = path.join(outputDir, file);
        const stat = await fs.stat(filepath);
        
        if (stat.mtime.getTime() < cutoffTime) {
          await fs.unlink(filepath);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  
  // Enhanced Stage 3 Methods
  
  async showInteractiveReport(result: ResultMetadata): Promise<void> {
    await this.reportViewer.showReport({
      reportData: result,
      theme: 'auto'
    });
  }
  
  async exportReport(result: ResultMetadata, options: ExportOptions): Promise<string> {
    return await this.exportManager.exportReport(result, options);
  }
  
  async shareReport(result: ResultMetadata, options: ShareOptions): Promise<void> {
    await this.exportManager.shareReport(result, options);
  }
  
  async getReportHistory(workspaceRoot: string) {
    return await this.historyManager.getReportHistory(workspaceRoot);
  }
  
  async compareReports(workspaceRoot: string, currentId: string, previousId?: string) {
    return await this.historyManager.compareReports(workspaceRoot, currentId, previousId);
  }
  
  async getTrendData(workspaceRoot: string, days: number = 30) {
    return await this.historyManager.getTrendData(workspaceRoot, days);
  }
  
  async exportHistory(workspaceRoot: string, format: 'json' | 'csv' = 'json') {
    return await this.historyManager.exportHistory(workspaceRoot, format);
  }
  
  private async openReports(outputDir: string, timestamp: string): Promise<void> {
    const config = this.configManager.getConfig();
    
    // Open the first available report format
    for (const format of config.reportFormats) {
      const filename = `xfi-report-${timestamp}.${format}`;
      const filepath = path.join(outputDir, filename);
      
      try {
        await fs.access(filepath);
        const uri = vscode.Uri.file(filepath);
        await vscode.window.showTextDocument(uri);
        break;
      } catch {
        // File doesn't exist, try next format
      }
    }
  }
  
  dispose(): void {
    this.reportViewer?.dispose();
  }
} 