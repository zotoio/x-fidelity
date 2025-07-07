import { fileContainsWithPosition } from './fileContainsWithPosition';

describe('fileContainsWithPosition', () => {
    it('should work with boolean for simple cases', () => {
        const factValue = { result: [{ match: 'test' }] };
        expect(fileContainsWithPosition.fn(factValue, true)).toBe(true);
        expect(fileContainsWithPosition.fn(null, false)).toBe(true);
    });

    it('should work with enhanced config object for position data', () => {
        const factValue = {
            matches: [
                {
                    pattern: 'test',
                    match: 'test',
                    range: {
                        start: { line: 1, column: 1 },
                        end: { line: 1, column: 5 }
                    },
                    context: 'test content'
                }
            ]
        };
        
        const config = {
            expectMatch: true,
            requirePosition: true,
            requireContext: true
        };
        
        expect(fileContainsWithPosition.fn(factValue, config)).toBe(true);
    });

    it('should enforce position requirements', () => {
        const factValueWithoutPosition = {
            matches: [
                {
                    pattern: 'test',
                    match: 'test',
                    context: 'test content'
                    // Missing range/position data
                }
            ]
        };
        
        const config = {
            expectMatch: true,
            requirePosition: true
        };
        
        expect(fileContainsWithPosition.fn(factValueWithoutPosition, config)).toBe(false);
    });

    it('should enforce context requirements', () => {
        const factValueWithoutContext = {
            matches: [
                {
                    pattern: 'test',
                    match: 'test',
                    range: {
                        start: { line: 1, column: 1 },
                        end: { line: 1, column: 5 }
                    }
                    // Missing context
                }
            ]
        };
        
        const config = {
            expectMatch: true,
            requireContext: true
        };
        
        expect(fileContainsWithPosition.fn(factValueWithoutContext, config)).toBe(false);
    });

    it('should handle match count requirements', () => {
        const factValue = {
            matches: [
                { pattern: 'test1', match: 'test1', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 6 } } },
                { pattern: 'test2', match: 'test2', range: { start: { line: 2, column: 1 }, end: { line: 2, column: 6 } } }
            ]
        };
        
        // Should pass: 2 matches, min 1, max 5
        expect(fileContainsWithPosition.fn(factValue, {
            expectMatch: true,
            minMatches: 1,
            maxMatches: 5
        })).toBe(true);
        
        // Should fail: 2 matches, but max is 1
        expect(fileContainsWithPosition.fn(factValue, {
            expectMatch: true,
            minMatches: 1,
            maxMatches: 1
        })).toBe(false);
        
        // Should fail: 2 matches, but min is 3
        expect(fileContainsWithPosition.fn(factValue, {
            expectMatch: true,
            minMatches: 3,
            maxMatches: 5
        })).toBe(false);
    });

    it('should handle legacy fact format', () => {
        const factValue = {
            result: [
                { match: 'test', lineNumber: 1, line: 'test content' }
            ]
        };
        
        expect(fileContainsWithPosition.fn(factValue, true)).toBe(true);
        expect(fileContainsWithPosition.fn(factValue, false)).toBe(false);
    });

    it('should handle expectMatch false correctly', () => {
        const factValueWithMatches = {
            matches: [
                { pattern: 'test', match: 'test', range: { start: { line: 1, column: 1 }, end: { line: 1, column: 5 } } }
            ]
        };
        
        const factValueWithoutMatches = {
            matches: []
        };
        
        expect(fileContainsWithPosition.fn(factValueWithMatches, false)).toBe(false);
        expect(fileContainsWithPosition.fn(factValueWithoutMatches, false)).toBe(true);
    });

    it('should handle fallback cases', () => {
        expect(fileContainsWithPosition.fn('some content', true)).toBe(true);
        expect(fileContainsWithPosition.fn('', false)).toBe(true);
        expect(fileContainsWithPosition.fn(null, false)).toBe(true);
        expect(fileContainsWithPosition.fn(undefined, false)).toBe(true);
    });
}); 