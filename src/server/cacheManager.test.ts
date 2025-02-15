import { getCachedData, setCachedData, clearCache, getCacheContent } from './cacheManager';

describe('Cache Manager', () => {
    beforeEach(() => {
        clearCache();
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
});
