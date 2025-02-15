import { isPathInside } from './pathUtils';

describe('isPathInside', () => {
    it('should return true for paths inside the parent path', () => {
        expect(isPathInside('/parent/child', '/parent')).toBe(true);
    });

    it('should return false for paths outside the parent path', () => {
        expect(isPathInside('/outside/child', '/parent')).toBe(false);
    });

    it('should handle edge cases', () => {
        expect(isPathInside('', '/parent')).toBe(false);
        expect(isPathInside('/parent/child', '')).toBe(false);
        expect(isPathInside('', '')).toBe(false);
    });
});
