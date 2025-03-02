import { collectRepoFileData, parseFile, isBlacklisted, isWhitelisted, repoFileAnalysis } from './repoFilesystemFacts';
import fs from 'fs';
import path from 'path';
import { ArchetypeConfig, FileData } from '../types/typeDefs';
import { logger } from '../utils/logger';
import { maskSensitiveData } from '../utils/maskSensitiveData';

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
      lstat: jest.fn(),
      readFile: jest.fn(),
      stat: jest.fn(),
    },
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
    lstatSync: jest.fn(),
    statSync: jest.fn(),
    realpathSync: jest.fn().mockImplementation(path => path),
  }));
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        trace: jest.fn(),
    }
}));
jest.mock('../utils/maskSensitiveData', () => ({
    maskSensitiveData: jest.fn(data => data)
}));

const mockArchetypeConfig: ArchetypeConfig = {
    name: 'testArchetype',
    rules: [],
    operators: [],
    facts: [],
    config: {
        minimumDependencyVersions: {},
        standardStructure: {},
        blacklistPatterns: ['node_modules', '\\.git'],
        whitelistPatterns: ['\\.js$', '\\.tsx$', '\\.md$']
    }
};

describe('File operations', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

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

        it('should handle errors when reading files', async () => {
            const filePath = 'test/path/nonexistent.txt';
            (fs.readFileSync as jest.Mock).mockImplementation(() => {
                throw new Error('File not found');
            });

            try {
                await parseFile(filePath);
                fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeDefined();
            }
        });
    });

    describe('collectRepoFileData', () => {
        it('should return file data for files in the repository', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock).mockReturnValue(['file1.js', 'file2.tsx', 'file3.txt']);
            // fs.realpathSync is already mocked in the jest.mock setup
            
            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.stat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

            const result = await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(result.length).toBe(2);
            expect(result[0].fileName).toBe('file1.js');
            expect(result[1].fileName).toBe('file2.tsx');
        });

        it('should recursively process directories', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock)
                .mockReturnValueOnce(['dir1', 'file1.js'])
                .mockReturnValueOnce(['file2.js', 'file3.txt']);
            // fs.realpathSync is already mocked in the jest.mock setup
            
            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.stat.mockResolvedValueOnce({ isDirectory: () => true } as fs.Stats)
                .mockResolvedValueOnce({ isDirectory: () => false } as fs.Stats)
                .mockResolvedValueOnce({ isDirectory: () => false } as fs.Stats)
                .mockResolvedValueOnce({ isDirectory: () => false } as fs.Stats);

            const result = await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(result.length).toBe(2);
            expect(result.some(file => file.fileName === 'file1.js')).toBe(true);
            expect(result.some(file => file.fileName === 'file2.js')).toBe(true);
        });

        it('should handle symlinks correctly', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock).mockReturnValue(['symlink.js', 'file1.js']);
            jest.mocked(fs.realpathSync)
                .mockImplementationOnce(path => path.toString() + '_real')
                .mockImplementationOnce(path => path.toString());
            
            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.stat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

            const result = await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(result.length).toBe(2);
            expect(fs.realpathSync).toHaveBeenCalledTimes(2);
        });

        it('should handle errors when resolving real paths', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock).mockReturnValue(['broken-symlink.js']);
            jest.mocked(fs.realpathSync).mockImplementation((path) => {
                throw new Error('Cannot resolve symlink');
            });
            
            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.stat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

            const result = await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should detect path traversal attempts', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock).mockReturnValue(['suspicious.js']);
            jest.mocked(fs.realpathSync).mockReturnValue('/etc/passwd' as any);
            
            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.stat.mockResolvedValue({ isDirectory: () => false } as fs.Stats);

            const result = await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(result.length).toBe(0);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Path traversal attempt detected'));
        });

        it('should skip blacklisted directories', async () => {
            const repoPath = 'mock/repo';
            (fs.readdirSync as jest.Mock).mockReturnValue(['node_modules', 'src']);
            // fs.realpathSync is already mocked in the jest.mock setup
            
            const mockedFsPromises = jest.mocked(fs.promises, { shallow: true });
            mockedFsPromises.stat.mockResolvedValueOnce({ isDirectory: () => true } as fs.Stats)
                .mockResolvedValueOnce({ isDirectory: () => true } as fs.Stats);

            await collectRepoFileData(repoPath, mockArchetypeConfig);
            expect(fs.readdirSync).toHaveBeenCalledTimes(2); // Once for repo, once for src
            expect(fs.readdirSync).not.toHaveBeenCalledWith('mock/repo/node_modules');
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

        it('should return true for path traversal attempts', () => {
            const filePath = '/etc/passwd';
            const repoPath = '/test/repo';
            expect(isBlacklisted({ filePath, repoPath, blacklistPatterns: mockArchetypeConfig.config.blacklistPatterns })).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
                filePath: '/etc/passwd'
            }), 'Potential path traversal attempt detected');
        });

        it('should log debug information', () => {
            const filePath = '/test/repo/node_modules/index.js';
            const repoPath = '/test/repo';
            isBlacklisted({ filePath, repoPath, blacklistPatterns: mockArchetypeConfig.config.blacklistPatterns });
            expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({
                filePath
            }), 'Checking file against blacklist patterns');
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

        it('should return false for path traversal attempts', () => {
            const filePath = '/etc/passwd';
            const repoPath = '/test/repo';
            expect(isWhitelisted({ filePath, repoPath, whitelistPatterns: mockArchetypeConfig.config.whitelistPatterns })).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({
                filePath: '/etc/passwd'
            }), 'Potential path traversal attempt detected');
        });

        it('should log debug information', () => {
            const filePath = '/test/repo/src/index.js';
            const repoPath = '/test/repo';
            isWhitelisted({ filePath, repoPath, whitelistPatterns: mockArchetypeConfig.config.whitelistPatterns });
            expect(logger.debug).toHaveBeenCalledWith(expect.objectContaining({
                filePath
            }), 'Checking file against whitelist patterns');
        });
    });

    describe('repoFileAnalysis', () => {
        it('should analyze file content for patterns', async () => {
            const mockAlmanac = {
                factValue: jest.fn().mockResolvedValue({
                    fileName: 'test.js',
                    filePath: '/test/repo/test.js',
                    fileContent: 'const password = "secret123";\nconst apiKey = "abc123";'
                }),
                addRuntimeFact: jest.fn()
            };

            const params = {
                checkPattern: ['password', 'apiKey'],
                resultFact: 'testResult'
            };

            const result = await repoFileAnalysis(params, mockAlmanac);
            
            expect(result.result.length).toBeGreaterThan(0);
            expect(mockAlmanac.addRuntimeFact).toHaveBeenCalledWith('testResult', expect.any(Object));
            expect(maskSensitiveData).toHaveBeenCalled();
        });

        it('should handle REPO_GLOBAL_CHECK files', async () => {
            const mockAlmanac = {
                factValue: jest.fn().mockResolvedValue({
                    fileName: 'REPO_GLOBAL_CHECK',
                    filePath: 'REPO_GLOBAL_CHECK',
                    fileContent: 'REPO_GLOBAL_CHECK'
                }),
                addRuntimeFact: jest.fn()
            };

            const params = {
                checkPattern: ['password'],
                resultFact: 'testResult'
            };

            const result = await repoFileAnalysis(params, mockAlmanac);
            
            expect(result.result).toEqual([]);
        });

        it('should handle empty check patterns', async () => {
            const mockAlmanac = {
                factValue: jest.fn().mockResolvedValue({
                    fileName: 'test.js',
                    filePath: '/test/repo/test.js',
                    fileContent: 'const password = "secret123";'
                }),
                addRuntimeFact: jest.fn()
            };

            const params = {
                checkPattern: [],
                resultFact: 'testResult'
            };

            const result = await repoFileAnalysis(params, mockAlmanac);
            
            expect(result.result).toEqual([]);
        });

        it('should handle long lines by splitting them', async () => {
            const mockAlmanac = {
                factValue: jest.fn().mockResolvedValue({
                    fileName: 'test.js',
                    filePath: '/test/repo/test.js',
                    fileContent: 'const veryLongLine = "' + 'a'.repeat(300) + 'password' + 'a'.repeat(300) + '";'
                }),
                addRuntimeFact: jest.fn()
            };

            const params = {
                checkPattern: ['password'],
                resultFact: 'testResult'
            };

            const result = await repoFileAnalysis(params, mockAlmanac);
            
            expect(result.result.length).toBeGreaterThan(0);
            expect(logger.trace).toHaveBeenCalledWith(expect.objectContaining({
                splitOccurred: true
            }), 'File content was processed for analysis');
        });

        it('should handle multiple patterns', async () => {
            const mockAlmanac = {
                factValue: jest.fn().mockResolvedValue({
                    fileName: 'test.js',
                    filePath: '/test/repo/test.js',
                    fileContent: 'const password = "secret123";\nconst apiKey = "abc123";\nconst token = "xyz789";'
                }),
                addRuntimeFact: jest.fn()
            };

            const params = {
                checkPattern: ['password', 'apiKey', 'token'],
                resultFact: 'testResult'
            };

            const result = await repoFileAnalysis(params, mockAlmanac);
            
            expect(result.result.length).toBe(3);
        });

        it('should log warnings when issues are found', async () => {
            const mockAlmanac = {
                factValue: jest.fn().mockResolvedValue({
                    fileName: 'test.js',
                    filePath: '/test/repo/test.js',
                    fileContent: 'const password = "secret123";'
                }),
                addRuntimeFact: jest.fn()
            };

            const params = {
                checkPattern: ['password'],
                resultFact: 'testResult'
            };

            await repoFileAnalysis(params, mockAlmanac);
            
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({
                    filePath: '/test/repo/test.js',
                    analysis: expect.any(Array)
                }),
                'Found issues in file analysis'
            );
        });
    });
});
