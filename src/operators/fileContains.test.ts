import { logger } from '../utils/logger';
import { fileContains } from './fileContains';

jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
    },
}));

describe('fileContains', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns true when the checkString is found in the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = 'world';
        expect(fileContains.fn(fileContent, checkString)).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('found in line 1'));
    });

    it('returns false when the checkString is not found in the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = 'universe';
        expect(fileContains.fn(fileContent, checkString)).toBe(false);
        expect(logger.debug).not.toHaveBeenCalled();
    });

    it('returns true when the checkString is a regular expression that matches part of the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = '\\bworld\\b';
        expect(fileContains.fn(fileContent, checkString)).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('found in line 1'));
    });

    it('returns false when the checkString is a regular expression that does not match any part of the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = '\\buniverse\\b';
        expect(fileContains.fn(fileContent, checkString)).toBe(false);
        expect(logger.debug).not.toHaveBeenCalled();
    });

    it('handles multiline fileContent correctly', () => {
        const fileContent = 'Hello,\nworld!';
        const checkString = 'world';
        expect(fileContains.fn(fileContent, checkString)).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('found in line 2'));
    });

    it('handles empty fileContent', () => {
        const fileContent = '';
        const checkString = 'test';
        expect(fileContains.fn(fileContent, checkString)).toBe(false);
        expect(logger.debug).not.toHaveBeenCalled();
    });

    it('handles empty checkString', () => {
        const fileContent = 'Hello, world!';
        const checkString = '';
        expect(fileContains.fn(fileContent, checkString)).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('found in line 1'));
    });

    it('is case sensitive', () => {
        const fileContent = 'Hello, World!';
        const checkString = 'world';
        expect(fileContains.fn(fileContent, checkString)).toBe(false);
        expect(logger.debug).not.toHaveBeenCalled();
    });

    it('logs a debug message when the checkString is found', () => {
        const fileContent = 'Hello, world!';
        const checkString = 'world';
        fileContains.fn(fileContent, checkString);
        expect(logger.debug).toHaveBeenCalledWith(`fileContains '${checkString}' found in line 1: Hello, world!`);
    });
});
