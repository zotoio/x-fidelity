import { validateInput, validateUrlInput, validateTelemetryData } from './inputValidation';

describe('validateInput', () => {
    it('should return false for undefined or null input', () => {
        expect(validateInput(undefined)).toBe(false);
        expect(validateInput(null as any)).toBe(false);
    });

    it('should return false for potential directory traversal attempts', () => {
        expect(validateInput('../somepath')).toBe(false);
        expect(validateInput('~/somepath')).toBe(false);
    });

    it('should return false for inputs with suspicious characters', () => {
        expect(validateInput('some;command')).toBe(false);
        expect(validateInput('some|pipe')).toBe(false);
        expect(validateInput('some`backtick`')).toBe(false);
    });

    it('should return false for excessively long inputs', () => {
        expect(validateInput('a'.repeat(1001))).toBe(false);
    });

    it('should return true for valid inputs', () => {
        expect(validateInput('validInput')).toBe(true);
        expect(validateInput('valid/path/to/file.txt')).toBe(true);
    });
});

describe('validateUrlInput', () => {
    it('should return true for valid URL inputs', () => {
        expect(validateUrlInput('valid-url')).toBe(true);
        expect(validateUrlInput('valid_url123')).toBe(true);
    });

    it('should return false for invalid URL inputs', () => {
        expect(validateUrlInput('invalid url')).toBe(false);
        expect(validateUrlInput('invalid/url')).toBe(false);
        expect(validateUrlInput('a'.repeat(51))).toBe(false);
    });
});

describe('validateTelemetryData', () => {
    it('should return true for valid telemetry data', () => {
        const validData = {
            eventType: 'test',
            metadata: {},
            timestamp: '2023-01-01T00:00:00.000Z'
        };
        expect(validateTelemetryData(validData)).toBe(true);
    });

    it('should return false for invalid telemetry data', () => {
        expect(validateTelemetryData({})).toBe(false);
        expect(validateTelemetryData({ eventType: 'test', metadata: {} })).toBe(false);
        expect(validateTelemetryData({ eventType: 'test', metadata: {}, timestamp: 'invalid' })).toBe(false);
    });
});
