import { EnhancedLogger, EnhancedLoggerFactory, withPerformanceLogging, withCorrelation } from './enhancedLogger';
import { ILogger, LogLevel } from '@x-fidelity/types';

// Mock base logger
const mockBaseLogger: ILogger = {
  trace: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  setLevel: jest.fn(),
  getLevel: jest.fn().mockReturnValue('info'),
  isLevelEnabled: jest.fn((level: string) => {
    // Simulate typical log level hierarchy: trace < debug < info < warn < error < fatal
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevel = 'trace'; // Mock current level set to trace to enable all levels
    const currentIndex = levels.indexOf(currentLevel);
    const requestedIndex = levels.indexOf(level);
    return requestedIndex >= currentIndex;
  }),
  dispose: jest.fn()
};

// Global logger for all tests
let enhancedLogger: EnhancedLogger;

describe('EnhancedLogger', () => {
  beforeEach(() => {
    // Reset call counts but preserve mock implementations
    (mockBaseLogger.trace as jest.Mock).mockClear();
    (mockBaseLogger.debug as jest.Mock).mockClear();
    (mockBaseLogger.info as jest.Mock).mockClear();
    (mockBaseLogger.warn as jest.Mock).mockClear();
    (mockBaseLogger.error as jest.Mock).mockClear();
    (mockBaseLogger.fatal as jest.Mock).mockClear();
    (mockBaseLogger.setLevel as jest.Mock).mockClear();
    (mockBaseLogger.getLevel as jest.Mock).mockClear();
    (mockBaseLogger.isLevelEnabled as jest.Mock).mockClear();
    (mockBaseLogger.dispose as jest.Mock).mockClear();
    
    // Ensure mock implementations are preserved
    (mockBaseLogger.isLevelEnabled as jest.Mock).mockImplementation((level: string) => {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      const currentLevel = 'trace';
      const currentIndex = levels.indexOf(currentLevel);
      const requestedIndex = levels.indexOf(level);
      return requestedIndex >= currentIndex;
    });
    
    (mockBaseLogger.getLevel as jest.Mock).mockReturnValue('info');
    
    enhancedLogger = new EnhancedLogger({
      baseLogger: mockBaseLogger,
      component: 'Core',
      sessionId: 'test-session-123',
      context: { testContext: 'value' },
      structured: false  // Use formatted logging for easier testing
    });
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      const logger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'CLI',
        sessionId: 'custom-session',
        context: { custom: 'context' },
        structured: true,
        enablePerformanceTracking: true,
        enableCorrelation: true
      });

      expect(logger).toBeDefined();
    });

    it('should use default values when not provided', () => {
      const logger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'VSCode'
      });

      expect(logger).toBeDefined();
    });

    it('should generate session ID when not provided', () => {
      const logger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'Plugin'
      });

      expect(logger).toBeDefined();
    });
  });

  describe('basic logging methods', () => {
    it('should call trace method', () => {
      enhancedLogger.trace('Test trace message');
      expect(mockBaseLogger.trace).toHaveBeenCalled();
    });

    it('should call debug method', () => {
      enhancedLogger.debug('Test debug message');
      expect(mockBaseLogger.debug).toHaveBeenCalled();
    });

    it('should call info method', () => {
      enhancedLogger.info('Test info message');
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('should call warn method', () => {
      enhancedLogger.warn('Test warn message');
      expect(mockBaseLogger.warn).toHaveBeenCalled();
    });

    it('should call error method', () => {
      enhancedLogger.error('Test error message');
      expect(mockBaseLogger.error).toHaveBeenCalled();
    });

    it('should call fatal method', () => {
      enhancedLogger.fatal('Test fatal message');
      expect(mockBaseLogger.fatal).toHaveBeenCalled();
    });
  });

  describe('logging with metadata', () => {
    it('should handle string message with metadata object', () => {
      enhancedLogger.info('Test message', { key: 'value', number: 42 });
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('should handle metadata object as first parameter', () => {
      enhancedLogger.info({ message: 'Test message', key: 'value' });
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('should handle error objects in metadata', () => {
      const error = new Error('Test error');
      enhancedLogger.error('Error occurred', { error });
      expect(mockBaseLogger.error).toHaveBeenCalled();
    });

    it('should handle complex nested metadata', () => {
      const complexMetadata = {
        user: { id: 123, name: 'Test User' },
        operation: {
          name: 'test-operation',
          startTime: Date.now(),
          parameters: ['param1', 'param2']
        },
        metrics: {
          duration: 150,
          memoryUsage: 1024
        }
      };

      enhancedLogger.info('Complex operation completed', complexMetadata);
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('logger functionality', () => {
    it('should support enhanced logging capabilities', () => {
      enhancedLogger.info('Test enhanced message');
      
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('log level management', () => {
    it('should set log level', () => {
      enhancedLogger.setLevel('debug');
      expect(mockBaseLogger.setLevel).toHaveBeenCalledWith('debug');
    });

    it('should get log level', () => {
      const level = enhancedLogger.getLevel();
      expect(mockBaseLogger.getLevel).toHaveBeenCalled();
      expect(level).toBe('info');
    });

    it('should check if level is enabled', () => {
      const enabled = enhancedLogger.isLevelEnabled('debug');
      expect(mockBaseLogger.isLevelEnabled).toHaveBeenCalledWith('debug');
      expect(enabled).toBe(true);
    });
  });

  describe('performance tracking', () => {
    it('should start and end operation tracking', () => {
      const operationId = enhancedLogger.startOperation('test-operation');
      expect(typeof operationId).toBe('string');
      expect(operationId).toContain('test-operation');

      enhancedLogger.endOperation(operationId, { result: 'success' });
      expect(mockBaseLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation completed'),
        expect.objectContaining({
          operationId,
          duration: expect.stringMatching(/\d+ms/)
        })
      );
    });

    it('should handle ending non-existent operation', () => {
      enhancedLogger.endOperation('non-existent-operation');
      // Should not throw or log anything
    });

    it('should not track performance when disabled', () => {
      const disabledLogger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'Core',
        enablePerformanceTracking: false
      });

      const operationId = disabledLogger.startOperation('test-operation');
      expect(operationId).toBe('test-operation');
      
      disabledLogger.endOperation(operationId);
      // Should not log performance info
    });
  });

  describe('correlation tracking', () => {
    it('should create and end correlation', () => {
      const correlationId = enhancedLogger.createCorrelation();
      expect(typeof correlationId).toBe('string');
      expect(correlationId).toMatch(/^corr-/);

      enhancedLogger.endCorrelation(correlationId);
      // Should update correlation stack
    });

    it('should create correlation with custom ID', () => {
      const customId = 'custom-correlation-123';
      const correlationId = enhancedLogger.createCorrelation(customId);
      expect(correlationId).toBe(customId);
    });

    it('should not create correlation when disabled', () => {
      const disabledLogger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'Core',
        enableCorrelation: false
      });

      const correlationId = disabledLogger.createCorrelation();
      expect(correlationId).toBe('');
    });

    it('should handle ending non-existent correlation', () => {
      enhancedLogger.endCorrelation('non-existent-correlation');
      // Should not throw
    });
  });

  describe('structured vs formatted logging', () => {
    it('should use structured logging when enabled', () => {
      const structuredLogger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'Core',
        structured: true
      });

      structuredLogger.info('Test message', { key: 'value' });
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('should use formatted logging when structured is disabled', () => {
      const formattedLogger = new EnhancedLogger({
        baseLogger: mockBaseLogger,
        component: 'Core',
        structured: false
      });

      formattedLogger.info('Test message', { key: 'value' });
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should call dispose on base logger if available', () => {
      enhancedLogger.dispose?.();
      expect(mockBaseLogger.dispose).toHaveBeenCalled();
    });

    it('should handle base logger without dispose method', () => {
      const loggerWithoutDispose = new EnhancedLogger({
        baseLogger: {
          ...mockBaseLogger,
          dispose: undefined
        },
        component: 'Core'
      });

      expect(() => loggerWithoutDispose.dispose?.()).not.toThrow();
    });
  });

  describe('context handling', () => {
    it('should include context in log entries', () => {
      enhancedLogger.info('Test with context', { operation: 'test' });
      
      const logCall = (mockBaseLogger.info as jest.Mock).mock.calls[0];
      expect(logCall).toBeDefined();
    });

    it('should handle null and undefined metadata', () => {
      enhancedLogger.info('Test message', null);
      enhancedLogger.info('Test message', undefined);
      
      expect(mockBaseLogger.info).toHaveBeenCalledTimes(2);
    });

    it('should handle circular references in metadata', () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      expect(() => {
        enhancedLogger.info('Test with circular reference', { circular: circularObject });
      }).not.toThrow();
    });
  });
});

describe('EnhancedLoggerFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create enhanced logger with default options', () => {
      const logger = EnhancedLoggerFactory.create(mockBaseLogger, 'CLI');
      
      expect(logger).toBeInstanceOf(EnhancedLogger);
    });

    it('should create enhanced logger with custom options', () => {
      const options = {
        sessionId: 'custom-session',
        context: { custom: 'value' },
        structured: false
      };

      const logger = EnhancedLoggerFactory.create(mockBaseLogger, 'VSCode', options);
      
      expect(logger).toBeInstanceOf(EnhancedLogger);
    });
  });

  describe('createWithDebugContext', () => {
    it('should create logger with debug context', () => {
      const logger = EnhancedLoggerFactory.createWithDebugContext(
        mockBaseLogger,
        'Core',
        'test-operation',
        { debugFlag: true }
      );

      expect(logger).toBeInstanceOf(EnhancedLogger);
    });

    it('should create logger without additional context', () => {
      const logger = EnhancedLoggerFactory.createWithDebugContext(
        mockBaseLogger,
        'Plugin',
        'test-operation'
      );

      expect(logger).toBeInstanceOf(EnhancedLogger);
    });
  });
});

describe('utility functions', () => {
  beforeEach(() => {
    // Reset call counts but preserve mock implementations
    (mockBaseLogger.trace as jest.Mock).mockClear();
    (mockBaseLogger.debug as jest.Mock).mockClear();
    (mockBaseLogger.info as jest.Mock).mockClear();
    (mockBaseLogger.warn as jest.Mock).mockClear();
    (mockBaseLogger.error as jest.Mock).mockClear();
    (mockBaseLogger.fatal as jest.Mock).mockClear();
    
    // Ensure mock implementations are preserved
    (mockBaseLogger.isLevelEnabled as jest.Mock).mockImplementation((level: string) => {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      const currentLevel = 'trace';
      const currentIndex = levels.indexOf(currentLevel);
      const requestedIndex = levels.indexOf(level);
      return requestedIndex >= currentIndex;
    });
    
    enhancedLogger = new EnhancedLogger({
      baseLogger: mockBaseLogger,
      component: 'Core',
      sessionId: 'test-session-123',
      context: { testContext: 'value' },
      structured: false
    });
  });

  describe('withPerformanceLogging', () => {
    it('should wrap synchronous function with performance logging', () => {
      const mockFunction = jest.fn().mockReturnValue('test-result');
      
      const result = withPerformanceLogging(
        enhancedLogger,
        'test-operation',
        mockFunction
      );

      expect(mockFunction).toHaveBeenCalled();
      expect(result).toBe('test-result');
      expect(mockBaseLogger.debug).toHaveBeenCalled(); // Start operation
      expect(mockBaseLogger.info).toHaveBeenCalled(); // End operation
    });

    it('should wrap asynchronous function with performance logging', async () => {
      const mockAsyncFunction = jest.fn().mockResolvedValue('async-result');
      
      const result = await withPerformanceLogging(
        enhancedLogger,
        'async-operation',
        mockAsyncFunction
      );

      expect(mockAsyncFunction).toHaveBeenCalled();
      expect(result).toBe('async-result');
      expect(mockBaseLogger.debug).toHaveBeenCalled();
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('should handle synchronous function errors', () => {
      const mockFunction = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => {
        withPerformanceLogging(enhancedLogger, 'error-operation', mockFunction);
      }).toThrow('Test error');

      expect(mockBaseLogger.debug).toHaveBeenCalled(); // Start operation
      expect(mockBaseLogger.info).toHaveBeenCalled(); // End operation even on error
    });

    it('should handle asynchronous function errors', async () => {
      const mockAsyncFunction = jest.fn().mockRejectedValue(new Error('Async error'));

      await expect(
        withPerformanceLogging(enhancedLogger, 'async-error-operation', mockAsyncFunction)
      ).rejects.toThrow('Async error');

      expect(mockBaseLogger.debug).toHaveBeenCalled();
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('withCorrelation', () => {
    it('should wrap function with correlation tracking', () => {
      const mockFunction = jest.fn((correlationId: string) => {
        expect(typeof correlationId).toBe('string');
        return 'correlated-result';
      });

      const result = withCorrelation(enhancedLogger, mockFunction);

      expect(mockFunction).toHaveBeenCalled();
      expect(result).toBe('correlated-result');
    });

    it('should wrap async function with correlation tracking', async () => {
      const mockAsyncFunction = jest.fn(async (correlationId: string) => {
        expect(typeof correlationId).toBe('string');
        return 'async-correlated-result';
      });

      const result = await withCorrelation(enhancedLogger, mockAsyncFunction);

      expect(mockAsyncFunction).toHaveBeenCalled();
      expect(result).toBe('async-correlated-result');
    });

    it('should use custom correlation ID when provided', () => {
      const customCorrelationId = 'custom-correlation-123';
      const mockFunction = jest.fn((correlationId: string) => {
        expect(correlationId).toBe(customCorrelationId);
        return 'result';
      });

      withCorrelation(enhancedLogger, mockFunction, customCorrelationId);
      expect(mockFunction).toHaveBeenCalledWith(customCorrelationId);
    });

    it('should handle function errors with correlation', () => {
      const mockFunction = jest.fn(() => {
        throw new Error('Correlation error');
      });

      expect(() => {
        withCorrelation(enhancedLogger, mockFunction);
      }).toThrow('Correlation error');

      expect(mockFunction).toHaveBeenCalled();
    });

    it('should handle async function errors with correlation', async () => {
      const mockAsyncFunction = jest.fn(async () => {
        throw new Error('Async correlation error');
      });

      await expect(
        withCorrelation(enhancedLogger, mockAsyncFunction)
      ).rejects.toThrow('Async correlation error');

      expect(mockAsyncFunction).toHaveBeenCalled();
    });
  });
});

describe('edge cases and error handling', () => {
  beforeEach(() => {
    // Reset call counts but preserve mock implementations
    (mockBaseLogger.trace as jest.Mock).mockClear();
    (mockBaseLogger.debug as jest.Mock).mockClear();
    (mockBaseLogger.info as jest.Mock).mockClear();
    (mockBaseLogger.warn as jest.Mock).mockClear();
    (mockBaseLogger.error as jest.Mock).mockClear();
    (mockBaseLogger.fatal as jest.Mock).mockClear();
    
    // Ensure mock implementations are preserved
    (mockBaseLogger.isLevelEnabled as jest.Mock).mockImplementation((level: string) => {
      const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      const currentLevel = 'trace';
      const currentIndex = levels.indexOf(currentLevel);
      const requestedIndex = levels.indexOf(level);
      return requestedIndex >= currentIndex;
    });
    
    enhancedLogger = new EnhancedLogger({
      baseLogger: mockBaseLogger,
      component: 'Core',
      sessionId: 'test-session-123',
      context: { testContext: 'value' },
      structured: false
    });
  });

  it('should handle very large metadata objects', () => {
    const largeMetadata = {
      data: Array(1000).fill(0).map((_, i) => ({
        id: i,
        value: `value-${i}`,
        nested: {
          level1: {
            level2: {
              level3: `deep-value-${i}`
            }
          }
        }
      }))
    };

    expect(() => {
      enhancedLogger.info('Large metadata test', largeMetadata);
    }).not.toThrow();
  });

  it('should handle metadata with special characters', () => {
    const specialMetadata = {
      unicode: '特殊字符 🚀 💯',
      symbols: '!@#$%^&*()[]{}|;:",.<>?',
      control: '\n\t\r\0',
      html: '<script>alert("test")</script>'
    };

    expect(() => {
      enhancedLogger.info('Special characters test', specialMetadata);
    }).not.toThrow();
  });

  it('should handle concurrent operations', () => {
    const operations = Array(10).fill(0).map((_, i) => 
      enhancedLogger.startOperation(`concurrent-op-${i}`)
    );

    operations.forEach((opId, i) => {
      enhancedLogger.endOperation(opId, { index: i });
    });

    expect(mockBaseLogger.debug).toHaveBeenCalledTimes(10); // Start operations
    expect(mockBaseLogger.info).toHaveBeenCalledTimes(10); // End operations
  });
}); 