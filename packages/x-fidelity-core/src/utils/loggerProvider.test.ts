import { LoggerProvider, PrefixingLogger } from './loggerProvider';
import { DefaultLogger } from './defaultLogger';
import { ILogger } from '@x-fidelity/types';

describe('LoggerProvider', () => {
  beforeEach(() => {
    // Clear any injected logger before each test
    LoggerProvider.clearInjectedLogger();
  });

  afterEach(() => {
    // Clean up after each test
    LoggerProvider.clearInjectedLogger();
  });

  it('should return PrefixingLogger wrapping default logger when no logger is injected', () => {
    const logger = LoggerProvider.getLogger();
    expect(logger).toBeInstanceOf(PrefixingLogger);
    
    // Check that the base logger is the default logger
    const baseLogger = LoggerProvider.getBaseLogger();
    expect(baseLogger).toBeInstanceOf(DefaultLogger);
    expect(LoggerProvider.hasInjectedLogger()).toBe(false);
  });

  it('should return PrefixingLogger wrapping injected logger when one is set', () => {
    const mockLogger: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
      isLevelEnabled: jest.fn()
    };

    LoggerProvider.setLogger(mockLogger);
    
    const logger = LoggerProvider.getLogger();
    expect(logger).toBeInstanceOf(PrefixingLogger);
    
    // Check that the base logger is the injected logger
    const baseLogger = LoggerProvider.getBaseLogger();
    expect(baseLogger).toBe(mockLogger);
    expect(LoggerProvider.hasInjectedLogger()).toBe(true);
  });

  it('should create child logger with PrefixingLogger wrapper', () => {
    const mockChildLogger: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
      isLevelEnabled: jest.fn()
    };

    const mockLogger: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn().mockReturnValue(mockChildLogger),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
      isLevelEnabled: jest.fn()
    };

    LoggerProvider.setLogger(mockLogger);
    
    const bindings = { userId: '123' };
    const childLogger = LoggerProvider.createChildLogger(bindings);
    
    // Child logger should also be wrapped in PrefixingLogger
    expect(childLogger).toBeInstanceOf(PrefixingLogger);
    
    // The base logger's child method should have been called
    expect(mockLogger.child).toHaveBeenCalled();
  });

  it('should clear injected logger and return to wrapped default logger', () => {
    const mockLogger: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
      isLevelEnabled: jest.fn()
    };

    LoggerProvider.setLogger(mockLogger);
    expect(LoggerProvider.hasInjectedLogger()).toBe(true);
    
    LoggerProvider.clearInjectedLogger();
    expect(LoggerProvider.hasInjectedLogger()).toBe(false);
    
    const logger = LoggerProvider.getLogger();
    expect(logger).toBeInstanceOf(PrefixingLogger);
    
    // Base logger should be default logger
    const baseLogger = LoggerProvider.getBaseLogger();
    expect(baseLogger).toBeInstanceOf(DefaultLogger);
  });

  it('should allow disabling auto-prefixing', () => {
    const mockLogger: ILogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      child: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn(),
      isLevelEnabled: jest.fn()
    };

    LoggerProvider.setLogger(mockLogger);
    
    // Disable auto-prefixing
    LoggerProvider.setAutoPrefixing(false);
    
    const logger = LoggerProvider.getLogger();
    expect(logger).toBe(mockLogger);
    
    // Re-enable auto-prefixing
    LoggerProvider.setAutoPrefixing(true);
    
    const wrappedLogger = LoggerProvider.getLogger();
    expect(wrappedLogger).toBeInstanceOf(PrefixingLogger);
  });
}); 