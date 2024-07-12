import { ConfigManager, REPO_GLOBAL_CHECK } from './config';
import { archetypes } from '../archetypes';
import axios from 'axios';
import { loadRules } from '../rules';

jest.mock('axios');
jest.mock('../rules');

describe('ConfigManager', () => {
    let configManager: ConfigManager;

    beforeEach(() => {
        jest.clearAllMocks();
        configManager = ConfigManager.getInstance();
    });

    afterEach(() => {
        jest.resetModules();
    });

    it('should be a singleton', () => {
        const instance1 = ConfigManager.getInstance();
        const instance2 = ConfigManager.getInstance();
        expect(instance1).toBe(instance2);
    });

    describe('initialize', () => {
        it('should initialize with default archetype when not specified', async () => {
            await configManager.initialize();
            expect(configManager.getConfig()).toEqual(archetypes['node-fullstack']);
        });

        it('should initialize with specified archetype', async () => {
            await configManager.initialize('java-microservice');
            expect(configManager.getConfig()).toEqual(archetypes['java-microservice']);
        });

        it('should fetch remote config when configServer is provided', async () => {
            const mockConfig = { config: { test: 'value' } };
            (axios.get as jest.Mock).mockResolvedValue({ data: mockConfig });

            await configManager.initialize('test-archetype', 'http://test-server.com');

            expect(axios.get).toHaveBeenCalledWith('http://test-server.com/archetypes/test-archetype');
            expect(configManager.getConfig().config).toHaveProperty('test', 'value');
        });

        it('should handle errors when fetching remote config', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            await configManager.initialize('test-archetype', 'http://test-server.com');

            expect(configManager.getConfig()).toEqual(archetypes['node-fullstack']);
        });

        it('should load rules after initializing config', async () => {
            (loadRules as jest.Mock).mockResolvedValue(['rule1', 'rule2']);

            await configManager.initialize('test-archetype');

            expect(loadRules).toHaveBeenCalledWith('test-archetype', expect.any(Array), '');
            expect(configManager.getRules()).toEqual(['rule1', 'rule2']);
        });
    });

    describe('getter methods', () => {
        beforeEach(async () => {
            await configManager.initialize('node-fullstack');
        });

        it('should return correct minimum dependency versions', () => {
            const minVersions = configManager.getMinimumDependencyVersions();
            expect(minVersions).toEqual(archetypes['node-fullstack'].config.minimumDependencyVersions);
        });

        it('should return correct standard structure', () => {
            const structure = configManager.getStandardStructure();
            expect(structure).toEqual(archetypes['node-fullstack'].config.standardStructure);
        });

        it('should return correct blacklist patterns', () => {
            const patterns = configManager.getBlacklistPatterns();
            expect(patterns).toEqual(archetypes['node-fullstack'].config.blacklistPatterns);
        });

        it('should return correct whitelist patterns', () => {
            const patterns = configManager.getWhitelistPatterns();
            expect(patterns).toEqual(archetypes['node-fullstack'].config.whitelistPatterns);
        });
    });
});

describe('REPO_GLOBAL_CHECK', () => {
    it('should be defined', () => {
        expect(REPO_GLOBAL_CHECK).toBeDefined();
        expect(typeof REPO_GLOBAL_CHECK).toBe('string');
    });
});
