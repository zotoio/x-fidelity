import { collectTelemetryData } from './telemetryCollector';
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';

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

describe('collectTelemetryData', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should collect telemetry data with git repo URL', async () => {
        const mockRepoUrl = 'https://github.com/test/repo.git';
        (execSync as jest.Mock).mockReturnValue(Buffer.from(mockRepoUrl));

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
                freeMemory: 8000000000,
            },
            userInfo: {
                username: 'testuser',
                homedir: '/home/testuser',
                shell: '/bin/bash',
            },
            startTime: expect.any(Number),
        });
    });

    it('should collect telemetry data with package.json repo URL when git command fails', async () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error('Git command failed');
        });

        const mockPackageJson = JSON.stringify({
            repository: 'https://github.com/test/repo-from-package.git',
        });
        (fs.promises.readFile as jest.Mock).mockResolvedValue(mockPackageJson);

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('https://github.com/test/repo-from-package.git');
    });

    it('should handle failure to get repo URL', async () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error('Git command failed');
        });
        (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

        const result = await collectTelemetryData({ repoPath: '/test/repo', configServer: 'http://test-server' });

        expect(result.repoUrl).toBe('');
    });
});
