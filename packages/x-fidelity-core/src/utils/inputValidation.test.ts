import { validateInput, validateUrlInput, validateTelemetryData } from './inputValidation';

describe('validateInput', () => {
    it('should return false for undefined or null input', () => {
        expect(validateInput(undefined).isValid).toBe(false);
        expect(validateInput(null as any).isValid).toBe(false);
    });

    it('should return false for potential directory traversal attempts', () => {
        expect(validateInput('../somepath').isValid).toBe(false);
        expect(validateInput('~/somepath').isValid).toBe(false);
    });

    it('should return false for inputs with suspicious characters', () => {
        expect(validateInput('some;command').isValid).toBe(false);
        expect(validateInput('some|pipe').isValid).toBe(false);
        expect(validateInput('some`backtick`').isValid).toBe(false);
    });

    it('should return false for excessively long inputs', () => {
        expect(validateInput('a'.repeat(1001)).isValid).toBe(false);
    });

    it('should return true for valid inputs', () => {
        expect(validateInput('validInput').isValid).toBe(true);
        expect(validateInput('valid/path/to/file.txt').isValid).toBe(true);
    });
});

describe('validateUrlInput', () => {
    it('should return true for valid URL inputs', () => {
        expect(validateUrlInput('valid-url').isValid).toBe(true);
        expect(validateUrlInput('valid_url123').isValid).toBe(true);
    });

    it('should return false for invalid URL inputs', () => {
        expect(validateUrlInput('invalid url').isValid).toBe(false);
        expect(validateUrlInput('invalid/url').isValid).toBe(false);
        expect(validateUrlInput('a'.repeat(51)).isValid).toBe(false);
    });
});

describe('validateTelemetryData', () => {
    it('should return true for valid telemetry data', () => {
        const validData = {
            eventType: 'test',
            metadata: {},
            timestamp: '2023-01-01T00:00:00.000Z'
        };
        expect(validateTelemetryData(validData).isValid).toBe(true);
    });

    it('should return false for invalid telemetry data', () => {
        expect(validateTelemetryData({}).isValid).toBe(false);
        expect(validateTelemetryData({ eventType: 'test', metadata: {} }).isValid).toBe(false);
        expect(validateTelemetryData({ eventType: 'test', metadata: {}, timestamp: 'invalid' }).isValid).toBe(false);
    });
});
