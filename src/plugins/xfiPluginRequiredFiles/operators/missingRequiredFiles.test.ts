import { missingRequiredFiles } from './missingRequiredFiles';
import { logger } from '../../../utils/logger';
jest.mock('../../../core/configManager', () => ({
    repoDir: () => 'TEST_DIR'
}));

jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        trace: jest.fn(),
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
        expect(logger.error).toHaveBeenCalledWith('Missing required files: [\"file3.txt\"]');
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

    it('should fail on invalid input', () => {
        expect(missingRequiredFiles.fn(null, [])).toBe(true);
        expect(missingRequiredFiles.fn([], null)).toBe(true);
        expect(missingRequiredFiles.fn(undefined, undefined)).toBe(true);
        expect(logger.error).toHaveBeenCalledWith('Invalid input: globalFileData and requiredFiles must be arrays');
    });
});
