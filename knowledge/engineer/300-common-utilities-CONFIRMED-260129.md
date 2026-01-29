# Topic: Common Utilities

## Fact: Logger Interface and Factory Pattern
### Modified: 2026-01-29
### Priority: H

X-Fidelity defines a standard `ILogger` interface that all logging implementations must follow. The `EnhancedLoggerFactory` creates configured logger instances with performance tracking and correlation support.

**ILogger Interface:**
```typescript
export interface ILogger {
  trace(msgOrMeta: string | any, metaOrMsg?: any): void;
  debug(msgOrMeta: string | any, metaOrMsg?: any): void;
  info(msgOrMeta: string | any, metaOrMsg?: any): void;
  warn(msgOrMeta: string | any, metaOrMsg?: any): void;
  error(msgOrMeta: string | any, metaOrMsg?: any): void;
  fatal(msgOrMeta: string | any, metaOrMsg?: any): void;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
  flush?(): Promise<void>;
  dispose?(): void;
}
```

**Log Level Ordering:**
```typescript
export const LogLevelValues: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60
};
```

**Factory Usage:**
```typescript
import { EnhancedLoggerFactory } from '@x-fidelity/core';

// Basic creation
const logger = EnhancedLoggerFactory.create(baseLogger, 'CLI');

// With debug context (sets up standardErrorHandler too)
const logger = EnhancedLoggerFactory.createWithDebugContext(
  baseLogger,
  'Core',
  'analyze',
  { archetype: 'node-fullstack' }
);
```

### References
1. [logger.ts](../../packages/x-fidelity-types/src/logger.ts)
2. [enhancedLogger.ts](../../packages/x-fidelity-core/src/utils/enhancedLogger.ts)

---

## Fact: Input Validation Utilities with Security Patterns
### Modified: 2026-01-29
### Priority: H

X-Fidelity provides comprehensive input validation utilities that check for common security attack patterns including directory traversal, command injection, SQL injection, XSS, and more.

**Available Validation Functions:**
```typescript
import { validateInput, validateUrlInput, validateTelemetryData } from '@x-fidelity/core';

// General string validation
const result = validateInput(userInput);
if (!result.isValid) {
  console.error('Validation failed:', result.errors);
}

// URL validation (checks protocol, XSS, path traversal)
const urlResult = validateUrlInput('https://example.com/api');

// Telemetry data validation (checks event type, sensitive data)
const telemetryResult = validateTelemetryData({ eventType: 'execution', metadata: {} });
```

**Security Patterns Detected:**
- Directory traversal: `../`, `~//`, `%2e%2e%2f`
- Command injection: `;`, `|`, `` ` ``, `$(`, `&&`, `||`
- SQL injection: `DROP TABLE`, `UNION SELECT`, `OR 1=1`
- XSS: `<script>`, `javascript:`, `onerror=`
- Template injection: `${}`, `{{}}`, `<%%>`
- Null byte injection: `\0`, `%00`

**ValidationResult Interface:**
```typescript
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  errors?: string[];  // Array for multiple validation failures
}
```

### References
1. [inputValidation.ts](../../packages/x-fidelity-core/src/utils/inputValidation.ts)
2. [pathUtils.ts](../../packages/x-fidelity-core/src/utils/pathUtils.ts)

---

## Fact: Path Validation Utility
### Modified: 2026-01-29
### Priority: M

X-Fidelity provides a path containment check utility to prevent directory traversal attacks. The `isPathInside` function verifies that a child path is contained within a parent directory.

```typescript
import { isPathInside } from '@x-fidelity/core';

// Check if file is within allowed directory
const isValid = isPathInside('/repo/src/file.ts', '/repo');
// Returns: true

const isAttack = isPathInside('/etc/passwd', '/repo');
// Returns: false

const traversalAttempt = isPathInside('/repo/../etc/passwd', '/repo');
// Returns: false
```

**Implementation:**
```typescript
export function isPathInside(childPath: string, parentPath: string): boolean {
    if (!childPath || !parentPath) return false;
    const relativePath = path.relative(parentPath, childPath);
    return relativePath === '' || 
           (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
```

Always use this function before reading or processing files when the path comes from user input or external configuration.

### References
1. [pathUtils.ts](../../packages/x-fidelity-core/src/utils/pathUtils.ts)

---

## Fact: Shared Core Types and Interfaces
### Modified: 2026-01-29
### Priority: H

X-Fidelity centralizes all shared types in the `@x-fidelity/types` package. Key types used across all packages include:

**Analysis Result Types:**
```typescript
export interface ScanResult {
    filePath: string;
    errors: RuleFailure[];
}

export interface RuleFailure {
    ruleFailure: string;
    level: ErrorLevel | undefined;
    message?: string;
    details: {
        message: string;
        source?: 'operator' | 'fact' | 'plugin' | 'rule' | 'unknown';
        originalError?: Error;
        // ... additional fields
    } | undefined;
}

export type ErrorLevel = 'warning' | 'error' | 'fatality' | 'exempt';
```

**Configuration Types:**
```typescript
export interface ArchetypeConfig {
    name: string;
    rules: string[];
    plugins: string[];
    config: {
        minimumDependencyVersions: Record<string, string>;
        standardStructure: Record<string, any>;
        blacklistPatterns: string[];
        whitelistPatterns: string[];
    };
}

export interface RuleConfig {
    name: string;
    conditions: {
        all?: RuleCondition[];
        any?: RuleCondition[];
    };
    event: {
        type: string;
        params: Record<string, any>;
    };
    errorBehavior?: 'swallow' | 'fatal';
    description?: string;
    recommendations?: string[];
}
```

**Plugin Types:**
```typescript
export type FactDefn = {
    name: string;
    fn: (params: any, almanac: any) => Promise<any>;
    priority?: number;
    description?: string;
    type?: 'global' | 'global-function' | 'iterative-function';
};

export type OperatorDefn = {
    name: string;
    fn: OperatorEvaluator<any, any>;
    description?: string;
};
```

### References
1. [core.ts](../../packages/x-fidelity-types/src/core.ts)
2. [plugins.ts](../../packages/x-fidelity-types/src/plugins.ts)
