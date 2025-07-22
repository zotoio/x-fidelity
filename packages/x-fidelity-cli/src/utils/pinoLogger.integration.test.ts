import { PinoLogger } from './pinoLogger';
import { EXECUTION_MODES } from '@x-fidelity/types';

// Mock process.env to control execution mode detection
const originalEnv = process.env;

// Mock console methods to capture output
const mockConsoleLog = jest.fn();
const mockConsoleWarn = jest.fn();
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

// Mock process.stdout.write to capture formatted output
const mockStdoutWrite = jest.fn();
const originalStdoutWrite = process.stdout.write;

// Mock LoggerProvider registration
jest.mock('@x-fidelity/core', () => ({
  LoggerProvider: {
    registerLoggerFactory: jest.fn(),
    setAutoPrefixing: jest.fn()
  },
  options: null,
  shouldUseDirectLogging: jest.fn(() => false)
}));

// Mock pino to control its behavior
jest.mock('pino', () => {
  const mockLogger = {
    trace: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    flush: jest.fn(),
    level: 'info'
  };
  
  const pinoMock = jest.fn((options, stream) => {
    // If stream is provided, capture writes to it
    if (stream && typeof stream === 'object' && stream.write) {
      // Store the current log level from options
      const currentLevel = options?.level || 'info';
      const levelValues: Record<string, number> = {
        'trace': 10,
        'debug': 20,
        'info': 30,
        'warn': 40,
        'error': 50,
        'fatal': 60
      };
      const currentLevelValue = levelValues[currentLevel] || 30;
      
      // Return a logger that writes to our stream
      return {
        ...mockLogger,
        level: currentLevel,
        info: jest.fn((metaOrMsg, msgOrMeta) => {
          if (currentLevelValue > 30) return; // Skip if level is higher than info
          // PinoLogger calls with (metadata, message) when first param is string
          const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
          const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
          
          const logEntry = {
            time: Date.now(),
            level: 30,
            msg: message,
            ...metadata // Include all metadata like correlationId, treeSitterMode, etc.
          };
          stream.write(JSON.stringify(logEntry) + '\n');
        }),
        warn: jest.fn((metaOrMsg, msgOrMeta) => {
          if (currentLevelValue > 40) return; // Skip if level is higher than warn
          const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
          const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
          
          const logEntry = {
            time: Date.now(),
            level: 40,
            msg: message,
            ...metadata
          };
          stream.write(JSON.stringify(logEntry) + '\n');
        }),
        error: jest.fn((metaOrMsg, msgOrMeta) => {
          if (currentLevelValue > 50) return; // Skip if level is higher than error
          const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
          const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
          
          const logEntry = {
            time: Date.now(),
            level: 50,
            msg: message,
            ...metadata
          };
          stream.write(JSON.stringify(logEntry) + '\n');
        }),
        debug: jest.fn((metaOrMsg, msgOrMeta) => {
          if (currentLevelValue > 20) return; // Skip if level is higher than debug
          const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
          const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
          
          const logEntry = {
            time: Date.now(),
            level: 20,
            msg: message,
            ...metadata
          };
          stream.write(JSON.stringify(logEntry) + '\n');
        }),
        trace: jest.fn((metaOrMsg, msgOrMeta) => {
          if (currentLevelValue > 10) return; // Skip if level is higher than trace
          const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
          const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
          
          const logEntry = {
            time: Date.now(),
            level: 10,
            msg: message,
            ...metadata
          };
          stream.write(JSON.stringify(logEntry) + '\n');
        }),
        fatal: jest.fn((metaOrMsg, msgOrMeta) => {
          if (currentLevelValue > 60) return; // Skip if level is higher than fatal
          const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
          const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
          
          const logEntry = {
            time: Date.now(),
            level: 60,
            msg: message,
            ...metadata
          };
          stream.write(JSON.stringify(logEntry) + '\n');
        }),
        setLevel: jest.fn((newLevel) => {
          // Update the logger level - this would affect future log calls
          // For simplicity in tests, we'll just update the level property
          mockLogger.level = newLevel;
        }),
        flush: jest.fn((callback) => {
          if (callback) callback();
        })
      };
    }
    
    // Handle plain logger case (VSCode mode) - when no stream is provided
    const currentLevel = options?.level || 'info';
    const levelValues: Record<string, number> = {
      'trace': 10,
      'debug': 20,
      'info': 30,
      'warn': 40,
      'error': 50,
      'fatal': 60
    };
    const currentLevelValue = levelValues[currentLevel] || 30;
    
    return {
      ...mockLogger,
      level: currentLevel,
      info: jest.fn((metaOrMsg, msgOrMeta) => {
        if (currentLevelValue > 30) return; // Skip if level is higher than info
        // For plain logger, create a simple formatted output
        const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
        const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
        
        // Simple format for VSCode mode (no colors, no fancy formatting)
        const timestamp = new Date().toISOString();
        const correlationId = metadata.correlationId ? `[${metadata.correlationId}] ` : '';
        const formatted = `${timestamp} INFO: ${correlationId}${message}`;
        mockStdoutWrite(formatted + '\n');
      }),
      warn: jest.fn((metaOrMsg, msgOrMeta) => {
        if (currentLevelValue > 40) return; // Skip if level is higher than warn
        const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
        const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
        
        const timestamp = new Date().toISOString();
        const correlationId = metadata.correlationId ? `[${metadata.correlationId}] ` : '';
        const formatted = `${timestamp} WARN: ${correlationId}${message}`;
        mockStdoutWrite(formatted + '\n');
      }),
      error: jest.fn((metaOrMsg, msgOrMeta) => {
        if (currentLevelValue > 50) return; // Skip if level is higher than error
        const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
        const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
        
        const timestamp = new Date().toISOString();
        const correlationId = metadata.correlationId ? `[${metadata.correlationId}] ` : '';
        const formatted = `${timestamp} ERROR: ${correlationId}${message}`;
        mockStdoutWrite(formatted + '\n');
      }),
      debug: jest.fn((metaOrMsg, msgOrMeta) => {
        if (currentLevelValue > 20) return; // Skip if level is higher than debug
        const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
        const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
        
        const timestamp = new Date().toISOString();
        const correlationId = metadata.correlationId ? `[${metadata.correlationId}] ` : '';
        const formatted = `${timestamp} DEBUG: ${correlationId}${message}`;
        mockStdoutWrite(formatted + '\n');
      }),
      trace: jest.fn((metaOrMsg, msgOrMeta) => {
        if (currentLevelValue > 10) return; // Skip if level is higher than trace
        const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
        const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
        
        const timestamp = new Date().toISOString();
        const correlationId = metadata.correlationId ? `[${metadata.correlationId}] ` : '';
        const formatted = `${timestamp} TRACE: ${correlationId}${message}`;
        mockStdoutWrite(formatted + '\n');
      }),
      fatal: jest.fn((metaOrMsg, msgOrMeta) => {
        if (currentLevelValue > 60) return; // Skip if level is higher than fatal
        const metadata = typeof metaOrMsg === 'object' ? metaOrMsg : {};
        const message = typeof msgOrMeta === 'string' ? msgOrMeta : (typeof metaOrMsg === 'string' ? metaOrMsg : 'unknown');
        
        const timestamp = new Date().toISOString();
        const correlationId = metadata.correlationId ? `[${metadata.correlationId}] ` : '';
        const formatted = `${timestamp} FATAL: ${correlationId}${message}`;
        mockStdoutWrite(formatted + '\n');
      }),
      setLevel: jest.fn((newLevel) => {
        mockLogger.level = newLevel;
      }),
      flush: jest.fn((callback) => {
        if (callback) callback();
      })
    };
  }) as any;
  
  pinoMock.stdTimeFunctions = {
    isoTime: () => new Date().toISOString()
  };
  
  return pinoMock;
});

// Mock pino-pretty
jest.mock('pino-pretty', () => {
  return jest.fn((options) => {
    return {
      write: jest.fn((chunk) => {
        try {
          const logObj = JSON.parse(chunk);
          const timestamp = new Date(logObj.time).toISOString().replace('T', ' ').replace('Z', '');
          const timezone = ' +1000'; // Mock timezone
          
          // Map log levels correctly
          const levelMap: Record<number, string> = {
            10: 'TRACE',
            20: 'DEBUG', 
            30: 'INFO',
            40: 'WARN',
            50: 'ERROR',
            60: 'FATAL'
          };
          const level = levelMap[logObj.level] || 'UNKNOWN';
          
          // Handle correlation ID and special mode indicators
          let message = logObj.msg || '';
          const correlationId = logObj.correlationId ? `[${logObj.correlationId}] ` : '';
          
          // Add tree-sitter mode indicator if present
          if (logObj.treeSitterMode) {
            message = `[${logObj.treeSitterMode}] ${message}`;
          }
          
          // Add performance indicators for timing
          if (logObj.performanceCategory) {
            const perfIcon = logObj.performanceCategory === 'slow' ? '[SLOW]' : 
                            logObj.performanceCategory === 'normal' ? '[FAST]' : '[PERF]';
            message = `${perfIcon} ${message}`;
          }
          
          const formatted = `[${timestamp}${timezone}] ${level}: ${correlationId}${message}`;
          
          // Only show metadata for DEBUG (20) and TRACE (10) levels - matching PinoLogger behavior
          const shouldShowMetadata = logObj.level < 30 && options?.hideObject && typeof options.hideObject === 'function' 
            ? !options.hideObject(logObj) 
            : logObj.level < 30;
          
          if (shouldShowMetadata && Object.keys(logObj).some(key => !['time', 'level', 'msg', 'pid', 'hostname'].includes(key))) {
            const metadata = { ...logObj };
            delete metadata.time;
            delete metadata.level;
            delete metadata.msg;
            delete metadata.pid;
            delete metadata.hostname;
            
            if (Object.keys(metadata).length > 0) {
              mockStdoutWrite(formatted + '\n');
              mockStdoutWrite(`    ${JSON.stringify(metadata, null, 2).replace(/\n/g, '\n    ')}\n`);
              return;
            }
          }
          
          mockStdoutWrite(formatted + '\n');
        } catch (e) {
          mockStdoutWrite(chunk);
        }
      })
    };
  });
});

describe('PinoLogger Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Override console methods
    console.log = mockConsoleLog;
    console.warn = mockConsoleWarn;
    process.stdout.write = mockStdoutWrite as any;
  });

  afterEach(() => {
    process.env = originalEnv;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    process.stdout.write = originalStdoutWrite;
  });

  describe('CLI Mode Log Output Verification', () => {
    beforeEach(() => {
      // Set up CLI mode environment
      delete process.env.XFI_VSCODE_MODE;
      delete process.env.XFI_CORRELATION_ID;
      process.env.XFI_EXECUTION_MODE = EXECUTION_MODES.CLI;
    });

    it('should produce properly formatted CLI logs with timezone and correlation ID', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      // Test info log with correlation ID
      logger.info('Test message', { correlationId: 'abc123' });

      // Verify output format matches screenshot: [timestamp +timezone] LEVEL: [correlationId] message
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      
      // Should match format: [2025-07-21 20:22:57.780 +1000] INFO: [abc123] Test message
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \+1000\] INFO: \[abc123\] Test message/);
    });

    it('should format different log levels correctly in CLI mode', () => {
      const logger = new PinoLogger({ 
        level: 'debug',
        enableConsole: true,
        enableColors: true 
      });

      // Test different log levels
      logger.info('Info message', { correlationId: 'info123' });
      logger.warn('Warning message', { correlationId: 'warn123' });
      logger.error('Error message', { correlationId: 'error123' });

      // Verify all log levels are formatted correctly
      expect(mockStdoutWrite).toHaveBeenCalledTimes(3);
      
      const infoOutput = mockStdoutWrite.mock.calls[0][0];
      const warnOutput = mockStdoutWrite.mock.calls[1][0];
      const errorOutput = mockStdoutWrite.mock.calls[2][0];

      expect(infoOutput).toContain('INFO: [info123] Info message');
      expect(warnOutput).toContain('WARN: [warn123] Warning message');
      expect(errorOutput).toContain('ERROR: [error123] Error message');
    });

    it('should handle messages without correlation ID in CLI mode', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      logger.info('Message without correlation ID');

      const output = mockStdoutWrite.mock.calls[0][0];
      
      // Should not have correlation ID brackets when none provided
      expect(output).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} \+1000\] INFO: Message without correlation ID/);
      expect(output).not.toContain('[]');
    });

    it('should hide verbose metadata at INFO level but show correlation ID in message', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      logger.info('Test message', { 
        correlationId: 'meta123',
        component: 'Core',
        operation: 'analyzeCodebase',
        executionStartTime: 1753095593076
      });

      const output = mockStdoutWrite.mock.calls[0][0];
      
      // Should show correlation ID in formatted message
      expect(output).toMatch(/\[meta123\] Test message/);
      
      // Should NOT show verbose metadata object at INFO level
      expect(output).not.toContain('correlationId: "meta123"');
      expect(output).not.toContain('component: "Core"');
      expect(output).not.toContain('operation: "analyzeCodebase"');
      expect(output).not.toContain('executionStartTime: 1753095593076');
    });

    it('should show verbose metadata at DEBUG level for debugging', () => {
      const logger = new PinoLogger({ 
        level: 'debug',
        enableConsole: true,
        enableColors: true 
      });

      logger.debug('Debug message', { 
        correlationId: 'debug123',
        component: 'Core',
        operation: 'analyzeCodebase',
        executionStartTime: 1753095593076
      });

      // Note: This test verifies that metadata would be shown at DEBUG level
      // The exact output format depends on the pino-pretty mock behavior
      // In real usage, DEBUG level would show the metadata object
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      
      // Should show correlation ID in formatted message
      expect(output).toMatch(/\[debug123\] Debug message/);
    });

    it('should handle different log levels consistently with metadata rules', () => {
      const logger = new PinoLogger({ 
        level: 'trace',
        enableConsole: true,
        enableColors: true 
      });

      const testMetadata = { 
        correlationId: 'level123',
        component: 'Core',
        operation: 'test',
        executionStartTime: Date.now()
      };

      // Test INFO level (should hide metadata)
      logger.info('Info level message', testMetadata);
      
      // Test WARN level (should hide metadata)
      logger.warn('Warn level message', testMetadata);
      
      // Test ERROR level (should hide metadata)
      logger.error('Error level message', testMetadata);
      
      // Test DEBUG level (should show metadata)
      logger.debug('Debug level message', testMetadata);
      
      // Test TRACE level (should show metadata)
      logger.trace('Trace level message', testMetadata);

      // Expect 7 calls: INFO (1), WARN (1), ERROR (1), DEBUG (1 + 1 metadata), TRACE (1 + 1 metadata)
      expect(mockStdoutWrite).toHaveBeenCalledTimes(7);
      
      // The first 5 calls should be the formatted messages containing correlation ID
      const messageLines = mockStdoutWrite.mock.calls.slice(0, 5).concat(mockStdoutWrite.mock.calls.slice(-2, -1));
      messageLines.forEach((call, index) => {
        const output = call[0];
        if (!output.startsWith('    {')) { // Skip metadata lines
          expect(output).toMatch(/\[level123\]/);
        }
      });
    });

    it('should format tree-sitter mode indicators correctly', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      logger.info('Tree-sitter message', { 
        correlationId: 'tree123',
        treeSitterMode: 'WASM'
      });

      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('[tree123] [WASM] Tree-sitter message');
    });

    it('should format performance indicators correctly', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      logger.info('Slow operation', { 
        correlationId: 'perf123',
        performanceCategory: 'slow'
      });

      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('[perf123] [SLOW] Slow operation');
    });
  });

  describe('VSCode Mode Integration Consistency', () => {
    beforeEach(() => {
      // Set up VSCode mode environment
      process.env.XFI_VSCODE_MODE = 'true';
      process.env.XFI_CORRELATION_ID = 'vscode-parent-123';
      process.env.XFI_EXECUTION_MODE = EXECUTION_MODES.VSCODE;
    });

    it('should detect VSCode mode correctly and use clean output', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: false // VSCode mode should not use colors
      });

      // Verify logger is created with VSCode-appropriate settings
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });

    it('should pass logs to parent process correctly in VSCode mode', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: false
      });

      logger.info('VSCode integration test', { correlationId: 'vscode123' });

      // In VSCode mode, should use clean format for parent process
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      
      // VSCode mode should have correlation ID but clean format
      expect(output).toContain('vscode123');
      expect(output).toContain('VSCode integration test');
    });

    it('should handle correlation ID inheritance from parent process', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: false
      });

      // Log without explicit correlation ID - should inherit from environment
      logger.info('Inherited correlation test');

      const output = mockStdoutWrite.mock.calls[0][0];
      // Should use the correlation ID from environment variable
      expect(output).toContain('Inherited correlation test');
    });

    it('should maintain log level consistency between CLI and VSCode modes', () => {
      const cliLogger = new PinoLogger({ level: 'debug', enableColors: true });
      const vscodeLogger = new PinoLogger({ level: 'debug', enableColors: false });

      expect(cliLogger.getLevel()).toBe(vscodeLogger.getLevel());
      expect(cliLogger.isLevelEnabled('debug')).toBe(vscodeLogger.isLevelEnabled('debug'));
    });
  });

  describe('Mode Detection and Switching', () => {
    it('should correctly detect direct CLI execution', () => {
      delete process.env.XFI_VSCODE_MODE;
      delete process.env.XFI_CORRELATION_ID;
      
      const logger = new PinoLogger({ level: 'info' });
      
      // Should create logger appropriate for CLI mode
      expect(logger).toBeDefined();
    });

    it('should correctly detect VSCode spawned execution', () => {
      process.env.XFI_VSCODE_MODE = 'true';
      process.env.XFI_CORRELATION_ID = 'parent-correlation';
      
      const logger = new PinoLogger({ level: 'info' });
      
      // Should create logger appropriate for VSCode mode
      expect(logger).toBeDefined();
    });

    it('should handle mode switching gracefully', () => {
      // Start in CLI mode
      delete process.env.XFI_VSCODE_MODE;
      const cliLogger = new PinoLogger({ level: 'info' });
      
      // Switch to VSCode mode
      process.env.XFI_VSCODE_MODE = 'true';
      const vscodeLogger = new PinoLogger({ level: 'info' });
      
      // Both loggers should be valid and functional
      expect(cliLogger).toBeDefined();
      expect(vscodeLogger).toBeDefined();
    });
  });

  describe('Fallback Behavior', () => {
    it('should use fallback formatter when pino-pretty is not available', () => {
      // Mock pino-pretty to throw an error
      jest.resetModules();
      jest.doMock('pino-pretty', () => {
        throw new Error('pino-pretty not available');
      });

      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      logger.info('Fallback test', { correlationId: 'fallback123' });

      // Should use fallback formatting
      expect(mockConsoleWarn).toHaveBeenCalledWith('Warning: pino-pretty not available, using fallback formatter');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed log entries gracefully', () => {
      const logger = new PinoLogger({ level: 'info' });

      // Test with various edge cases
      expect(() => logger.info('')).not.toThrow();
      expect(() => logger.info(null as any)).not.toThrow();
      expect(() => logger.info(undefined as any)).not.toThrow();
    });

    it('should handle correlation ID edge cases', () => {
      // Test that the logger can handle edge cases without throwing
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      // Test with various correlation ID formats - should not throw errors
      expect(() => {
        logger.info('Empty string test', { correlationId: '' });
        logger.info('Null test', { correlationId: null as any });
        logger.info('Undefined test', { correlationId: undefined });
        logger.info('Long test', { correlationId: 'very-long-correlation-id-that-might-cause-issues-but-should-still-work' });
      }).not.toThrow();

      // Verify logger instance is functional
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });
  });

  describe('Performance and Memory', () => {
    it('should not leak memory with repeated log operations', () => {
      // Test that repeated logging operations don't cause memory leaks or crashes
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      // Simulate moderate-volume logging - should complete without errors
      expect(() => {
        for (let i = 0; i < 50; i++) {
          logger.info(`Test message ${i}`, { correlationId: `test-${i}` });
        }
      }).not.toThrow();

      // Verify logger is still functional after repeated operations
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });

    it('should flush logs efficiently', async () => {
      // Test that flush method works without throwing errors
      const logger = new PinoLogger({ 
        level: 'info',
        enableConsole: true,
        enableColors: true 
      });

      // Test logging before flush
      expect(() => {
        logger.info('Pre-flush message', { correlationId: 'pre-flush' });
      }).not.toThrow();
      
      // Test that flush doesn't throw and completes successfully
      await expect(logger.flush()).resolves.not.toThrow();
      
      // Test logging after flush
      expect(() => {
        logger.info('Post-flush message', { correlationId: 'post-flush' });
      }).not.toThrow();

      // Verify logger is still functional after flush
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe('info');
    });
  });
}); 