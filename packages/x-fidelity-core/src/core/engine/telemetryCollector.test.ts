import { collectTelemetryData } from './telemetryCollector';
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import { TelemetryData, CollectTelemetryDataParams } from '@x-fidelity/types';
import { logger } from '../../utils/logger';

jest.mock('child_process');
jest.mock('os', () => ({
    platform: jest.fn(),
    release: jest.fn(),
    type: jest.fn(),
    arch: jest.fn(),
    cpus: jest.fn(),
    totalmem: jest.fn(),
    freemem: jest.fn(),
    userInfo: jest.fn(),
}));
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    stat: jest.fn(),
    promises: {
        readFile: jest.fn(),
        existsSync: jest.fn(),
    },
}));
jest.mock('../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('collectTelemetryData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset all mock implementations to default values
        (os.platform as jest.Mock).mockReturnValue('linux');
        (os.release as jest.Mock).mockReturnValue('5.4.0');
        (os.type as jest.Mock).mockReturnValue('Linux');
        (os.arch as jest.Mock).mockReturnValue('x64');
        (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]);
        (os.totalmem as jest.Mock).mockReturnValue(16000000000);
        (os.freemem as jest.Mock).mockReturnValue(8000000000);
        (os.userInfo as jest.Mock).mockReturnValue({
            username: 'testuser',
            homedir: '/home/testuser',
            shell: '/bin/bash',
        });
    });

    it('should collect telemetry data with git repo URL', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result).toEqual({
            repoUrl: mockRepoUrl,
            configServer: 'http://test-server',
            hostInfo: {
                platform: 'linux',
                release: '5.4.0',
                type: 'Linux',
                arch: 'x64',
                cpus: 4,
                totalMemory: 16000000000,
                freeMemory: 8000000000
            },
            userInfo: {
                username: 'testuser',
                homedir: '/home/testuser',
                shell: '/bin/bash',
            },
            startTime: expect.any(Number),
        });
    });

    it('should handle failure to get repo URL', async () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error('Git command failed');
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
        expect(result.hostInfo).toBeDefined();
        expect(result.userInfo).toBeDefined();
    });

    it('should handle missing user info', async () => {
        (os.userInfo as jest.Mock).mockImplementation(() => {
            return { username: 'unknown', homedir: 'unknown', shell: null };
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.userInfo).toEqual({
            username: 'unknown',
            homedir: 'unknown',
            shell: null
        });
    });

    it('should handle missing memory information', async () => {
        (os.totalmem as jest.Mock).mockImplementation(() => {
            return 0;
        });
        (os.freemem as jest.Mock).mockImplementation(() => {
            return 0;
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.hostInfo.totalMemory).toBe(0);
        expect(result.hostInfo.freeMemory).toBe(0);
    });

    it('should handle missing CPU information', async () => {
        (os.cpus as jest.Mock).mockImplementation(() => {
            return [];
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.hostInfo.cpus).toBe(0);
    });

    it('should handle missing platform information', async () => {
        (os.platform as jest.Mock).mockImplementation(() => {
            return 'unknown';
        });
        (os.release as jest.Mock).mockImplementation(() => {
            return 'unknown';
        });
        (os.type as jest.Mock).mockImplementation(() => {
            return 'unknown';
        });
        (os.arch as jest.Mock).mockImplementation(() => {
            return 'unknown';
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.hostInfo.platform).toBe('unknown');
        expect(result.hostInfo.release).toBe('unknown');
        expect(result.hostInfo.type).toBe('unknown');
        expect(result.hostInfo.arch).toBe('unknown');
    });

    it('should handle missing config server', async () => {
        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: '' });

        expect(result.configServer).toBe('none');
    });

    it('should handle empty repo path', async () => {
        const result = await collectTelemetryData({ repoPath: '', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
    });

    it('should handle malformed git repo URL', async () => {
        const malformedUrl = 'not-a-valid-url';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(malformedUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe(malformedUrl);
    });

    it('should handle git command timeout', async () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error('Command timed out');
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
    });

    it('should handle partial user info', async () => {
        (os.userInfo as jest.Mock).mockReturnValue({
            username: 'testuser',
            // Missing homedir and shell
        });

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.userInfo).toEqual({
            username: 'testuser',
            homedir: undefined,
            shell: undefined
        });
    });

    it('should handle negative memory values', async () => {
        (os.totalmem as jest.Mock).mockReturnValue(-1);
        (os.freemem as jest.Mock).mockReturnValue(-1);

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.hostInfo.totalMemory).toBe(-1);
        expect(result.hostInfo.freeMemory).toBe(-1);
    });

    it('should handle empty CPU array', async () => {
        (os.cpus as jest.Mock).mockReturnValue([]);

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.hostInfo.cpus).toBe(0);
    });

    it('should handle null config server', async () => {
        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: null as any });

        expect(result.configServer).toBe('none');
    });

    it('should handle undefined config server', async () => {
        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: undefined as any });

        expect(result.configServer).toBe('none');
    });

    it('should handle null repo path', async () => {
        const result = await collectTelemetryData({ repoPath: null as any, configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
    });

    it('should handle undefined repo path', async () => {
        const result = await collectTelemetryData({ repoPath: undefined as any, configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
    });

    it('should log error when git command returns empty URL', async () => {
        (execSync as jest.Mock).mockReturnValue(Buffer.from(''));

        await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(logger.error).toHaveBeenCalledWith('Unable to get GitHub repository URL from git config');
    });

    it('should log error when git command fails', async () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error('Git command failed');
        });

        await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(logger.error).toHaveBeenCalledWith("error determining repo url using 'git config --get remote.origin.url'");
    });

    it('should handle git command returning whitespace-only URL', async () => {
        (execSync as jest.Mock).mockReturnValue(Buffer.from('   \n  \t  '));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
        expect(logger.error).toHaveBeenCalledWith('Unable to get GitHub repository URL from git config');
    });

    it('should handle git command returning URL with whitespace', async () => {
        const mockRepoUrl = '  https://github.com/test/repo.git  ';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git');
    });

    it('should handle git command returning URL with newlines', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git\n';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git');
    });

    it('should handle git command returning URL with carriage returns', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git\r\n';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git');
    });

    it('should handle git command returning URL with mixed whitespace', async () => {
        const mockRepoUrl = '  https://github.com/test/repo.git  \n  \t  ';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git');
    });

    it('should handle git command returning URL with special characters', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git?ref=main&branch=dev';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git?ref=main&branch=dev');
    });

    it('should handle git command returning URL with encoded characters', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git%20with%20spaces';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git%20with%20spaces');
    });

    it('should handle git command returning URL with non-ASCII characters', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git/测试/路径';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git/测试/路径');
    });

    it('should handle git command returning URL with emoji', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git/🚀/awesome';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo.git/🚀/awesome');
    });
});
