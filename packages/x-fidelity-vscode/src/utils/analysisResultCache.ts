import * as path from 'path';
import * as fs from 'fs';
import { VSCodeLogger } from './vscodeLogger';
import { getAnalysisTargetDirectory } from './workspaceUtils';

const logger = new VSCodeLogger('AnalysisResultCache');

export interface CacheInvalidationOptions {
  forceRefresh?: boolean;
  clearCache?: boolean;
  ensureFreshResults?: boolean;
}

export interface AnalysisLockData {
  analysisId: string;
  startTime: number;
  pid: number;
}

export interface AnalysisCompletionData {
  analysisId: string;
  completedAt: number;
  resultFileExists: boolean;
}

/**
 * Enhanced cache management to ensure fresh XFI_RESULT.json files are generated
 * and prevent stale results from being used
 */
export class AnalysisResultCache {
  private static readonly RESULTS_DIR = '.xfiResults';
  private static readonly RESULT_FILENAME = 'XFI_RESULT.json';
  private static readonly CACHE_METADATA_FILE = 'cache-metadata.json';
  private static readonly ANALYSIS_LOCK_FILE = 'analysis.lock';
  private static readonly LAST_ANALYSIS_FILE = 'last-analysis.json';

  /**
   * Ensure fresh analysis results by clearing old files and cache
   */
  static async ensureFreshResults(workspacePath?: string): Promise<void> {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        logger.warn('No target directory available for cache management');
        return;
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      const resultFile = path.join(resultsDir, this.RESULT_FILENAME);
      const cacheMetadataFile = path.join(resultsDir, this.CACHE_METADATA_FILE);

      logger.info('🗑️ Ensuring fresh analysis results', {
        targetDir,
        resultsDir,
        resultFile
      });

      // CRITICAL: We NEVER delete XFI_RESULT.json - it should always exist and be overwritten
      // Only clear cache metadata to force fresh generation
      if (fs.existsSync(cacheMetadataFile)) {
        fs.unlinkSync(cacheMetadataFile);
        logger.debug('Removed cache metadata file');
      }

      // Ensure results directory exists
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
        logger.debug('Created results directory');
      }

      // Write cache invalidation marker
      const invalidationMarker = {
        timestamp: Date.now(),
        reason: 'ensureFreshResults',
        clearedFiles: ['cache-metadata.json'] // XFI_RESULT.json is NEVER deleted
      };

      fs.writeFileSync(
        path.join(resultsDir, 'cache-invalidated.json'),
        JSON.stringify(invalidationMarker, null, 2),
        'utf8'
      );

      logger.info('✅ Cache cleared, fresh results will be generated');
    } catch (error) {
      logger.error('Failed to ensure fresh results', { error });
    }
  }

  /**
   * Validate that the XFI_RESULT.json file is fresh and not stale
   */
  static validateResultFile(workspacePath?: string): {
    exists: boolean;
    isFresh: boolean;
    age: number;
    path: string;
  } {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        return { exists: false, isFresh: false, age: 0, path: '' };
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      const resultFile = path.join(resultsDir, this.RESULT_FILENAME);

      if (!fs.existsSync(resultFile)) {
        return { exists: false, isFresh: false, age: 0, path: resultFile };
      }

      const stats = fs.statSync(resultFile);
      const age = Date.now() - stats.mtimeMs;
      const MAX_FRESH_AGE = 5 * 60 * 1000; // 5 minutes

      return {
        exists: true,
        isFresh: age < MAX_FRESH_AGE,
        age,
        path: resultFile
      };
    } catch (error) {
      logger.error('Failed to validate result file', { error });
      return { exists: false, isFresh: false, age: 0, path: '' };
    }
  }

  /**
   * Get workspace-specific cache key for tracking analysis runs
   */
  static getCacheKey(workspacePath?: string): string {
    const targetDir = workspacePath || getAnalysisTargetDirectory();
    if (!targetDir) {
      return 'unknown-workspace';
    }

    // Use workspace path and timestamp to create unique key
    const pathHash = Buffer.from(targetDir).toString('base64').slice(0, 8);
    return `xfi-cache-${pathHash}-${Date.now()}`;
  }

  /**
   * Mark analysis as started to prevent concurrent runs
   */
  static markAnalysisStarted(workspacePath?: string): string {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        return '';
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }

      const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const lockFile = path.join(resultsDir, this.ANALYSIS_LOCK_FILE);

      const lockData: AnalysisLockData = {
        analysisId,
        startTime: Date.now(),
        pid: process.pid
      };

      fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2), 'utf8');
      logger.debug('Analysis lock created', { analysisId, lockFile });

      return analysisId;
    } catch (error) {
      logger.error('Failed to create analysis lock', { error });
      return '';
    }
  }

  /**
   * Mark analysis as completed and remove lock
   */
  static markAnalysisCompleted(
    analysisId: string,
    workspacePath?: string
  ): void {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        return;
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      const lockFile = path.join(resultsDir, this.ANALYSIS_LOCK_FILE);

      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        logger.debug('Analysis lock removed', { analysisId });
      }

      // Update completion metadata
      const completionData: AnalysisCompletionData = {
        analysisId,
        completedAt: Date.now(),
        resultFileExists: fs.existsSync(
          path.join(resultsDir, this.RESULT_FILENAME)
        )
      };

      fs.writeFileSync(
        path.join(resultsDir, this.LAST_ANALYSIS_FILE),
        JSON.stringify(completionData, null, 2),
        'utf8'
      );
    } catch (error) {
      logger.error('Failed to mark analysis as completed', {
        error,
        analysisId
      });
    }
  }

  /**
   * Check if analysis is currently running
   */
  static isAnalysisRunning(workspacePath?: string): boolean {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        return false;
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      const lockFile = path.join(resultsDir, this.ANALYSIS_LOCK_FILE);

      if (!fs.existsSync(lockFile)) {
        return false;
      }

      const lockData: AnalysisLockData = JSON.parse(
        fs.readFileSync(lockFile, 'utf8')
      );
      const lockAge = Date.now() - lockData.startTime;
      const MAX_LOCK_AGE = 10 * 60 * 1000; // 10 minutes

      // Remove stale locks
      if (lockAge > MAX_LOCK_AGE) {
        fs.unlinkSync(lockFile);
        logger.warn('Removed stale analysis lock', { lockAge, lockData });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check analysis status', { error });
      return false;
    }
  }

  /**
   * Clear all cached results and force fresh analysis
   */
  static async clearAllCaches(workspacePath?: string): Promise<void> {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        return;
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      if (!fs.existsSync(resultsDir)) {
        return;
      }

      logger.info('🧹 Clearing all analysis caches', { resultsDir });

      // List of files to remove - CRITICAL: XFI_RESULT.json is NEVER deleted
      const filesToRemove = [
        // this.RESULT_FILENAME, // NEVER delete XFI_RESULT.json - it should always exist
        this.CACHE_METADATA_FILE,
        this.LAST_ANALYSIS_FILE,
        'cache-invalidated.json'
      ];

      let removedCount = 0;
      for (const fileName of filesToRemove) {
        const filePath = path.join(resultsDir, fileName);
        if (fs.existsSync(filePath)) {
          // CRITICAL SAFETY CHECK: Never delete XFI_RESULT.json
          if (
            fileName === 'XFI_RESULT.json' ||
            filePath.includes('XFI_RESULT.json')
          ) {
            logger.error(
              `🚨 CRITICAL: Attempted to delete XFI_RESULT.json - BLOCKED!`,
              {
                fileName,
                filePath
              }
            );
            continue;
          }

          fs.unlinkSync(filePath);
          removedCount++;
          logger.debug(`Removed cache file: ${fileName}`);
        }
      }

      logger.info(`✅ Cleared ${removedCount} cache files`);
    } catch (error) {
      logger.error('Failed to clear all caches', { error });
    }
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStatistics(workspacePath?: string): {
    hasResultFile: boolean;
    resultFileAge: number;
    isAnalysisRunning: boolean;
    lastAnalysisTime: number;
    cacheDirectorySize: number;
  } {
    try {
      const targetDir = workspacePath || getAnalysisTargetDirectory();
      if (!targetDir) {
        return {
          hasResultFile: false,
          resultFileAge: 0,
          isAnalysisRunning: false,
          lastAnalysisTime: 0,
          cacheDirectorySize: 0
        };
      }

      const resultsDir = path.join(targetDir, this.RESULTS_DIR);
      const resultFile = path.join(resultsDir, this.RESULT_FILENAME);
      const lastAnalysisFile = path.join(resultsDir, this.LAST_ANALYSIS_FILE);

      let resultFileAge = 0;
      let hasResultFile = false;
      let lastAnalysisTime = 0;
      let cacheDirectorySize = 0;

      if (fs.existsSync(resultFile)) {
        hasResultFile = true;
        const stats = fs.statSync(resultFile);
        resultFileAge = Date.now() - stats.mtimeMs;
      }

      if (fs.existsSync(lastAnalysisFile)) {
        const completionData: AnalysisCompletionData = JSON.parse(
          fs.readFileSync(lastAnalysisFile, 'utf8')
        );
        lastAnalysisTime = completionData.completedAt;
      }

      if (fs.existsSync(resultsDir)) {
        const files = fs.readdirSync(resultsDir);
        cacheDirectorySize = files.length;
      }

      return {
        hasResultFile,
        resultFileAge,
        isAnalysisRunning: this.isAnalysisRunning(workspacePath),
        lastAnalysisTime,
        cacheDirectorySize
      };
    } catch (error) {
      logger.error('Failed to get cache statistics', { error });
      return {
        hasResultFile: false,
        resultFileAge: 0,
        isAnalysisRunning: false,
        lastAnalysisTime: 0,
        cacheDirectorySize: 0
      };
    }
  }
}
