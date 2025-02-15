import { ConfigManager } from '../core/configManager';
import { logger } from '../utils/logger';

const MAX_CACHE_SIZE = 1000; // Maximum number of items in the cache
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

class CacheItem {
    constructor(public data: any, public expiry: number) {}
}

class LRUCache {
    private cache: Map<string, CacheItem>;
    private readonly maxSize: number;

    constructor(maxSize: number) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key: string): any | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (item.expiry <= Date.now()) {
            this.cache.delete(key);
            return null;
        }
        // Move accessed item to the end to mark it as most recently used
        this.cache.delete(key);
        this.cache.set(key, item);
        return item.data;
    }

    set(key: string, value: any, ttl: number): void {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, new CacheItem(value, Date.now() + ttl));
    }

    clear(): void {
        this.cache.clear();
    }

    getContent(): { [key: string]: any } {
        const content: { [key: string]: any } = {};
        this.cache.forEach((value, key) => {
            content[key] = value.data;
        });
        return content;
    }
}

const cache = new LRUCache(MAX_CACHE_SIZE);
const ruleListCache = new LRUCache(MAX_CACHE_SIZE);

export function getCachedData(key: string): any | null {
    logger.debug({ key, operation: 'cache-check' }, 'Checking cache');
    return cache.get(key);
}

export function setCachedData(key: string, data: any, ttl: number = DEFAULT_TTL): void {
    logger.debug({ key, operation: 'cache-set' }, 'Setting cache');
    cache.set(key, data, ttl);
}

export function clearCache(): void {
    logger.debug({ operation: 'cache-clear' }, 'Clearing cache');
    cache.clear();
    ruleListCache.clear();
}

export function getCacheContent(): any {
    return {
        cache: cache.getContent(),
        ruleListCache: ruleListCache.getContent()
    };
}

export function setRuleListCache(archetype: string, data: any, ttl: number = DEFAULT_TTL): void {
    ruleListCache.set(archetype, data, ttl);
}

export function getRuleListCache(archetype: string): any | null {
    return ruleListCache.get(archetype);
}

export function handleConfigChange(path: string, fileType: string, changeType: string) {
    logger.info(`${fileType} ${path} has been ${changeType}`);
    clearCache();
    ConfigManager.clearLoadedConfigs();
    logger.debug('Cache and loaded configs cleared due to local config change');
}

