import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as fsAsync from 'fs/promises';
import { createComponentLogger } from './globalLogger';
import { getAnalysisTargetDirectory } from './workspaceUtils';
import type { ResultMetadata } from '@x-fidelity/types';

const logger = createComponentLogger('ResultFileManager');

export interface XFIResultFile {
  filename: string;
  fullPath: string;
  timestamp: number;
  metadata: ResultMetadata;
  fileType: string; // 'json', 'md', 'html', 'csv', etc.
  prefix: string; // The file prefix like 'xfi-report', 'xfidelity-history', etc.
}

/**
 * Enhanced result file manager with per-prefix retention and readable date formatting
 */
export class ResultFileManager {
  private static readonly RESULTS_DIR = '.xfiResults';
  private static readonly MAX_FILES_PER_PREFIX = 10; // Keep 10 files per prefix type
  private static readonly LATEST_RESULT_FILENAME = 'XFI_RESULT.json';

  /**
   * Generate a filename with readable date format
   * Format: prefix-YYYY-MM-DD-timestamp.extension
   */
  private static generateTimestampedFilename(
    prefix: string,
    extension: string
  ): string {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timestamp = now.getTime();
    return `${prefix}-${dateStr}-${timestamp}.${extension}`;
  }

  /**
   * Extract prefix from filename
   */
  private static extractPrefix(filename: string): string {
    // Match patterns like: prefix-YYYY-MM-DD-timestamp.ext or prefix-timestamp.ext
    const match = filename.match(/^([a-zA-Z-]+?)(?:-\d{4}-\d{2}-\d{2})?-\d+\./);
    return match ? match[1] : filename.split('-')[0] || filename.split('.')[0];
  }

  /**
   * Extract timestamp from filename
   */
  private static extractTimestamp(filename: string): number {
    // Look for timestamp pattern at end: -1234567890.ext
    const match = filename.match(/-(\d+)\.[^.]+$/);
    if (match) {
      return parseInt(match[1], 10);
    }

    // Fallback to file stats if no timestamp in name
    return 0;
  }

  /**
   * Get file extension from filename
   */
  private static getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Save a result file with proper naming and cleanup
   */
  static async saveResultFile(
    content: string,
    prefix: string,
    extension: string,
    metadata: ResultMetadata,
    targetDirectory?: string
  ): Promise<XFIResultFile | null> {
    try {
      const repoRoot =
        targetDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) {
        logger.warn('No target directory available for saving results');
        return null;
      }

      const resultsDir = path.join(repoRoot, this.RESULTS_DIR);

      // Ensure results directory exists
      await fsAsync.mkdir(resultsDir, { recursive: true });

      // Generate timestamped filename
      const filename = this.generateTimestampedFilename(prefix, extension);
      const filePath = path.join(resultsDir, filename);

      // Write the file
      await fsAsync.writeFile(filePath, content, 'utf8');

      const resultFile: XFIResultFile = {
        filename,
        fullPath: filePath,
        timestamp: Date.now(),
        metadata,
        fileType: extension,
        prefix
      };

      logger.info(`${extension.toUpperCase()} report saved: ${filename}`);

      // Clean up old files for this prefix
      await this.cleanupOldFilesByPrefix(resultsDir, prefix, extension);

      return resultFile;
    } catch (error) {
      logger.error('Failed to save result file', { prefix, extension, error });
      return null;
    }
  }

  /**
   * Save multiple report formats and update latest result
   */
  static async saveMultipleFormats(
    reports: Array<{
      content: string;
      prefix: string;
      extension: string;
    }>,
    metadata: ResultMetadata,
    targetDirectory?: string
  ): Promise<XFIResultFile[]> {
    const savedFiles: XFIResultFile[] = [];

    for (const report of reports) {
      const savedFile = await this.saveResultFile(
        report.content,
        report.prefix,
        report.extension,
        metadata,
        targetDirectory
      );

      if (savedFile) {
        savedFiles.push(savedFile);
      }
    }

    // Update latest result file if we have a JSON report
    const jsonFile = savedFiles.find(f => f.fileType === 'json');
    if (jsonFile) {
      await this.updateLatestResult(jsonFile, targetDirectory);
    }

    return savedFiles;
  }

  /**
   * Update the latest result file (always XFI_RESULT.json)
   */
  static async updateLatestResult(
    sourceFile: XFIResultFile,
    targetDirectory?: string
  ): Promise<void> {
    try {
      const repoRoot =
        targetDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) {
        return;
      }

      const resultsDir = path.join(repoRoot, this.RESULTS_DIR);
      const latestPath = path.join(resultsDir, this.LATEST_RESULT_FILENAME);

      // Copy the source file content to the latest result file
      const content = await fsAsync.readFile(sourceFile.fullPath, 'utf8');
      await fsAsync.writeFile(latestPath, content, 'utf8');

      logger.info(`Latest result updated: ${this.LATEST_RESULT_FILENAME}`);
    } catch (error) {
      logger.error('Failed to update latest result', { error });
    }
  }

  /**
   * Clean up old files by prefix, keeping only the most recent MAX_FILES_PER_PREFIX
   */
  static async cleanupOldFilesByPrefix(
    resultsDir: string,
    prefix: string,
    extension: string
  ): Promise<void> {
    try {
      if (!fs.existsSync(resultsDir)) {
        return;
      }

      const files = await fsAsync.readdir(resultsDir);

      // Filter files by prefix and extension
      const prefixFiles = files
        .filter(file => {
          const filePrefix = this.extractPrefix(file);
          const fileExt = this.getFileExtension(file);
          return filePrefix === prefix && fileExt === extension;
        })
        .map(file => {
          const filePath = path.join(resultsDir, file);
          const stats = fs.statSync(filePath);
          const timestamp = this.extractTimestamp(file) || stats.mtimeMs;

          return {
            filename: file,
            fullPath: filePath,
            timestamp,
            mtime: stats.mtimeMs
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending (newest first)

      // Remove excess files (keep only MAX_FILES_PER_PREFIX)
      if (prefixFiles.length > this.MAX_FILES_PER_PREFIX) {
        const filesToDelete = prefixFiles.slice(this.MAX_FILES_PER_PREFIX);

        for (const file of filesToDelete) {
          try {
            // CRITICAL SAFETY CHECK: Never delete XFI_RESULT.json
            if (
              file.filename === 'XFI_RESULT.json' ||
              file.fullPath.endsWith('.xfiResults/XFI_RESULT.json')
            ) {
              logger.error(
                `🚨 CRITICAL: Attempted to delete XFI_RESULT.json - BLOCKED!`,
                {
                  filename: file.filename,
                  fullPath: file.fullPath
                }
              );
              continue;
            }

            await fsAsync.unlink(file.fullPath);
            logger.debug(`Cleaned up old file: ${file.filename}`);
          } catch (deleteError) {
            logger.warn(`Failed to delete old file: ${file.filename}`, {
              deleteError
            });
          }
        }

        logger.info(
          `Cleaned up ${filesToDelete.length} old ${extension} files with prefix '${prefix}'`
        );
      }
    } catch (error) {
      logger.error('Failed to cleanup old files by prefix', {
        prefix,
        extension,
        error
      });
    }
  }

  /**
   * Get all result files grouped by prefix and type
   */
  static async getResultFiles(
    targetDirectory?: string
  ): Promise<Record<string, XFIResultFile[]>> {
    try {
      const repoRoot =
        targetDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) {
        return {};
      }

      const resultsDir = path.join(repoRoot, this.RESULTS_DIR);
      if (!fs.existsSync(resultsDir)) {
        return {};
      }

      const files = await fsAsync.readdir(resultsDir);
      const resultFiles: Record<string, XFIResultFile[]> = {};

      for (const file of files) {
        // Skip the latest result file and log files
        if (file === this.LATEST_RESULT_FILENAME || file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(resultsDir, file);
        const stats = fs.statSync(filePath);
        const prefix = this.extractPrefix(file);
        const extension = this.getFileExtension(file);
        const timestamp = this.extractTimestamp(file) || stats.mtimeMs;

        const resultFile: XFIResultFile = {
          filename: file,
          fullPath: filePath,
          timestamp,
          metadata: {} as ResultMetadata, // Would need to read from file if needed
          fileType: extension,
          prefix
        };

        const key = `${prefix}-${extension}`;
        if (!resultFiles[key]) {
          resultFiles[key] = [];
        }
        resultFiles[key].push(resultFile);
      }

      // Sort each group by timestamp descending
      for (const key in resultFiles) {
        resultFiles[key].sort((a, b) => b.timestamp - a.timestamp);
      }

      return resultFiles;
    } catch (error) {
      logger.error('Failed to get result files', { error });
      return {};
    }
  }

  /**
   * Get the latest result file content
   */
  static getLatestResult(targetDirectory?: string): string | null {
    try {
      const repoRoot =
        targetDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) {
        return null;
      }

      const resultsDir = path.join(repoRoot, this.RESULTS_DIR);
      const latestPath = path.join(resultsDir, this.LATEST_RESULT_FILENAME);

      if (fs.existsSync(latestPath)) {
        return fs.readFileSync(latestPath, 'utf8');
      }

      return null;
    } catch (error) {
      logger.error('Failed to get latest result', { error });
      return null;
    }
  }

  /**
   * Ensure .gitignore contains .xfiResults entry
   */
  static async ensureGitIgnore(repoRoot: string): Promise<void> {
    try {
      const gitignorePath = path.join(repoRoot, '.gitignore');

      let gitignoreContent = '';
      if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      }

      // Check if .xfiResults is already in .gitignore
      if (!gitignoreContent.includes('.xfiResults')) {
        const newContent =
          gitignoreContent.trim() +
          '\n\n# X-Fidelity analysis results\n.xfiResults/\n';
        await fsAsync.writeFile(gitignorePath, newContent, 'utf8');
        logger.info('Added .xfiResults/ to .gitignore');
      }
    } catch (error) {
      logger.warn('Failed to update .gitignore', { error });
    }
  }

  /**
   * Clean up all old files across all prefixes (emergency cleanup)
   */
  static async cleanupAllOldFiles(targetDirectory?: string): Promise<void> {
    try {
      const repoRoot =
        targetDirectory || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!repoRoot) {
        return;
      }

      const resultsDir = path.join(repoRoot, this.RESULTS_DIR);
      if (!fs.existsSync(resultsDir)) {
        return;
      }

      const resultFiles = await this.getResultFiles(targetDirectory);

      for (const [key, files] of Object.entries(resultFiles)) {
        const [prefix, extension] = key.split('-');
        if (files.length > this.MAX_FILES_PER_PREFIX) {
          await this.cleanupOldFilesByPrefix(resultsDir, prefix, extension);
        }
      }

      logger.info('Completed cleanup of all old result files');
    } catch (error) {
      logger.error('Failed to cleanup all old files', { error });
    }
  }
}
