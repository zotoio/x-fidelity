import { loadLocalExemptions, loadRemoteExemptions, normalizeGitHubUrl, isExempt } from './exemptionUtils';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        readdir: jest.fn(),
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
}));

jest.mock('./logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
    },
}));

describe('normalizeGitHubUrl', () => {
    it('should normalize URLs to SSH format', () => {
        // SSH format should be preserved
        expect(normalizeGitHubUrl('git@github.com:org/repo.git')).toBe('git@github.com:org/repo.git');
        expect(normalizeGitHubUrl('git@github.com:org/repo')).toBe('git@github.com:org/repo.git');
        
        // HTTPS format should be converted to SSH
        expect(normalizeGitHubUrl('https://github.com/org/repo')).toBe('git@github.com:org/repo.git');
        expect(normalizeGitHubUrl('https://github.com/org/repo.git')).toBe('git@github.com:org/repo.git');
        
        // Bare org/repo should be converted to SSH
        expect(normalizeGitHubUrl('org/repo')).toBe('git@github.com:org/repo.git');
    }, 10000);

    it('should preserve custom GitHub hostnames', () => {
        expect(normalizeGitHubUrl('git@custom-github.com:org/repo.git')).toBe('git@custom-github.com:org/repo.git');
        expect(normalizeGitHubUrl('https://custom-github.com/org/repo')).toBe('git@custom-github.com:org/repo.git');
    });

    it('should handle empty strings', () => {
        expect(normalizeGitHubUrl('')).toBe('');
    });

    it('should throw error for invalid formats', () => {
        expect(() => normalizeGitHubUrl('invalid/format/repo')).toThrow('Invalid GitHub URL format');
        expect(() => normalizeGitHubUrl('http://github.com/invalid')).toThrow('Invalid GitHub URL format');
    });
});

describe('isExempt', () => {
    it('should check exemption expiration dates', () => {
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: '2025-12-31',
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(true);
    });

    it('should return false for expired exemptions', () => {
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: '2020-12-31',
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(false);
    });

    it('should return false when repoUrl is missing', () => {
        const params = {
            repoUrl: '',
            ruleName: 'test-rule',
            exemptions: [],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(false);
        expect(logger.warn).toHaveBeenCalled();
    });
});

describe('loadLocalExemptions', () => {
    const archetype = 'test-archetype';
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load exemptions from legacy file and correctly named files in directory', async () => {
        const mockLegacyExemptions = [
            { repoUrl: 'repo1', rule: 'rule1', expirationDate: '2024-12-31', reason: 'reason1' }
        ];
        const mockFileExemptions = [
            { repoUrl: 'repo2', rule: 'rule2', expirationDate: '2024-12-31', reason: 'reason2' }
        ];

        (fs.existsSync as jest.Mock)
            .mockImplementation(path => path.includes('-exemptions.json') || path.includes('-exemptions'));
        (fs.promises.readFile as jest.Mock)
            .mockImplementation(path => {
                if (path.includes(`/${archetype}-exemptions.json`)) {
                    return Promise.resolve(JSON.stringify(mockLegacyExemptions));
                }
                return Promise.resolve(JSON.stringify(mockFileExemptions));
            });
        (fs.promises.readdir as jest.Mock)
            .mockResolvedValue([
                `team1-${archetype}-exemptions.json`,
                'wrongformat.json',
                `project1-${archetype}-exemptions.json`
            ]);

        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });

        expect(result).toEqual([...mockLegacyExemptions, ...mockFileExemptions, ...mockFileExemptions]);
        expect(logger.info).toHaveBeenCalledWith(`Loaded 3 total exemptions for archetype ${archetype}`);
    });

    it('should handle invalid JSON in exemption files', async () => {
        (fs.existsSync as jest.Mock)
            .mockImplementation(path => path.includes('-exemptions'));
        (fs.promises.readFile as jest.Mock)
            .mockRejectedValue(new Error('Invalid JSON'));
        (fs.promises.readdir as jest.Mock)
            .mockResolvedValue([`team1-${archetype}-exemptions.json`]);

        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });

        expect(result).toEqual([]);
    });

    it('should handle missing directory and legacy file', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalled();
    });

    it('should prevent path traversal attempts', async () => {
        (fs.existsSync as jest.Mock)
            .mockImplementation(path => path.includes('-exemptions'));
        (fs.promises.readdir as jest.Mock)
            .mockResolvedValue([`../malicious-${archetype}-exemptions.json`]);
        
        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });
        
        expect(result).toEqual([]);
    });

    it('should handle non-array exemption files', async () => {
        (fs.existsSync as jest.Mock)
            .mockImplementation(path => path.includes('-exemptions'));
        (fs.promises.readFile as jest.Mock)
            .mockResolvedValue(JSON.stringify({ invalid: 'format' }));
        (fs.promises.readdir as jest.Mock)
            .mockResolvedValue([`team1-${archetype}-exemptions.json`]);
        
        const result = await loadLocalExemptions({
            localConfigPath: '/test/path',
            archetype,
            configServer: '',
            logPrefix: 'test'
        });
        
        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Invalid exemptions format")
        );
    });
});

describe('loadRemoteExemptions', () => {
    jest.mock('../utils/axiosClient', () => ({
        axiosClient: {
            get: jest.fn().mockRejectedValue(new Error('API Error'))
        }
    }));

    it('should handle API errors gracefully', async () => {
        jest.setTimeout(30000); // Increase timeout for this test
        mockAxiosGet.mockRejectedValueOnce(new Error('API Error'));

        const result = await loadRemoteExemptions({
            configServer: 'https://config.example.com',
            archetype: 'test',
            logPrefix: 'test',
            localConfigPath: '/test/path'
        });

        expect(result).toEqual([]);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Error loading remote exemptions")
        );
    });
});
