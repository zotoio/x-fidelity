import { ILogger, LogLevel, LogLevelValues } from '@x-fidelity/types';
import { standardErrorHandler } from './standardErrorHandler';

export interface EnhancedLoggerConfig {
  baseLogger: ILogger;
  component: 'CLI' | 'VSCode' | 'Core' | 'Plugin';
  sessionId?: string;
  context?: Record<string, any>;
  structured?: boolean;
  enablePerformanceTracking?: boolean;
  enableCorrelation?: boolean;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component: string;
  sessionId?: string;
  function?: string;
  filePath?: string;
  ruleName?: string;
  pluginName?: string;
  metadata?: Record<string, any>;
  timing?: {
    startTime?: number;
    duration?: number;
    operation?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string | number;
  };
}

export class EnhancedLogger implements ILogger {
  private baseLogger: ILogger;
  private component: 'CLI' | 'VSCode' | 'Core' | 'Plugin';
  private sessionId: string;
  private context: Record<string, any>;
  private structured: boolean;
  private enablePerformanceTracking: boolean;
  private enableCorrelation: boolean;
  private activeOperations: Map<string, number> = new Map();
  private correlationStack: string[] = [];
  
  constructor(config: EnhancedLoggerConfig) {
    this.baseLogger = config.baseLogger;
    this.component = config.component;
    this.sessionId = config.sessionId || this.generateSessionId();
    this.context = config.context || {};
    this.structured = config.structured !== false;
    this.enablePerformanceTracking = config.enablePerformanceTracking !== false;
    this.enableCorrelation = config.enableCorrelation !== false;
  }
  
  trace(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('trace', msgOrMeta, metaOrMsg);
  }
  
  debug(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('debug', msgOrMeta, metaOrMsg);
  }
  
  info(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('info', msgOrMeta, metaOrMsg);
  }
  
  warn(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('warn', msgOrMeta, metaOrMsg);
  }
  
  error(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('error', msgOrMeta, metaOrMsg);
  }
  
  fatal(msgOrMeta: string | any, metaOrMsg?: any): void {
    this.log('fatal', msgOrMeta, metaOrMsg);
  }
  
  child(bindings: any): ILogger {
    return new EnhancedLogger({
      baseLogger: this.baseLogger.child(bindings),
      component: this.component,
      sessionId: this.sessionId,
      context: { ...this.context, ...bindings },
      structured: this.structured,
      enablePerformanceTracking: this.enablePerformanceTracking,
      enableCorrelation: this.enableCorrelation
    });
  }
  
  setLevel(level: LogLevel): void {
    this.baseLogger.setLevel(level);
  }
  
  getLevel(): LogLevel {
    return this.baseLogger.getLevel();
  }
  
  isLevelEnabled(level: LogLevel): boolean {
    return this.baseLogger.isLevelEnabled(level);
  }
  
  dispose?(): void {
    if (this.baseLogger.dispose) {
      this.baseLogger.dispose();
    }
  }
  
  startOperation(operationName: string): string {
    if (!this.enablePerformanceTracking) {
      return operationName;
    }
    
    const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    this.activeOperations.set(operationId, Date.now());
    
    this.debug('Operation started', {
      operation: operationName,
      operationId,
      timestamp: new Date().toISOString()
    });
    
    return operationId;
  }
  
  endOperation(operationId: string, metadata?: Record<string, any>): void {
    if (!this.enablePerformanceTracking || !this.activeOperations.has(operationId)) {
      return;
    }
    
    const startTime = this.activeOperations.get(operationId)!;
    const duration = Date.now() - startTime;
    this.activeOperations.delete(operationId);
    
    this.info('Operation completed', {
      operationId,
      duration: `${duration}ms`,
      ...metadata
    });
  }
  
  createCorrelation(correlationId?: string): string {
    if (!this.enableCorrelation) {
      return '';
    }
    
    const id = correlationId || `corr-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    this.correlationStack.push(id);
    
    this.debug('Correlation started', { correlationId: id });
    return id;
  }
  
  endCorrelation(correlationId: string): void {
    if (!this.enableCorrelation) {
      return;
    }
    
    const index = this.correlationStack.indexOf(correlationId);
    if (index !== -1) {
      this.correlationStack.splice(index, 1);
      this.debug('Correlation ended', { correlationId });
    }
  }
  
  private log(level: LogLevel, msgOrMeta: string | any, metaOrMsg?: any): void {
    if (!this.isLevelEnabled(level)) {
      return;
    }
    
    const logEntry = this.createLogEntry(level, msgOrMeta, metaOrMsg);
    
    if (this.structured) {
      this.logStructured(logEntry);
    } else {
      this.logFormatted(logEntry);
    }
  }
  
  private createLogEntry(level: LogLevel, msgOrMeta: string | any, metaOrMsg?: any): LogEntry {
    let message: string;
    let metadata: Record<string, any> = {};
    
    if (typeof msgOrMeta === 'string') {
      message = msgOrMeta;
      if (metaOrMsg && typeof metaOrMsg === 'object') {
        metadata = metaOrMsg;
      }
    } else if (typeof msgOrMeta === 'object') {
      message = metaOrMsg || JSON.stringify(msgOrMeta);
      metadata = msgOrMeta;
    } else {
      message = String(msgOrMeta);
    }
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: this.component,
      sessionId: this.sessionId,
      metadata: { ...this.context, ...metadata }
    };
    
    if (metadata.function) logEntry.function = metadata.function;
    if (metadata.filePath) logEntry.filePath = metadata.filePath;
    if (metadata.ruleName) logEntry.ruleName = metadata.ruleName;
    if (metadata.pluginName) logEntry.pluginName = metadata.pluginName;
    
    if (metadata.duration || metadata.operation) {
      logEntry.timing = {
        duration: metadata.duration,
        operation: metadata.operation,
        startTime: metadata.startTime
      };
    }
    
    if (metadata.error) {
      logEntry.error = {
        message: metadata.error.message || metadata.error,
        stack: metadata.error.stack,
        code: metadata.error.code
      };
    }
    
    return logEntry;
  }
  
  private logStructured(entry: LogEntry): void {
    const structuredData: Record<string, any> = {
      '@timestamp': entry.timestamp,
      '@level': entry.level.toUpperCase(),
      '@component': entry.component,
      '@session': entry.sessionId,
      message: entry.message,
      ...entry.metadata
    };
    
    if (entry.function) structuredData['@function'] = entry.function;
    if (entry.filePath) structuredData['@file'] = entry.filePath;
    if (entry.ruleName) structuredData['@rule'] = entry.ruleName;
    if (entry.pluginName) structuredData['@plugin'] = entry.pluginName;
    
    if (entry.timing) {
      structuredData['@timing'] = entry.timing;
    }
    
    if (entry.error) {
      structuredData['@error'] = entry.error;
    }
    
    this.baseLogger[entry.level](entry.message, structuredData);
  }
  
  private logFormatted(entry: LogEntry): void {
    const parts: string[] = [];
    
    const contextParts: string[] = [entry.component];
    
    if (entry.function) contextParts.push(entry.function);
    if (entry.pluginName) contextParts.push(`plugin:${entry.pluginName}`);
    if (entry.filePath) contextParts.push(`file:${this.getShortFilePath(entry.filePath)}`);
    if (entry.ruleName) contextParts.push(`rule:${entry.ruleName}`);
    
    const contextStr = contextParts.join('::');
    
    let timingStr = '';
    if (entry.timing?.duration) {
      timingStr = ` [${entry.timing.duration}ms]`;
    }
    
    const formattedMessage = `[${this.getShortTimestamp(entry.timestamp)}] ${entry.level.toUpperCase().padEnd(5)} [${contextStr}] ${entry.message}${timingStr}`;
    
    const logMetadata = entry.metadata || {};
    if (entry.error) {
      logMetadata.error = entry.error;
    }
    
    this.baseLogger[entry.level](formattedMessage, logMetadata);
  }
  
  private generateSessionId(): string {
    return `sess-${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
  
  private getShortTimestamp(timestamp: string): string {
    return new Date(timestamp).toISOString().substring(11, 23);
  }
  
  private getShortFilePath(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    if (parts.length > 2) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return filePath;
  }
}

export class EnhancedLoggerFactory {
  static create(baseLogger: ILogger, component: 'CLI' | 'VSCode' | 'Core' | 'Plugin', options: Partial<EnhancedLoggerConfig> = {}): EnhancedLogger {
    return new EnhancedLogger({
      baseLogger,
      component,
      ...options
    });
  }
  
  static createWithDebugContext(
    baseLogger: ILogger, 
    component: 'CLI' | 'VSCode' | 'Core' | 'Plugin',
    operation: string,
    additionalContext?: Record<string, any>
  ): EnhancedLogger {
    const logger = new EnhancedLogger({
      baseLogger,
      component,
      context: { operation, ...additionalContext },
      structured: true,
      enablePerformanceTracking: true,
      enableCorrelation: true
    });
    
    standardErrorHandler.setDebugContext({
      operation,
      state: additionalContext || {},
      config: {},
      environment: {
        platform: process.platform,
        version: process.version,
        nodeVersion: process.version,
        vscodeVersion: process.env.VSCODE_VERSION
      },
      metrics: {
        startTime: Date.now(),
        memoryUsage: process.memoryUsage().heapUsed,
        activeOperations: []
      }
    });
    
    return logger;
  }
}

export function isDebugEnabled(): boolean {
  return process.env.XFI_DEBUG === 'true' || 
         process.env.NODE_ENV === 'development' ||
         process.env.XFI_LOG_LEVEL === 'debug' ||
         process.env.XFI_LOG_LEVEL === 'trace';
}

export function isVerboseEnabled(): boolean {
  return process.env.XFI_VERBOSE === 'true' || isDebugEnabled();
}

export function withPerformanceLogging<T>(
  logger: EnhancedLogger,
  operationName: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  const operationId = logger.startOperation(operationName);
  
  try {
    const result = operation();
    
    if (result instanceof Promise) {
      return result
        .then(value => {
          logger.endOperation(operationId, { success: true });
          return value;
        })
        .catch(error => {
          logger.endOperation(operationId, { success: false, error: error.message });
          throw error;
        });
    } else {
      logger.endOperation(operationId, { success: true });
      return result;
    }
  } catch (error) {
    logger.endOperation(operationId, { success: false, error: (error as Error).message });
    throw error;
  }
}

export function withCorrelation<T>(
  logger: EnhancedLogger,
  operation: (correlationId: string) => T | Promise<T>,
  correlationId?: string
): T | Promise<T> {
  const id = logger.createCorrelation(correlationId);
  
  try {
    const result = operation(id);
    
    if (result instanceof Promise) {
      return result.finally(() => logger.endCorrelation(id));
    } else {
      logger.endCorrelation(id);
      return result;
    }
  } catch (error) {
    logger.endCorrelation(id);
    throw error;
  }
}
