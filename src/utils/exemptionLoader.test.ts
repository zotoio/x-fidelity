import { loadLocalExemptions, loadRemoteExemptions, normalizeGitHubUrl, isExempt } from './exemptionLoader';
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
    },
}));

describe('normalizeGitHubUrl', () => {
    it('should handle various GitHub URL formats', () => {
        expect(normalizeGitHubUrl('https://github.com/org/repo')).toBe('org/repo');
        expect(normalizeGitHubUrl('org/repo')).toBe('org/repo');
        expect(normalizeGitHubUrl('https://github.com/org/repo.git')).toBe('org/repo');
        expect(normalizeGitHubUrl('git@github.com:org/repo.git')).toBe('org/repo');
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
                if (path.includes(`${archetype}-exemptions.json`)) {
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
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Skipping file wrongformat.json")
        );
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
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Error processing exemption file")
        );
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
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining("Invalid path")
        );
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
    const mockAxiosGet = jest.fn();
    jest.mock('./axiosClient', () => ({
        axiosClient: {
            get: mockAxiosGet
        }
    }));

    it('should fetch and return remote exemptions', async () => {
        const mockExemptions = [{
            repoUrl: 'org/repo',
            rule: 'test-rule',
            expirationDate: '2025-12-31'
        }];
        
        mockAxiosGet.mockResolvedValueOnce({
            status: 200,
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
});
