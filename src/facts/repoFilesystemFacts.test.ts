import { collectRepoFileData, parseFile, isBlacklisted, isWhitelisted } from './repoFilesystemFacts';
import fs from 'fs';
import path from 'path';
import { ArchetypeConfig } from '../types/typeDefs';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
      lstat: jest.fn(),
      readFile: jest.fn(),
    },
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
  }));
jest.mock('../utils/logger');

const mockArchetypeConfig: ArchetypeConfig = {
    name: 'testArchetype',
    rules: [],
    operators: [],
    facts: [],
    config: {
        minimumDependencyVersions: {},
        standardStructure: {},
        blacklistPatterns: ['node_modules'],
        whitelistPatterns: ['\\.js$', '\\.tsx$']
    }
};

describe('File operations', () => {
    describe('parseFile', () => {
        it('should return file data including name, path, and content', async () => {
            const filePath = 'test/path/mockFile.txt';
            const mockContent = 'mock file content';
            (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

            const result = await parseFile(filePath);
            expect(result).toEqual({
                fileName: path.basename(filePath),
                filePath,
                fileContent: mockContent,
            });
        });
    });

    describe('collectRepoFileData', () => {
        it('should return file data for files in the repository', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock).mockReturnValue(['file1.js', 'file2.tsx', 'file3.txt']);

            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.lstat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

            const result = await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(result.length).toBe(2);
            expect(result[0].fileName).toBe('file1.js');
            expect(result[1].fileName).toBe('file2.tsx');
        });
    });

    describe('isBlacklisted', () => {
        it('should return true if file path matches any blacklist pattern', () => {
            const filePath = '/test/repo/node_modules/index.js';
            const repoPath = '/test/repo';
            expect(isBlacklisted({ filePath, repoPath, blacklistPatterns: mockArchetypeConfig.config.blacklistPatterns })).toBe(true);
        });

        it('should return false if file path does not match any blacklist pattern', () => {
            const filePath = '/test/repo/src/index.js';
            const repoPath = '/test/repo';
            expect(isBlacklisted({ filePath, repoPath, blacklistPatterns: mockArchetypeConfig.config.blacklistPatterns })).toBe(false);
        });
    });

    describe('isWhitelisted', () => {
        it('should return true if file path matches any whitelist pattern', () => {
            const filePath = '/test/repo/src/index.js';
            const repoPath = '/test/repo';
            expect(isWhitelisted({ filePath, repoPath, whitelistPatterns: mockArchetypeConfig.config.whitelistPatterns })).toBe(true);
        });

        it('should return false if file path does not match any whitelist pattern', () => {
            const filePath = '/test/repo/build/index.txt';
            const repoPath = '/test/repo';
            expect(isWhitelisted({ filePath, repoPath, whitelistPatterns: mockArchetypeConfig.config.whitelistPatterns })).toBe(false);
        });
    });
});
