---
crux: true
globs: "**/*.ts,**/*.tsx"
---

# X-Fidelity Coding Standards

This rule defines coding standards and patterns based on the X-Fidelity codebase conventions. All TypeScript code should follow these patterns for consistency.

## File Organization

### Package Structure
- **Monorepo Layout**: Code lives in `packages/` with dedicated packages for each domain
- **Barrel Exports**: Use `index.ts` files for re-exporting public APIs
- **Domain Folders**: Organize by feature (facts/, operators/, utils/, core/)
- **Test Collocation**: Test files (`*.test.ts`) live alongside source files

```typescript
// Good: Barrel export pattern in index.ts
export * from './sharedPluginUtils';
export { xfiPluginAst } from './xfiPluginAst';
export { xfiPluginDependency } from './xfiPluginDependency';
```

## TypeScript Patterns

### Type Definitions
- **Interfaces over Types**: Prefer `interface` for object shapes
- **Explicit Types**: Avoid `any` where possible; use specific types
- **Type Imports**: Import types from `@x-fidelity/types` package

```typescript
// Good: Typed interface with JSDoc
export interface PluginContext {
    config: any;
    logger: ILogger;
    utils: any;
    loggerContext: {
        createOperationLogger: (operation: string, additionalContext?: Record<string, any>) => ILogger;
        createFactLogger: (factName: string, additionalContext?: Record<string, any>) => ILogger;
        createOperatorLogger: (operatorName: string, additionalContext?: Record<string, any>) => ILogger;
    };
}
```

### Function Parameters
- **Destructured Objects**: Use typed destructured parameter objects for functions with multiple params
- **Default Values**: Provide sensible defaults for optional parameters

```typescript
// Good: Typed destructured params
export async function analyzeCodebase(params: AnalyzeCodebaseParams): Promise<ResultMetadata> {
    const { 
        repoPath, 
        archetype = 'node-fullstack', 
        configServer = '', 
        localConfigPath = ''
    } = params;
    // ...
}

// Good: Interface for params
interface CustomFactParams {
    resultFact?: string;
    [key: string]: any;
}
```

### Error Handling

Use the StandardError pattern with categorized error codes:

```typescript
// Error code ranges:
// 1000-1099: Configuration errors
// 1100-1199: Plugin errors  
// 1200-1299: Analysis errors
// 1300-1399: Filesystem errors
// 1400-1499: Network errors
// 1500-1599: Validation errors
// 1600-1699: Runtime errors

import { ErrorCode, StandardErrorFactory } from '@x-fidelity/types';

// Good: Standardized error creation
const error = StandardErrorFactory.create(
    ErrorCode.CONFIG_NOT_FOUND,
    `Configuration not found for archetype '${archetype}'`,
    {
        category: 'CONFIGURATION',
        context: { component: 'Core', function: 'getConfig' }
    }
);

// Good: Wrapping caught errors
catch (error) {
    throw StandardErrorFactory.fromError(
        error as Error,
        ErrorCode.ANALYSIS_FAILED,
        { component: 'Core', function: 'analyzeCodebase' }
    );
}
```

## Logging Standards

### LoggerProvider Pattern
- **Always use LoggerProvider**: Never create loggers directly
- **Context-Aware Logging**: Include relevant context in log messages
- **Appropriate Log Levels**: debug, info, warn, error

```typescript
import { LoggerProvider } from '@x-fidelity/core';

// Good: Get logger from provider
const logger = LoggerProvider.getLoggerForMode(currentMode);

// Good: Structured logging with context
logger.info('Starting codebase analysis', {
    repoPath: params.repoPath,
    archetype: params.archetype,
    hasInjectedLogger: LoggerProvider.hasInjectedLogger()
});

// Good: Error logging with context
logger.error('Failed to load plugin', {
    pluginName,
    error: error.message
});
```

### Execution Context for Correlation
```typescript
import { ExecutionContext } from '@x-fidelity/core';

// Start execution context for log correlation
const executionId = ExecutionContext.startExecution({
    component: 'Core',
    operation: 'analyzeCodebase',
    archetype: params.archetype,
    repoPath: params.repoPath
});

// ... perform operations ...

// End execution context
ExecutionContext.endExecution();
```

### Plugin Logging
```typescript
import { pluginLogger } from '@x-fidelity/core';

// Good: Create specialized loggers
const factLogger = pluginLogger.createFactLogger('my-plugin', 'myFact');
const operatorLogger = pluginLogger.createOperatorLogger('my-plugin', 'myOperator');

// Good: Safe logging (never throws)
pluginLogger.getLogger().info('message'); // Always safe
```

## Plugin Architecture

### Plugin Structure
```typescript
import { XFiPlugin, PluginError, PluginContext, ILogger } from '@x-fidelity/types';

let logger: ILogger;

export const myPlugin: XFiPlugin = {
    name: 'myPlugin',
    version: '1.0.0',
    description: 'Plugin description',
    facts: [/* fact definitions */],
    operators: [/* operator definitions */],
    
    // Required: Initialize with logger context
    initialize: async (context: PluginContext): Promise<void> => {
        logger = context.logger;
        logger.info('Plugin initialized', { version: '1.0.0' });
    },
    
    // Required: Error handler
    onError: (error: Error): PluginError => {
        logger?.error('Plugin error:', error);
        return {
            message: error.message,
            level: 'error',
            source: 'my-plugin'
        };
    },
    
    // Optional: Cleanup resources
    cleanup: async (): Promise<void> => {
        logger?.info('Plugin cleanup completed');
    }
};
```

### Fact Definitions
```typescript
import { FactDefn } from '@x-fidelity/types';

export const myFact: FactDefn = {
    name: 'myFact',
    description: 'What this fact collects',
    type: 'iterative-function',  // 'global' | 'global-function' | 'iterative-function'
    priority: 1,
    fn: async (params: unknown, almanac?: unknown): Promise<any> => {
        const logger = pluginLogger.createFactLogger('my-plugin', 'myFact');
        try {
            logger.debug('Executing fact', { params: Object.keys(params || {}) });
            // Fact logic here
            return result;
        } catch (error) {
            logger.error('Error in fact:', error);
            return null;
        }
    }
};
```

### Operator Definitions
```typescript
import { OperatorDefn } from '@x-fidelity/types';

export const myOperator: OperatorDefn = {
    name: 'myOperator',
    description: 'What this operator compares',
    fn: (factValue: any, operatorValue: any): boolean => {
        const logger = pluginLogger.createOperatorLogger('my-plugin', 'myOperator');
        try {
            logger.debug('Executing operator', { factValue, operatorValue });
            return factValue === operatorValue;
        } catch (error) {
            logger.error('Error in operator:', error);
            return false;
        }
    }
};
```

## Security Patterns

### Path Validation
Always validate paths to prevent directory traversal:

```typescript
import path from 'path';

// Good: Resolve and validate paths
const resolvedPath = path.resolve(basePath, userPath);

// Check for traversal attempts
if (userPath.includes('..') || userPath.includes('\0')) {
    throw new PathTraversalError(userPath, 'Path traversal attempt detected');
}

// Validate against allowed prefixes
const isAllowed = ALLOWED_PATH_PREFIXES.some(prefix => 
    resolvedPath.startsWith(path.resolve(prefix))
);
```

## Testing Patterns

### Test Structure
```typescript
import { myFunction } from './myModule';

// Mock dependencies at top of file
jest.mock('../utils/logger');
jest.mock('../utils/axiosClient');

// Proper mock typing
const mockLogger = jest.mocked(logger);

describe('MyModule', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle success case', async () => {
        const mockAlmanac = { factValue: jest.fn() };
        const result = await myFunction({}, mockAlmanac);
        expect(result).toEqual(expectedValue);
    });

    it('should handle error case', async () => {
        mockDependency.mockRejectedValue(new Error('Test error'));
        await expect(myFunction({})).rejects.toThrow('Test error');
    });
});
```

### Mock Patterns
```typescript
// Good: Create typed axios response mocks
const createAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
    request: {}
});

// Good: Mock module with factory
jest.mock('./options', () => ({
    options: {
        configServer: 'http://test-server.com',
        localConfigPath: '/path/to/config'
    }
}));
```

## Async Patterns

### Async/Await
```typescript
// Good: Proper async function with error handling
async function loadConfig(path: string): Promise<Config> {
    try {
        const content = await fs.readFile(path, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        throw StandardErrorFactory.fromError(error, ErrorCode.CONFIG_PARSE_ERROR);
    }
}

// Good: Parallel execution when independent
const [config, rules, exemptions] = await Promise.all([
    loadConfig(configPath),
    loadRules(rulesPath),
    loadExemptions(exemptionsPath)
]);
```

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | camelCase | `configManager.ts` |
| Test files | camelCase.test | `configManager.test.ts` |
| Interfaces | PascalCase | `PluginContext` |
| Classes | PascalCase | `ConfigManager` |
| Functions | camelCase | `analyzeCodebase` |
| Constants | UPPER_SNAKE_CASE | `EXECUTION_MODES` |
| Enums | PascalCase | `ErrorCode` |
| Enum values | UPPER_SNAKE_CASE | `CONFIG_NOT_FOUND` |

## Documentation

### JSDoc for Public APIs
```typescript
/**
 * Validates that a directory path is safe for operations
 * @param dirPath The directory path to validate
 * @returns True if path is safe
 * @throws PathTraversalError if path contains traversal attempts
 */
export function validateDirectoryPath(dirPath: string): boolean {
    // implementation
}
```

### Interface Documentation
```typescript
/** Enhanced error information with standardized structure */
export interface StandardError {
  /** Unique error code for identification */
  code: ErrorCode;
  
  /** Error category for grouping */
  category: ErrorCategory;
  
  /** Human-readable error message */
  message: string;
}
```

## VSCode Extension Patterns

### Extension Lifecycle
```typescript
import * as vscode from 'vscode';

let extensionManager: ExtensionManager | undefined;

export async function activate(context: vscode.ExtensionContext) {
    const logger = createComponentLogger('Extension');
    
    try {
        logger.info('Extension activating...');
        
        // Set context for UI
        await vscode.commands.executeCommand('setContext', 'myext.active', true);
        
        extensionManager = new ExtensionManager(context);
        context.subscriptions.push(extensionManager);
        
        logger.info('Extension activated');
    } catch (error) {
        logger.error('Activation failed:', error);
        throw error;
    }
}

export async function deactivate() {
    extensionManager?.dispose();
}
```

## Import Order

Organize imports in this order:
1. Node.js built-in modules
2. External packages
3. Workspace packages (`@x-fidelity/*`)
4. Relative imports

```typescript
// 1. Node.js built-ins
import fs from 'fs/promises';
import path from 'path';

// 2. External packages
import { Engine } from 'json-rules-engine';

// 3. Workspace packages
import { PluginContext, ILogger } from '@x-fidelity/types';
import { LoggerProvider } from '@x-fidelity/core';

// 4. Relative imports
import { myLocalUtil } from './utils';
import { MyComponent } from '../components';
```
