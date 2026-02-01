/**
 * Test suite for PluginRegistry async initialization
 * Tests plugin registration, async initialization, and state management
 */

import { XFiPluginRegistry, pluginRegistry } from './pluginRegistry';
import { XFiPlugin, PluginContext } from '@x-fidelity/types';

// Mock the logger
jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    }
}));

// Mock LoggerProvider - using mockImplementation which survives resetMocks
jest.mock('../utils/loggerProvider', () => {
    const createMockLogger = () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    });
    const mockLogger = createMockLogger();
    return {
        LoggerProvider: {
            ensureInitialized: jest.fn().mockImplementation(() => {}),
            getLogger: jest.fn().mockImplementation(() => mockLogger),
            setLogger: jest.fn().mockImplementation(() => {}),
            clearInjectedLogger: jest.fn().mockImplementation(() => {}),
            getLoggerForMode: jest.fn().mockImplementation(() => mockLogger),
            getCurrentExecutionMode: jest.fn().mockImplementation(() => 'cli')
        }
    };
});

// Mock plugin logger
jest.mock('../utils/pluginLogger', () => ({
    createPluginLoggerContext: jest.fn(() => ({
        logger: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn()
        },
        createOperationLogger: jest.fn(),
        createFactLogger: jest.fn(),
        createOperatorLogger: jest.fn()
    })),
    createPluginLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    }))
}));

describe('XFiPluginRegistry', () => {
    let registry: XFiPluginRegistry;

    beforeEach(() => {
        // Create a fresh registry for each test
        registry = XFiPluginRegistry.getInstance();
        registry.reset();
    });

    afterEach(() => {
        registry.reset();
    });

    describe('registerPlugin', () => {
        it('should register a valid plugin', () => {
            const plugin: XFiPlugin = {
                name: 'test-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);

            expect(registry.getPlugin('test-plugin')).toBeDefined();
            expect(registry.getPluginCount()).toBe(1);
        });

        it('should reject plugin without name', () => {
            const plugin = {
                version: '1.0.0'
            } as XFiPlugin;

            expect(() => registry.registerPlugin(plugin)).toThrow('Invalid plugin format');
        });

        it('should reject plugin without version', () => {
            const plugin = {
                name: 'test-plugin'
            } as XFiPlugin;

            expect(() => registry.registerPlugin(plugin)).toThrow('Invalid plugin format');
        });

        it('should skip duplicate plugin registration', () => {
            const plugin: XFiPlugin = {
                name: 'duplicate-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);
            registry.registerPlugin(plugin); // Second registration

            expect(registry.getPluginCount()).toBe(1);
        });

        it('should register plugin with facts and operators', () => {
            const plugin: XFiPlugin = {
                name: 'full-plugin',
                version: '1.0.0',
                facts: [
                    { name: 'testFact', fn: jest.fn() }
                ],
                operators: [
                    { name: 'testOperator', fn: jest.fn() }
                ]
            };

            registry.registerPlugin(plugin);

            const facts = registry.getPluginFacts();
            const operators = registry.getPluginOperators();

            expect(facts).toHaveLength(1);
            expect(operators).toHaveLength(1);
            expect(facts[0].name).toBe('testFact');
            expect(operators[0].name).toBe('testOperator');
        });
    });

    describe('async initialization', () => {
        it('should mark plugin as completed for sync plugins without initialize', () => {
            const plugin: XFiPlugin = {
                name: 'sync-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);

            expect(registry.isPluginReady('sync-plugin')).toBe(true);
        });

        it('should handle async plugin initialization', async () => {
            let initResolved = false;

            const plugin: XFiPlugin = {
                name: 'async-plugin',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async (context: PluginContext) => {
                    await new Promise(resolve => setTimeout(resolve, 50));
                    initResolved = true;
                }
            };

            registry.registerPlugin(plugin);

            // Initially not ready
            const statusBefore = registry.getInitializationStatus();
            expect(statusBefore.get('async-plugin')).toBe('initializing');

            // Wait for initialization
            await registry.waitForPlugin('async-plugin');

            expect(initResolved).toBe(true);
            expect(registry.isPluginReady('async-plugin')).toBe(true);
        });

        it('should handle failed async initialization', async () => {
            const plugin: XFiPlugin = {
                name: 'failing-plugin',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async () => {
                    throw new Error('Initialization failed');
                }
            };

            // Register the plugin - this starts async initialization
            registry.registerPlugin(plugin);

            // Wait for async initialization to complete (which should fail)
            await expect(registry.waitForPlugin('failing-plugin')).rejects.toThrow('Initialization failed');

            const status = registry.getInitializationStatus();
            expect(status.get('failing-plugin')).toBe('failed');
        });

        it('should wait for all plugins to complete', async () => {
            const initOrder: string[] = [];

            const plugin1: XFiPlugin = {
                name: 'plugin-1',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async () => {
                    await new Promise(resolve => setTimeout(resolve, 30));
                    initOrder.push('plugin-1');
                }
            };

            const plugin2: XFiPlugin = {
                name: 'plugin-2',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async () => {
                    await new Promise(resolve => setTimeout(resolve, 10));
                    initOrder.push('plugin-2');
                }
            };

            registry.registerPlugin(plugin1);
            registry.registerPlugin(plugin2);

            await registry.waitForAllPlugins();

            expect(initOrder).toHaveLength(2);
            expect(registry.isPluginReady('plugin-1')).toBe(true);
            expect(registry.isPluginReady('plugin-2')).toBe(true);
        });

        it('should handle waitForPlugin when plugin already completed', async () => {
            const plugin: XFiPlugin = {
                name: 'quick-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);

            // Should not throw or hang
            await registry.waitForPlugin('quick-plugin');

            expect(registry.isPluginReady('quick-plugin')).toBe(true);
        });

        it('should throw when waiting for failed plugin', async () => {
            const plugin: XFiPlugin = {
                name: 'will-fail',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async () => {
                    throw new Error('Intentional failure');
                }
            };

            try {
                registry.registerPlugin(plugin);
            } catch {
                // Expected in test environment
            }

            await expect(registry.waitForPlugin('will-fail')).rejects.toThrow();
        });

        it('should not block for plugin without initialization promise', async () => {
            const plugin: XFiPlugin = {
                name: 'no-init-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);

            // Should complete immediately
            const startTime = Date.now();
            await registry.waitForPlugin('no-init-plugin');
            const duration = Date.now() - startTime;

            expect(duration).toBeLessThan(100);
        });
    });

    describe('getInitializationStatus', () => {
        it('should return status map for all plugins', () => {
            const plugin1: XFiPlugin = {
                name: 'status-plugin-1',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            const plugin2: XFiPlugin = {
                name: 'status-plugin-2',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin1);
            registry.registerPlugin(plugin2);

            const status = registry.getInitializationStatus();

            expect(status.get('status-plugin-1')).toBe('completed');
            expect(status.get('status-plugin-2')).toBe('completed');
        });

        it('should return a copy of the status map', () => {
            const plugin: XFiPlugin = {
                name: 'copy-test-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);

            const status1 = registry.getInitializationStatus();
            const status2 = registry.getInitializationStatus();

            expect(status1).not.toBe(status2); // Different objects
            expect(status1.get('copy-test-plugin')).toBe(status2.get('copy-test-plugin'));
        });
    });

    describe('isPluginReady', () => {
        it('should return true for completed plugins', () => {
            const plugin: XFiPlugin = {
                name: 'ready-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);

            expect(registry.isPluginReady('ready-plugin')).toBe(true);
        });

        it('should return false for non-existent plugins', () => {
            expect(registry.isPluginReady('non-existent')).toBe(false);
        });

        it('should return false for initializing plugins', () => {
            // Create a plugin that takes time to initialize
            let resolveInit: () => void;
            const initPromise = new Promise<void>(resolve => {
                resolveInit = resolve;
            });

            const plugin: XFiPlugin = {
                name: 'slow-init-plugin',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async () => {
                    await initPromise;
                }
            };

            registry.registerPlugin(plugin);

            // Before initialization completes
            expect(registry.isPluginReady('slow-init-plugin')).toBe(false);

            // Clean up
            resolveInit!();
        });
    });

    describe('legacy plugin support', () => {
        it('should handle legacy plugins without context parameter', () => {
            let legacyInitCalled = false;

            const plugin: XFiPlugin = {
                name: 'legacy-plugin',
                version: '1.0.0',
                facts: [],
                operators: [],
                // Legacy initialize with 0 parameters
                initialize: (() => {
                    legacyInitCalled = true;
                    return Promise.resolve();
                }) as any
            };

            registry.registerPlugin(plugin);

            // Legacy initialization should still work
            expect(legacyInitCalled).toBe(true);
        });
    });

    describe('concurrent plugin initialization', () => {
        it('should handle multiple plugins initializing concurrently', async () => {
            const initTimes: Record<string, number> = {};
            const startTime = Date.now();

            const plugins: XFiPlugin[] = [];
            for (let i = 0; i < 5; i++) {
                const name = `concurrent-plugin-${i}`;
                plugins.push({
                    name,
                    version: '1.0.0',
                    facts: [],
                    operators: [],
                    initialize: async () => {
                        await new Promise(resolve => setTimeout(resolve, 20));
                        initTimes[name] = Date.now() - startTime;
                    }
                });
            }

            // Register all plugins
            plugins.forEach(p => registry.registerPlugin(p));

            // Wait for all
            await registry.waitForAllPlugins();

            // All should be complete
            plugins.forEach(p => {
                expect(registry.isPluginReady(p.name)).toBe(true);
            });

            // Total time should be close to max individual time, not sum
            // (indicating parallel execution)
            const totalTime = Date.now() - startTime;
            expect(totalTime).toBeLessThan(5 * 30); // Less than sequential would take
        });

        it('should handle mix of sync and async plugins', async () => {
            const syncPlugin: XFiPlugin = {
                name: 'mixed-sync',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            const asyncPlugin: XFiPlugin = {
                name: 'mixed-async',
                version: '1.0.0',
                facts: [],
                operators: [],
                initialize: async () => {
                    await new Promise(resolve => setTimeout(resolve, 20));
                }
            };

            registry.registerPlugin(syncPlugin);
            registry.registerPlugin(asyncPlugin);

            expect(registry.isPluginReady('mixed-sync')).toBe(true);
            expect(registry.isPluginReady('mixed-async')).toBe(false);

            await registry.waitForAllPlugins();

            expect(registry.isPluginReady('mixed-async')).toBe(true);
        });
    });

    describe('plugin getters', () => {
        beforeEach(() => {
            const plugin: XFiPlugin = {
                name: 'getter-test-plugin',
                version: '1.0.0',
                facts: [
                    { name: 'fact1', fn: jest.fn() },
                    { name: 'fact2', fn: jest.fn() }
                ],
                operators: [
                    { name: 'op1', fn: jest.fn() }
                ]
            };

            registry.registerPlugin(plugin);
        });

        it('should return all plugin names', () => {
            const names = registry.getPluginNames();
            expect(names).toContain('getter-test-plugin');
        });

        it('should return all facts from all plugins', () => {
            const facts = registry.getPluginFacts();
            expect(facts.length).toBeGreaterThanOrEqual(2);
            expect(facts.map(f => f.name)).toContain('fact1');
            expect(facts.map(f => f.name)).toContain('fact2');
        });

        it('should return all operators from all plugins', () => {
            const operators = registry.getPluginOperators();
            expect(operators.length).toBeGreaterThanOrEqual(1);
            expect(operators.map(o => o.name)).toContain('op1');
        });

        it('should return plugin by name', () => {
            const plugin = registry.getPlugin('getter-test-plugin');
            expect(plugin).toBeDefined();
            expect(plugin?.version).toBe('1.0.0');
        });

        it('should return undefined for non-existent plugin', () => {
            const plugin = registry.getPlugin('does-not-exist');
            expect(plugin).toBeUndefined();
        });
    });

    describe('cleanup', () => {
        it('should call cleanup on all plugins', async () => {
            const cleanupFn = jest.fn();

            const plugin: XFiPlugin = {
                name: 'cleanup-plugin',
                version: '1.0.0',
                facts: [],
                operators: [],
                cleanup: cleanupFn
            };

            registry.registerPlugin(plugin);
            await registry.cleanupAllPlugins();

            expect(cleanupFn).toHaveBeenCalledTimes(1);
        });

        it('should handle cleanup errors gracefully', async () => {
            const plugin: XFiPlugin = {
                name: 'cleanup-error-plugin',
                version: '1.0.0',
                facts: [],
                operators: [],
                cleanup: async () => {
                    throw new Error('Cleanup failed');
                }
            };

            registry.registerPlugin(plugin);

            // Should not throw
            await expect(registry.cleanupAllPlugins()).resolves.not.toThrow();
        });
    });

    describe('reset', () => {
        it('should clear all registered plugins', () => {
            const plugin: XFiPlugin = {
                name: 'reset-test-plugin',
                version: '1.0.0',
                facts: [],
                operators: []
            };

            registry.registerPlugin(plugin);
            expect(registry.getPluginCount()).toBe(1);

            registry.reset();
            expect(registry.getPluginCount()).toBe(0);
        });
    });
});
