import { fileContains } from './fileContains';

describe('fileContains', () => {
    it('returns true when the checkString is found in the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = 'world';
        expect(fileContains.fn(fileContent, checkString)).toBe(true);
    });

    it('returns false when the checkString is not found in the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = 'universe';
        expect(fileContains.fn(fileContent, checkString)).toBe(false);
    });

    it('returns true when the checkString is a regular expression that matches part of the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = '\\bworld\\b';
        expect(fileContains.fn(fileContent, checkString)).toBe(true);
    });

    it('returns false when the checkString is a regular expression that does not match any part of the fileContent', () => {
        const fileContent = 'Hello, world!';
        const checkString = '\\buniverse\\b';
        expect(fileContains.fn(fileContent, checkString)).toBe(false);
    });
});