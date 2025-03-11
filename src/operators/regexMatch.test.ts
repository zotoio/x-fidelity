import { regexMatch } from './regexMatch';
import { logger } from '../utils/logger';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    },
}));

describe('regexMatch', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when the string matches the pattern', () => {
        expect(regexMatch.fn('hello world', 'hello')).toBe(true);
        expect(regexMatch.fn('hello world', 'world$')).toBe(true);
        expect(regexMatch.fn('hello world', '^hello')).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('result is true'));
    });

    it('should return false when the string does not match the pattern', () => {
        expect(regexMatch.fn('hello world', 'goodbye')).toBe(false);
        expect(regexMatch.fn('hello world', '^world')).toBe(false);
        expect(regexMatch.fn('hello world', 'hello$')).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('result is false'));
    });

    it('should handle regex flags correctly', () => {
        expect(regexMatch.fn('Hello World', '/hello/i')).toBe(true);
        expect(regexMatch.fn('Hello\nWorld', '/hello.*world/is')).toBe(true);
        expect(regexMatch.fn('Hello World', '/hello world/i')).toBe(true);
    });

    it('should handle undefined or null factValue', () => {
        expect(regexMatch.fn(undefined, 'test')).toBe(false);
        expect(regexMatch.fn(null, 'test')).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('regexMatch: factValue is undefined or null');
    });

    it('should handle non-string regexPattern', () => {
        expect(regexMatch.fn('test', null as any)).toBe(false);
        expect(regexMatch.fn('test', undefined as any)).toBe(false);
        expect(regexMatch.fn('test', 123 as any)).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('regexPattern is not a string'));
    });

    it('should handle invalid regex patterns gracefully', () => {
        expect(regexMatch.fn('test', '[')).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('regexMatch error'));
    });

    it('should handle non-string factValues by converting them to strings', () => {
        expect(regexMatch.fn(123, '123')).toBe(true);
        expect(regexMatch.fn(true, 'true')).toBe(true);
        expect(regexMatch.fn({ toString: () => 'custom' }, 'custom')).toBe(true);
    });
});
