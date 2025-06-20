import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConfigManager } from '../configuration/configManager';
import type { AnalysisResult } from './types';
import { logger } from '../utils/logger';

export interface CacheEntry {
  result: AnalysisResult;
  timestamp: number;
  hash: string; // Content hash for invalidation
}

export class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_FILE = '.xfidelity-cache.json';
  
  async getCachedResult(repoPath: string, forceRefresh?: boolean): Promise<AnalysisResult | null> {
    const config = ConfigManager.getInstance().getConfig();
    
    // Skip cache if force refresh is requested or caching is disabled
    if (!config.cacheResults || forceRefresh) {
      return null;
    }
    
    const key = this.getCacheKey(repoPath);
    let entry = this.cache.get(key);
    
    // Load from disk if not in memory
    if (!entry) {
      const diskEntry = await this.loadFromDisk(repoPath);
      if (diskEntry) {
        entry = diskEntry;
      }
    }
    
    if (!entry) {
      return null;
    }
    
    // Check TTL
    const now = Date.now();
    const ttl = config.cacheTTL * 60 * 1000; // Convert minutes to ms
    
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      await this.removeFromDisk(repoPath);
      return null;
    }
    
    // Check content hash
    const currentHash = await this.computeContentHash(repoPath);
    if (currentHash !== entry.hash) {
      this.cache.delete(key);
      await this.removeFromDisk(repoPath);
      return null;
    }
    
    return entry.result;
  }
  
  async cacheResult(repoPath: string, result: AnalysisResult): Promise<void> {
    const config = ConfigManager.getInstance().getConfig();
    
    if (!config.cacheResults) {
      return;
    }
    
    const key = this.getCacheKey(repoPath);
    const hash = await this.computeContentHash(repoPath);
    
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      hash
    };
    
    this.cache.set(key, entry);
    await this.saveToDisk(repoPath, entry);
  }
  
  async clearCache(repoPath?: string): Promise<void> {
    if (repoPath) {
      // Clear specific repo cache
      const key = this.getCacheKey(repoPath);
      this.cache.delete(key);
      await this.removeFromDisk(repoPath);
    } else {
      // Clear all cache
      this.cache.clear();
      // Note: We don't clear all disk caches here since we don't know all repo paths
    }
  }
  
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  
  private getCacheKey(repoPath: string): string {
    return path.normalize(repoPath);
  }
  
  private async computeContentHash(repoPath: string): Promise<string> {
    // Simple hash based on key files' modification times and configuration
    const config = ConfigManager.getInstance().getConfig();
    const keyFiles = [
      'package.json',
      'tsconfig.json',
      '.xfidelity.json',
      'pom.xml',
      'build.gradle',
      'requirements.txt',
      'pyproject.toml'
    ];
    
    const stats: string[] = [];
    
    // Include configuration in hash
    stats.push(`config:${JSON.stringify(config)}`);
    
    // Include file modification times
    for (const file of keyFiles) {
      const filePath = path.join(repoPath, file);
      try {
        const stat = await fs.stat(filePath);
        stats.push(`${file}:${stat.mtime.getTime()}`);
      } catch {
        // File doesn't exist, skip
      }
    }
    
    // Include git commit hash if available
    try {
      const gitHeadPath = path.join(repoPath, '.git', 'HEAD');
      const headContent = await fs.readFile(gitHeadPath, 'utf8');
      
      if (headContent.startsWith('ref: ')) {
        // Branch reference
        const refPath = headContent.slice(5).trim();
        const refFilePath = path.join(repoPath, '.git', refPath);
        const commitHash = await fs.readFile(refFilePath, 'utf8');
        stats.push(`git:${commitHash.trim()}`);
      } else {
        // Direct commit hash
        stats.push(`git:${headContent.trim()}`);
      }
    } catch {
      // No git repo or error reading, skip
    }
    
    return crypto.createHash('md5').update(stats.join('|')).digest('hex');
  }
  
  private async loadFromDisk(repoPath: string): Promise<CacheEntry | null> {
    const cacheFile = path.join(repoPath, this.CACHE_FILE);
    
    try {
      const data = await fs.readFile(cacheFile, 'utf8');
      const entry = JSON.parse(data) as CacheEntry;
      
      // Restore Map objects from serialized data
      if (entry.result?.diagnostics) {
        entry.result.diagnostics = new Map(Object.entries(entry.result.diagnostics as any));
      }
      
      return entry;
    } catch {
      return null;
    }
  }
  
  private async saveToDisk(repoPath: string, entry: CacheEntry): Promise<void> {
    const cacheFile = path.join(repoPath, this.CACHE_FILE);
    
    try {
      // Convert Map to plain object for serialization
      const serializable = {
        ...entry,
        result: {
          ...entry.result,
          diagnostics: Object.fromEntries(entry.result.diagnostics)
        }
      };
      
      await fs.writeFile(cacheFile, JSON.stringify(serializable, null, 2));
    } catch (error) {
      // Fail silently for cache writes
      logger.warn(`Failed to save cache to disk: ${error}`);
    }
  }
  
  private async removeFromDisk(repoPath: string): Promise<void> {
    const cacheFile = path.join(repoPath, this.CACHE_FILE);
    
    try {
      await fs.unlink(cacheFile);
    } catch {
      // File doesn't exist or can't be deleted, ignore
    }
  }
  
  async cleanup(): Promise<void> {
    // Clean up expired cache entries
    const config = ConfigManager.getInstance().getConfig();
    const ttl = config.cacheTTL * 60 * 1000;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttl) {
        this.cache.delete(key);
      }
    }
  }
} 