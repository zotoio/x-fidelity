import { FileCacheManager, FileCacheEntry } from './fileCacheManager';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Mock fs module
jest.mock('fs', () => ({
    promises: {
        stat: jest.fn(),
        readFile: jest.fn(),
        writeFile: jest.fn(),
        mkdir: jest.fn(),
        unlink: jest.fn(),
        access: jest.fn(),
        readdir: jest.fn()
    }
}));

// Mock logger
jest.mock('./logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Mock options
jest.mock('../core/options', () => ({
    options: {
        fileCacheTTL: 60,
        dir: '/mock/dir'
    }
}));

describe('FileCacheManager', () => {
    let cacheManager: FileCacheManager;
    const mockCacheDir = '/mock/cache/dir';
    const mockRepoPath = '/mock/repo';

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset singleton
        (FileCacheManager as any).instance = null;
        
        // Mock fs.promises.access to simulate file not exists by default
        (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        
        // Mock fs.promises.mkdir
        (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
    });

    afterEach(() => {
        // Clean up singleton
        (FileCacheManager as any).instance = null;
    });

    describe('getInstance', () => {
        it('should create singleton instance', () => {
            const instance1 = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
            const instance2 = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
            
            expect(instance1).toBe(instance2);
        });

        it('should use default cache directory if not provided', () => {
            const instance = FileCacheManager.getInstance();
            expect(instance).toBeDefined();
        });
    });

    describe('isFileChanged', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should return true for uncached files', async () => {
            const mockStats = { mtime: new Date() };
            (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
            
            const isChanged = await cacheManager.isFileChanged('/mock/file.ts');
            
            expect(isChanged).toBe(true);
        });

        it('should return true when file stat fails', async () => {
            (fs.promises.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));
            
            const isChanged = await cacheManager.isFileChanged('/nonexistent/file.ts');
            
            expect(isChanged).toBe(true);
        });
    });

    describe('updateFileCache', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should update cache entry for a file', async () => {
            const mockStats = { mtime: new Date() };
            (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
            (fs.promises.readFile as jest.Mock).mockResolvedValue('file content');
            
            await cacheManager.updateFileCache('/mock/file.ts', { result: 'analysis' });
            
            // Verify stat was called
            expect(fs.promises.stat).toHaveBeenCalled();
            expect(fs.promises.readFile).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            (fs.promises.stat as jest.Mock).mockRejectedValue(new Error('Permission denied'));
            
            // Should not throw
            await expect(cacheManager.updateFileCache('/mock/file.ts')).resolves.not.toThrow();
        });
    });

    describe('getCachedResult', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should return null for uncached files', () => {
            const result = cacheManager.getCachedResult('/mock/file.ts');
            expect(result).toBeNull();
        });
    });

    describe('getChangedFiles', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should filter to only changed files', async () => {
            const mockStats = { mtime: new Date() };
            (fs.promises.stat as jest.Mock).mockResolvedValue(mockStats);
            
            const files = ['/mock/file1.ts', '/mock/file2.ts', '/mock/file3.ts'];
            const changedFiles = await cacheManager.getChangedFiles(files);
            
            // All files should be considered changed (not in cache)
            expect(changedFiles.length).toBe(3);
        });

        it('should handle empty file list', async () => {
            const changedFiles = await cacheManager.getChangedFiles([]);
            expect(changedFiles).toEqual([]);
        });
    });

    describe('saveCacheToDisk', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should create cache directory and save cache', async () => {
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            await cacheManager.saveCacheToDisk();
            
            expect(fs.promises.mkdir).toHaveBeenCalledWith(mockCacheDir, { recursive: true });
            expect(fs.promises.writeFile).toHaveBeenCalled();
        });

        it('should handle save errors gracefully', async () => {
            (fs.promises.mkdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));
            
            // Should not throw
            await expect(cacheManager.saveCacheToDisk()).resolves.not.toThrow();
        });
    });

    describe('clearCache', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should clear in-memory cache', async () => {
            (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
            
            await cacheManager.clearCache();
            
            const stats = cacheManager.getCacheStats();
            expect(stats.entryCount).toBe(0);
        });

        it('should handle missing cache file gracefully', async () => {
            (fs.promises.unlink as jest.Mock).mockRejectedValue(new Error('ENOENT'));
            
            // Should not throw
            await expect(cacheManager.clearCache()).resolves.not.toThrow();
        });

        it('should NOT delete XFI_RESULT.json even if path contains it', async () => {
            // This is a critical safety check
            const mockLogger = require('./logger').logger;
            
            // Create a cache manager with a path that would include XFI_RESULT.json
            (FileCacheManager as any).instance = null;
            const dangerousCacheManager = FileCacheManager.getInstance('/mock/XFI_RESULT.json', mockRepoPath);
            
            await dangerousCacheManager.clearCache();
            
            // The unlink should NOT be called because of the safety check
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('CRITICAL'),
                expect.any(Object)
            );
        });
    });

    describe('getCacheStats', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should return cache statistics', () => {
            const stats = cacheManager.getCacheStats();
            
            expect(stats).toHaveProperty('entryCount');
            expect(stats).toHaveProperty('ttlMinutes');
            expect(stats).toHaveProperty('cacheDir');
            expect(stats.cacheDir).toBe(mockCacheDir);
        });
    });

    describe('dispose', () => {
        beforeEach(() => {
            cacheManager = FileCacheManager.getInstance(mockCacheDir, mockRepoPath);
        });

        it('should save cache to disk and clear singleton', async () => {
            (fs.promises.mkdir as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
            
            await cacheManager.dispose();
            
            expect(fs.promises.writeFile).toHaveBeenCalled();
            expect((FileCacheManager as any).instance).toBeNull();
        });
    });

    describe('performStartupCleanup', () => {
        it('should skip cleanup if directory does not exist', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));
            
            await FileCacheManager.performStartupCleanup('/nonexistent/dir');
            
            // Should not throw and should not try to read directory
            expect(fs.promises.readdir).not.toHaveBeenCalled();
        });

        it('should process files in results directory', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                'xfi-result-2025-01-01-1234567890123.json',
                'xfi-result-2025-01-02-1234567890124.json'
            ]);
            (fs.promises.stat as jest.Mock).mockResolvedValue({
                isDirectory: () => false,
                size: 1024
            });
            
            await FileCacheManager.performStartupCleanup('/mock/results', {
                maxFilesPerPrefix: 5,
                maxAgeHours: 168
            });
            
            expect(fs.promises.readdir).toHaveBeenCalledWith('/mock/results');
        });

        it('should not delete files in dry run mode', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                'xfi-result-2025-01-01-1234567890123.json',
                'xfi-result-2025-01-02-1234567890124.json'
            ]);
            (fs.promises.stat as jest.Mock).mockResolvedValue({
                isDirectory: () => false,
                size: 1024
            });
            
            await FileCacheManager.performStartupCleanup('/mock/results', {
                dryRun: true
            });
            
            expect(fs.promises.unlink).not.toHaveBeenCalled();
        });

        it('should never delete XFI_RESULT.json', async () => {
            const mockLogger = require('./logger').logger;
            
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                'XFI_RESULT.json',
                'xfi-result-2025-01-01-1234567890123.json'
            ]);
            (fs.promises.stat as jest.Mock).mockResolvedValue({
                isDirectory: () => false,
                size: 1024
            });
            
            await FileCacheManager.performStartupCleanup('/mock/results', {
                maxFilesPerPrefix: 1
            });
            
            // XFI_RESULT.json should be skipped, not deleted
            // Check that unlink was not called with XFI_RESULT.json
            const unlinkCalls = (fs.promises.unlink as jest.Mock).mock.calls;
            for (const call of unlinkCalls) {
                expect(call[0]).not.toContain('XFI_RESULT.json');
            }
        });

        it('should skip log files and cache files', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                'xfi.log',
                'file-cache.json',
                'XFI_RESULT.json'
            ]);
            (fs.promises.stat as jest.Mock).mockResolvedValue({
                isDirectory: () => false,
                size: 1024
            });
            
            await FileCacheManager.performStartupCleanup('/mock/results');
            
            // None of these should be deleted
            expect(fs.promises.unlink).not.toHaveBeenCalled();
        });

        it('should handle stat errors gracefully', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([
                'xfi-result-2025-01-01-1234567890123.json'
            ]);
            (fs.promises.stat as jest.Mock).mockRejectedValue(new Error('Permission denied'));
            
            // Should not throw
            await expect(FileCacheManager.performStartupCleanup('/mock/results'))
                .resolves.not.toThrow();
        });
    });
});
