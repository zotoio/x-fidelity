# Topic: Standard Error Patterns

## Fact: StandardError Interface and Factory
### Modified: 2026-01-29
### Priority: H

X-Fidelity uses a standardized error handling system through the `StandardError` interface and `StandardErrorFactory` class. All errors should be created using this pattern for consistency across CLI and VSCode.

**StandardError Interface Structure:**
```typescript
interface StandardError {
  code: ErrorCode;           // Numeric code for identification (1000-1699)
  category: ErrorCategory;   // Category for grouping (auto-detected from code)
  message: string;           // Human-readable message
  details?: string;          // Technical debugging details
  context?: {
    component: 'CLI' | 'VSCode' | 'Core' | 'Plugin';
    function?: string;
    filePath?: string;
    ruleName?: string;
    pluginName?: string;
    extra?: Record<string, any>;
  };
  cause?: Error | StandardError;  // Wrapped original error
  stack?: string;                 // Stack trace
  timestamp: string;              // ISO timestamp
  errorId: string;                // Unique ID for correlation
}
```

**Creating Errors:**
```typescript
// Basic error creation
const error = StandardErrorFactory.create(
  ErrorCode.CONFIG_NOT_FOUND,
  'Configuration file not found',
  { 
    context: { component: 'Core', filePath: '/path/to/config' }
  }
);

// Wrapping JavaScript errors
const standardError = StandardErrorFactory.fromError(
  originalError,
  ErrorCode.UNEXPECTED_ERROR,
  { component: 'Plugin', pluginName: 'my-plugin' }
);
```

### References
1. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)
2. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)

---

## Fact: Error Code Ranges and Categories
### Modified: 2026-01-29
### Priority: H

Error codes are organized into ranges, each mapping to a specific category. The `StandardErrorFactory.getCategoryFromCode()` method automatically determines the category based on the error code.

| Range | Category | Examples |
|-------|----------|----------|
| 1000-1099 | CONFIGURATION | CONFIG_NOT_FOUND (1001), CONFIG_INVALID (1002), ARCHETYPE_NOT_FOUND (1004) |
| 1100-1199 | PLUGIN | PLUGIN_NOT_FOUND (1101), PLUGIN_LOAD_FAILED (1102), PLUGIN_EXECUTION_FAILED (1105) |
| 1200-1299 | ANALYSIS | ANALYSIS_FAILED (1201), ANALYSIS_TIMEOUT (1202), RULE_EXECUTION_FAILED (1204) |
| 1300-1399 | FILESYSTEM | FILE_NOT_FOUND (1301), FILE_READ_ERROR (1302), PERMISSION_DENIED (1305) |
| 1400-1499 | NETWORK | NETWORK_TIMEOUT (1401), NETWORK_CONNECTION_FAILED (1402), API_RATE_LIMIT (1404) |
| 1500-1599 | VALIDATION | INVALID_INPUT (1501), SCHEMA_VALIDATION_FAILED (1502), SECURITY_VIOLATION (1503) |
| 1600-1699 | RUNTIME | INITIALIZATION_FAILED (1601), DEPENDENCY_MISSING (1602), UNEXPECTED_ERROR (1699) |

**Complete ErrorCode Enum:**
```typescript
enum ErrorCode {
  // Configuration (1000-1099)
  CONFIG_NOT_FOUND = 1001,
  CONFIG_INVALID = 1002,
  CONFIG_PARSE_ERROR = 1003,
  ARCHETYPE_NOT_FOUND = 1004,
  ARCHETYPE_INVALID = 1005,
  
  // Plugin (1100-1199)
  PLUGIN_NOT_FOUND = 1101,
  PLUGIN_LOAD_FAILED = 1102,
  PLUGIN_INVALID = 1103,
  PLUGIN_FUNCTION_NOT_FOUND = 1104,
  PLUGIN_EXECUTION_FAILED = 1105,
  
  // Analysis (1200-1299)
  ANALYSIS_FAILED = 1201,
  ANALYSIS_TIMEOUT = 1202,
  ANALYSIS_CANCELLED = 1203,
  RULE_EXECUTION_FAILED = 1204,
  FACT_COLLECTION_FAILED = 1205,
  
  // Filesystem (1300-1399)
  FILE_NOT_FOUND = 1301,
  FILE_READ_ERROR = 1302,
  FILE_WRITE_ERROR = 1303,
  DIRECTORY_NOT_FOUND = 1304,
  PERMISSION_DENIED = 1305,
  
  // Network (1400-1499)
  NETWORK_TIMEOUT = 1401,
  NETWORK_CONNECTION_FAILED = 1402,
  REMOTE_SERVER_ERROR = 1403,
  API_RATE_LIMIT = 1404,
  
  // Validation (1500-1599)
  INVALID_INPUT = 1501,
  SCHEMA_VALIDATION_FAILED = 1502,
  SECURITY_VIOLATION = 1503,
  
  // Runtime (1600-1699)
  INITIALIZATION_FAILED = 1601,
  DEPENDENCY_MISSING = 1602,
  MEMORY_ERROR = 1603,
  UNEXPECTED_ERROR = 1699
}
```

### References
1. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)

---

## Fact: StandardErrorHandler Singleton Pattern
### Modified: 2026-01-29
### Priority: M

The `StandardErrorHandler` is a singleton that provides consistent error handling across CLI and VSCode. It handles logging, notifications, telemetry, and error correlation.

**Key Methods:**
```typescript
// Get the singleton instance
const handler = StandardErrorHandler.getInstance();

// Handle a StandardError with options
await handler.handleError(error, {
  showNotification: true,    // Show user notification
  logError: true,            // Log to logger
  severity: 'error',         // 'fatal' | 'error' | 'warning' | 'info'
  recoveryActions: [...],    // Suggested user actions
  includeDebugInfo: true,    // Include debug context
  customReporter: async (err) => { ... }  // Custom reporting
});

// Wrap and handle JavaScript errors
const standardError = await handler.handleJavaScriptError(
  jsError,
  ErrorCode.FILE_READ_ERROR,
  { component: 'Core', filePath: '/path/to/file' }
);

// Create and handle a new error in one call
const error = await handler.createAndHandleError(
  ErrorCode.CONFIG_INVALID,
  'Invalid configuration',
  { component: 'CLI' }
);
```

**Error Correlation:**
```typescript
// Create a correlation for tracking related errors
const correlationId = handler.createCorrelation('my-operation');

// Add errors to correlation
handler.addToCorrelation(correlationId, error.errorId);

// Get all related errors
const relatedErrors = handler.getCorrelatedErrors(correlationId);
```

**Debug Context:**
```typescript
// Set debug context for enhanced error reporting
handler.setDebugContext({
  operation: 'analyze',
  state: { fileCount: 100 },
  config: { archetype: 'node-fullstack' },
  environment: {
    platform: process.platform,
    version: '1.0.0',
    nodeVersion: process.version
  }
});
```

### References
1. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)
2. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)

---

## Fact: Helper Functions for Common Error Patterns
### Modified: 2026-01-29
### Priority: M

The standardErrorHandler module exports helper functions for common error scenarios. These provide pre-configured recovery actions and context.

**Configuration Errors:**
```typescript
import { handleConfigurationError } from '@x-fidelity/core/utils/standardErrorHandler';

try {
  // Load configuration
} catch (error) {
  await handleConfigurationError(
    error as Error,
    'node-fullstack',      // archetype name
    '/path/to/config.json' // file path
  );
}
```

**Plugin Errors:**
```typescript
import { handlePluginError } from '@x-fidelity/core/utils/standardErrorHandler';

try {
  // Load or execute plugin
} catch (error) {
  await handlePluginError(
    error as Error,
    'ast-plugin',      // plugin name
    'analyzeSyntax'    // function name
  );
}
```

**Analysis Errors:**
```typescript
import { handleAnalysisError } from '@x-fidelity/core/utils/standardErrorHandler';

try {
  // Analyze file
} catch (error) {
  await handleAnalysisError(
    error as Error,
    '/path/to/file.ts',  // file being analyzed
    'no-console-log'     // rule that failed
  );
}
```

**User-Friendly Messages:**
```typescript
import { getUserFriendlyMessage, getTechnicalDetails } from '@x-fidelity/types';

const userMessage = getUserFriendlyMessage(error);
const techDetails = getTechnicalDetails(error);
```

### References
1. [standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)
2. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)
