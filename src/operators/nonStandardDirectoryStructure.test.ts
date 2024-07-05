import * as path from 'path';
import * as fs from 'fs';
import { nonStandardDirectoryStructure } from './nonStandardDirectoryStructure';
import { Stats } from 'fs';

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

    it('should return false if filePath is not "yarn.lock" or hasChecked is true', () => {
        const result = nonStandardDirectoryStructure.fn('notYarn.lock', {});
        expect(result).toBe(false);
    });

    it('should return false if directory structure matches the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => true } as Stats);

        const result = nonStandardDirectoryStructure.fn('yarn.lock', { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(false);
    });

    it('should return true if directory structure does not match the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(false);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => false } as Stats);

        const result = nonStandardDirectoryStructure.fn('yarn.lock', { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(true);
    });
    // ...

    it('should return false if directory structure matches the standard structure', () => {
        mockedPath.dirname.mockReturnValue('/repo');
        mockedPath.join.mockImplementation((...args) => args.join('/'));
        mockedFs.existsSync.mockReturnValue(true);
        mockedFs.lstatSync.mockReturnValue({ isDirectory: () => true } as Stats);

        const result = nonStandardDirectoryStructure.fn('yarn.lock', { dir1: null, dir2: { subdir1: null } });

        expect(result).toBe(false);
    });

});
