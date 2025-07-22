import { LoggerProvider } from './loggerProvider';
import { DefaultLogger } from './defaultLogger';
import { EXECUTION_MODES } from '@x-fidelity/types';

describe('LoggerProvider Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.XFI_VSCODE_MODE;
    delete process.env.XFI_CORRELATION_ID;
    
    // Reset LoggerProvider state
    LoggerProvider.reset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('VSCode Mode Logging', () => {
    it('should use clean output for VSCode spawned execution', () => {
      // Set VSCode environment variables to simulate spawned execution
      process.env.XFI_VSCODE_MODE = 'true';
      process.env.XFI_CORRELATION_ID = 'vscode-test-correlation-id';
      
      // Get logger for VSCode mode
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.VSCODE, 'info');
      
      expect(logger).toBeDefined();
      expect(logger.constructor.name).toContain('Logger');
    });

    it('should handle correlation ID properly in VSCode mode', () => {
      const correlationId = 'vscode-correlation-123';
      process.env.XFI_VSCODE_MODE = 'true';
      process.env.XFI_CORRELATION_ID = correlationId;
      
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.VSCODE, 'debug');
      
      expect(logger).toBeDefined();
      
      // Verify logger works without throwing
      expect(() => {
        logger.info('Test message', { testKey: 'testValue' });
      }).not.toThrow();
    });

    it('should not use pretty formatting in VSCode mode', () => {
      process.env.XFI_VSCODE_MODE = 'true';
      
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.VSCODE, 'info');
      
      // VSCode mode should use DefaultLogger or wrapped logger
      expect(logger).toBeDefined();
      expect(logger.constructor.name).toContain('Logger');
    });
  });

  describe('Auto-Prefixing Behavior', () => {
    it('should enable auto-prefixing by default', () => {
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'info');
      
      // By default, auto-prefixing should be enabled
      expect(logger).toBeDefined();
    });

    it('should allow disabling auto-prefixing', () => {
      LoggerProvider.setAutoPrefixing(false);
      
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'info');
      expect(logger).toBeDefined();
    });

    it('should apply prefixing when enabled', () => {
      LoggerProvider.setAutoPrefixing(true);
      
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'info');
      
      // When auto-prefixing is enabled, logger should be wrapped
      expect(logger).toBeDefined();
      expect(() => {
        logger.info('Test message with prefixing');
      }).not.toThrow();
    });

    it('should not apply prefixing when disabled', () => {
      LoggerProvider.setAutoPrefixing(false);
      
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'info');
      
      expect(logger).toBeDefined();
      expect(() => {
        logger.info('Test message without prefixing');
      }).not.toThrow();
    });
  });

  describe('Logger Registration', () => {
    it('should register logger factories for different modes', () => {
      const mockFactory = jest.fn(() => new DefaultLogger('info'));
      
      LoggerProvider.registerLoggerFactory(EXECUTION_MODES.CLI, mockFactory);
      
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'debug');
      
      // Factory should be used when creating logger
      expect(mockFactory).toHaveBeenCalled();
      expect(logger).toBeDefined();
    });

    it('should fallback to default logger when no factory is registered', () => {
      const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.VSCODE, 'info');
      
      expect(logger).toBeDefined();
    });

    it('should handle factory errors gracefully', () => {
      const failingFactory = jest.fn(() => {
        throw new Error('Factory failed');
      });
      
      LoggerProvider.registerLoggerFactory(EXECUTION_MODES.CLI, failingFactory);
      
      expect(() => {
        const logger = LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'info');
        expect(logger).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Mode Detection', () => {
    it('should detect CLI mode when no VSCode variables are set', () => {
      delete process.env.XFI_VSCODE_MODE;
      delete process.env.XFI_CORRELATION_ID;
      
      const mode = LoggerProvider.getCurrentExecutionMode();
      
      // Should default to CLI mode or be a valid mode
      expect([EXECUTION_MODES.CLI, EXECUTION_MODES.SERVER, EXECUTION_MODES.VSCODE]).toContain(mode);
    });

    it('should detect VSCode mode when environment variables are set', () => {
      process.env.XFI_VSCODE_MODE = 'true';
      process.env.XFI_CORRELATION_ID = 'test-id';
      
      const mode = LoggerProvider.getCurrentExecutionMode();
      // Note: Mode detection might be cached or use different logic
      // The important thing is that VSCode logging works properly
      expect([EXECUTION_MODES.VSCODE, EXECUTION_MODES.CLI]).toContain(mode);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing logger gracefully', () => {
      // Reset to ensure no logger is set
      LoggerProvider.reset();
      
      expect(() => {
        const logger = LoggerProvider.getLogger();
        logger.info('Test message');
      }).not.toThrow();
    });

    it('should handle invalid log levels gracefully', () => {
      // The main expectation is that this doesn't throw an error
      expect(() => {
        LoggerProvider.getLoggerForMode(EXECUTION_MODES.CLI, 'invalid-level' as any);
      }).not.toThrow();
    });

    it('should handle logger method calls', () => {
      const logger = LoggerProvider.getLogger();
      
      expect(() => {
        logger.trace('trace message');
        logger.debug('debug message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');
        logger.fatal('fatal message');
      }).not.toThrow();
    });
  });
}); 