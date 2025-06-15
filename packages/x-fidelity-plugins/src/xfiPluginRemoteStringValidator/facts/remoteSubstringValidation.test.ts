import { remoteSubstringValidationFact } from './remoteSubstringValidation';
import { logger } from '@x-fidelity/core';

jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        warn: jest.fn()
    },
}));

// Mock console.error for proper test isolation
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation(() => {});

afterEach(() => {
    mockConsoleError.mockClear();
    mockConsoleDebug.mockClear();
});

describe('remoteSubstringValidation', () => {
    it('should return error when missing required parameters', async () => {
        const params = {
            // Missing content and pattern
        };

        const result = await remoteSubstringValidationFact.fn(params, undefined);

        expect(result).toHaveProperty('isValid', false);
        expect(result).toHaveProperty('error', 'Missing required parameters: content and pattern');
    });

    it('should return error when missing content parameter', async () => {
        const params = {
            pattern: 'http://example.com/validate',
            // Missing content
        };

        const result = await remoteSubstringValidationFact.fn(params, undefined);

        expect(result).toHaveProperty('isValid', false);
        expect(result).toHaveProperty('error', 'Missing required parameters: content and pattern');
    });

    it('should return error when missing pattern parameter', async () => {
        const params = {
            content: 'some content to validate',
            // Missing pattern
        };

        const result = await remoteSubstringValidationFact.fn(params, undefined);

        expect(result).toHaveProperty('isValid', false);
        expect(result).toHaveProperty('error', 'Missing required parameters: content and pattern');
    });
});
