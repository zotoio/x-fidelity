import { invalidRemoteValidation } from './invalidRemoteValidation';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
        warn: jest.fn()
    },
}));

describe('invalidRemoteValidation', () => {
    it('should return false for valid remote validation results', () => {
        const factValue = { result: [] };
        const result = invalidRemoteValidation.fn(factValue, null);
        expect(result).toBe(false);
    });

    it('should return true for invalid remote validation results', () => {
        const factValue = {
            result: [
                { validationResult: { isValid: false } },
            ],
        };
        const result = invalidRemoteValidation.fn(factValue, null);
        expect(result).toBe(true);
    });
});
