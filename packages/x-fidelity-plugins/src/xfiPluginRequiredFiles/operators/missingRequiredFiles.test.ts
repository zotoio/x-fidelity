// Mock must be at the top before any imports
jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn()
    }
}));

import { missingRequiredFilesOperator } from './missingRequiredFiles';
import { logger } from '@x-fidelity/core';

describe('missingRequiredFilesOperator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when missing files exceed threshold', () => {
        const factValue = {
            missing: ['package.json', 'README.md'],
            total: 5,
            found: 3
        };

        const threshold = 1; // 2 missing files > 1 threshold
        const result = missingRequiredFilesOperator.fn(factValue, threshold);

        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalled();
    });

    it('should return false when missing files do not exceed threshold', () => {
        const factValue = {
            missing: ['package.json'],
            total: 3,
            found: 2
        };

        const threshold = 1; // 1 missing file = 1 threshold (not greater)
        const result = missingRequiredFilesOperator.fn(factValue, threshold);

        expect(result).toBe(false);
    });

    it('should handle invalid input gracefully', () => {
        const result = missingRequiredFilesOperator.fn(null, []);
        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith(
            'factValue', null
        );
    });

    it('should handle missing missing property', () => {
        const factValue = {
            total: 3,
            found: 3
        };

        const result = missingRequiredFilesOperator.fn(factValue, 1);
        expect(result).toBe(false);
    });

    it('should handle zero threshold', () => {
        const factValue = {
            missing: ['package.json'],
            total: 1,
            found: 0
        };

        const result = missingRequiredFilesOperator.fn(factValue, 0);
        expect(result).toBe(true); // 1 missing file > 0 threshold
    });
});
