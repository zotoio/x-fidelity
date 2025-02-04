import path from 'path';
import fs from 'fs';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';
import { Stats } from 'fs';
import { REPO_GLOBAL_CHECK } from '../core/configManager';

jest.mock('fs');
jest.mock('path');

describe('nonStandardDirectoryStructure', () => {
    const mockedFs = fs as jest.Mocked<typeof fs>;
    const mockedPath = path as jest.Mocked<typeof path>;

    beforeEach(() => {
        mockedFs.existsSync.mockReset();
        mockedFs.lstatSync.mockReset();
        mockedPath.dirname.mockReset();
        mockedPath.join.mockReset();
    });

    it('should return false if filePath is not REPO_GLOBAL_CHECK or hasChecked is true', () => {
        const result = nonStandardDirectoryStructure.fn('not' + REPO_GLOBAL_CHECK, {});
        expect(result).toBe(false);
    });

    it('should return false if directory structure matches the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => true } as Stats);

        const result = nonStandardDirectoryStructure.fn(REPO_GLOBAL_CHECK, { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(false);
    });

    it('should return true if directory structure does not match the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(false);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => false } as Stats);

        const result = nonStandardDirectoryStructure.fn(REPO_GLOBAL_CHECK, { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(true);
    });
    it('should return false if directory structure matches the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => true } as Stats);

        const result = nonStandardDirectoryStructure.fn(REPO_GLOBAL_CHECK, { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(false);
    });

    it('should return true if directory structure does not match the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(false);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => false } as Stats);

        const result = nonStandardDirectoryStructure.fn(REPO_GLOBAL_CHECK, { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(true);
    });

    it('should return false if directory structure matches the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => true } as Stats);

        const result = nonStandardDirectoryStructure.fn(REPO_GLOBAL_CHECK, { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(false);
    });

});
