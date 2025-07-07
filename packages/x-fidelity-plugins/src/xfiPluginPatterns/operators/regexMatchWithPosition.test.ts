import { regexMatchWithPosition } from './regexMatchWithPosition';

describe('regexMatchWithPosition', () => {
    it('should work with string pattern for enhanced fact results', () => {
        const factValue = {
            matches: [
                {
                    pattern: 'test',
                    match: 'test',
                    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
                }
            ]
        };
        const result = regexMatchWithPosition.fn(factValue, 'test');
        expect(result).toBe(true);
    });

    it('should work with enhanced config object', () => {
        const factValue = {
            matches: [
                {
                    pattern: 'Test',
                    match: 'Test',
                    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
                }
            ]
        };
        const config = {
            pattern: 'test',
            flags: 'i',
            captureGroups: true
        };
        const result = regexMatchWithPosition.fn(factValue, config);
        expect(result).toBe(true);
    });

    it('should handle legacy fact result format', () => {
        const factValue = {
            result: [
                { match: 'test', lineNumber: 1, line: 'test content' }
            ]
        };
        const result = regexMatchWithPosition.fn(factValue, 'test');
        expect(result).toBe(true);
    });

    it('should handle direct string matching', () => {
        const result = regexMatchWithPosition.fn('test content', 'test');
        expect(result).toBe(true);
    });

    it('should return false when no matches found', () => {
        const factValue = {
            matches: [
                {
                    pattern: 'different',
                    match: 'different',
                    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 9 } }
                }
            ]
        };
        const result = regexMatchWithPosition.fn(factValue, 'test');
        expect(result).toBe(false);
    });

    it('should handle regex flags correctly', () => {
        const factValue = {
            matches: [
                {
                    pattern: 'TEST',
                    match: 'TEST',
                    range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } }
                }
            ]
        };
        const config = {
            pattern: 'test',
            flags: 'i'
        };
        const result = regexMatchWithPosition.fn(factValue, config);
        expect(result).toBe(true);
    });

    it('should handle empty or null fact values', () => {
        expect(regexMatchWithPosition.fn(null, 'test')).toBe(false);
        expect(regexMatchWithPosition.fn(undefined, 'test')).toBe(false);
        expect(regexMatchWithPosition.fn({}, 'test')).toBe(false);
    });
}); 