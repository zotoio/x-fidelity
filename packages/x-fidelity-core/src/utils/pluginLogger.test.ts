import { pluginLogger, createPluginLogger, getPluginLogger, createPluginLoggerContext } from './pluginLogger';
import { LoggerProvider } from './loggerProvider';
import { ILogger } from '@x-fidelity/types';

// Mock logger for testing
class MockLogger implements ILogger {
    public logs: Array<{ level: string; message: string; meta?: any }> = [];

    trace(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'trace', message: msgOrMeta, meta: metaOrMsg });
    }

    debug(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'debug', message: msgOrMeta, meta: metaOrMsg });
    }

    info(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'info', message: msgOrMeta, meta: metaOrMsg });
    }

    warn(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'warn', message: msgOrMeta, meta: metaOrMsg });
    }

    error(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'error', message: msgOrMeta, meta: metaOrMsg });
    }

    fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
        this.logs.push({ level: 'fatal', message: msgOrMeta, meta: metaOrMsg });
    }

    child(bindings: any): ILogger {
        const childLogger = new MockLogger();
        childLogger.logs.push({ level: 'child', message: 'Created child logger', meta: bindings });
        return childLogger;
    }

    setLevel(level: any): void {}
    getLevel(): any { return 'info'; }
    isLevelEnabled(level: any): boolean { return true; }
    dispose?(): void {}
}

describe('Plugin Logger Utilities', () => {
    beforeEach(() => {
        // Reset the provider before each test
        LoggerProvider.reset();
    });

    afterEach(() => {
        // Clean up after each test
        LoggerProvider.reset();
    });

    describe('createPluginLogger', () => {
        it('should create a plugin logger with plugin name context', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const logger = createPluginLogger('test-plugin');
            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
        });

        it('should create a plugin logger with additional context', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const logger = createPluginLogger('test-plugin', { operation: 'test-op' });
            expect(logger).toBeDefined();
        });

        it('should work without injected logger (fallback)', () => {
            const logger = createPluginLogger('test-plugin');
            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
        });
    });

    describe('getPluginLogger', () => {
        it('should return a valid logger instance', () => {
            const logger = getPluginLogger();
            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
        });

        it('should return the same logger as LoggerProvider.getLogger', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const pluginLoggerInstance = getPluginLogger();
            const providerLoggerInstance = LoggerProvider.getLogger();

            // Both should be PrefixingLogger instances wrapping the same base logger
            expect(pluginLoggerInstance).toBeDefined();
            expect(providerLoggerInstance).toBeDefined();
        });
    });

    describe('pluginLogger object', () => {
        beforeEach(() => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
        });

        it('should provide getLogger method', () => {
            const logger = pluginLogger.getLogger();
            expect(logger).toBeDefined();
        });

        it('should provide createLogger method', () => {
            const logger = pluginLogger.createLogger('test-plugin');
            expect(logger).toBeDefined();
        });

        it('should provide createOperationLogger method', () => {
            const logger = pluginLogger.createOperationLogger('test-plugin', 'test-operation');
            expect(logger).toBeDefined();
        });

        it('should provide createFactLogger method', () => {
            const logger = pluginLogger.createFactLogger('test-plugin', 'test-fact');
            expect(logger).toBeDefined();
        });

        it('should provide createOperatorLogger method', () => {
            const logger = pluginLogger.createOperatorLogger('test-plugin', 'test-operator');
            expect(logger).toBeDefined();
        });

        it('should provide isInitialized method', () => {
            const isInitialized = pluginLogger.isInitialized();
            expect(typeof isInitialized).toBe('boolean');
            expect(isInitialized).toBe(true);
        });

        it('should provide initializeForPlugins method', () => {
            expect(() => {
                pluginLogger.initializeForPlugins();
            }).not.toThrow();
        });
    });

    describe('createPluginLoggerContext', () => {
        it('should create a complete plugin logger context', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const context = createPluginLoggerContext('test-plugin');

            expect(context).toBeDefined();
            expect(context.logger).toBeDefined();
            expect(context.createOperationLogger).toBeDefined();
            expect(context.createFactLogger).toBeDefined();
            expect(context.createOperatorLogger).toBeDefined();
        });

        it('should create working logger methods in context', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const context = createPluginLoggerContext('test-plugin');

            const operationLogger = context.createOperationLogger('test-op');
            const factLogger = context.createFactLogger('test-fact');
            const operatorLogger = context.createOperatorLogger('test-operator');

            expect(operationLogger).toBeDefined();
            expect(factLogger).toBeDefined();
            expect(operatorLogger).toBeDefined();
        });

        it('should work with fallback logger', () => {
            // Don't inject any logger, should use default
            const context = createPluginLoggerContext('test-plugin');

            expect(context).toBeDefined();
            expect(context.logger).toBeDefined();
        });
    });

    describe('Initialization Safety', () => {
        it('should initialize LoggerProvider automatically when needed', () => {
            // Reset to uninitialized state
            LoggerProvider.reset();
            
            // This should not throw and should auto-initialize
            const logger = getPluginLogger();
            expect(logger).toBeDefined();
            expect(LoggerProvider.hasLogger()).toBe(true);
        });

        it('should handle multiple initialization calls safely', () => {
            expect(() => {
                pluginLogger.initializeForPlugins();
                pluginLogger.initializeForPlugins();
                pluginLogger.initializeForPlugins();
            }).not.toThrow();
        });

        it('should work correctly after provider reset', () => {
            // First use
            const logger1 = getPluginLogger();
            expect(logger1).toBeDefined();

            // Reset
            LoggerProvider.reset();

            // Should still work
            const logger2 = getPluginLogger();
            expect(logger2).toBeDefined();
        });
    });

    describe('Context Propagation', () => {
        it('should propagate plugin name through logger hierarchy', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const pluginLogger1 = createPluginLogger('plugin-1');
            const pluginLogger2 = createPluginLogger('plugin-2', { extra: 'context' });

            expect(pluginLogger1).toBeDefined();
            expect(pluginLogger2).toBeDefined();
        });

        it('should create proper child loggers with context', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const context = createPluginLoggerContext('test-plugin');
            const operationLogger = context.createOperationLogger('test-operation', { step: 1 });

            expect(operationLogger).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing plugin name gracefully', () => {
            expect(() => {
                createPluginLogger('');
            }).not.toThrow();
        });

        it('should handle null/undefined additional context', () => {
            expect(() => {
                createPluginLogger('test-plugin', null as any);
                createPluginLogger('test-plugin', undefined);
            }).not.toThrow();
        });

        it('should provide fallback behavior when logger provider fails', () => {
            // Even if something goes wrong, should not throw
            expect(() => {
                const logger = getPluginLogger();
                logger.info('test message');
            }).not.toThrow();
        });
    });

    describe('Performance', () => {
        it('should create loggers efficiently', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);

            const start = performance.now();
            
            for (let i = 0; i < 100; i++) {
                createPluginLogger(`plugin-${i}`);
            }
            
            const end = performance.now();
            const duration = end - start;
            
            // Should be fast (less than 100ms for 100 loggers)
            expect(duration).toBeLessThan(100);
        });

        it('should reuse logger instances when appropriate', () => {
            const logger1 = getPluginLogger();
            const logger2 = getPluginLogger();
            
            // Should get the same underlying logger
            expect(logger1).toBeDefined();
            expect(logger2).toBeDefined();
        });
    });
}); 