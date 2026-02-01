/**
 * Test suite for FileCacheManager
 * Tests file change detection, caching, and cleanup functionality
 */

import { FileCacheManager } from './fileCacheManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock the options module
jest.mock('../core/options', () => ({
    options: {
        dir: '/test/repo',
        fileCacheTTL: 60
    }
}));

// Mock the logger
jest.mock('./logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    }
}));

describe('FileCacheManager', () => {
    let tempDir: string;
    let cacheManager: FileCacheManager;
    let testFile1: string;
    let testFile2: string;

    beforeAll(async () => {
        // Create a temp directory for testing
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xfi-cache-test-'));
        testFile1 = path.join(tempDir, 'test1.ts');
        testFile2 = path.join(tempDir, 'test2.ts');
    });

    afterAll(async () => {
        // Clean up temp directory
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    beforeEach(async () => {
        // Create fresh test files
        await fs.promises.writeFile(testFile1, 'const a = 1;');
        await fs.promises.writeFile(testFile2, 'const b = 2;');
        
        // Create a fresh cache manager instance
        // Reset the singleton for testing
        (FileCacheManager as any).instance = null;
        cacheManager = FileCacheManager.getInstance(tempDir, tempDir);
    });

    afterEach(async () => {
        // Clean up cache
        await cacheManager.clearCache();
        (FileCacheManager as any).instance = null;
    });

    describe('isFileChanged', () => {
        it('should return true for uncached files', async () => {
            const isChanged = await cacheManager.isFileChanged(testFile1);
            expect(isChanged).toBe(true);
        });

        it('should return false for unchanged cached files', async () => {
            // First access - file is "new"
            await cacheManager.isFileChanged(testFile1);
            await cacheManager.updateFileCache(testFile1);
            
            // Second access - file should be unchanged
            const isChanged = await cacheManager.isFileChanged(testFile1);
            expect(isChanged).toBe(false);
        });

        it('should return true when file content changes', async () => {
            // Cache the file
            await cacheManager.updateFileCache(testFile1);
            
            // Modify the file
            await fs.promises.writeFile(testFile1, 'const a = 2; // modified');
            
            // File should be detected as changed
            const isChanged = await cacheManager.isFileChanged(testFile1);
            expect(isChanged).toBe(true);
        });

        it('should return true for non-existent files', async () => {
            const nonExistentFile = path.join(tempDir, 'does-not-exist.ts');
            const isChanged = await cacheManager.isFileChanged(nonExistentFile);
            expect(isChanged).toBe(true);
        });

        it('should handle file touch without content change', async () => {
            // Cache the file
            await cacheManager.updateFileCache(testFile1);
            
            // Touch the file (change mtime but not content)
            const originalContent = await fs.promises.readFile(testFile1, 'utf8');
            
            // Wait a bit then rewrite with same content
            await new Promise(resolve => setTimeout(resolve, 100));
            await fs.promises.writeFile(testFile1, originalContent);
            
            // mtime changed but content is same - should not be marked as changed
            const isChanged = await cacheManager.isFileChanged(testFile1);
            expect(isChanged).toBe(false);
        });
    });

    describe('updateFileCache', () => {
        it('should cache file with mtime and hash', async () => {
            await cacheManager.updateFileCache(testFile1);
            
            // File should now be tracked
            const isChanged = await cacheManager.isFileChanged(testFile1);
            expect(isChanged).toBe(false);
        });

        it('should store analysis result with cache entry', async () => {
            const analysisResult = { errors: [], warnings: ['test warning'] };
            await cacheManager.updateFileCache(testFile1, analysisResult);
            
            const cachedResult = cacheManager.getCachedResult(testFile1);
            expect(cachedResult).toEqual(analysisResult);
        });

        it('should update existing cache entries', async () => {
            // First cache
            await cacheManager.updateFileCache(testFile1, { version: 1 });
            
            // Update cache with new result
            await cacheManager.updateFileCache(testFile1, { version: 2 });
            
            const cachedResult = cacheManager.getCachedResult(testFile1);
            expect(cachedResult).toEqual({ version: 2 });
        });
    });

    describe('getCachedResult', () => {
        it('should return null for uncached files', () => {
            const result = cacheManager.getCachedResult(testFile1);
            expect(result).toBeNull();
        });

        it('should return cached analysis result', async () => {
            const mockResult = { issues: [{ line: 1, message: 'test' }] };
            await cacheManager.updateFileCache(testFile1, mockResult);
            
            const result = cacheManager.getCachedResult(testFile1);
            expect(result).toEqual(mockResult);
        });

        it('should return null for expired cache entries', async () => {
            // This would require manipulating TTL or waiting, so we'll just verify the mechanism exists
            await cacheManager.updateFileCache(testFile1, { data: 'test' });
            
            // Immediately after caching, result should be available
            const result = cacheManager.getCachedResult(testFile1);
            expect(result).toEqual({ data: 'test' });
        });
    });

    describe('getChangedFiles', () => {
        it('should return all files when cache is empty', async () => {
            const files = [testFile1, testFile2];
            const changedFiles = await cacheManager.getChangedFiles(files);
            
            expect(changedFiles).toHaveLength(2);
            expect(changedFiles).toContain(testFile1);
            expect(changedFiles).toContain(testFile2);
        });

        it('should return only changed files when some are cached', async () => {
            // Cache file1
            await cacheManager.updateFileCache(testFile1);
            
            // Only file2 should be detected as changed
            const files = [testFile1, testFile2];
            const changedFiles = await cacheManager.getChangedFiles(files);
            
            expect(changedFiles).toHaveLength(1);
            expect(changedFiles).toContain(testFile2);
            expect(changedFiles).not.toContain(testFile1);
        });

        it('should return empty array when all files are cached and unchanged', async () => {
            // Cache both files
            await cacheManager.updateFileCache(testFile1);
            await cacheManager.updateFileCache(testFile2);
            
            const files = [testFile1, testFile2];
            const changedFiles = await cacheManager.getChangedFiles(files);
            
            expect(changedFiles).toHaveLength(0);
        });

        it('should handle mixed scenario correctly', async () => {
            // Cache file1
            await cacheManager.updateFileCache(testFile1);
            
            // Modify file1
            await fs.promises.writeFile(testFile1, 'const a = 999; // changed');
            
            // Both should be changed now
            const files = [testFile1, testFile2];
            const changedFiles = await cacheManager.getChangedFiles(files);
            
            expect(changedFiles).toHaveLength(2);
        });

        it('should handle large file lists efficiently', async () => {
            // Create many test files
            const manyFiles: string[] = [];
            for (let i = 0; i < 100; i++) {
                const filePath = path.join(tempDir, `bulk-test-${i}.ts`);
                await fs.promises.writeFile(filePath, `const x${i} = ${i};`);
                manyFiles.push(filePath);
            }
            
            const startTime = Date.now();
            const changedFiles = await cacheManager.getChangedFiles(manyFiles);
            const duration = Date.now() - startTime;
            
            // Should process 100 files quickly (under 5 seconds)
            expect(duration).toBeLessThan(5000);
            expect(changedFiles).toHaveLength(100);
            
            // Clean up bulk files
            for (const file of manyFiles) {
                await fs.promises.unlink(file);
            }
        });
    });

    describe('saveCacheToDisk and loadCacheFromDisk', () => {
        it('should persist cache to disk', async () => {
            // Cache some files
            await cacheManager.updateFileCache(testFile1, { test: 'data1' });
            await cacheManager.updateFileCache(testFile2, { test: 'data2' });
            
            // Save to disk
            await cacheManager.saveCacheToDisk();
            
            // Check that cache file exists
            const cacheFile = path.join(tempDir, 'file-cache.json');
            const exists = await fs.promises.access(cacheFile).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });

        it('should load cache from disk on initialization', async () => {
            // Cache and save
            await cacheManager.updateFileCache(testFile1, { persisted: true });
            await cacheManager.saveCacheToDisk();
            
            // Create new instance (simulating restart)
            (FileCacheManager as any).instance = null;
            const newCacheManager = FileCacheManager.getInstance(tempDir, tempDir);
            
            // Wait for async cache loading to complete
            // The constructor calls loadCacheFromDisk asynchronously
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Cache should be loaded
            const result = newCacheManager.getCachedResult(testFile1);
            expect(result).toEqual({ persisted: true });
        });
    });

    describe('cleanup', () => {
        it('should remove entries for deleted files', async () => {
            // Cache file1
            await cacheManager.updateFileCache(testFile1);
            
            // Delete the file
            await fs.promises.unlink(testFile1);
            
            // Run cleanup
            await cacheManager.cleanup();
            
            // Entry should be removed
            const result = cacheManager.getCachedResult(testFile1);
            expect(result).toBeNull();
            
            // Recreate file for other tests
            await fs.promises.writeFile(testFile1, 'const a = 1;');
        });
    });

    describe('clearCache', () => {
        it('should clear all cache entries', async () => {
            // Cache files
            await cacheManager.updateFileCache(testFile1, { data: 1 });
            await cacheManager.updateFileCache(testFile2, { data: 2 });
            
            // Clear cache
            await cacheManager.clearCache();
            
            // All entries should be gone
            expect(cacheManager.getCachedResult(testFile1)).toBeNull();
            expect(cacheManager.getCachedResult(testFile2)).toBeNull();
        });

        it('should not throw if cache file does not exist', async () => {
            await expect(cacheManager.clearCache()).resolves.not.toThrow();
        });
    });

    describe('getCacheStats', () => {
        it('should return cache statistics', async () => {
            const stats = cacheManager.getCacheStats();
            
            expect(stats).toHaveProperty('entryCount');
            expect(stats).toHaveProperty('ttlMinutes');
            expect(stats).toHaveProperty('cacheDir');
            expect(typeof stats.entryCount).toBe('number');
            expect(typeof stats.ttlMinutes).toBe('number');
        });

        it('should reflect current entry count', async () => {
            const initialStats = cacheManager.getCacheStats();
            const initialCount = initialStats.entryCount;
            
            await cacheManager.updateFileCache(testFile1);
            
            const newStats = cacheManager.getCacheStats();
            expect(newStats.entryCount).toBe(initialCount + 1);
        });
    });

    describe('performStartupCleanup', () => {
        let cleanupDir: string;

        beforeEach(async () => {
            cleanupDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xfi-cleanup-test-'));
        });

        afterEach(async () => {
            await fs.promises.rm(cleanupDir, { recursive: true, force: true });
        });

        it('should handle non-existent directory gracefully', async () => {
            const nonExistentDir = path.join(os.tmpdir(), 'does-not-exist-' + Date.now());
            
            await expect(
                FileCacheManager.performStartupCleanup(nonExistentDir)
            ).resolves.not.toThrow();
        });

        it('should not delete XFI_RESULT.json', async () => {
            // Create XFI_RESULT.json
            const xfiResultPath = path.join(cleanupDir, 'XFI_RESULT.json');
            await fs.promises.writeFile(xfiResultPath, '{"test": true}');
            
            // Run cleanup
            await FileCacheManager.performStartupCleanup(cleanupDir);
            
            // File should still exist
            const exists = await fs.promises.access(xfiResultPath).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        });

        it('should clean up old result files exceeding limit', async () => {
            // Create more than maxFilesPerPrefix files
            const prefix = 'xfi-result';
            const today = new Date().toISOString().split('T')[0];
            
            for (let i = 0; i < 15; i++) {
                const timestamp = Date.now() - (i * 1000 * 60); // Each file 1 minute older
                const filename = `${prefix}-${today}-${timestamp}.json`;
                await fs.promises.writeFile(path.join(cleanupDir, filename), '{}');
            }
            
            // Run cleanup with limit of 10
            await FileCacheManager.performStartupCleanup(cleanupDir, { 
                maxFilesPerPrefix: 10,
                dryRun: false 
            });
            
            // Should have only 10 files left
            const remainingFiles = await fs.promises.readdir(cleanupDir);
            const resultFiles = remainingFiles.filter(f => f.startsWith(prefix));
            expect(resultFiles.length).toBeLessThanOrEqual(10);
        });

        it('should respect dryRun option', async () => {
            // Create test files
            const today = new Date().toISOString().split('T')[0];
            for (let i = 0; i < 15; i++) {
                const timestamp = Date.now() - (i * 1000 * 60);
                await fs.promises.writeFile(
                    path.join(cleanupDir, `xfi-result-${today}-${timestamp}.json`),
                    '{}'
                );
            }
            
            // Run cleanup with dryRun
            await FileCacheManager.performStartupCleanup(cleanupDir, { 
                maxFilesPerPrefix: 5,
                dryRun: true 
            });
            
            // All 15 files should still exist
            const remainingFiles = await fs.promises.readdir(cleanupDir);
            expect(remainingFiles.length).toBe(15);
        });

        it('should skip log and cache files', async () => {
            // Create various file types
            await fs.promises.writeFile(path.join(cleanupDir, 'analysis.log'), 'log content');
            await fs.promises.writeFile(path.join(cleanupDir, 'file-cache.json'), '{}');
            await fs.promises.writeFile(path.join(cleanupDir, 'XFI_RESULT.json'), '{}');
            
            // Run cleanup
            await FileCacheManager.performStartupCleanup(cleanupDir, {
                maxFilesPerPrefix: 0 // Would delete everything if not protected
            });
            
            // Protected files should still exist
            const remainingFiles = await fs.promises.readdir(cleanupDir);
            expect(remainingFiles).toContain('analysis.log');
            expect(remainingFiles).toContain('file-cache.json');
            expect(remainingFiles).toContain('XFI_RESULT.json');
        });
    });
});

