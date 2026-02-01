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

// Mock axiosClient at the top level to ensure proper hoisting
jest.mock('./axiosClient', () => ({
    axiosClient: {
        get: jest.fn()
    }
}));

// Mock telemetry to prevent any network calls
jest.mock('./telemetry', () => ({
    sendTelemetry: jest.fn()
}));

// Import the mocked axiosClient to get access to the mock function
import { axiosClient } from './axiosClient';
const mockAxiosGet = axiosClient.get as jest.MockedFunction<typeof axiosClient.get>;

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
        // Use a date one year in the future to ensure this test doesn't become stale
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        const futureExpirationDate = futureDate.toISOString().split('T')[0];
        
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: futureExpirationDate,
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
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the mock for each test
        mockAxiosGet.mockReset();
    });

    it('should handle API errors gracefully', async () => {
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

    it('should handle successful API response', async () => {
        const mockExemptions = [
            { repoUrl: 'org/repo', rule: 'test-rule', expirationDate: '2025-12-31', reason: 'test' }
        ];
        
        mockAxiosGet.mockResolvedValueOnce({
            data: mockExemptions
        });

        const result = await loadRemoteExemptions({
            configServer: 'https://config.example.com',
            archetype: 'test',
            logPrefix: 'test',
            localConfigPath: '/test/path'
        });

        expect(result).toEqual(mockExemptions);
        expect(mockAxiosGet).toHaveBeenCalledWith(
            'https://config.example.com/archetypes/test/exemptions',
            expect.any(Object)
        );
    });

    it('should handle non-array response from server', async () => {
        mockAxiosGet.mockResolvedValueOnce({
            data: { invalid: 'format' }
        });

        const result = await loadRemoteExemptions({
            configServer: 'https://config.example.com',
            archetype: 'test',
            logPrefix: 'test',
            localConfigPath: '/test/path'
        });

        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Invalid exemptions format")
        );
    });
});

// Additional comprehensive tests for isExempt and normalizeGitHubUrl
describe('isExempt - comprehensive scenarios', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should match SSH URL format exemptions', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const params = {
            repoUrl: 'git@github.com:org/repo.git',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'git@github.com:org/repo.git',
                rule: 'test-rule',
                expirationDate: futureDate.toISOString().split('T')[0],
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(true);
    });

    it('should match HTTPS URL format exemptions', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const params = {
            repoUrl: 'https://github.com/org/repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'https://github.com/org/repo.git',
                rule: 'test-rule',
                expirationDate: futureDate.toISOString().split('T')[0],
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(true);
    });

    it('should normalize different URL formats to match', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        // Exemption uses SSH format, repo uses HTTPS
        const params = {
            repoUrl: 'https://github.com/myorg/myrepo',
            ruleName: 'security-rule',
            exemptions: [{
                repoUrl: 'git@github.com:myorg/myrepo.git',
                rule: 'security-rule',
                expirationDate: futureDate.toISOString().split('T')[0],
                reason: 'approved exception'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(true);
    });

    it('should return false for non-matching rule names', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'different-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: futureDate.toISOString().split('T')[0],
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(false);
    });

    it('should return false for non-matching repos', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const params = {
            repoUrl: 'org/other-repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: futureDate.toISOString().split('T')[0],
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(false);
    });

    it('should handle empty exemptions array', () => {
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'test-rule',
            exemptions: [],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(false);
    });

    it('should handle undefined exemptions', () => {
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'test-rule',
            exemptions: undefined as any,
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(false);
    });

    it('should handle exemptions with missing expirationDate (defaults to future)', () => {
        const params = {
            repoUrl: 'org/repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: '', // Empty expiration
                reason: 'test reason'
            }],
            logPrefix: 'test'
        };
        
        // Should default to 2099-12-31 which is in the future
        expect(isExempt(params)).toBe(true);
    });

    it('should handle multiple exemptions and find matching one', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const params = {
            repoUrl: 'org/target-repo',
            ruleName: 'specific-rule',
            exemptions: [
                {
                    repoUrl: 'org/other-repo',
                    rule: 'other-rule',
                    expirationDate: futureDate.toISOString().split('T')[0],
                    reason: 'not this one'
                },
                {
                    repoUrl: 'org/target-repo',
                    rule: 'wrong-rule',
                    expirationDate: futureDate.toISOString().split('T')[0],
                    reason: 'wrong rule'
                },
                {
                    repoUrl: 'org/target-repo',
                    rule: 'specific-rule',
                    expirationDate: futureDate.toISOString().split('T')[0],
                    reason: 'this is the match'
                }
            ],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(true);
    });

    it('should handle exemptions for enterprise GitHub URLs', () => {
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 1);
        
        const params = {
            repoUrl: 'https://github.enterprise.com/org/repo',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'git@github.enterprise.com:org/repo.git',
                rule: 'test-rule',
                expirationDate: futureDate.toISOString().split('T')[0],
                reason: 'enterprise exemption'
            }],
            logPrefix: 'test'
        };
        
        expect(isExempt(params)).toBe(true);
    });

    it('should handle error in URL normalization gracefully', () => {
        const params = {
            repoUrl: 'invalid/format/with/too/many/parts',
            ruleName: 'test-rule',
            exemptions: [{
                repoUrl: 'org/repo',
                rule: 'test-rule',
                expirationDate: '2099-12-31',
                reason: 'test'
            }],
            logPrefix: 'test'
        };
        
        // Should return false and handle error gracefully
        expect(isExempt(params)).toBe(false);
        expect(logger.error).toHaveBeenCalled();
    });
});

describe('normalizeGitHubUrl - comprehensive scenarios', () => {
    it('should handle SSH URLs without .git suffix', () => {
        expect(normalizeGitHubUrl('git@github.com:org/repo')).toBe('git@github.com:org/repo.git');
    });

    it('should preserve SSH URLs with .git suffix', () => {
        expect(normalizeGitHubUrl('git@github.com:org/repo.git')).toBe('git@github.com:org/repo.git');
    });

    it('should convert HTTPS to SSH format', () => {
        expect(normalizeGitHubUrl('https://github.com/org/repo')).toBe('git@github.com:org/repo.git');
    });

    it('should convert HTTPS with .git to SSH format', () => {
        expect(normalizeGitHubUrl('https://github.com/org/repo.git')).toBe('git@github.com:org/repo.git');
    });

    it('should convert HTTP to SSH format', () => {
        expect(normalizeGitHubUrl('http://github.com/org/repo')).toBe('git@github.com:org/repo.git');
    });

    it('should convert org/repo shorthand to SSH format', () => {
        expect(normalizeGitHubUrl('org/repo')).toBe('git@github.com:org/repo.git');
    });

    it('should preserve enterprise GitHub hostname in SSH format', () => {
        expect(normalizeGitHubUrl('git@enterprise.github.com:org/repo.git'))
            .toBe('git@enterprise.github.com:org/repo.git');
    });

    it('should convert enterprise HTTPS to SSH with correct hostname', () => {
        expect(normalizeGitHubUrl('https://enterprise.github.com/org/repo'))
            .toBe('git@enterprise.github.com:org/repo.git');
    });

    it('should return empty string for empty input', () => {
        expect(normalizeGitHubUrl('')).toBe('');
    });

    it('should throw for invalid URL with too many path segments', () => {
        expect(() => normalizeGitHubUrl('invalid/format/repo')).toThrow('Invalid GitHub URL format');
    });

    it('should throw for invalid HTTP URL missing repo', () => {
        expect(() => normalizeGitHubUrl('http://github.com/invalid')).toThrow('Invalid GitHub URL format');
    });

    it('should throw for completely invalid format', () => {
        expect(() => normalizeGitHubUrl('not-a-url-at-all')).toThrow('Invalid GitHub URL format');
    });

    it('should handle URLs with dashes and underscores in org/repo names', () => {
        expect(normalizeGitHubUrl('my-org/my_repo')).toBe('git@github.com:my-org/my_repo.git');
        expect(normalizeGitHubUrl('https://github.com/my-org/my_repo'))
            .toBe('git@github.com:my-org/my_repo.git');
    });
});
