import { regexMatch } from './regexMatch';

describe('regexMatch operator', () => {
    const operator = regexMatch.fn;

    describe('basic matching', () => {
        it('should return true when pattern matches', () => {
            expect(operator('hello world', 'hello')).toBe(true);
            expect(operator('test123', '\\d+')).toBe(true);
            expect(operator('foo.bar.baz', '\\.bar\\.')).toBe(true);
        });

        it('should return false when pattern does not match', () => {
            expect(operator('hello world', 'goodbye')).toBe(false);
            expect(operator('noNumbers', '\\d+')).toBe(false);
        });

        it('should match at any position in the string', () => {
            expect(operator('abc123xyz', '123')).toBe(true);
            expect(operator('prefix_match_suffix', 'match')).toBe(true);
        });
    });

    describe('regex flags', () => {
        it('should support case-insensitive matching with /pattern/i format', () => {
            expect(operator('HELLO WORLD', '/hello/i')).toBe(true);
            expect(operator('Hello World', '/HELLO/i')).toBe(true);
        });

        it('should support global flag with /pattern/g format', () => {
            expect(operator('test test test', '/test/g')).toBe(true);
        });

        it('should support multiline flag with /pattern/m format', () => {
            expect(operator('line1\nline2', '/^line2/m')).toBe(true);
        });

        it('should support combined flags', () => {
            expect(operator('TEST\ntest', '/^test/im')).toBe(true);
        });

        it('should work without /pattern/flags format', () => {
            expect(operator('test', 'test')).toBe(true);
            expect(operator('TEST', 'test')).toBe(false);
        });
    });

    describe('special regex patterns', () => {
        it('should match start of string with ^', () => {
            expect(operator('hello world', '^hello')).toBe(true);
            expect(operator('say hello', '^hello')).toBe(false);
        });

        it('should match end of string with $', () => {
            expect(operator('hello world', 'world$')).toBe(true);
            expect(operator('world hello', 'world$')).toBe(false);
        });

        it('should match word boundaries with \\b', () => {
            expect(operator('hello world', '\\bworld\\b')).toBe(true);
            expect(operator('helloworld', '\\bworld\\b')).toBe(false);
        });

        it('should match character classes', () => {
            expect(operator('a1b2c3', '[0-9]+')).toBe(true);
            expect(operator('hello', '[A-Z]')).toBe(false);
        });

        it('should match with quantifiers', () => {
            expect(operator('aaa', 'a{3}')).toBe(true);
            expect(operator('aa', 'a{3}')).toBe(false);
            expect(operator('color', 'colou?r')).toBe(true);
            expect(operator('colour', 'colou?r')).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should return false for null factValue', () => {
            expect(operator(null, 'pattern')).toBe(false);
        });

        it('should return false for undefined factValue', () => {
            expect(operator(undefined, 'pattern')).toBe(false);
        });

        it('should return false for non-string regexPattern', () => {
            expect(operator('test', null as any)).toBe(false);
            expect(operator('test', undefined as any)).toBe(false);
            expect(operator('test', 123 as any)).toBe(false);
            expect(operator('test', {} as any)).toBe(false);
        });

        it('should convert number factValue to string', () => {
            expect(operator(12345, '\\d+')).toBe(true);
            expect(operator(123, '123')).toBe(true);
        });

        it('should handle empty string factValue', () => {
            expect(operator('', 'test')).toBe(false);
            expect(operator('', '^$')).toBe(true); // Empty string matches ^$
        });

        it('should handle empty string pattern', () => {
            expect(operator('test', '')).toBe(true); // Empty regex matches everything
        });

        it('should return false for invalid regex patterns', () => {
            // Invalid regex should return false (caught by try-catch)
            expect(operator('test', '[invalid')).toBe(false);
        });
    });

    describe('complex patterns', () => {
        it('should match email patterns', () => {
            const emailPattern = '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}';
            expect(operator('test@example.com', emailPattern)).toBe(true);
            expect(operator('invalid-email', emailPattern)).toBe(false);
        });

        it('should match URL patterns', () => {
            const urlPattern = 'https?://[a-zA-Z0-9.-]+';
            expect(operator('https://example.com', urlPattern)).toBe(true);
            expect(operator('http://test.org', urlPattern)).toBe(true);
            expect(operator('ftp://server.com', urlPattern)).toBe(false);
        });

        it('should match file extension patterns', () => {
            expect(operator('file.ts', '\\.ts$')).toBe(true);
            expect(operator('file.tsx', '\\.tsx?$')).toBe(true);
            expect(operator('file.js', '\\.tsx?$')).toBe(false);
        });
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(regexMatch.name).toBe('regexMatch');
        });

        it('should have description', () => {
            expect(regexMatch.description).toBeDefined();
            expect(typeof regexMatch.description).toBe('string');
        });

        it('should have fn function', () => {
            expect(typeof regexMatch.fn).toBe('function');
        });
    });
});
