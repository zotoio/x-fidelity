import * as path from 'path';
import * as fs from 'fs';
import { getAnalysisTargetDirectory } from './workspaceUtils';
import { VSCodeLogger } from './vscodeLogger';
import type { ResultMetadata } from '@x-fidelity/types';

const logger = new VSCodeLogger('ResultFileManager');

export interface XFIResultFile {
  filename: string;
  fullPath: string;
  timestamp: number;
  metadata: ResultMetadata;
}

export class ResultFileManager {
  private static readonly RESULTS_DIR = '.xfiResults';
  private static readonly MAX_RESULT_FILES = 10; // Keep only the latest 10 results
  private static instance: ResultFileManager | null = null;

  /**
   * Get singleton instance
   */
  static getInstance(): ResultFileManager {
    if (!this.instance) {
      this.instance = new ResultFileManager();
    }
    return this.instance;
  }

  /**
   * Instance method to store a result
   */
  async storeResult(result: any): Promise<string> {
    return ResultFileManager.writeResultToFile(result);
  }

  /**
   * Write XFI analysis results to a file and return the filename
   */
  static writeResultToFile(metadata: ResultMetadata): string {
    try {
      const resultsDir = this.getResultsDirectory();
      if (!resultsDir) {
        throw new Error('No workspace found to write results');
      }

      // Ensure results directory exists
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
        logger.info(`Created XFI results directory: ${resultsDir}`);
      }

      // Create unique filename with timestamp
      const timestamp = Date.now();
      const filename = `xfi-result-${timestamp}.json`;
      const fullPath = path.join(resultsDir, filename);

      // Write the complete metadata to file
      const resultData: XFIResultFile = {
        filename,
        fullPath,
        timestamp,
        metadata
      };

      fs.writeFileSync(fullPath, JSON.stringify(resultData, null, 2), 'utf8');
      logger.info(`XFI results written to file: ${filename}`);

      // Clean up old result files (async, don't wait)
      this.cleanupOldResults(resultsDir).catch(error =>
        logger.warn('Failed to cleanup old results', { error })
      );

      return filename;
    } catch (error) {
      logger.error('Failed to write XFI result to file', { error });
      throw error;
    }
  }

  /**
   * Read XFI analysis results from a filename
   */
  static readResultFromFile(filename: string): ResultMetadata | null {
    try {
      const resultsDir = this.getResultsDirectory();
      if (!resultsDir) {
        logger.warn('No workspace found to read results from');
        return null;
      }

      const fullPath = path.join(resultsDir, filename);

      if (!fs.existsSync(fullPath)) {
        logger.warn(`XFI result file not found: ${filename}`);
        return null;
      }

      const fileContent = fs.readFileSync(fullPath, 'utf8');
      const resultData: XFIResultFile = JSON.parse(fileContent);

      logger.debug(`XFI results read from file: ${filename}`);
      return resultData.metadata;
    } catch (error) {
      logger.error('Failed to read XFI result from file', { filename, error });
      return null;
    }
  }

  /**
   * Helper function for test utilities to read results from filename
   */
  static getResultsFromFilename(
    filename: string | null
  ): ResultMetadata | null {
    if (!filename) {
      return null;
    }

    return this.readResultFromFile(filename);
  }

  /**
   * Get the latest result filename (for fallback scenarios)
   */
  static getLatestResultFilename(): string | null {
    try {
      const resultsDir = this.getResultsDirectory();
      if (!resultsDir || !fs.existsSync(resultsDir)) {
        return null;
      }

      const files = fs
        .readdirSync(resultsDir)
        .filter(
          file => file.startsWith('xfi-result-') && file.endsWith('.json')
        )
        .sort((a, b) => {
          // Sort by timestamp (newest first)
          const timestampA = parseInt(
            a.match(/xfi-result-(\d+)\.json/)?.[1] || '0'
          );
          const timestampB = parseInt(
            b.match(/xfi-result-(\d+)\.json/)?.[1] || '0'
          );
          return timestampB - timestampA;
        });

      return files[0] || null;
    } catch (error) {
      logger.error('Failed to get latest result filename', { error });
      return null;
    }
  }

  /**
   * List all available result files
   */
  static listResultFiles(): XFIResultFile[] {
    try {
      const resultsDir = this.getResultsDirectory();
      if (!resultsDir || !fs.existsSync(resultsDir)) {
        return [];
      }

      const files = fs
        .readdirSync(resultsDir)
        .filter(
          file => file.startsWith('xfi-result-') && file.endsWith('.json')
        )
        .map(filename => {
          try {
            const fullPath = path.join(resultsDir, filename);
            const content = fs.readFileSync(fullPath, 'utf8');
            return JSON.parse(content) as XFIResultFile;
          } catch (error) {
            logger.warn(`Failed to parse result file: ${filename}`, { error });
            return null;
          }
        })
        .filter((file): file is XFIResultFile => file !== null)
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first

      return files;
    } catch (error) {
      logger.error('Failed to list result files', { error });
      return [];
    }
  }

  /**
   * Clean up old result files, keeping only the latest MAX_RESULT_FILES
   */
  private static async cleanupOldResults(_resultsDir: string): Promise<void> {
    try {
      const files = this.listResultFiles();

      if (files.length > this.MAX_RESULT_FILES) {
        const filesToDelete = files.slice(this.MAX_RESULT_FILES);

        for (const file of filesToDelete) {
          try {
            fs.unlinkSync(file.fullPath);
            logger.debug(`Cleaned up old result file: ${file.filename}`);
          } catch (error) {
            logger.warn(`Failed to delete old result file: ${file.filename}`, {
              error
            });
          }
        }

        logger.info(`Cleaned up ${filesToDelete.length} old result files`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old results', { error });
    }
  }

  /**
   * Get the results directory path for the current workspace
   */
  private static getResultsDirectory(): string | undefined {
    const analysisTarget = getAnalysisTargetDirectory();
    if (!analysisTarget) {
      return undefined;
    }

    return path.join(analysisTarget, this.RESULTS_DIR);
  }

  /**
   * Clear all result files (useful for testing or cleanup)
   */
  static clearAllResults(): void {
    try {
      const resultsDir = this.getResultsDirectory();
      if (!resultsDir || !fs.existsSync(resultsDir)) {
        return;
      }

      const files = fs
        .readdirSync(resultsDir)
        .filter(
          file => file.startsWith('xfi-result-') && file.endsWith('.json')
        );

      for (const file of files) {
        const fullPath = path.join(resultsDir, file);
        fs.unlinkSync(fullPath);
      }

      logger.info(`Cleared ${files.length} result files`);
    } catch (error) {
      logger.error('Failed to clear result files', { error });
    }
  }

  /**
   * Get result directory info for debugging
   */
  static getResultDirectoryInfo(): {
    directory: string | undefined;
    exists: boolean;
    fileCount: number;
  } {
    const directory = this.getResultsDirectory();
    const exists = directory ? fs.existsSync(directory) : false;
    let fileCount = 0;

    if (exists && directory) {
      try {
        fileCount = fs
          .readdirSync(directory)
          .filter(
            file => file.startsWith('xfi-result-') && file.endsWith('.json')
          ).length;
      } catch (error) {
        logger.warn('Failed to count result files', { error });
      }
    }

    return { directory, exists, fileCount };
  }
}
