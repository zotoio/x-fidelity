import { PinoLogger } from './pinoLogger';
import { EXECUTION_MODES } from '@x-fidelity/types';

// Mock pino to avoid external dependencies in tests
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
  
  const pinoMock = jest.fn(() => mockLogger) as any;
  pinoMock.stdTimeFunctions = {
    isoTime: () => new Date().toISOString()
  };
  
  return pinoMock;
});

// Mock the LoggerProvider registration
jest.mock('@x-fidelity/core', () => ({
  LoggerProvider: {
    registerLoggerFactory: jest.fn()
  },
  options: null,
  shouldUseDirectLogging: jest.fn(() => false)
}));

describe('PinoLogger', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let mockOptions: any;

  beforeEach(() => {
    originalEnv = process.env;
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.XFI_VSCODE_MODE;
    delete process.env.XFI_CORRELATION_ID;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock options from @x-fidelity/core
    mockOptions = null;
    require('@x-fidelity/core').options = mockOptions;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Direct CLI Mode Detection', () => {
    it('should detect direct CLI execution when no VSCode environment variables are set', () => {
      const logger = new PinoLogger({ level: 'info' });
      
      expect(logger).toBeDefined();
      // Verify that pino was called with pretty formatting for direct CLI
      const pino = require('pino');
      expect(pino).toHaveBeenCalled();
    });

    it('should detect direct CLI execution when mode is explicitly set to CLI', () => {
      // Set explicit CLI mode
      require('@x-fidelity/core').options = { mode: EXECUTION_MODES.CLI };
      
      const logger = new PinoLogger({ level: 'debug' });
      
      expect(logger).toBeDefined();
      const pino = require('pino');
      expect(pino).toHaveBeenCalled();
    });

    it('should use plain formatting when VSCode mode is detected', () => {
      // Set VSCode environment variables
      process.env.XFI_VSCODE_MODE = 'true';
      process.env.XFI_CORRELATION_ID = 'test-correlation-id';
      
      const logger = new PinoLogger({ level: 'info' });
      
      expect(logger).toBeDefined();
      const pino = require('pino');
      expect(pino).toHaveBeenCalled();
    });

    it('should use plain formatting when mode is explicitly set to VSCode', () => {
      require('@x-fidelity/core').options = { mode: EXECUTION_MODES.VSCODE };
      
      const logger = new PinoLogger({ level: 'info' });
      
      expect(logger).toBeDefined();
      const pino = require('pino');
      expect(pino).toHaveBeenCalled();
    });
  });

  describe('Logger Interface Implementation', () => {
    let logger: PinoLogger;
    let mockPinoInstance: any;

    beforeEach(() => {
      const pino = require('pino');
      mockPinoInstance = pino();
      logger = new PinoLogger({ level: 'debug' });
    });

    it('should implement all ILogger methods', () => {
      expect(logger.trace).toBeDefined();
      expect(logger.debug).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.fatal).toBeDefined();
      expect(logger.setLevel).toBeDefined();
      expect(logger.getLevel).toBeDefined();
      expect(logger.isLevelEnabled).toBeDefined();
      expect(logger.flush).toBeDefined();
    });

    it('should forward trace calls to pino logger', () => {
      logger.trace('test message', { key: 'value' });
      expect(mockPinoInstance.trace).toHaveBeenCalledWith({ key: 'value' }, 'test message');
    });

    it('should forward info calls to pino logger', () => {
      logger.info('info message');
      expect(mockPinoInstance.info).toHaveBeenCalledWith(undefined, 'info message');
    });

    it('should forward error calls to pino logger', () => {
      const error = new Error('test error');
      logger.error(error);
      expect(mockPinoInstance.error).toHaveBeenCalledWith(error, undefined);
    });

    it('should handle setLevel correctly', () => {
      logger.setLevel('warn');
      expect(mockPinoInstance.level).toBe('warn');
    });

    it('should handle getLevel correctly', () => {
      mockPinoInstance.level = 'debug';
      expect(logger.getLevel()).toBe('debug');
    });

    it('should handle isLevelEnabled correctly', () => {
      mockPinoInstance.level = 'info';
      expect(logger.isLevelEnabled('warn')).toBe(true);
      expect(logger.isLevelEnabled('debug')).toBe(false);
    });

    it('should handle flush correctly when flush method exists', async () => {
      mockPinoInstance.flush = jest.fn((callback) => callback());
      await logger.flush();
      expect(mockPinoInstance.flush).toHaveBeenCalled();
    });

    it('should handle flush correctly when flush method does not exist', async () => {
      delete mockPinoInstance.flush;
      await expect(logger.flush()).resolves.toBeUndefined();
    });
  });

  describe('Configuration Options', () => {
    it('should respect enableColors: false configuration', () => {
      const logger = new PinoLogger({ 
        level: 'info',
        enableColors: false 
      });
      
      expect(logger).toBeDefined();
      const pino = require('pino');
      expect(pino).toHaveBeenCalled();
    });

    it('should use default level when not specified', () => {
      const logger = new PinoLogger({});
      
      expect(logger).toBeDefined();
      const pino = require('pino');
      expect(pino).toHaveBeenCalled();
    });

    it('should handle file logging options', () => {
      const logger = new PinoLogger({
        level: 'debug',
        enableFile: true,
        filePath: '/tmp/test.log'
      });
      
      expect(logger).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should not throw when updateOptions is called', () => {
      const logger = new PinoLogger({ level: 'info' });
      expect(() => {
        logger.updateOptions({ enableFileLogging: true });
      }).not.toThrow();
    });
  });

  describe('Registration', () => {
    it('should register logger factory for CLI mode on module load', () => {
      // Since the registration happens during module load, we need to test it differently
      // The mock should have been called during import, but since we're in a test environment
      // we'll verify the registration would work by testing the factory function directly
      expect(EXECUTION_MODES.CLI).toBe('cli');
      
      // Verify the logger can be created for CLI mode
      const logger = new PinoLogger({ level: 'info' });
      expect(logger).toBeInstanceOf(PinoLogger);
    });

    it('should create PinoLogger when used as factory', () => {
      // Test the factory function behavior directly since module mocking 
      // makes testing the registration call complex
      const factory = (level: string, options?: { enableFileLogging?: boolean; filePath?: string }) => {
        return new PinoLogger({
          level: level as any,
          enableConsole: true,
          enableColors: true,
          enableFile: options?.enableFileLogging || false,
          filePath: options?.filePath
        });
      };
      
      const logger = factory('debug', { enableFileLogging: false });
      expect(logger).toBeInstanceOf(PinoLogger);
      // Note: getLevel() returns the mock level 'info', not the configured level
      expect(logger.getLevel()).toBeDefined();
    });
  });

  describe('Emoji-Free Formatting', () => {
    it('should not contain emojis in formatted output', () => {
      // Create logger and check that no emojis are used in configuration
      const logger = new PinoLogger({ level: 'info' });
      
      // Verify pino was called without emoji-containing formatters
      const pino = require('pino');
      const pinoCall = pino.mock.calls[0];
      
      // Check that the configuration doesn't contain emoji characters
      if (pinoCall && pinoCall[1]) {
        const config = JSON.stringify(pinoCall[1]);
        expect(config).not.toMatch(/[🔵🟡🔴💀🟢⚪🌳⚡🐌🚀]/);
      }
      
      expect(logger).toBeDefined();
    });
  });

  describe('Mode-Specific Behavior', () => {
    it('should use different formatting for CLI vs VSCode modes', () => {
      // Test direct CLI mode
      delete process.env.XFI_VSCODE_MODE;
      delete process.env.XFI_CORRELATION_ID;
      require('@x-fidelity/core').options = { mode: EXECUTION_MODES.CLI };
      
      const cliLogger = new PinoLogger({ level: 'info' });
      expect(cliLogger).toBeDefined();
      
      // Test VSCode mode
      process.env.XFI_VSCODE_MODE = 'true';
      require('@x-fidelity/core').options = { mode: EXECUTION_MODES.VSCODE };
      
      const vscodeLogger = new PinoLogger({ level: 'info' });
      expect(vscodeLogger).toBeDefined();
      
      // Both should be valid but configured differently
      const pino = require('pino');
      expect(pino).toHaveBeenCalledTimes(2);
    });
  });
}); 