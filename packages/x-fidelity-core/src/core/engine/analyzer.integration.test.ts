import { LoggerProvider, PrefixingLogger } from '../../utils/loggerProvider';
import { ILogger } from '@x-fidelity/types';

describe('Logger Injection Integration Test', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    // Create mock logger
    mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      setLevel: jest.fn(),
      getLevel: jest.fn().mockReturnValue('info'),
      isLevelEnabled: jest.fn().mockReturnValue(true)
    };

    // Clear any existing injected logger
    LoggerProvider.clearInjectedLogger();
  });

  afterEach(() => {
    // Clear injected logger
    LoggerProvider.clearInjectedLogger();
  });

  it('should inject logger into LoggerProvider', () => {
    // Verify no logger is injected initially
    expect(LoggerProvider.hasInjectedLogger()).toBe(false);

    // Inject the logger
    LoggerProvider.setLogger(mockLogger);

    // Verify logger was injected
    expect(LoggerProvider.hasInjectedLogger()).toBe(true);
    
    // getLogger() now returns PrefixingLogger wrapper, check base logger
    const logger = LoggerProvider.getLogger();
    expect(logger).toBeInstanceOf(PrefixingLogger);
    expect(LoggerProvider.getBaseLogger()).toBe(mockLogger);
  });

  it('should use injected logger in core logger proxy', async () => {
    // Import the core logger after setting up the provider
    const { logger } = await import('../../utils/logger');
    
    // Inject the logger
    LoggerProvider.setLogger(mockLogger);

    // Use the core logger - it should delegate to the injected logger
    logger.info('Test message');
    logger.warn('Test warning', { data: 'test' });
    logger.error('Test error');

    // Verify the injected logger was called
    expect(mockLogger.info).toHaveBeenCalledWith('Test message', undefined);
    expect(mockLogger.warn).toHaveBeenCalledWith('Test warning', { data: 'test' });
    expect(mockLogger.error).toHaveBeenCalledWith('Test error', undefined);
  });

  it('should use injected logger consistently', () => {
    // Inject the logger
    LoggerProvider.setLogger(mockLogger);

    // Verify logger was injected and is used consistently
    expect(LoggerProvider.hasInjectedLogger()).toBe(true);
    expect(LoggerProvider.getBaseLogger()).toBe(mockLogger);
  });

  it('should fall back to default logger when no logger is injected', async () => {
    // Import the core logger
    const { logger } = await import('../../utils/logger');
    
    // Verify no logger is injected
    expect(LoggerProvider.hasInjectedLogger()).toBe(false);

    // Use the core logger - it should use the default logger
    logger.info('Test message');

    // Verify the mock logger was not called (since it's not injected)
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
}); 