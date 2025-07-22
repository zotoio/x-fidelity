import { LoggerProvider, PrefixingLogger } from './loggerProvider';
import { DefaultLogger, SilentLogger } from './defaultLogger';
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


    setLevel(level: any): void {}
    getLevel(): any { return 'info'; }
    isLevelEnabled(level: any): boolean { return true; }
    dispose?(): void {}
}

describe('LoggerProvider', () => {
    beforeEach(() => {
        // Reset the provider before each test
        LoggerProvider.reset();
    });

    afterEach(() => {
        // Clean up after each test
        LoggerProvider.reset();
    });

    describe('Initialization', () => {
        it('should initialize with default logger when ensureInitialized is called', () => {
            LoggerProvider.ensureInitialized();
            
            expect(LoggerProvider.hasLogger()).toBe(true);
            expect(LoggerProvider.hasInjectedLogger()).toBe(false);
            
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeDefined();
            expect(logger).toBeInstanceOf(PrefixingLogger);
        });

        it('should initialize only once when ensureInitialized is called multiple times', () => {
            LoggerProvider.ensureInitialized();
            const firstLogger = LoggerProvider.getBaseLogger();
            
            LoggerProvider.ensureInitialized();
            const secondLogger = LoggerProvider.getBaseLogger();
            
            expect(firstLogger).toBe(secondLogger);
        });

        it('should initialize automatically when getLogger is called', () => {
            const logger = LoggerProvider.getLogger();
            
            expect(logger).toBeDefined();
            expect(LoggerProvider.hasLogger()).toBe(true);
        });
    });

    describe('Logger Injection', () => {
        it('should use injected logger when available', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            expect(LoggerProvider.hasInjectedLogger()).toBe(true);
            expect(LoggerProvider.getBaseLogger()).toBe(mockLogger);
        });

        it('should wrap injected logger with prefixing', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeInstanceOf(PrefixingLogger);
            expect((logger as PrefixingLogger).getBaseLogger()).toBe(mockLogger);
        });

        it('should fall back to default logger when injected logger is cleared', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            expect(LoggerProvider.hasInjectedLogger()).toBe(true);
            
            LoggerProvider.clearInjectedLogger();
            
            expect(LoggerProvider.hasInjectedLogger()).toBe(false);
            expect(LoggerProvider.hasLogger()).toBe(true);
        });
    });

    describe('Logger Functionality', () => {
        it('should support basic logging operations', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            const logger = LoggerProvider.getLogger();
            logger.info('test message');
            
            expect(mockLogger.logs).toHaveLength(1);
            expect(mockLogger.logs[0].level).toBe('info');
        });

        it('should support auto-prefixing control', () => {
            LoggerProvider.setAutoPrefixing(false);
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            const logger = LoggerProvider.getLogger();
            // Logger is always wrapped in PrefixingLogger for correlation ID support
            expect(logger).toBeInstanceOf(PrefixingLogger);
            expect((logger as any).enablePrefix).toBe(false);
            expect((logger as any).enableCorrelationMetadata).toBe(true);
            
            LoggerProvider.setAutoPrefixing(true);
        });
    });

    describe('Plugin Initialization', () => {
        it('should initialize logger provider for plugins', () => {
            LoggerProvider.initializeForPlugins();
            
            expect(LoggerProvider.hasLogger()).toBe(true);
            
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeDefined();
        });

        it('should not throw error when initializing for plugins multiple times', () => {
            expect(() => {
                LoggerProvider.initializeForPlugins();
                LoggerProvider.initializeForPlugins();
            }).not.toThrow();
        });
    });

    describe('Auto-Prefixing', () => {
        it('should enable auto-prefixing by default', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeInstanceOf(PrefixingLogger);
        });

        it('should disable auto-prefixing when requested', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            LoggerProvider.setAutoPrefixing(false);
            
            const logger = LoggerProvider.getLogger();
            // Logger is always wrapped in PrefixingLogger for correlation ID support
            expect(logger).toBeInstanceOf(PrefixingLogger);
            expect((logger as any).enablePrefix).toBe(false);
            expect((logger as any).enableCorrelationMetadata).toBe(true);
        });

        it('should re-enable auto-prefixing when requested', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            LoggerProvider.setAutoPrefixing(false);
            LoggerProvider.setAutoPrefixing(true);
            
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeInstanceOf(PrefixingLogger);
        });
    });

    describe('Error Handling', () => {
        it('should never throw when getLogger is called', () => {
            expect(() => {
                LoggerProvider.getLogger();
            }).not.toThrow();
        });

        it('should provide valid logger even without initialization', () => {
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeDefined();
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.error).toBe('function');
        });

        it('should provide valid logger after reset', () => {
            LoggerProvider.reset();
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeDefined();
        });
    });

    describe('Legacy Compatibility', () => {
        it('should maintain backwards compatibility with existing code', () => {
            const mockLogger = new MockLogger();
            LoggerProvider.setLogger(mockLogger);
            
            // Test old methods still work
            expect(LoggerProvider.hasInjectedLogger()).toBe(true);
            expect(LoggerProvider.getBaseLogger()).toBe(mockLogger);
            
            LoggerProvider.clearInjectedLogger();
            expect(LoggerProvider.hasInjectedLogger()).toBe(false);
        });
    });
}); 