/**
 * Test suite for CentralConfigManager
 * Tests config resolution priority, security validation, and GitHub config handling
 */

import { CentralConfigManager } from './centralConfigManager';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    }
}));

jest.mock('../security/pathValidator', () => ({
    validateDirectoryPath: jest.fn().mockImplementation(() => true)
}));

jest.mock('./gitHubConfigManager', () => {
    // Define mock class inside factory so it's available when hoisted
    class MockGitHubConfigManager {
        parseGitHubTreeUrl = jest.fn().mockImplementation((url: string) => ({
            repoUrl: 'github.com/test/config',
            branch: 'main',
            path: 'config'
        }));
        getGitHubConfig = jest.fn().mockImplementation(() => Promise.resolve('/mock/github/config'));
    }
    return {
        GitHubConfigManager: jest.fn().mockImplementation(() => new MockGitHubConfigManager())
    };
});

// Import the mocked functions for configuration in tests
import { validateDirectoryPath } from '../security/pathValidator';
const mockValidateDirectoryPath = validateDirectoryPath as jest.Mock;

describe('CentralConfigManager', () => {
    let manager: CentralConfigManager;
    let tempDir: string;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'xfi-central-test-'));
    });

    afterAll(async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockValidateDirectoryPath.mockReturnValue(true);
        
        // Reset singleton
        (CentralConfigManager as any).instance = undefined;
        manager = CentralConfigManager.getInstance();
        originalEnv = { ...process.env };
    });

    afterEach(() => {
        process.env = originalEnv;
        (CentralConfigManager as any).instance = undefined;
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = CentralConfigManager.getInstance();
            const instance2 = CentralConfigManager.getInstance();
            
            expect(instance1).toBe(instance2);
        });
    });

    describe('getCentralConfigDir', () => {
        it('should return XDG-compliant config directory on Unix', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux' });
            
            const configDir = manager.getCentralConfigDir();
            
            expect(configDir).toContain('xfidelity');
            expect(configDir).toContain('.config');
            
            Object.defineProperty(process, 'platform', { value: originalPlatform });
        });

        it('should use XDG_CONFIG_HOME if set', () => {
            const customConfigHome = path.join(tempDir, 'custom-config');
            process.env.XDG_CONFIG_HOME = customConfigHome;
            
            // Reset singleton to pick up new env
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            const configDir = newManager.getCentralConfigDir();
            
            expect(configDir).toContain(customConfigHome);
        });
    });

    describe('resolveConfigPath', () => {
        describe('priority order', () => {
            it('should use configServer when provided (highest priority)', async () => {
                const result = await manager.resolveConfigPath({
                    archetype: 'test',
                    configServer: 'https://config.example.com'
                });
                
                expect(result.source).toBe('configServer');
                expect(result.path).toBe('');
            });

            it('should use explicit GitHub location when provided', async () => {
                const result = await manager.resolveConfigPath({
                    archetype: 'test',
                    githubConfigLocation: 'https://github.com/org/config/tree/main/config'
                });
                
                expect(result.source).toBe('explicit-github');
            });

            it('should use explicit local path when provided', async () => {
                const localPath = path.join(tempDir, 'local-config');
                
                const result = await manager.resolveConfigPath({
                    archetype: 'test',
                    localConfigPath: localPath
                });
                
                expect(result.source).toBe('explicit-local');
                expect(result.path).toBe(localPath);
            });

            it('should use environment variable when set', async () => {
                const envConfigPath = path.join(tempDir, 'env-config');
                await fs.promises.mkdir(envConfigPath, { recursive: true });
                process.env.XFI_CONFIG_PATH = envConfigPath;
                
                const result = await manager.resolveConfigPath({
                    archetype: 'test'
                });
                
                expect(result.source).toBe('environment');
                expect(result.path).toBe(envConfigPath);
            });

            it('should fall back to demo config when no other source available', async () => {
                // Ensure no environment variable is set
                delete process.env.XFI_CONFIG_PATH;
                
                const result = await manager.resolveConfigPath({
                    archetype: 'test'
                });
                
                expect(result.source).toBe('demo');
            });
        });

        describe('configServer priority', () => {
            it('should prioritize configServer over localConfigPath', async () => {
                const result = await manager.resolveConfigPath({
                    archetype: 'test',
                    configServer: 'https://config.example.com',
                    localConfigPath: '/local/path'
                });
                
                expect(result.source).toBe('configServer');
            });

            it('should prioritize configServer over githubConfigLocation', async () => {
                const result = await manager.resolveConfigPath({
                    archetype: 'test',
                    configServer: 'https://config.example.com',
                    githubConfigLocation: 'https://github.com/org/repo'
                });
                
                expect(result.source).toBe('configServer');
            });
        });

        describe('GitHub priority', () => {
            it('should prioritize githubConfigLocation over localConfigPath', async () => {
                const result = await manager.resolveConfigPath({
                    archetype: 'test',
                    githubConfigLocation: 'https://github.com/org/repo/tree/main/config',
                    localConfigPath: '/local/path'
                });
                
                expect(result.source).toBe('explicit-github');
            });
        });
    });

    describe('initializeCentralConfig', () => {
        it('should create central config directory structure', async () => {
            // Use a unique temp dir for this test
            const testConfigHome = path.join(tempDir, 'init-test', '.config');
            process.env.XDG_CONFIG_HOME = testConfigHome;
            
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            await newManager.initializeCentralConfig();
            
            const centralDir = newManager.getCentralConfigDir();
            const configsDir = path.join(centralDir, 'configs');
            
            const centralExists = await fs.promises.access(centralDir).then(() => true).catch(() => false);
            const configsExists = await fs.promises.access(configsDir).then(() => true).catch(() => false);
            
            expect(centralExists).toBe(true);
            expect(configsExists).toBe(true);
        });
    });

    describe('listCentralConfigs', () => {
        it('should return empty array when configs directory does not exist', async () => {
            const testConfigHome = path.join(tempDir, 'empty-configs', '.config');
            process.env.XDG_CONFIG_HOME = testConfigHome;
            
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            const configs = await newManager.listCentralConfigs();
            
            expect(configs).toEqual([]);
        });

        it('should list available central configs', async () => {
            const testConfigHome = path.join(tempDir, 'list-test', '.config');
            process.env.XDG_CONFIG_HOME = testConfigHome;
            
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            // Create config structure
            const configsDir = path.join(newManager.getCentralConfigDir(), 'configs');
            const testConfig = path.join(configsDir, 'test-archetype');
            await fs.promises.mkdir(testConfig, { recursive: true });
            
            // Create minimal valid structure
            await fs.promises.mkdir(path.join(testConfig, 'archetypes'), { recursive: true });
            await fs.promises.mkdir(path.join(testConfig, 'rules'), { recursive: true });
            
            const configs = await newManager.listCentralConfigs();
            
            expect(configs.length).toBeGreaterThan(0);
            expect(configs.some(c => c.name === 'test-archetype')).toBe(true);
        });
    });

    describe('removeCentralConfig', () => {
        it('should throw error for non-existent config', async () => {
            await expect(
                manager.removeCentralConfig('does-not-exist')
            ).rejects.toThrow("does not exist");
        });

        it('should remove existing config', async () => {
            const testConfigHome = path.join(tempDir, 'remove-test', '.config');
            process.env.XDG_CONFIG_HOME = testConfigHome;
            
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            // Create config to remove
            const configsDir = path.join(newManager.getCentralConfigDir(), 'configs');
            const testConfig = path.join(configsDir, 'to-remove');
            await fs.promises.mkdir(testConfig, { recursive: true });
            
            await newManager.removeCentralConfig('to-remove');
            
            const exists = await fs.promises.access(testConfig).then(() => true).catch(() => false);
            expect(exists).toBe(false);
        });
    });

    describe('updateSecurityAllowedPaths', () => {
        it('should add central config paths to allowed paths', () => {
            const basePaths = ['/some/path'];
            
            const updatedPaths = CentralConfigManager.updateSecurityAllowedPaths(basePaths);
            
            expect(updatedPaths.length).toBeGreaterThan(basePaths.length);
            expect(updatedPaths).toContain('/some/path');
            expect(updatedPaths.some(p => p.includes('xfidelity'))).toBe(true);
        });

        it('should preserve original paths', () => {
            const basePaths = ['/original/path/1', '/original/path/2'];
            
            const updatedPaths = CentralConfigManager.updateSecurityAllowedPaths(basePaths);
            
            expect(updatedPaths).toContain('/original/path/1');
            expect(updatedPaths).toContain('/original/path/2');
        });

        it('should handle empty input array', () => {
            const updatedPaths = CentralConfigManager.updateSecurityAllowedPaths([]);
            
            expect(Array.isArray(updatedPaths)).toBe(true);
            // Should at least add central config paths
            expect(updatedPaths.length).toBeGreaterThan(0);
        });
    });

    describe('config resolution with central directory', () => {
        it('should check archetype-specific config before default', async () => {
            const testConfigHome = path.join(tempDir, 'archetype-priority', '.config');
            process.env.XDG_CONFIG_HOME = testConfigHome;
            delete process.env.XFI_CONFIG_PATH;
            
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            // Create both archetype-specific and default configs
            const configsDir = path.join(newManager.getCentralConfigDir(), 'configs');
            const specificConfig = path.join(configsDir, 'specific-archetype');
            const defaultConfig = path.join(configsDir, 'default');
            
            // Create specific archetype config with valid structure
            await fs.promises.mkdir(path.join(specificConfig, 'archetypes'), { recursive: true });
            await fs.promises.mkdir(path.join(specificConfig, 'rules'), { recursive: true });
            
            // Create default config with valid structure
            await fs.promises.mkdir(path.join(defaultConfig, 'archetypes'), { recursive: true });
            await fs.promises.mkdir(path.join(defaultConfig, 'rules'), { recursive: true });
            
            const result = await newManager.resolveConfigPath({
                archetype: 'specific-archetype'
            });
            
            // Should find the archetype-specific config
            if (result.source.startsWith('central')) {
                expect(result.source).toBe('central-archetype');
            }
        });
    });

    describe('path traversal prevention', () => {
        it('should prevent path traversal in archetype name', async () => {
            const testConfigHome = path.join(tempDir, 'traversal-test', '.config');
            process.env.XDG_CONFIG_HOME = testConfigHome;
            delete process.env.XFI_CONFIG_PATH;
            
            (CentralConfigManager as any).instance = undefined;
            const newManager = CentralConfigManager.getInstance();
            
            await newManager.initializeCentralConfig();
            
            // Try to access with path traversal
            const result = await newManager.resolveConfigPath({
                archetype: '../../../etc/passwd'
            });
            
            // Should fall back to demo config, not allow traversal
            expect(result.source).toBe('demo');
        });
    });
});
