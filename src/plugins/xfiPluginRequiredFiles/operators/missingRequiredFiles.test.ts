import { missingRequiredFiles } from './missingRequiredFiles';
import { logger } from '../../../utils/logger';
jest.mock('../../../core/configManager', () => ({
    repoDir: () => 'TEST_DIR'
}));

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
            { fileName: 'file1.txt', filePath: 'TEST_DIR/file1.txt' },
            { fileName: 'file2.txt', filePath: 'TEST_DIR/file2.txt' }
        ];
        const requiredFiles = ['file1.txt', 'file3.txt'];
        
        const result = missingRequiredFiles.fn(fileData, requiredFiles);
        
        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith('Executing missingRequiredFiles check', { requiredFiles });
        expect(logger.info).toHaveBeenCalledWith('Repo dir prefix: TEST_DIR');
        expect(logger.error).toHaveBeenCalledWith('Required file: TEST_DIR/file3.txt is missing');
        expect(logger.error).toHaveBeenCalledWith(`Missing required files: ${JSON.stringify(['TEST_DIR/file3.txt'])}`);
    });

    it('should return false when all required files exist', () => {
        const fileData = [
            { fileName: 'file1.txt', filePath: 'TEST_DIR/file1.txt' },
            { fileName: 'file2.txt', filePath: 'TEST_DIR/file2.txt' }
        ];
        const requiredFiles = ['file1.txt', 'file2.txt'];
        
        const result = missingRequiredFiles.fn(fileData, requiredFiles);
        
        expect(result).toBe(false);
        expect(logger.info).toHaveBeenCalledWith('Executing missingRequiredFiles check', { requiredFiles });
        expect(logger.info).toHaveBeenCalledWith('Repo dir prefix: TEST_DIR');
        expect(logger.info).toHaveBeenCalledWith('Required file: TEST_DIR/file1.txt is present');
        expect(logger.info).toHaveBeenCalledWith('Required file: TEST_DIR/file2.txt is present');
        expect(logger.debug).toHaveBeenCalledWith('All required files present');
    });

    it('should handle invalid input gracefully', () => {
        expect(missingRequiredFiles.fn(null, [])).toBe(false);
        expect(missingRequiredFiles.fn([], null)).toBe(false);
        expect(missingRequiredFiles.fn(undefined, undefined)).toBe(false);
        expect(logger.error).toHaveBeenCalledWith('Invalid input: fileData and requiredFiles must be arrays');
    });
});
