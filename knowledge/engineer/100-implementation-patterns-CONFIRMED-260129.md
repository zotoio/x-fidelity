# Topic: Implementation Patterns

## Fact: Async/Await Pattern with Performance Logging
### Modified: 2026-01-29
### Priority: H

X-Fidelity uses a consistent async/await pattern wrapped with performance logging for all asynchronous operations. The `withPerformanceLogging` utility function automatically tracks operation duration and logs success/failure status.

```typescript
import { withPerformanceLogging } from '@x-fidelity/core';

// Pattern 1: Direct async function wrapping
const result = await withPerformanceLogging(
  logger,
  'operation-name',
  async () => {
    // async operation here
    return await someAsyncWork();
  }
);

// Pattern 2: Plugin async operations use EnhancedLogger startOperation/endOperation
const operationId = logger.startOperation('analyze-file');
try {
  const result = await analyzeFile(filePath);
  logger.endOperation(operationId, { success: true });
  return result;
} catch (error) {
  logger.endOperation(operationId, { success: false, error: error.message });
  throw error;
}
```

All async operations should:
1. Use try/catch for error handling at the appropriate level
2. Include operation timing via the performance logging utilities
3. Log operation start and completion with relevant metadata

### References
1. [enhancedLogger.ts](../../packages/x-fidelity-core/src/utils/enhancedLogger.ts)

---

## Fact: Standardized Error Handling with Error Codes
### Modified: 2026-01-29
### Priority: H

X-Fidelity uses a centralized error handling system with categorized error codes (1000-1699 ranges) and a StandardErrorFactory for consistent error creation across all packages.

Error code ranges:
- **1000-1099**: Configuration errors (CONFIG_NOT_FOUND, CONFIG_INVALID, etc.)
- **1100-1199**: Plugin errors (PLUGIN_NOT_FOUND, PLUGIN_LOAD_FAILED, etc.)
- **1200-1299**: Analysis errors (ANALYSIS_FAILED, ANALYSIS_TIMEOUT, etc.)
- **1300-1399**: Filesystem errors (FILE_NOT_FOUND, FILE_READ_ERROR, etc.)
- **1400-1499**: Network errors (NETWORK_TIMEOUT, NETWORK_CONNECTION_FAILED, etc.)
- **1500-1599**: Validation errors (INVALID_INPUT, SCHEMA_VALIDATION_FAILED, etc.)
- **1600-1699**: Runtime errors (INITIALIZATION_FAILED, UNEXPECTED_ERROR, etc.)

```typescript
import { StandardErrorFactory, ErrorCode } from '@x-fidelity/types';

// Create a standard error with automatic category detection
const error = StandardErrorFactory.create(
  ErrorCode.PLUGIN_LOAD_FAILED,
  `Failed to load plugin '${pluginName}': ${reason}`,
  {
    details: error.stack,
    context: { 
      component: 'Core', 
      function: 'registerPlugin',
      pluginName 
    },
    cause: originalError
  }
);

// Convert native errors to standard errors
const standardError = StandardErrorFactory.fromError(
  nativeError, 
  ErrorCode.ANALYSIS_FAILED,
  { component: 'CLI', filePath }
);
```

### References
1. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)
2. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)

---

## Fact: Singleton Registry Pattern for Plugin Management
### Modified: 2026-01-29
### Priority: H

X-Fidelity uses the singleton pattern for plugin registry management, ensuring a single source of truth for all registered plugins. The pattern includes lazy initialization, thread-safe plugin registration, and initialization state tracking.

```typescript
export class XFiPluginRegistry implements PluginRegistry {
    private static instance: XFiPluginRegistry;
    private plugins: XFiPlugin[] = [];
    private initializationStatus: Map<string, 'pending' | 'initializing' | 'completed' | 'failed'> = new Map();
    private initializationPromises: Map<string, Promise<void>> = new Map();

    private constructor(options: PluginInitializationOptions = {}) {
        this.initializationOptions = {
            enableLoggerContext: true,
            enableErrorWrapping: true,
            enableLegacySupport: true,
            ...options
        };
    }

    public static getInstance(options?: PluginInitializationOptions): XFiPluginRegistry {
        if (!XFiPluginRegistry.instance) {
            XFiPluginRegistry.instance = new XFiPluginRegistry(options);
        }
        return XFiPluginRegistry.instance;
    }

    // Wait for async initialization to complete
    public async waitForPlugin(pluginName: string): Promise<void> {
        const promise = this.initializationPromises.get(pluginName);
        if (promise) await promise;
    }
}

// Export singleton instance for convenient access
export const pluginRegistry = XFiPluginRegistry.getInstance();
```

Key characteristics:
- Private constructor prevents direct instantiation
- Static `getInstance()` provides global access point
- Plugin initialization is tracked with state machine (pending → initializing → completed/failed)
- Async plugin initialization is supported via Promise tracking

### References
1. [pluginRegistry.ts](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)

---

## Fact: Execution Context for Correlation and Tracing
### Modified: 2026-01-29
### Priority: M

X-Fidelity uses an ExecutionContext class to maintain correlation IDs across an analysis run, enabling log correlation and distributed tracing. Every analysis operation starts with an execution context that propagates through all components.

```typescript
import { ExecutionContext } from '@x-fidelity/core';

// Start a new execution with context
const executionId = ExecutionContext.startExecution({
    component: 'CLI',
    operation: 'analyze',
    archetype: 'node-fullstack',
    repoPath: '/path/to/repo'
});

// Access current execution ID anywhere in the call stack
const currentId = ExecutionContext.getCurrentExecutionId();

// Create prefixed log messages
const prefixedMessage = ExecutionContext.prefixMessage('Operation completed');
// Result: "[a1b2c3d4] Operation completed"

// Get full context for debugging
const context = ExecutionContext.getCurrentContext();

// End execution when complete
ExecutionContext.endExecution();
```

The ExecutionContext provides:
- Unique 8-character execution IDs for log correlation
- Static methods for global access without dependency injection
- Metadata tracking (start time, component, operation, archetype)
- Duration calculation on execution end

### References
1. [executionContext.ts](../../packages/x-fidelity-core/src/utils/executionContext.ts)
