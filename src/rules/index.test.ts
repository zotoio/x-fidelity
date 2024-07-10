import { loadRules } from './index';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

describe('loadRules', () => {
    const mockedFs = fs as jest.Mocked<typeof fs>;
    const mockedPath = path as jest.Mocked<typeof path>;

    beforeEach(() => {
        (mockedFs.promises.readdir as jest.Mock).mockReset();
        mockedPath.join.mockReset();
    });

    it('should load all rule files in the directory', async () => {
        const mockFiles = ['rule1-rule.json', 'rule2-rule.json'];
        (mockedFs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
        mockedPath.join.mockImplementation((...args) => args.join('/'));

        jest.spyOn(global, 'import').mockImplementation(async (filePath) => {
            if (filePath.includes('rule1-rule.json')) {
                return { default: { name: 'rule1' } };
            } else if (filePath.includes('rule2-rule.json')) {
                return { default: { name: 'rule2' } };
            }
            throw new Error('File not found');
        });

        const rules = await loadRules();

        expect(rules.length).toBe(2);
        expect(logger.debug).toHaveBeenCalledWith('loading json rules..');
        expect(logger.debug).toHaveBeenCalledWith('found 2 rule files to load.');
    });

    it('should handle errors when loading rule files', async () => {
        const mockFiles = ['rule1-rule.json'];
        (mockedFs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        jest.spyOn(global, 'import').mockRejectedValue(new Error('mock error'));

        const rules = await loadRules();

        expect(rules.length).toBe(0);
        expect(logger.error).toHaveBeenCalledWith('FATAL: Error loading rule file: rule1-rule.json');
    });
});
