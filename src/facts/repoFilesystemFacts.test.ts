import { collectRepoFileData, FileData } from './repoFilesystemFacts';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

describe('collectRepoFileData', () => {
    const mockedFs = fs as jest.Mocked<typeof fs>;
    beforeEach(() => {
        mockedFsPromises.lstat = jest.fn().mockResolvedValue({ isDirectory: () => false } as fs.Stats);
    });
    const mockedPath = path as jest.Mocked<typeof path>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should collect file data from the repository', async () => {
        const mockFiles = [
            { name: 'file1.ts', isDirectory: () => false } as fs.Dirent,
            { name: 'file2.ts', isDirectory: () => false } as fs.Dirent
        ];
        
        const mockFileData: FileData = {
            fileName: 'file1.ts',
            filePath: '/repo/file1.ts',
            fileContent: 'console.log("Hello, world!");'
        };

        mockedFs.readdirSync.mockReturnValue(mockFiles);
        mockedFsPromises.lstat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);
        mockedFs.readFileSync.mockReturnValue(mockFileData.fileContent);
        mockedPath.join.mockImplementation((...args) => args.join('/'));

        const result = await collectRepoFileData('/repo');

        expect(result).toEqual([mockFileData, { ...mockFileData, fileName: 'file2.ts', filePath: '/repo/file2.ts' }]);
    });

    it('should skip blacklisted files', async () => {
        const mockFiles = [
            { name: 'file1.ts', isDirectory: () => false } as fs.Dirent,
            { name: '.hiddenFile', isDirectory: () => false } as fs.Dirent
        ];
        const mockFileData: FileData = {
            fileName: 'file1.ts',
            filePath: '/repo/file1.ts',
            fileContent: 'console.log("Hello, world!");'
        };

        mockedFs.readdirSync.mockReturnValue(mockFiles);
        mockedFs.promises.lstat = jest.fn().mockResolvedValue({ isDirectory: () => false } as fs.Stats);
        mockedFs.readFileSync.mockReturnValue(mockFileData.fileContent);
        mockedPath.join.mockImplementation((...args) => args.join('/'));

        const result = await collectRepoFileData('/repo');

        expect(result).toEqual([mockFileData]);
    });

    it('should collect file data recursively from directories', async () => {
        const mockFiles = [
            { name: 'dir1', isDirectory: () => true } as fs.Dirent,
            { name: 'file1.ts', isDirectory: () => false } as fs.Dirent
        ];
        const mockDirFiles = [
            { name: 'file2.ts', isDirectory: () => false } as fs.Dirent
        ];
        const mockFileData: FileData = {
            fileName: 'file1.ts',
            filePath: '/repo/file1.ts',
            fileContent: 'console.log("Hello, world!");'
        };
        const mockDirFileData: FileData = {
            fileName: 'file2.ts',
            filePath: '/repo/dir1/file2.ts',
            fileContent: 'console.log("Hello, world!");'
        };

        mockedFs.readdirSync.mockImplementation((dirPath) => {
            if (dirPath === '/repo') return mockFiles;
            if (dirPath === '/repo/dir1') return mockDirFiles;
            return [];
        });
        mockedFsPromises.lstat.mockImplementation((path: fs.PathLike) => {
            if (path === '/repo/dir1') return Promise.resolve({ isDirectory: () => true } as fs.Stats);
            return Promise.resolve({ isDirectory: () => false } as fs.Stats);
        });
        mockedFs.readFileSync.mockReturnValue(mockFileData.fileContent);
        mockedPath.join.mockImplementation((...args) => args.join('/'));

        const result = await collectRepoFileData('/repo');

        expect(result).toEqual([mockFileData, mockDirFileData]);
    });
});
