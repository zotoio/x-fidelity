import * as fs from 'fs/promises';
import * as path from 'path';
import type { ResultMetadata } from '@x-fidelity/types';
import { ConfigManager } from '../configuration/configManager';

export interface ReportHistoryEntry {
  id: string;
  timestamp: number;
  commitHash?: string;
  branch?: string;
  result: ResultMetadata;
  summary: ReportSummary;
  filePath: string;
}

export interface ReportSummary {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  hintCount: number;
  fatalityCount: number;
  exemptCount: number;
  fileCount: number;
  durationSeconds: number;
  archetype: string;
}

export interface TrendData {
  timestamps: number[];
  totalIssues: number[];
  errorCounts: number[];
  warningCounts: number[];
  filesCounts: number[];
}

export interface ComparisonResult {
  previous: ReportHistoryEntry;
  current: ReportHistoryEntry;
  changes: {
    totalIssuesChange: number;
    errorsChange: number;
    warningsChange: number;
    newIssues: Array<{ file: string; rule: string; message: string }>;
    resolvedIssues: Array<{ file: string; rule: string; message: string }>;
    changedFiles: string[];
  };
}

export class ReportHistoryManager {
  private readonly HISTORY_FILE = '.xfidelity-history.json';
  private readonly MAX_HISTORY_ENTRIES = 100;
  
  constructor(private configManager: ConfigManager) {}
  
  async addReportToHistory(result: ResultMetadata, workspaceRoot: string): Promise<string> {
    const id = this.generateReportId();
    const timestamp = Date.now();
    
    // Ensure .xfiResults directory exists
    const resultsDir = path.join(workspaceRoot, '.xfiResults');
    await fs.mkdir(resultsDir, { recursive: true });
    
    // Get git information if available
    const gitInfo = await this.getGitInfo(workspaceRoot);
    
    const entry: ReportHistoryEntry = {
      id,
      timestamp,
      commitHash: gitInfo.commitHash,
      branch: gitInfo.branch,
      result,
      summary: this.createSummary(result),
      filePath: this.getReportFilePath(resultsDir, id)
    };
    
    // Save the full report data to separate file
    await this.saveReportData(entry.filePath, result);
    
    // Add to history index
    await this.addToHistoryIndex(workspaceRoot, entry);
    
    return id;
  }
  
  async getReportHistory(workspaceRoot: string): Promise<ReportHistoryEntry[]> {
    const resultsDir = path.join(workspaceRoot, '.xfiResults');
    const historyFile = path.join(resultsDir, this.HISTORY_FILE);
    
    try {
      const data = await fs.readFile(historyFile, 'utf8');
      const history = JSON.parse(data) as ReportHistoryEntry[];
      
      // Sort by timestamp (newest first)
      return history.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
  
  async getReportById(workspaceRoot: string, id: string): Promise<ReportHistoryEntry | null> {
    const history = await this.getReportHistory(workspaceRoot);
    return history.find(entry => entry.id === id) || null;
  }
  
  async compareReports(workspaceRoot: string, currentId: string, previousId?: string): Promise<ComparisonResult | null> {
    const current = await this.getReportById(workspaceRoot, currentId);
    if (!current) {return null;}
    
    let previous: ReportHistoryEntry | null;
    
    if (previousId) {
      previous = await this.getReportById(workspaceRoot, previousId);
    } else {
      // Get the most recent report before current
      const history = await this.getReportHistory(workspaceRoot);
      const currentIndex = history.findIndex(entry => entry.id === currentId);
      previous = currentIndex < history.length - 1 ? history[currentIndex + 1] : null;
    }
    
    if (!previous) {return null;}
    
    return this.generateComparison(previous, current);
  }
  
  async getTrendData(workspaceRoot: string, days: number = 30): Promise<TrendData> {
    const history = await this.getReportHistory(workspaceRoot);
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const recentHistory = history.filter(entry => entry.timestamp >= cutoffTime);
    
    return {
      timestamps: recentHistory.map(entry => entry.timestamp),
      totalIssues: recentHistory.map(entry => entry.summary.totalIssues),
      errorCounts: recentHistory.map(entry => entry.summary.errorCount),
      warningCounts: recentHistory.map(entry => entry.summary.warningCount),
      filesCounts: recentHistory.map(entry => entry.summary.fileCount)
    };
  }
  
  async cleanupOldReports(workspaceRoot: string): Promise<void> {
    const config = this.configManager.getConfig();
    if (config.reportRetentionDays <= 0) {return;}
    
    const cutoffTime = Date.now() - (config.reportRetentionDays * 24 * 60 * 60 * 1000);
    const history = await this.getReportHistory(workspaceRoot);
    
    // Filter out old entries and delete their files
    const filteredHistory: ReportHistoryEntry[] = [];
    for (const entry of history) {
      if (entry.timestamp >= cutoffTime) {
        filteredHistory.push(entry);
      } else {
        // Delete the report file
        try {
          await fs.unlink(entry.filePath);
        } catch {
          // Ignore file deletion errors
        }
      }
    }
    
    // Save the filtered history
    await this.saveHistoryIndex(workspaceRoot, filteredHistory);
  }
  
  async exportHistory(workspaceRoot: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const history = await this.getReportHistory(workspaceRoot);
    const resultsDir = path.join(workspaceRoot, '.xfiResults');
    const exportPath = path.join(resultsDir, `xfi-history-export-${Date.now()}.${format}`);
    
    if (format === 'csv') {
      const csv = this.generateHistoryCSV(history);
      await fs.writeFile(exportPath, csv);
    } else {
      const json = JSON.stringify(history, null, 2);
      await fs.writeFile(exportPath, json);
    }
    
    return exportPath;
  }
  
  private createSummary(result: ResultMetadata): ReportSummary {
    const data = result.XFI_RESULT;
    
    // Count different severity levels
    let infoCount = 0;
    let hintCount = 0;
    
    for (const detail of data.issueDetails) {
      for (const error of detail.errors) {
        const level = (error.level as string) || 'hint';
        if (level === 'info' || level === 'information') {infoCount++;}
        else if (level === 'hint') {hintCount++;}
      }
    }
    
    return {
      totalIssues: data.totalIssues,
      errorCount: data.errorCount,
      warningCount: data.warningCount,
      infoCount,
      hintCount,
      fatalityCount: data.fatalityCount,
      exemptCount: data.exemptCount,
      fileCount: data.fileCount,
      durationSeconds: data.durationSeconds,
      archetype: data.archetype
    };
  }
  
  private async getGitInfo(workspaceRoot: string): Promise<{ commitHash?: string; branch?: string }> {
    try {
      const gitDir = path.join(workspaceRoot, '.git');
      
      // Get current branch
      let branch: string | undefined;
      try {
        const headPath = path.join(gitDir, 'HEAD');
        const headContent = await fs.readFile(headPath, 'utf8');
        
        if (headContent.startsWith('ref: refs/heads/')) {
          branch = headContent.replace('ref: refs/heads/', '').trim();
        }
      } catch {
        // Ignore branch detection errors
      }
      
      // Get current commit hash
      let commitHash: string | undefined;
      try {
        if (branch) {
          const refPath = path.join(gitDir, 'refs', 'heads', branch);
          commitHash = (await fs.readFile(refPath, 'utf8')).trim();
        } else {
          // Detached HEAD
          const headPath = path.join(gitDir, 'HEAD');
          const headContent = await fs.readFile(headPath, 'utf8');
          if (!headContent.startsWith('ref: ')) {
            commitHash = headContent.trim();
          }
        }
      } catch {
        // Ignore commit hash detection errors
      }
      
      return { commitHash, branch };
    } catch {
      return {};
    }
  }
  
  private generateReportId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getReportFilePath(resultsDir: string, id: string): string {
    return path.join(resultsDir, `.xfidelity-report-${id}.json`);
  }
  
  private async saveReportData(filePath: string, result: ResultMetadata): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(result, null, 2));
  }
  
  private async addToHistoryIndex(workspaceRoot: string, entry: ReportHistoryEntry): Promise<void> {
    const history = await this.getReportHistory(workspaceRoot);
    
    // Remove result data to keep index lightweight
    const indexEntry = { ...entry };
    delete (indexEntry as any).result;
    
    history.unshift(indexEntry);
    
    // Limit history size
    if (history.length > this.MAX_HISTORY_ENTRIES) {
      history.splice(this.MAX_HISTORY_ENTRIES);
    }
    
    await this.saveHistoryIndex(workspaceRoot, history);
  }
  
  private async saveHistoryIndex(workspaceRoot: string, history: ReportHistoryEntry[]): Promise<void> {
    const resultsDir = path.join(workspaceRoot, '.xfiResults');
    const historyFile = path.join(resultsDir, this.HISTORY_FILE);
    await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
  }
  
  private generateComparison(previous: ReportHistoryEntry, current: ReportHistoryEntry): ComparisonResult {
    const changes = {
      totalIssuesChange: current.summary.totalIssues - previous.summary.totalIssues,
      errorsChange: current.summary.errorCount - previous.summary.errorCount,
      warningsChange: current.summary.warningCount - previous.summary.warningCount,
      newIssues: [] as Array<{ file: string; rule: string; message: string }>,
      resolvedIssues: [] as Array<{ file: string; rule: string; message: string }>,
      changedFiles: [] as string[]
    };
    
    // Load full report data for detailed comparison if available
    if (previous.result && current.result) {
      const prevIssues = this.extractIssueMap(previous.result);
      const currIssues = this.extractIssueMap(current.result);
      
      // Find new issues
      for (const [key, issue] of currIssues) {
        if (!prevIssues.has(key)) {
          changes.newIssues.push(issue);
        }
      }
      
      // Find resolved issues
      for (const [key, issue] of prevIssues) {
        if (!currIssues.has(key)) {
          changes.resolvedIssues.push(issue);
        }
      }
      
      // Find changed files
      const prevFiles = new Set(previous.result.XFI_RESULT.issueDetails.map(d => d.filePath));
      const currFiles = new Set(current.result.XFI_RESULT.issueDetails.map(d => d.filePath));
      
      changes.changedFiles = [...new Set([...prevFiles, ...currFiles])].filter(file => {
        const prevFileIssues = previous.result!.XFI_RESULT.issueDetails.find(d => d.filePath === file)?.errors.length || 0;
        const currFileIssues = current.result!.XFI_RESULT.issueDetails.find(d => d.filePath === file)?.errors.length || 0;
        return prevFileIssues !== currFileIssues;
      });
    }
    
    return { previous, current, changes };
  }
  
  private extractIssueMap(result: ResultMetadata): Map<string, { file: string; rule: string; message: string }> {
    const issueMap = new Map();
    
    for (const detail of result.XFI_RESULT.issueDetails) {
      for (const error of detail.errors) {
        const key = `${detail.filePath}:${error.ruleFailure}:${error.details?.lineNumber || 0}`;
        issueMap.set(key, {
          file: detail.filePath,
          rule: error.ruleFailure,
          message: error.details?.message || error.ruleFailure
        });
      }
    }
    
    return issueMap;
  }
  
  private generateHistoryCSV(history: ReportHistoryEntry[]): string {
    const headers = [
      'Timestamp',
      'Date',
      'Branch',
      'Commit',
      'Total Issues',
      'Errors',
      'Warnings',
      'Info',
      'Hints',
      'Fatal',
      'Exempt',
      'Files',
      'Duration (s)',
      'Archetype'
    ];
    
    const rows = history.map(entry => [
      entry.timestamp,
      new Date(entry.timestamp).toISOString(),
      entry.branch || '',
      entry.commitHash || '',
      entry.summary.totalIssues,
      entry.summary.errorCount,
      entry.summary.warningCount,
      entry.summary.infoCount,
      entry.summary.hintCount,
      entry.summary.fatalityCount,
      entry.summary.exemptCount,
      entry.summary.fileCount,
      entry.summary.durationSeconds,
      entry.summary.archetype
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
} 
