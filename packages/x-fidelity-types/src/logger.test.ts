import { LogLevelValues, LogLevel, LoggerOptions, LogEntry, LoggerContext, LogCategory } from './logger';

describe('Logger Types', () => {
  describe('LogLevelValues', () => {
    it('should have correct numeric values for log levels', () => {
      expect(LogLevelValues.trace).toBe(10);
      expect(LogLevelValues.debug).toBe(20);
      expect(LogLevelValues.info).toBe(30);
      expect(LogLevelValues.warn).toBe(40);
      expect(LogLevelValues.error).toBe(50);
      expect(LogLevelValues.fatal).toBe(60);
    });

    it('should have values in ascending order', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      for (let i = 1; i < levels.length; i++) {
        expect(LogLevelValues[levels[i]]).toBeGreaterThan(LogLevelValues[levels[i - 1]]);
      }
    });
  });

  describe('LoggerOptions', () => {
    it('should create valid logger options', () => {
      const options: LoggerOptions = {
        level: 'info',
        prefix: 'test-',
        context: { component: 'test' },
        structured: true,
        includeTimestamp: true,
        colorize: false,
        format: {
          timestampFormat: 'iso',
          singleLine: true,
          ignore: ['pid'],
          redact: ['password']
        }
      };

      expect(options.level).toBe('info');
      expect(options.prefix).toBe('test-');
      expect(options.context).toEqual({ component: 'test' });
      expect(options.structured).toBe(true);
      expect(options.includeTimestamp).toBe(true);
      expect(options.colorize).toBe(false);
      expect(options.format?.timestampFormat).toBe('iso');
      expect(options.format?.singleLine).toBe(true);
      expect(options.format?.ignore).toContain('pid');
      expect(options.format?.redact).toContain('password');
    });

    it('should allow partial options', () => {
      const minimalOptions: LoggerOptions = {
        level: 'debug'
      };

      expect(minimalOptions.level).toBe('debug');
      expect(minimalOptions.prefix).toBeUndefined();
      expect(minimalOptions.context).toBeUndefined();
    });
  });

  describe('LogEntry', () => {
    it('should create valid log entry', () => {
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'info',
        category: LogCategory.System,
        message: 'Test message',
        metadata: { key: 'value' },
        context: { component: 'test' },
        error: new Error('Test error')
      };

      expect(entry.timestamp).toBe('2023-01-01T00:00:00.000Z');
      expect(entry.level).toBe('info');
      expect(entry.category).toBe(LogCategory.System);
      expect(entry.message).toBe('Test message');
      expect(entry.metadata).toEqual({ key: 'value' });
      expect(entry.context).toEqual({ component: 'test' });
      expect(entry.error).toBeInstanceOf(Error);
    });

    it('should allow minimal log entry', () => {
      const minimalEntry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'info',
        category: LogCategory.System,
        message: 'Test message'
      };

      expect(minimalEntry.timestamp).toBe('2023-01-01T00:00:00.000Z');
      expect(minimalEntry.level).toBe('info');
      expect(minimalEntry.category).toBe(LogCategory.System);
      expect(minimalEntry.message).toBe('Test message');
      expect(minimalEntry.metadata).toBeUndefined();
      expect(minimalEntry.context).toBeUndefined();
      expect(minimalEntry.error).toBeUndefined();
    });
  });

  describe('LoggerContext', () => {
    it('should create valid logger context', () => {
      const context: LoggerContext = {
        component: 'engine',
        operation: 'analysis',
        requestId: 'req-123',
        userId: 'user-456',
        customField: 'custom-value'
      };

      expect(context.component).toBe('engine');
      expect(context.operation).toBe('analysis');
      expect(context.requestId).toBe('req-123');
      expect(context.userId).toBe('user-456');
      expect(context.customField).toBe('custom-value');
    });

    it('should allow empty context', () => {
      const emptyContext: LoggerContext = {};
      expect(Object.keys(emptyContext)).toHaveLength(0);
    });

    it('should allow partial context', () => {
      const partialContext: LoggerContext = {
        component: 'test'
      };

      expect(partialContext.component).toBe('test');
      expect(partialContext.operation).toBeUndefined();
      expect(partialContext.requestId).toBeUndefined();
    });
  });

  describe('Type compatibility', () => {
    it('should support all log levels as union type', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
      
      levels.forEach(level => {
        expect(typeof level).toBe('string');
        expect(LogLevelValues[level]).toBeDefined();
      });
    });

    it('should reject invalid log levels', () => {
      // TypeScript should prevent this at compile time, but we can test runtime behavior
      const invalidLevel = 'invalid' as LogLevel;
      expect(LogLevelValues[invalidLevel]).toBeUndefined();
    });
  });
}); 