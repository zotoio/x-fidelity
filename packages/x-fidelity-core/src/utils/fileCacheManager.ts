import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from './logger';
import { options } from '../core/options';

/**
 * File cache entry with modification time tracking
 */
export interface FileCacheEntry {
    filePath: string;
    mtime: number;  // File modification time in ms
    hash?: string;  // Content hash (computed only when needed)
    lastAccessed: number;  // When this cache entry was last accessed
    analysisResult?: any;  // Cached analysis result
}

/**
 * File cache metadata stored on disk
 */
export interface FileCacheMetadata {
    version: string;
    createdAt: number;
    lastCleanup: number;
    ttlMinutes: number;
    entries: Record<string, FileCacheEntry>;
}

/**
 * High-performance file cache manager with mtime tracking and hybrid validation
 */
export class FileCacheManager {
    private static instance: FileCacheManager | null = null;
    private cache: Map<string, FileCacheEntry> = new Map();
    private readonly CACHE_VERSION = '1.0.0';
    private readonly CACHE_FILE = 'file-cache.json';
    private cacheDir: string;
    private ttlMs: number;
    private repoPath?: string;

    private constructor(cacheDir: string, repoPath?: string) {
        this.cacheDir = cacheDir;
        this.repoPath = repoPath;
        this.ttlMs = (options.fileCacheTTL || 60) * 60 * 1000; // Convert minutes to ms
        this.loadCacheFromDisk();
    }

    /**
     * Get singleton instance
     */
    static getInstance(cacheDir?: string, repoPath?: string): FileCacheManager {
        if (!this.instance) {
            const targetDir = cacheDir || path.join(options.dir || process.cwd(), '.xfiResults');
            this.instance = new FileCacheManager(targetDir, repoPath);
        }
        return this.instance;
    }

    /**
     * Get display path (relative if repoPath available, otherwise absolute)
     */
    private getDisplayPath(filePath: string): string {
        return this.repoPath ? path.relative(this.repoPath, filePath) : filePath;
    }

    /**
     * Check if a file has changed since last analysis
     * Uses hybrid approach: mtime check first, then content hash if needed
     */
    async isFileChanged(filePath: string): Promise<boolean> {
        try {
            const absolutePath = path.resolve(filePath);
            const stats = await fs.promises.stat(absolutePath);
            const currentMtime = stats.mtime.getTime();

            const cached = this.cache.get(absolutePath);
            
            // No cache entry means file is "changed" (new)
            if (!cached) {
                logger.debug(`File not cached: ${this.getDisplayPath(filePath)}`);
                return true;
            }

            // Check TTL first
            const now = Date.now();
            if (now - cached.lastAccessed > this.ttlMs) {
                logger.debug(`Cache entry expired for: ${this.getDisplayPath(filePath)}`);
                this.cache.delete(absolutePath);
                return true;
            }

            // Fast path: mtime comparison
            if (currentMtime !== cached.mtime) {
                logger.debug(`File mtime changed: ${this.getDisplayPath(filePath)} (${cached.mtime} -> ${currentMtime})`);
                
                // Hybrid approach: verify with content hash if mtime differs
                const currentHash = await this.computeFileHash(absolutePath);
                if (currentHash !== cached.hash) {
                    logger.debug(`File content changed: ${this.getDisplayPath(filePath)}`);
                    return true;
                }
                
                // mtime changed but content is same (file was touched) - update cache
                cached.mtime = currentMtime;
                cached.lastAccessed = now;
                return false;
            }

            // File unchanged, update last accessed time
            cached.lastAccessed = now;
            return false;

        } catch (error) {
            logger.warn(`Error checking file change: ${this.getDisplayPath(filePath)}`, error);
            return true; // Assume changed if we can't check
        }
    }

    /**
     * Update cache entry for a file
     */
    async updateFileCache(filePath: string, analysisResult?: any): Promise<void> {
        try {
            const absolutePath = path.resolve(filePath);
            const stats = await fs.promises.stat(absolutePath);
            const mtime = stats.mtime.getTime();
            const hash = await this.computeFileHash(absolutePath);
            const now = Date.now();

            const entry: FileCacheEntry = {
                filePath: absolutePath,
                mtime,
                hash,
                lastAccessed: now,
                analysisResult
            };

            this.cache.set(absolutePath, entry);
            logger.debug(`Updated cache for: ${this.getDisplayPath(filePath)}`);

        } catch (error) {
            logger.warn(`Error updating file cache: ${this.getDisplayPath(filePath)}`, error);
        }
    }

    /**
     * Get cached analysis result for a file
     */
    getCachedResult(filePath: string): any {
        const absolutePath = path.resolve(filePath);
        const cached = this.cache.get(absolutePath);
        
        if (!cached) {
            return null;
        }

        // Check TTL
        const now = Date.now();
        if (now - cached.lastAccessed > this.ttlMs) {
            this.cache.delete(absolutePath);
            return null;
        }

        cached.lastAccessed = now;
        return cached.analysisResult;
    }

    /**
     * Filter files to only those that have changed
     */
    async getChangedFiles(filePaths: string[]): Promise<string[]> {
        const changedFiles: string[] = [];
        
        // Process files in batches for performance
        const batchSize = 50;
        for (let i = 0; i < filePaths.length; i += batchSize) {
            const batch = filePaths.slice(i, i + batchSize);
            const batchPromises = batch.map(async (filePath) => {
                const isChanged = await this.isFileChanged(filePath);
                return isChanged ? filePath : null;
            });
            
            const batchResults = await Promise.all(batchPromises);
            changedFiles.push(...batchResults.filter(f => f !== null) as string[]);
        }

        logger.info(`File change detection: ${changedFiles.length}/${filePaths.length} files changed`);
        return changedFiles;
    }

    /**
     * Save cache to disk
     */
    async saveCacheToDisk(): Promise<void> {
        try {
            // Ensure cache directory exists
            await fs.promises.mkdir(this.cacheDir, { recursive: true });

            const metadata: FileCacheMetadata = {
                version: this.CACHE_VERSION,
                createdAt: Date.now(),
                lastCleanup: Date.now(),
                ttlMinutes: options.fileCacheTTL || 60,
                entries: Object.fromEntries(this.cache)
            };

            const cacheFile = path.join(this.cacheDir, this.CACHE_FILE);
            await fs.promises.writeFile(cacheFile, JSON.stringify(metadata, null, 2));
            
            logger.debug(`Saved file cache with ${this.cache.size} entries to ${cacheFile}`);

        } catch (error) {
            logger.warn('Failed to save file cache to disk', error);
        }
    }

    /**
     * Load cache from disk
     */
    private async loadCacheFromDisk(): Promise<void> {
        try {
            const cacheFile = path.join(this.cacheDir, this.CACHE_FILE);
            
            if (!await this.fileExists(cacheFile)) {
                logger.debug('No existing file cache found');
                return;
            }

            const content = await fs.promises.readFile(cacheFile, 'utf8');
            const metadata: FileCacheMetadata = JSON.parse(content);

            // Version check
            if (metadata.version !== this.CACHE_VERSION) {
                logger.info('File cache version mismatch, starting fresh');
                return;
            }

            // Load entries
            this.cache.clear();
            for (const [filePath, entry] of Object.entries(metadata.entries)) {
                this.cache.set(filePath, entry);
            }

            logger.debug(`Loaded file cache with ${this.cache.size} entries`);

            // Clean up expired entries
            await this.cleanup();

        } catch (error) {
            logger.warn('Failed to load file cache from disk', error);
        }
    }

    /**
     * Clean up expired cache entries
     */
    async cleanup(): Promise<void> {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [filePath, entry] of this.cache.entries()) {
            // Remove entries older than TTL
            if (now - entry.lastAccessed > this.ttlMs) {
                this.cache.delete(filePath);
                cleanedCount++;
                continue;
            }

            // Remove entries for files that no longer exist
            if (!await this.fileExists(entry.filePath)) {
                this.cache.delete(filePath);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): {
        entryCount: number;
        ttlMinutes: number;
        cacheDir: string;
        hitRate?: number;
    } {
        return {
            entryCount: this.cache.size,
            ttlMinutes: this.ttlMs / (60 * 1000),
            cacheDir: this.cacheDir
        };
    }

    /**
     * Clear all cache entries
     */
    async clearCache(): Promise<void> {
        this.cache.clear();
        const cacheFile = path.join(this.cacheDir, this.CACHE_FILE);
        
        try {
            // CRITICAL SAFETY CHECK: Never delete XFI_RESULT.json
            if (cacheFile.includes('XFI_RESULT.json')) {
                logger.error(`🚨 CRITICAL: Attempted to delete XFI_RESULT.json via cache clear - BLOCKED!`, {
                    cacheFile
                });
                return;
            }
            
            await fs.promises.unlink(cacheFile);
            logger.info('File cache cleared');
        } catch (error) {
            // File might not exist, that's fine
            logger.debug('Cache file not found during clear');
        }
    }

    /**
     * Compute content hash for a file
     */
    private async computeFileHash(filePath: string): Promise<string> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (error) {
            logger.warn(`Failed to compute hash for ${this.getDisplayPath(filePath)}`, error);
            return '';
        }
    }

    /**
     * Check if file exists
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Dispose of the cache manager and save to disk
     */
    async dispose(): Promise<void> {
        await this.saveCacheToDisk();
        FileCacheManager.instance = null;
    }

    /**
     * Comprehensive startup cleanup of .xfiResults directory
     * Removes files exceeding retention limits and older than threshold
     */
    public static async performStartupCleanup(resultsDir: string, options?: {
        maxFilesPerPrefix?: number;
        maxAgeHours?: number;
        dryRun?: boolean;
    }): Promise<void> {
        const { maxFilesPerPrefix = 10, maxAgeHours = 168, dryRun = false } = options || {}; // Default 7 days
        
        try {
            logger.info(`🧹 Starting cleanup of .xfiResults directory: ${resultsDir}`);
            
            try {
                await fs.promises.access(resultsDir);
            } catch {
                logger.info('Results directory does not exist, skipping cleanup');
                return;
            }

            const files = await fs.promises.readdir(resultsDir);
            const now = Date.now();
            const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
            
            // Group files by prefix and extension
            const fileGroups: Record<string, Array<{
                filename: string;
                fullPath: string;
                timestamp: number;
                size: number;
                prefix: string;
                extension: string;
            }>> = {};
            
            let totalFiles = 0;
            let oldFiles = 0;
            let oversizedGroups = 0;
            
            for (const filename of files) {
                const fullPath = path.join(resultsDir, filename);
                
                try {
                    const stats = await fs.promises.stat(fullPath);
                    if (stats.isDirectory()) continue;
                    
                    // Skip logs and cache files
                    if (filename.endsWith('.log') || 
                        filename === 'file-cache.json' ||
                        filename === 'XFI_RESULT.json') {
                        continue;
                    }
                    
                    totalFiles++;
                    
                    // Parse filename pattern: support both new and old formats
                    // New: prefix-YYYY-MM-DD-timestamp.extension (prefix can contain hyphens)
                    // Old: prefix-YYYY-MM-DDTHH-MM-SS-msZ.extension
                    let match = filename.match(/^(.+?)-(\d{4}-\d{2}-\d{2})-(\d+)\.([^.]+)$/);
                    let prefix: string, dateStr: string, timestamp: number, extension: string;
                    
                    logger.debug(`Processing file: ${filename}`);
                    
                    if (match) {
                        // New format: xfi-result-2025-07-01-1751367418375.json
                        [, prefix, dateStr, , extension] = match;
                        timestamp = parseInt(match[3]);
                        logger.debug(`✅ Matched NEW format: prefix=${prefix}, dateStr=${dateStr}, timestamp=${timestamp}, extension=${extension}`);
                    } else {
                        // Try old format: xfi-report-2025-07-01T11-20-28-541Z.json
                        const oldMatch = filename.match(/^(.+?)-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d+)Z\.([^.]+)$/);
                        if (oldMatch) {
                            [, prefix, dateStr, , , , , extension] = oldMatch;
                            // Convert time parts to a simple timestamp for sorting
                            timestamp = parseInt(oldMatch[6]); // Use milliseconds part as timestamp
                            logger.debug(`✅ Matched OLD format: prefix=${prefix}, dateStr=${dateStr}, timestamp=${timestamp}, extension=${extension}`);
                        } else {
                            logger.debug(`❌ No match for: ${filename}`);
                            continue;
                        }
                    }
                    
                    const groupKey = `${prefix}.${extension}`;
                    
                    if (!fileGroups[groupKey]) {
                        fileGroups[groupKey] = [];
                    }
                    
                    fileGroups[groupKey].push({
                        filename,
                        fullPath,
                        timestamp,
                        size: stats.size,
                        prefix,
                        extension
                    });
                    
                } catch (error) {
                    logger.warn(`Failed to stat file ${filename}:`, error);
                }
            }
            
            logger.info(`📊 Found ${totalFiles} result files in ${Object.keys(fileGroups).length} groups`);
            
            // Clean up each group
            for (const [groupKey, groupFiles] of Object.entries(fileGroups)) {
                const [prefix, extension] = groupKey.split('.');
                
                // Sort by timestamp (newest first)
                groupFiles.sort((a, b) => b.timestamp - a.timestamp);
                
                // Find files to delete
                const filesToDelete: typeof groupFiles = [];
                
                // 1. Remove files exceeding retention limit
                if (groupFiles.length > maxFilesPerPrefix) {
                    const excessFiles = groupFiles.slice(maxFilesPerPrefix);
                    filesToDelete.push(...excessFiles);
                    oversizedGroups++;
                }
                
                // 2. Remove files older than max age
                const ageThreshold = now - maxAgeMs;
                const remainingFiles = groupFiles.slice(0, maxFilesPerPrefix);
                const oldFilesInGroup = remainingFiles.filter(f => f.timestamp < ageThreshold);
                
                // Only delete old files if we have newer files to keep
                if (remainingFiles.length > oldFilesInGroup.length) {
                    filesToDelete.push(...oldFilesInGroup);
                    oldFiles += oldFilesInGroup.length;
                }
                
                // Remove duplicates and delete
                const uniqueFilesToDelete = Array.from(new Set(filesToDelete));
                
                if (uniqueFilesToDelete.length > 0) {
                    logger.info(`🗑️  Group ${groupKey}: ${uniqueFilesToDelete.length}/${groupFiles.length} files marked for deletion`);
                    
                    if (!dryRun) {
                        for (const file of uniqueFilesToDelete) {
                            try {
                                // CRITICAL SAFETY CHECK: Never delete XFI_RESULT.json
                                if (file.filename === 'XFI_RESULT.json' || file.fullPath.includes('XFI_RESULT.json')) {
                                    logger.error(`🚨 CRITICAL: Attempted to delete XFI_RESULT.json - BLOCKED!`, {
                                        filename: file.filename,
                                        fullPath: file.fullPath
                                    });
                                    continue;
                                }
                                
                                await fs.promises.unlink(file.fullPath);
                                logger.debug(`Deleted: ${file.filename}`);
                            } catch (deleteError) {
                                logger.warn(`Failed to delete ${file.filename}:`, deleteError);
                            }
                        }
                    } else {
                        logger.info(`DRY RUN: Would delete ${uniqueFilesToDelete.map(f => f.filename).join(', ')}`);
                    }
                }
            }
            
            const totalSize = Object.values(fileGroups)
                .flat()
                .reduce((sum, f) => sum + f.size, 0);
            
            logger.info('Startup cleanup completed', {
                totalGroups: Object.keys(fileGroups).length,
                totalFilesProcessed: totalFiles,
                totalSizeMB: Number((totalSize / 1024 / 1024).toFixed(2)),
                groupsExceedingLimit: oversizedGroups,
                oldFilesCleaned: oldFiles
            });
            
        } catch (error) {
            logger.error('Failed to perform startup cleanup:', error);
        }
    }
}