import { getCachedData, setCachedData, clearCache, getCacheContent, getRuleListCache, setRuleListCache, handleConfigChange } from './cacheManager';
import { ConfigManager } from '@x-fidelity/core';
import { logger } from './utils/serverLogger';

jest.mock('./utils/serverLogger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn()
    }
}));

jest.mock('@x-fidelity/core', () => ({
    ...jest.requireActual('@x-fidelity/core'),
    ConfigManager: {
        clearLoadedConfigs: jest.fn()
    }
}));

describe('Cache Manager', () => {
    beforeEach(() => {
        clearCache();
        jest.clearAllMocks();
    });

    it('should cache and retrieve data', () => {
        setCachedData('testKey', 'testData');
        const data = getCachedData('testKey');
        expect(data).toBe('testData');
    });

    it('should return null for expired or non-existent data', () => {
        const data = getCachedData('nonExistentKey');
        expect(data).toBeNull();
    });

    it('should clear cache', () => {
        setCachedData('testKey', 'testData');
        clearCache();
        const data = getCachedData('testKey');
        expect(data).toBeNull();
    });

    it('should return cache content', () => {
        setCachedData('testKey', 'testData');
        const content = getCacheContent();
        expect(content.cache).toHaveProperty('testKey', 'testData');
    });

    it('should cache and retrieve rule list data', () => {
        const mockRules = [{ name: 'rule1' }, { name: 'rule2' }];
        setRuleListCache('testArchetype', mockRules);
        const data = getRuleListCache('testArchetype');
        expect(data).toEqual(mockRules);
    });

    it('should handle config changes', () => {
        handleConfigChange('test/path/config.json', 'File', 'changed');
        expect(logger.info).toHaveBeenCalledWith('File test/path/config.json has been changed');
        expect(ConfigManager.clearLoadedConfigs).toHaveBeenCalled();
        expect(logger.debug).toHaveBeenCalledWith('Cache and loaded configs cleared due to local config change');
    });

    it('should respect TTL for cached data', () => {
        jest.useFakeTimers();
        setCachedData('testKey', 'testData', 100); // 100ms TTL
        expect(getCachedData('testKey')).toBe('testData');
        
        // Advance time past TTL
        jest.advanceTimersByTime(101);
        expect(getCachedData('testKey')).toBeNull();
        
        jest.useRealTimers();
    });

    it('should handle cache size limits', () => {
        // Fill cache to its limit (MAX_CACHE_SIZE is 1000 in the implementation)
        for (let i = 0; i < 1001; i++) {
            setCachedData(`key${i}`, `value${i}`);
        }
        
        // The first key should be evicted
        expect(getCachedData('key0')).toBeNull();
        
        // The last key should still be present
        expect(getCachedData('key1000')).toBe('value1000');
    });
});
