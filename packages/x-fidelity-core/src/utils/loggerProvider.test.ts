import { LoggerProvider } from './loggerProvider';
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

  it('should return default logger when no logger is injected', () => {
    const logger = LoggerProvider.getLogger();
    expect(logger).toBeInstanceOf(DefaultLogger);
    expect(LoggerProvider.hasInjectedLogger()).toBe(false);
  });

  it('should return injected logger when one is set', () => {
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
    expect(logger).toBe(mockLogger);
    expect(LoggerProvider.hasInjectedLogger()).toBe(true);
  });

  it('should create child logger from current logger', () => {
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
    
    expect(mockLogger.child).toHaveBeenCalledWith(bindings);
    expect(childLogger).toBe(mockChildLogger);
  });

  it('should clear injected logger', () => {
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
    expect(logger).toBeInstanceOf(DefaultLogger);
  });
}); 