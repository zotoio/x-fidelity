import { ConfigManager, REPO_GLOBAL_CHECK } from './config';
import { archetypes } from '../archetypes';
import axios from 'axios';
import { validateArchetype } from './jsonSchemas';
import fs from 'fs';
import { options } from '../core/cli';

jest.mock('axios');
jest.mock('../rules');
jest.mock('./jsonSchemas', () => ({
  validateArchetype: jest.fn().mockReturnValue(true)
}));
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    promises: {
      lstat: jest.fn(),
      readFile: jest.fn(),
    },
    readFileSync: jest.fn(),
    readdirSync: jest.fn(),
}));
jest.mock('../core/cli', () => ({
    options: {
        configServer: 'http://test-server.com',
        localConfigPath: '/path/to/local/config'
    }
}));

describe('ConfigManager', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getConfig', () => {
        it('should return the same instance for the same archetype', async () => {
            const instance1 = await ConfigManager.getConfig('node-fullstack');
            const instance2 = await ConfigManager.getConfig('node-fullstack');
            expect(instance1).toBe(instance2);
        });

        it('should return different instances for different archetypes', async () => {
            const instance1 = await ConfigManager.getConfig('node-fullstack');
            const instance2 = await ConfigManager.getConfig('java-microservice');
            expect(instance1).not.toBe(instance2);
        });
    });

    describe('initialize', () => {
        it('should initialize with default archetype when not specified', async () => {
            const config = await ConfigManager.getConfig();
            expect(config.archetype).toEqual(expect.objectContaining(archetypes['node-fullstack']));
        });

        it('should initialize with specified archetype', async () => {
            const config = await ConfigManager.getConfig('java-microservice');
            expect(config.archetype).toEqual(expect.objectContaining(archetypes['java-microservice']));
        });

        it('should fetch remote config when configServer is provided', async () => {
            const mockConfig = {
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
            (axios.get as jest.Mock).mockResolvedValue({ data: mockConfig });

            const config = await ConfigManager.getConfig('test-archetype');

            expect(axios.get).toHaveBeenCalledWith('http://test-server.com/archetypes/test-archetype', expect.objectContaining({
                headers: expect.objectContaining({
                    'X-Log-Prefix': expect.any(String)
                })
            }));
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
            expect(validateArchetype).toHaveBeenCalledWith(expect.objectContaining(mockConfig));
        });

        it('should throw an error when unable to fetch from configServer', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(ConfigManager.getConfig('test-archetype'))
                .rejects.toThrow('Network error');
        });

        it('should load local config when localConfigPath is provided', async () => {
            const mockConfig = {
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
            (fs.promises.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockConfig));

            options.configServer = '';
            options.localConfigPath = '/path/to/local/config';
            const config = await ConfigManager.getConfig('test-archetype');

            expect(fs.promises.readFile).toHaveBeenCalledWith('/path/to/local/config/test-archetype.json', 'utf8');
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
        });

        it('should return a default config when unable to load local archetype config', async () => {
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

            options.configServer = '';
            options.localConfigPath = '/path/to/local/config';
            const result = await ConfigManager.getConfig('test-archetype');
            expect(result).toEqual({
                archetype: {
                    config: {
                        blacklistPatterns: [],
                        minimumDependencyVersions: {},
                        standardStructure: {},
                        whitelistPatterns: []
                    },
                    facts: ["fact1", "fact2"],
                    operators: ["operator1", "operator2"],
                    rules: ["rule1", "rule2"]
                },
                cliOptions: {
                    configServer: "",
                    localConfigPath: "/path/to/local/config"
                },
                rules: []
            });
        });
    });
});

describe('REPO_GLOBAL_CHECK', () => {
    it('should be defined', () => {
        expect(REPO_GLOBAL_CHECK).toBeDefined();
        expect(typeof REPO_GLOBAL_CHECK).toBe('string');
    });
});
