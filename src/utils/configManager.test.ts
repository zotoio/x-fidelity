import { ConfigManager, REPO_GLOBAL_CHECK } from './configManager';

jest.mock('../archetypes', () => ({
  archetypes: {
    'node-fullstack': {
      rules: ['rule1', 'rule2'],
      operators: ['operator1', 'operator2'],
      facts: ['fact1', 'fact2'],
      config: {
        minimumDependencyVersions: {},
        standardStructure: {},
        blacklistPatterns: [],
        whitelistPatterns: []
      }
    }
  }
}));
import axios from 'axios';
import { validateArchetype } from './jsonSchemas';
import fs from 'fs';
import { options } from '../core/cli';
import { logger } from './logger';
import { archetypes } from '../archetypes';

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
        localConfigPath: '/path/to/local/config',
        archetype: 'node-fullstack'
    }
}));
jest.mock('./logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    }
}));

describe('ConfigManager', () => {
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

    beforeEach(() => {
        jest.clearAllMocks();
        ConfigManager['configs'] = {}; // Reset the static configs
    });

    describe('getConfig', () => {
        it('should return the same instance for the same archetype', async () => {
            (axios.get as jest.Mock).mockResolvedValue({ data: mockConfig });
            const instance1 = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            const instance2 = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            expect(instance1).toBe(instance2);
        });

        it('should return different instances for different archetypes', async () => {
            (axios.get as jest.Mock).mockResolvedValueOnce({ data: { ...mockConfig, name: 'node-fullstack' } });
            (axios.get as jest.Mock).mockResolvedValueOnce({ data: { ...mockConfig, name: 'java-microservice' } });
            const instance1 = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            const instance2 = await ConfigManager.getConfig({ archetype: 'java-microservice' });
            expect(instance1).not.toBe(instance2);
        });

        it('should initialize with default archetype when not specified', async () => {
            (axios.get as jest.Mock).mockResolvedValue({ data: mockConfig });
            const config = await ConfigManager.getConfig({});
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
        });

        it('should initialize with specified archetype', async () => {
            (axios.get as jest.Mock).mockResolvedValue({ data: { ...mockConfig, name: 'java-microservice' } });
            const config = await ConfigManager.getConfig({ archetype: 'java-microservice' });
            expect(config.archetype.name).toBe('java-microservice');
        });
    });

    describe('initialize', () => {
        it('should fetch remote config when configServer is provided', async () => {
            (axios.get as jest.Mock).mockResolvedValue({ data: mockConfig });
            const config = await ConfigManager.getConfig({ archetype: 'test-archetype' });
            expect(axios.get).toHaveBeenCalledWith('http://test-server.com/archetypes/test-archetype', expect.any(Object));
            expect(config.archetype).toEqual(expect.objectContaining(mockConfig));
            expect(validateArchetype).toHaveBeenCalledWith(expect.objectContaining(mockConfig));
        });

        it('should throw an error when unable to fetch from configServer', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
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

        it('should return a default config when unable to load local archetype config', async () => {
            options.configServer = '';
            options.localConfigPath = '/path/to/local/config';
            (fs.promises.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
            await ConfigManager.getConfig({ archetype: 'test-archetype' });
            expect(logger.error).toHaveBeenCalled();
        });

        it('should use default archetypes when no configServer or localConfigPath is provided', async () => {
            options.configServer = '';
            options.localConfigPath = '';
            const config = await ConfigManager.getConfig({ archetype: 'node-fullstack' });
            expect(config.archetype).toEqual(expect.objectContaining(archetypes['node-fullstack']));
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
});

describe('REPO_GLOBAL_CHECK', () => {
    it('should be defined', () => {
        expect(REPO_GLOBAL_CHECK).toBeDefined();
        expect(typeof REPO_GLOBAL_CHECK).toBe('string');
    });
});