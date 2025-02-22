import { missingRequiredFiles } from './missingRequiredFiles';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn()
    },
}));

describe('missingRequiredFiles', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when missing files are found', () => {
        const factValue = {
            result: [{ file: 'missing.txt' }]
        };
        const result = missingRequiredFiles.fn(factValue, true);
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('missingRequiredFiles: true');
    });

    it('should return false when no missing files are found', () => {
        const factValue = {
            result: []
        };
        const result = missingRequiredFiles.fn(factValue, true);
        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('missingRequiredFiles: false');
    });

    it('should handle undefined input gracefully', () => {
        const result = missingRequiredFiles.fn(undefined, true);
        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('missingRequiredFiles: false');
    });

    it('should handle errors gracefully', () => {
        const factValue = null;
        const result = missingRequiredFiles.fn(factValue, true);
        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('missingRequiredFiles: false');
    });
});
