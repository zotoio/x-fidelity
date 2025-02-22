import { missingRequiredFiles } from './missingRequiredFiles';
import { logger } from '../../../utils/logger';

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

describe('missingRequiredFiles', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return true when required files are missing', () => {
        const fileData = [
            { fileName: 'file1.txt' },
            { fileName: 'file2.txt' }
        ];
        const requiredFiles = ['file1.txt', 'file3.txt'];
        
        const result = missingRequiredFiles.fn(fileData, requiredFiles);
        
        expect(result).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('Missing required files:', '["file3.txt"]');
    });

    it('should return false when all required files exist', () => {
        const fileData = [
            { fileName: 'file1.txt' },
            { fileName: 'file2.txt' }
        ];
        const requiredFiles = ['file1.txt', 'file2.txt'];
        
        const result = missingRequiredFiles.fn(fileData, requiredFiles);
        
        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('All required files present');
    });

    it('should handle invalid input gracefully', () => {
        expect(missingRequiredFiles.fn(null, [])).toBe(false);
        expect(missingRequiredFiles.fn([], null)).toBe(false);
        expect(missingRequiredFiles.fn(undefined, undefined)).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('Invalid input: fileData and requiredFiles must be arrays');
    });
});
