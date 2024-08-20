import { logger } from '../utils/logger';

// Simple in-memory cache
const cache: { [key: string]: { data: any; expiry: number } } = {};
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Cache for archetype lists and rule lists
const ruleListCache: { [archetype: string]: { data: any; expiry: number } } = {};

export function getCachedData(key: string): any | null {
    logger.debug(`checking cache for key: ${key}`);
    const item = cache[key];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}

export function setCachedData(key: string, data: any, ttl: number = DEFAULT_TTL): void {
    logger.debug(`setting cache for key: ${key}`);
    cache[key] = {
        data,
        expiry: Date.now() + ttl
    };
    logger.debug(JSON.stringify(cache));
}

export function clearCache(): void {
    logger.info('Clearing cache');
    Object.keys(cache).forEach((key) => {
        delete cache[key];
    });
    Object.keys(ruleListCache).forEach((key) => {
        delete ruleListCache[key];
    });
}

export function getCacheContent(): any {
    return {
        cache: cache,
        ruleListCache: ruleListCache
    };
}

export function setRuleListCache(archetype: string, data: any, ttl: number = DEFAULT_TTL): void {
    ruleListCache[archetype] = {
        data: data,
        expiry: Date.now() + ttl
    };
}

export function getRuleListCache(archetype: string): any | null {
    const item = ruleListCache[archetype];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}
