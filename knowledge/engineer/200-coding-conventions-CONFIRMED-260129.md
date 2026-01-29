# Topic: Coding Conventions

## Fact: File and Directory Naming Conventions
### Modified: 2026-01-29
### Priority: H

X-Fidelity follows consistent naming conventions across all packages:

**Files:**
- Source files: `camelCase.ts` (e.g., `pluginRegistry.ts`, `configManager.ts`)
- Test files: `camelCase.test.ts` or `camelCase.unit.test.ts` for unit tests
- Integration tests: `camelCase.integration.test.ts`
- Type definition files: `camelCase.ts` in the types package
- Mock files: Located in `__mocks__/` subdirectory with matching names

**Classes and Interfaces:**
- Classes: `PascalCase` (e.g., `XFiPluginRegistry`, `EnhancedLogger`)
- Interfaces: `PascalCase` with `I` prefix for pure interfaces, or without for data shapes (e.g., `ILogger`, `ArchetypeConfig`)
- Type aliases: `PascalCase` (e.g., `ErrorLevel`, `LogLevel`)
- Enums: `PascalCase` with `PascalCase` members (e.g., `ErrorCode.CONFIG_NOT_FOUND`)

**Functions and Variables:**
- Functions: `camelCase` (e.g., `analyzeCodebase`, `validateInput`)
- Constants: `SCREAMING_SNAKE_CASE` for true constants (e.g., `SECURITY_PATTERNS`, `EXECUTION_MODES`)
- Variables: `camelCase`
- Private class members: `camelCase` (no underscore prefix)

**Package Naming:**
- Packages: `x-fidelity-{domain}` (e.g., `x-fidelity-core`, `x-fidelity-plugins`)
- Scoped imports: `@x-fidelity/{domain}` (e.g., `@x-fidelity/core`, `@x-fidelity/types`)

### References
1. [package.json](../../package.json)
2. [pluginRegistry.ts](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)

---

## Fact: Import Organization and Module Structure
### Modified: 2026-01-29
### Priority: H

X-Fidelity follows a strict import ordering convention:

```typescript
// 1. Node.js built-in modules
import path from 'path';
import crypto from 'crypto';

// 2. External dependencies
import { Engine, OperatorEvaluator } from 'json-rules-engine';
import { JSONSchemaType } from 'ajv';

// 3. Workspace package imports (using @x-fidelity scope)
import { XFiPlugin, FactDefn, OperatorDefn } from '@x-fidelity/types';
import { ILogger, LogLevel } from '@x-fidelity/types';

// 4. Local imports (relative paths)
import { logger } from '../utils/logger';
import { LoggerProvider } from '../utils/loggerProvider';
import { standardErrorHandler } from './standardErrorHandler';
```

**Module Export Patterns:**
- Named exports preferred over default exports
- Re-export types from index.ts for cleaner imports
- Separate type exports: `export type { RepoXFIConfig } from './config';`

**Path Aliases (tsconfig.base.json):**
```json
{
  "paths": {
    "@x-fidelity/types": ["packages/x-fidelity-types/src"],
    "@x-fidelity/core": ["packages/x-fidelity-core/src"],
    "@x-fidelity/plugins": ["packages/x-fidelity-plugins/src"]
  }
}
```

### References
1. [tsconfig.base.json](../../tsconfig.base.json)
2. [core.ts](../../packages/x-fidelity-types/src/core.ts)

---

## Fact: TypeScript Strict Mode and Type Safety Patterns
### Modified: 2026-01-29
### Priority: H

X-Fidelity enforces strict TypeScript configuration with specific patterns for type safety:

**tsconfig.base.json Settings:**
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**Type Safety Patterns:**

1. **Avoid `any` - Use `unknown` with type guards:**
```typescript
// Bad
function processData(data: any): void { ... }

// Good
function processData(data: unknown): void {
    if (typeof data === 'object' && data !== null && 'name' in data) {
        // Type narrowed to { name: unknown }
    }
}
```

2. **Use discriminated unions for complex types:**
```typescript
export type ErrorCategory = 
  | 'CONFIGURATION'
  | 'PLUGIN'
  | 'ANALYSIS'
  | 'FILESYSTEM';
```

3. **Prefer interfaces for object shapes, types for unions:**
```typescript
// Interface for object structure
export interface StandardError {
  code: ErrorCode;
  message: string;
  details?: string;
}

// Type for union/primitive types
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';
```

4. **Use const assertions for literal types:**
```typescript
export const EXECUTION_MODES = {
    CLI: 'cli' as const,
    VSCODE: 'vscode' as const,
    SERVER: 'server' as const
} as const;
```

### References
1. [tsconfig.base.json](../../tsconfig.base.json)
2. [errorHandling.ts](../../packages/x-fidelity-types/src/errorHandling.ts)

---

## Fact: Documentation and Comment Standards
### Modified: 2026-01-29
### Priority: M

X-Fidelity uses JSDoc-style comments for public APIs and inline comments for complex logic:

**Public API Documentation:**
```typescript
/**
 * Standardized Error Handling System for X-Fidelity
 * Provides consistent error types, codes, and handling across CLI and VSCode
 */

/**
 * Abstract logger interface for X-Fidelity
 * Provides a consistent logging API across different environments
 */
export interface ILogger {
  /** Log trace level messages (lowest level) */
  trace(msgOrMeta: string | any, metaOrMsg?: any): void;
  
  /** Log debug level messages */
  debug(msgOrMeta: string | any, metaOrMsg?: any): void;
}
```

**Interface Property Documentation:**
```typescript
export interface StandardError {
  /** Unique error code for identification */
  code: ErrorCode;
  
  /** Error category for grouping */
  category: ErrorCategory;
  
  /** Human-readable error message */
  message: string;
  
  /** Technical details for debugging */
  details?: string;
}
```

**Inline Comments for Complex Logic:**
```typescript
// Check protocol
if (!VALID_URL_PROTOCOLS.includes(urlObj.protocol)) {
    return { isValid: false, errors: ['Invalid URL protocol'] };
}

// Note: getTimezoneOffset returns positive for behind UTC
const offsetSign = offsetMinutes <= 0 ? '+' : '-';
```

**Version Compatibility Comments:**
```typescript
message?: string;  // V3.24.0 compatibility - used in reportGenerator
content?: string;  // v3.24.0 compatibility - alias for fileContent
```

### References
1. [logger.ts](../../packages/x-fidelity-types/src/logger.ts)
2. [core.ts](../../packages/x-fidelity-types/src/core.ts)
