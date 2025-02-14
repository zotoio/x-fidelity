import { ConfigManager, REPO_GLOBAL_CHECK } from './configManager';
import { isExempt, loadLocalExemptions, normalizeGitHubUrl } from "../utils/exemptionUtils";
import { loadExemptions } from '../utils/exemptionUtils';

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
    });

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
import { axiosClient } from '../utils/axiosClient';
import { validateArchetype } from '../utils/jsonSchemas';
import fs from 'fs';
import { DEMO_CONFIG_PATH, options } from './cli';
import { logger } from '../utils/logger';
import { sendTelemetry } from '../utils/telemetry';

jest.mock('../utils/axiosClient');
jest.mock('../utils/ruleUtils');
jest.mock('../utils/jsonSchemas', () => ({
  validateArchetype: jest.fn().mockReturnValue(true)
}));
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
        readdir: jest.fn(),
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
}));
jest.mock('../core/cli', () => ({
    options: {
        configServer: 'http://test-server.com',
        localConfigPath: '/path/to/local/config',
        archetype: 'node-fullstack'
    }
}));
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    }
}));
jest.mock('../utils/telemetry', () => ({
    sendTelemetry: jest.fn()
}));

describe('ConfigManager', () => {
    const mockConfig = {
        name: 'node-fullstack',
        rules: ['rule1', 'rule2'],
        operators: ['operator1', 'operator2'],
        facts: ['fact1', 'fact2'],
        config: {
            minimumDependencyVersions: {},
            standardStructure: {},
            blacklistPatterns: [],
            whitelistPatterns: []
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        ConfigManager['configs'] = {}; // Reset the static configs
    });

    describe('getConfig', () => {
        it('should return the same instance for the same archetype', async () => {
            (axiosClient.get as jest.Mock).mockResolvedValue({ data: mockConfig });
            const instance1 = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            const instance2 = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            expect(instance1).toBe(instance2);
        });

        it('should return different instances for different archetypes', async () => {
            (axiosClient.get as jest.Mock).mockResolvedValueOnce({ data: { ...mockConfig, name: 'node-fullstack' } });
            (axiosClient.get as jest.Mock).mockResolvedValueOnce({ data: { ...mockConfig, name: 'java-microservice' } });
            const instance1 = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            const instance2 = await ConfigManager.getConfig({ archetype: 'java-microservice' });
            expect(instance1).not.toBe(instance2);
        });

        it('should initialize with default archetype when not specified', async () => {
            (axiosClient.get as jest.Mock).mockResolvedValue({ data: mockConfig });
            const config = await ConfigManager.getConfig({});
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
        });

        it('should initialize with specified archetype', async () => {
            (axiosClient.get as jest.Mock).mockResolvedValue({ data: { ...mockConfig, name: 'java-microservice' } });
            const config = await ConfigManager.getConfig({ archetype: 'java-microservice' });
            expect(config.archetype.name).toBe('java-microservice');
        });
    });

    describe('initialize', () => {
        it('should fetch remote config when configServer is provided', async () => {
            (axiosClient.get as jest.Mock).mockResolvedValue({ data: mockConfig });
            const config = await ConfigManager.getConfig({ archetype: 'test-archetype' });
            expect(axiosClient.get).toHaveBeenCalledWith('http://test-server.com/archetypes/test-archetype', expect.any(Object));
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
            expect(validateArchetype).toHaveBeenCalledWith(expect.objectContaining(mockConfig));
        });

        it('should throw an error when unable to fetch from configServer', async () => {
            (axiosClient.get as jest.Mock).mockRejectedValue(new Error('Network error'));
            await expect(ConfigManager.getConfig({ archetype: 'test-archetype' })).rejects.toThrow('Network error');
            expect(logger.error).toHaveBeenCalled();
        });

        it('should load local config when localConfigPath is provided', async () => {
            options.configServer = '';
            (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
            const config = await ConfigManager.getConfig({ archetype: 'test-archetype' });
            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/local/config/test-archetype.json', 'utf8');
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
        });

    });

    describe('getLoadedConfigs', () => {
        it('should return an array of loaded config names', async () => {
            options.configServer = '';
            options.localConfigPath = '/path/to/local/config';
            (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));
            await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/local/config/node-fullstack.json', 'utf8');
            await ConfigManager.getConfig({ archetype: 'java-microservice' });
            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/local/config/java-microservice.json', 'utf8');
            const loadedConfigs = await ConfigManager.getLoadedConfigs();
            expect(loadedConfigs).toEqual(['node-fullstack', 'java-microservice']);
        });
    });

    describe('loadExemptions', () => {
        it('should load exemptions from legacy file and directory', async () => {
            const mockLegacyExemptions = [
                { repoUrl: 'https://github.com/example/repo', rule: 'test-rule', expirationDate: '2023-12-31', reason: 'Test reason' }
            ];
            (fs.existsSync as jest.Mock).mockImplementation(path => 
                path.includes('-exemptions.json') || path.includes('-exemptions'));
            (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockLegacyExemptions));
            (fs.promises.readdir as jest.Mock).mockResolvedValue([]);

            const exemptions = await loadExemptions({ 
                configServer: '', 
                localConfigPath: '/path/to/local/config', 
                archetype: 'test-archetype' 
            });
            
            expect(exemptions).toEqual(mockLegacyExemptions);
            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/local/config/test-archetype-exemptions.json', 'utf-8');
        });

        it('should return an empty array if no exemption files are found', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            (fs.promises.readdir as jest.Mock).mockResolvedValue([]);
            
            const exemptions = await loadLocalExemptions({ 
                configServer: '', 
                localConfigPath: '/path/to/local/config', 
                archetype: 'test-archetype' 
            });
            
            expect(exemptions).toEqual([]);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No exemption files found for archetype test-archetype'));
        });
    });

    describe('isExempt', () => {
        const mockExemptions = [
            { repoUrl: 'https://github.com/example/repo', rule: 'test-rule', expirationDate: '2099-12-31', reason: 'Test reason' }
        ];

        it('should return true for an exempted rule', () => {
            const result = isExempt({
                repoUrl: 'https://github.com/example/repo',
                ruleName: 'test-rule',
                exemptions: mockExemptions,
                logPrefix: 'test-prefix'
            });
            expect(result).toBe(true);
            expect(logger.error).toHaveBeenCalled();
            expect(sendTelemetry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'exemptionAllowed',
                    metadata: expect.objectContaining({
                        repoUrl: 'https://github.com/example/repo',
                        rule: 'test-rule'
                    })
                }),
                'test-prefix'
            );
        });

        it('should return false for a non-exempted rule', () => {
            const result = isExempt({
                repoUrl: 'https://github.com/example/repo',
                ruleName: 'non-exempted-rule',
                exemptions: mockExemptions,
                logPrefix: 'test-prefix'
            });
            expect(result).toBe(false);
            expect(logger.error).not.toHaveBeenCalled();
            expect(sendTelemetry).not.toHaveBeenCalled();
        });

        it('should return false for an expired exemption', () => {
            const expiredExemptions = [
                { repoUrl: 'https://github.com/example/repo', rule: 'test-rule', expirationDate: '2000-01-01', reason: 'Expired reason' }
            ];
            const result = isExempt({
                repoUrl: 'https://github.com/example/repo',
                ruleName: 'test-rule',
                exemptions: expiredExemptions,
                logPrefix: 'test-prefix'
            });
            expect(result).toBe(false);
            expect(logger.error).not.toHaveBeenCalled();
            expect(sendTelemetry).not.toHaveBeenCalled();
        });
    });
});

describe('REPO_GLOBAL_CHECK', () => {
    it('should be defined', () => {
        expect(REPO_GLOBAL_CHECK).toBeDefined();
        expect(typeof REPO_GLOBAL_CHECK).toBe('string');
    });
});
