# Topic: Logging Conventions

## Fact: ILogger Interface and Log Levels
### Modified: 2026-01-29
### Priority: H

X-Fidelity uses an abstract `ILogger` interface that provides a consistent logging API across different environments (CLI, VSCode, Server). The interface supports six log levels in order of severity.

**ILogger Interface:**
```typescript
interface ILogger {
  trace(msgOrMeta: string | any, metaOrMsg?: any): void;  // Lowest - detailed traces
  debug(msgOrMeta: string | any, metaOrMsg?: any): void;  // Development debugging
  info(msgOrMeta: string | any, metaOrMsg?: any): void;   // Normal operations
  warn(msgOrMeta: string | any, metaOrMsg?: any): void;   // Warnings
  error(msgOrMeta: string | any, metaOrMsg?: any): void;  // Errors
  fatal(msgOrMeta: string | any, metaOrMsg?: any): void;  // Highest - critical failures
  
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
  flush?(): Promise<void>;
  dispose?(): void;
}
```

**Log Level Values (for comparison):**
```typescript
const LogLevelValues = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};
```

**Usage Pattern:**
```typescript
import { logger } from '@x-fidelity/core/utils/logger';

// String message only
logger.info('Analysis started');

// Message with metadata
logger.debug('Processing file', { filePath: '/path/to/file.ts', size: 1024 });

// Object as first parameter
logger.warn({ warning: 'Deprecated API', location: 'plugin.ts' }, 'API deprecation');

// Error with context
logger.error('Analysis failed', { 
  error: err.message, 
  stack: err.stack,
  filePath: currentFile 
});
```

### References
1. [logger.ts](../../packages/x-fidelity-types/src/logger.ts)
2. [logger.ts](../../packages/x-fidelity-core/src/utils/logger.ts)

---

## Fact: LoggerProvider and Execution Mode Detection
### Modified: 2026-01-29
### Priority: H

`LoggerProvider` is the central logger management class that provides mode-aware logger instances. It automatically detects the execution mode (CLI, VSCode, Server, Hook) and creates appropriate loggers.

**Getting Loggers:**
```typescript
import { LoggerProvider } from '@x-fidelity/core/utils/loggerProvider';

// Get logger for current mode (auto-detected)
const logger = LoggerProvider.getLogger();

// Get logger for specific mode
const cliLogger = LoggerProvider.getLoggerForMode('cli', 'debug');
const vscodeLogger = LoggerProvider.getLoggerForMode('vscode', 'info');

// Set logger for mode with file logging (CLI only)
LoggerProvider.setLoggerForMode('cli', 'debug', {
  enableFileLogging: true,
  filePath: '/path/to/logs/xfi.log'
});
```

**Mode Detection Logic:**
```typescript
// Detection order:
// 1. Check options.mode if available
// 2. Check for browser window (VSCode)
// 3. Check NODE_ENV === 'test' (CLI)
// 4. Check PORT or EXPRESS_ENV (Server)
// 5. Default to CLI
```

**Logger Injection for Testing:**
```typescript
// Inject custom logger (e.g., for testing)
LoggerProvider.setLogger(mockLogger);

// Check if custom logger is injected
if (LoggerProvider.hasInjectedLogger()) {
  // Using injected logger
}

// Clear injected logger
LoggerProvider.clearInjectedLogger();

// Reset provider completely
LoggerProvider.reset();
```

**Environment Variable:**
- `XFI_LOG_LEVEL` - Override log level (trace, debug, info, warn, error, fatal)

### References
1. [loggerProvider.ts](../../packages/x-fidelity-core/src/utils/loggerProvider.ts)
2. [logger.ts](../../packages/x-fidelity-core/src/utils/logger.ts)

---

## Fact: ExecutionContext for Correlation IDs
### Modified: 2026-01-29
### Priority: H

`ExecutionContext` provides correlation IDs for tracing requests across log entries. Each analysis run gets a unique execution ID that appears in all related log messages.

**Starting an Execution:**
```typescript
import { ExecutionContext } from '@x-fidelity/core/utils/executionContext';

// Start execution with context
const executionId = ExecutionContext.startExecution({
  component: 'CLI',        // 'CLI' | 'VSCode' | 'Core' | 'Server'
  operation: 'analyze',
  archetype: 'node-fullstack',
  repoPath: '/path/to/repo',
  metadata: { verbose: true }
});

// Logs will now include: [abc12def] Analyzing file...
```

**Using Execution Context:**
```typescript
// Get current execution ID
const id = ExecutionContext.getCurrentExecutionId();

// Get full context
const context = ExecutionContext.getCurrentContext();
// Returns: { executionId, startTime, component, operation, archetype, repoPath, metadata }

// Update context during execution
ExecutionContext.updateContext({ 
  metadata: { filesProcessed: 50 } 
});

// Check if execution is active
if (ExecutionContext.isExecutionActive()) {
  // In active execution
}

// End execution
ExecutionContext.endExecution();
// Sets endTime, duration, and clears context
```

**Log Message Prefixing:**
```typescript
// Get execution prefix for manual formatting
const prefix = ExecutionContext.getExecutionPrefix();
// Returns: "[abc12def]" or "" if no execution active

// Prefix a message
const prefixed = ExecutionContext.prefixMessage('Processing file');
// Returns: "[abc12def] Processing file"
```

### References
1. [executionContext.ts](../../packages/x-fidelity-core/src/utils/executionContext.ts)
2. [loggerProvider.ts](../../packages/x-fidelity-core/src/utils/loggerProvider.ts)

---

## Fact: PrefixingLogger and Correlation Metadata
### Modified: 2026-01-29
### Priority: M

`PrefixingLogger` is a logger wrapper that automatically adds correlation IDs and execution context to all log entries. It wraps the base logger and enhances every log call.

**Automatic Enhancement:**
```typescript
// PrefixingLogger automatically adds:
// - correlationId from ExecutionContext
// - component from current context
// - operation from current context
// - executionStartTime

// Example log output structure:
{
  message: "[abc12def] Processing file",
  correlationId: "abc12def",
  component: "CLI",
  operation: "analyze",
  executionStartTime: 1706500000000,
  // ... your metadata
}
```

**Creating PrefixingLogger:**
```typescript
import { PrefixingLogger } from '@x-fidelity/core/utils/loggerProvider';

// With static prefix
const logger = new PrefixingLogger(baseLogger, '[MyComponent]');

// With options
const logger = new PrefixingLogger(baseLogger, undefined, {
  enablePrefix: true,              // Add prefix to messages
  enableCorrelationMetadata: true  // Add correlation to metadata
});

// Access underlying logger
const base = logger.getBaseLogger();
```

**Log Level Propagation:**
```typescript
// Update log level globally
LoggerProvider.updateLogLevel('debug');

// Propagate to specific mode
LoggerProvider.propagateLogLevel('trace', 'cli');

// Propagate to all modes
LoggerProvider.propagateLogLevel('info');
```

### References
1. [loggerProvider.ts](../../packages/x-fidelity-core/src/utils/loggerProvider.ts)
2. [executionContext.ts](../../packages/x-fidelity-core/src/utils/executionContext.ts)

---

## Fact: EnhancedLogger for Structured Logging
### Modified: 2026-01-29
### Priority: M

`EnhancedLogger` provides advanced logging features including structured logging, performance tracking, and operation correlation. It's useful for detailed debugging scenarios.

**Creating Enhanced Logger:**
```typescript
import { EnhancedLogger, EnhancedLoggerFactory } from '@x-fidelity/core/utils/enhancedLogger';

// Simple creation
const logger = EnhancedLoggerFactory.create(baseLogger, 'Core');

// With debug context (sets error handler context too)
const logger = EnhancedLoggerFactory.createWithDebugContext(
  baseLogger,
  'Plugin',
  'analyzeDependencies',
  { pluginName: 'dependency-plugin' }
);
```

**Performance Tracking:**
```typescript
// Start tracked operation
const operationId = logger.startOperation('parseAST');

// ... do work ...

// End operation (logs duration)
logger.endOperation(operationId, { success: true, nodeCount: 1500 });
```

**Correlation Tracking:**
```typescript
// Start correlation
const corrId = logger.createCorrelation();

// ... related operations ...

// End correlation
logger.endCorrelation(corrId);
```

**Helper Functions:**
```typescript
import { 
  isDebugEnabled, 
  isVerboseEnabled,
  withPerformanceLogging,
  withCorrelation 
} from '@x-fidelity/core/utils/enhancedLogger';

// Check debug mode
if (isDebugEnabled()) {
  logger.debug('Detailed debug info', { state: internalState });
}

// Wrap operation with performance logging
const result = await withPerformanceLogging(logger, 'heavyOperation', async () => {
  return await heavyOperation();
});

// Wrap with correlation
const result = await withCorrelation(logger, async (corrId) => {
  return await trackedOperation(corrId);
});
```

**Debug Environment Variables:**
- `XFI_DEBUG=true` - Enable debug mode
- `XFI_VERBOSE=true` - Enable verbose mode
- `NODE_ENV=development` - Also enables debug

### References
1. [enhancedLogger.ts](../../packages/x-fidelity-core/src/utils/enhancedLogger.ts)
2. [loggerProvider.ts](../../packages/x-fidelity-core/src/utils/loggerProvider.ts)
