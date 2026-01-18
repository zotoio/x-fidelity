import { ServerLogger, setLogPrefix, resetLogPrefix, setLogLevel, logger } from './serverLogger';

describe('ServerLogger', () => {
    describe('constructor', () => {
        it('should create logger with default config', () => {
            const serverLogger = new ServerLogger();
            expect(serverLogger).toBeDefined();
            expect(serverLogger.getLevel()).toBe('info');
        });

        it('should create logger with custom log level', () => {
            const serverLogger = new ServerLogger({ level: 'debug' });
            expect(serverLogger.getLevel()).toBe('debug');
        });

        it('should create logger with error level', () => {
            const serverLogger = new ServerLogger({ level: 'error' });
            expect(serverLogger.getLevel()).toBe('error');
        });

        it('should create logger with warn level', () => {
            const serverLogger = new ServerLogger({ level: 'warn' });
            expect(serverLogger.getLevel()).toBe('warn');
        });
    });

    describe('logging methods', () => {
        let serverLogger: ServerLogger;

        beforeEach(() => {
            serverLogger = new ServerLogger({ level: 'trace' });
        });

        it('should log trace messages', () => {
            expect(() => serverLogger.trace('trace message')).not.toThrow();
            expect(() => serverLogger.trace({ key: 'value' }, 'trace with meta')).not.toThrow();
        });

        it('should log debug messages', () => {
            expect(() => serverLogger.debug('debug message')).not.toThrow();
            expect(() => serverLogger.debug({ key: 'value' }, 'debug with meta')).not.toThrow();
        });

        it('should log info messages', () => {
            expect(() => serverLogger.info('info message')).not.toThrow();
            expect(() => serverLogger.info({ key: 'value' }, 'info with meta')).not.toThrow();
        });

        it('should log warn messages', () => {
            expect(() => serverLogger.warn('warn message')).not.toThrow();
            expect(() => serverLogger.warn({ key: 'value' }, 'warn with meta')).not.toThrow();
        });

        it('should log error messages', () => {
            expect(() => serverLogger.error('error message')).not.toThrow();
            expect(() => serverLogger.error({ key: 'value' }, 'error with meta')).not.toThrow();
        });

        it('should log fatal messages', () => {
            expect(() => serverLogger.fatal('fatal message')).not.toThrow();
            expect(() => serverLogger.fatal({ key: 'value' }, 'fatal with meta')).not.toThrow();
        });

        it('should handle object-first logging style', () => {
            expect(() => serverLogger.info({ requestId: '123' }, 'Processing request')).not.toThrow();
        });

        it('should handle string-first logging style', () => {
            expect(() => serverLogger.info('Processing request', { requestId: '123' })).not.toThrow();
        });
    });

    describe('setLevel', () => {
        it('should change the log level', () => {
            const serverLogger = new ServerLogger({ level: 'info' });
            
            serverLogger.setLevel('debug');
            expect(serverLogger.getLevel()).toBe('debug');
            
            serverLogger.setLevel('error');
            expect(serverLogger.getLevel()).toBe('error');
        });
    });

    describe('updateLevel', () => {
        it('should update the log level dynamically', () => {
            const serverLogger = new ServerLogger({ level: 'info' });
            
            serverLogger.updateLevel('warn');
            expect(serverLogger.getLevel()).toBe('warn');
        });
    });

    describe('getLevel', () => {
        it('should return current log level', () => {
            const serverLogger = new ServerLogger({ level: 'debug' });
            expect(serverLogger.getLevel()).toBe('debug');
        });
    });

    describe('isLevelEnabled', () => {
        it('should return true for enabled levels', () => {
            const serverLogger = new ServerLogger({ level: 'debug' });
            
            expect(serverLogger.isLevelEnabled('debug')).toBe(true);
            expect(serverLogger.isLevelEnabled('info')).toBe(true);
            expect(serverLogger.isLevelEnabled('warn')).toBe(true);
            expect(serverLogger.isLevelEnabled('error')).toBe(true);
            expect(serverLogger.isLevelEnabled('fatal')).toBe(true);
        });

        it('should return false for disabled levels', () => {
            const serverLogger = new ServerLogger({ level: 'error' });
            
            expect(serverLogger.isLevelEnabled('trace')).toBe(false);
            expect(serverLogger.isLevelEnabled('debug')).toBe(false);
            expect(serverLogger.isLevelEnabled('info')).toBe(false);
            expect(serverLogger.isLevelEnabled('warn')).toBe(false);
        });

        it('should return true for same and higher levels', () => {
            const serverLogger = new ServerLogger({ level: 'warn' });
            
            expect(serverLogger.isLevelEnabled('warn')).toBe(true);
            expect(serverLogger.isLevelEnabled('error')).toBe(true);
            expect(serverLogger.isLevelEnabled('fatal')).toBe(true);
        });
    });

    describe('updateOptions', () => {
        it('should not throw when called (no-op)', () => {
            const serverLogger = new ServerLogger();
            expect(() => serverLogger.updateOptions({ enableFileLogging: true })).not.toThrow();
            expect(() => serverLogger.updateOptions()).not.toThrow();
        });
    });

    describe('default logger instance', () => {
        it('should export a default logger instance', () => {
            expect(logger).toBeDefined();
            expect(logger).toBeInstanceOf(ServerLogger);
        });

        it('should have logging methods available', () => {
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
            expect(typeof logger.debug).toBe('function');
        });
    });

    describe('legacy compatibility functions', () => {
        it('should not throw when setLogPrefix is called', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            expect(() => setLogPrefix('test-prefix')).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
            
            consoleSpy.mockRestore();
        });

        it('should not throw when resetLogPrefix is called', () => {
            expect(() => resetLogPrefix()).not.toThrow();
        });

        it('should update default logger level via setLogLevel', () => {
            const originalLevel = logger.getLevel();
            
            setLogLevel('warn');
            expect(logger.getLevel()).toBe('warn');
            
            // Restore original level
            setLogLevel(originalLevel);
        });
    });

    describe('file logging', () => {
        it('should handle file logging config without errors', () => {
            // Note: We're not testing actual file creation, just that config doesn't throw
            expect(() => new ServerLogger({
                level: 'info',
                enableConsole: false, // Disable console to trigger file transport path
                enableFile: true,
                filePath: '/tmp/test-logger.log'
            })).not.toThrow();
        });

        it('should handle missing file path gracefully', () => {
            expect(() => new ServerLogger({
                level: 'info',
                enableFile: true
                // No filePath provided
            })).not.toThrow();
        });
    });

    describe('console configuration', () => {
        it('should create logger with console enabled by default', () => {
            const serverLogger = new ServerLogger({});
            expect(serverLogger).toBeDefined();
        });

        it('should create logger with console disabled', () => {
            const serverLogger = new ServerLogger({
                enableConsole: false
            });
            expect(serverLogger).toBeDefined();
        });

        it('should create logger with colors disabled', () => {
            const serverLogger = new ServerLogger({
                enableColors: false
            });
            expect(serverLogger).toBeDefined();
        });
    });
});
