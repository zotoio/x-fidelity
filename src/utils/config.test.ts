import { ConfigManager, REPO_GLOBAL_CHECK } from './config';
import { archetypes } from '../archetypes';
import axios from 'axios';

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
            const mockConfig = { test: 'value' };
            (axios.get as jest.Mock).mockResolvedValue({ data: mockConfig });

            await configManager.initialize('test-archetype', 'http://test-server.com');

            expect(axios.get).toHaveBeenCalledWith('http://test-server.com/archetypes/test-archetype');
            expect(configManager.getConfig()).toEqual(expect.objectContaining(mockConfig));
        });

        it('should throw an error when unable to fetch from configServer', async () => {
            (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(configManager.initialize('test-archetype', 'http://test-server.com'))
                .rejects.toThrow('Failed to fetch remote archetype config');

            expect(configManager.getConfig()).toEqual(archetypes['node-fullstack']);
        });

    });

    it('should throw an error when unable to load local archetype config', async () => {
        const configManager = ConfigManager.getInstance();
        configManager.localConfigPath = '/non/existent/path';

        await expect(configManager.initialize('test-archetype', '', '/non/existent/path'))
            .rejects.toThrow('Failed to load local archetype config');
    });

});

describe('REPO_GLOBAL_CHECK', () => {
    it('should be defined', () => {
        expect(REPO_GLOBAL_CHECK).toBeDefined();
        expect(typeof REPO_GLOBAL_CHECK).toBe('string');
    });
});
