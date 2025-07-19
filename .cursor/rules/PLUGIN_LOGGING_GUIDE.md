# Universal Plugin Logging System

The X-Fidelity Universal Plugin Logging System ensures that all plugins, whether built-in or external, have reliable access to logging functionality. This system provides fallback mechanisms, automatic initialization, and consistent logging behavior across all environments.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Plugin Development Patterns](#plugin-development-patterns)
4. [API Reference](#api-reference)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Overview

### Key Features

- **Universal Availability**: Plugins always have access to logging, even without explicit initialization
- **Automatic Fallback**: Default logger is provided when no custom logger is injected
- **Context-Aware**: Loggers automatically include plugin names and operation context
- **Environment-Adaptive**: Silent in tests, console output in development
- **Backward Compatible**: Existing plugins continue to work without modification

### Benefits

- **Reliable Debugging**: Never lose plugin debugging information
- **Consistent Logging**: All plugins use the same logging interface
- **Performance Optimized**: Efficient logger creation and reuse
- **Developer Friendly**: Clear error messages and context information

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                 Universal Plugin Logging                    │
├─────────────────────────────────────────────────────────────┤
│  LoggerProvider     │  Enhanced logger management with      │
│                     │  automatic fallback support          │
├─────────────────────────────────────────────────────────────┤
│  DefaultLogger      │  Fallback logger for universal       │
│                     │  availability                        │
├─────────────────────────────────────────────────────────────┤
│  PluginLogger       │  Plugin-specific logging utilities   │
│                     │  and context management              │
├─────────────────────────────────────────────────────────────┤
│  PluginRegistry     │  Automatic logger injection and      │
│                     │  function wrapping                   │
└─────────────────────────────────────────────────────────────┘
```

### Initialization Flow

```
1. System Startup
   ├── LoggerProvider.initializeForPlugins()
   ├── Create default logger (fallback)
   └── Ready for plugin registration

2. Logger Injection (Optional)
   ├── LoggerProvider.setLogger(customLogger)
   └── All plugins use custom logger

3. Plugin Registration
   ├── Plugin.initialize(context) called
   ├── Logger context provided
   ├── Facts/operators wrapped with logging
   └── Plugin ready for execution
```

## Plugin Development Patterns

### New Plugin Pattern (Recommended)

```typescript
import { XFiPlugin, PluginContext, ILogger } from '@x-fidelity/types';

// Plugin logger - set during initialization
let logger: ILogger;

export const myPlugin: XFiPlugin = {
    name: 'my-awesome-plugin',
    version: '1.0.0',
    description: 'My awesome plugin with logging',
    
    // Enhanced initialization with logger context
    initialize: async (context: PluginContext): Promise<void> => {
        // Set up plugin logger from context
        logger = context.logger;
        
        // Log successful initialization
        logger.info('My awesome plugin initialized', {
            version: '1.0.0',
            features: ['feature1', 'feature2']
        });
        
        // Create specialized loggers
        const factLogger = context.loggerContext.createFactLogger('myFact');
        const operatorLogger = context.loggerContext.createOperatorLogger('myOperator');
    },
    
    facts: [/* facts using logger */],
    operators: [/* operators using logger */],
    
    // Enhanced error handling
    onError: (error: Error) => {
        if (logger) {
            logger.error('Plugin error occurred:', error);
        }
        return {
            message: error.message,
            level: 'error',
            source: 'my-awesome-plugin'
        };
    },
    
    // Cleanup
    cleanup: async () => {
        if (logger) {
            logger.info('Plugin cleanup completed');
        }
    }
};
```

### External Plugin Pattern

```typescript
import { XFiPlugin, PluginContext } from '@x-fidelity/types';
import { pluginLogger } from '@x-fidelity/core'; // Universal logger

export const myExternalPlugin: XFiPlugin = {
    name: 'my-external-plugin',
    version: '1.0.0',
    
    initialize: async (context: PluginContext) => {
        // Use injected logger or fallback
        const logger = context.logger || pluginLogger.getLogger();
        
        logger.info('External plugin initialized');
    },
    
    facts: [{
        name: 'myExternalFact',
        fn: async (params, almanac) => {
            // Always safe to get logger
            const logger = pluginLogger.createFactLogger('my-external-plugin', 'myExternalFact');
            logger.debug('Executing external fact');
            
            // ... fact logic
            return result;
        }
    }]
};
```

### Legacy Plugin (Automatic Compatibility)

```typescript
// Legacy plugins continue to work without modification
export const legacyPlugin: XFiPlugin = {
    name: 'legacy-plugin',
    version: '1.0.0',
    
    // No initialize method - still works!
    facts: [/* existing facts */],
    operators: [/* existing operators */]
};
```

## API Reference

### LoggerProvider

```typescript
class LoggerProvider {
    // Ensure logger is always available
    static ensureInitialized(): void;
    
    // Set custom logger
    static setLogger(logger: ILogger): void;
    
    // Get current logger (never throws)
    static getLogger(): ILogger;
    
    // Check if custom logger is injected
    static hasInjectedLogger(): boolean;
    
    // Create specialized loggers
    static createPluginLogger(pluginName: string, context?: any): ILogger;
    static createOperationLogger(operation: string, context?: any): ILogger;
    static createComponentLogger(component: string, context?: any): ILogger;
    
    // Initialize for plugin use
    static initializeForPlugins(): void;
}
```

### PluginLogger Utilities

```typescript
// Universal plugin logger utilities
export const pluginLogger = {
    // Get current logger (guaranteed available)
    getLogger(): ILogger;
    
    // Create plugin-specific logger
    createLogger(pluginName: string, context?: any): ILogger;
    
    // Create specialized loggers
    createOperationLogger(pluginName: string, operation: string): ILogger;
    createFactLogger(pluginName: string, factName: string): ILogger;
    createOperatorLogger(pluginName: string, operatorName: string): ILogger;
    
    // Utility methods
    isInitialized(): boolean;
    initializeForPlugins(): void;
};

// Standalone functions
export function createPluginLogger(pluginName: string, context?: any): ILogger;
export function getPluginLogger(): ILogger;
export function createPluginLoggerContext(pluginName: string): PluginLoggerContext;
```

### PluginContext Interface

```typescript
interface PluginContext {
    config: any;
    logger: ILogger;
    utils: any;
    
    loggerContext: {
        createOperationLogger(operation: string, context?: any): ILogger;
        createFactLogger(factName: string, context?: any): ILogger;
        createOperatorLogger(operatorName: string, context?: any): ILogger;
    };
}
```

## Migration Guide

### From Legacy Logging

#### Before (Legacy Pattern)
```typescript
import { logger } from '@x-fidelity/core';

export const myPlugin: XFiPlugin = {
    name: 'my-plugin',
    facts: [{
        name: 'myFact',
        fn: async (params) => {
            logger.debug('Executing fact'); // Could throw if no logger injected
            return result;
        }
    }]
};
```

#### After (Universal Pattern)
```typescript
import { pluginLogger } from '@x-fidelity/core';

let logger: ILogger;

export const myPlugin: XFiPlugin = {
    name: 'my-plugin',
    
    initialize: async (context: PluginContext) => {
        logger = context.logger;
        logger.info('Plugin initialized');
    },
    
    facts: [{
        name: 'myFact',
        fn: async (params) => {
            const factLogger = pluginLogger.createFactLogger('my-plugin', 'myFact');
            factLogger.debug('Executing fact'); // Never throws
            return result;
        }
    }]
};
```

### Gradual Migration Strategy

1. **Phase 1**: Add `initialize` method to plugins
2. **Phase 2**: Use plugin logger utilities in facts/operators
3. **Phase 3**: Add proper error handling and cleanup
4. **Phase 4**: Remove direct logger imports

## Best Practices

### 1. Plugin Initialization

```typescript
// ✅ Good: Use context logger
initialize: async (context: PluginContext) => {
    logger = context.logger;
    logger.info('Plugin ready', { features: [...] });
}

// ❌ Avoid: Direct logger import without fallback
import { logger } from '@x-fidelity/core';
// logger might not be initialized
```

### 2. Fact/Operator Logging

```typescript
// ✅ Good: Use specialized loggers
fn: async (params) => {
    const factLogger = pluginLogger.createFactLogger('my-plugin', 'myFact');
    factLogger.debug('Processing', { paramsCount: Object.keys(params).length });
    // ... logic
}

// ❌ Avoid: Generic logging without context
fn: async (params) => {
    logger.debug('Processing something'); // No context
}
```

### 3. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
onError: (error: Error) => {
    if (logger) {
        logger.error('Plugin error:', error, { 
            plugin: 'my-plugin',
            errorType: error.constructor.name 
        });
    }
    return {
        message: error.message,
        level: 'error',
        source: 'my-plugin',
        details: error.stack
    };
}
```

### 4. Performance Considerations

```typescript
// ✅ Good: Create logger once, reuse
let factLogger: ILogger;

initialize: async (context) => {
    factLogger = context.loggerContext.createFactLogger('myFact');
}

// ❌ Avoid: Creating logger on every call
fn: async (params) => {
    const logger = pluginLogger.createFactLogger('my-plugin', 'myFact'); // Expensive
}
```

### 5. Testing

```typescript
// Test with mock logger
describe('My Plugin', () => {
    beforeEach(() => {
        LoggerProvider.setLogger(mockLogger);
    });
    
    afterEach(() => {
        LoggerProvider.reset();
    });
});
```

## Troubleshooting

### Common Issues

#### 1. "No logger has been injected" Error

**Cause**: Using old logger patterns without initialization
**Solution**: Use `pluginLogger.getLogger()` instead of direct imports

```typescript
// ❌ Problem
import { logger } from '@x-fidelity/core';
logger.info('message'); // Throws if not initialized

// ✅ Solution
import { pluginLogger } from '@x-fidelity/core';
pluginLogger.getLogger().info('message'); // Never throws
```

#### 2. Missing Plugin Logs

**Cause**: Plugin not using logger context
**Solution**: Implement `initialize` method and use provided logger

```typescript
// ✅ Solution
initialize: async (context: PluginContext) => {
    logger = context.logger; // Use provided logger
}
```

#### 3. Silent Logging in Tests

**Cause**: Default logger is silent in test environment
**Solution**: Inject test logger if needed

```typescript
// In tests
LoggerProvider.setLogger(testLogger);
```

#### 4. Performance Issues

**Cause**: Creating new loggers repeatedly
**Solution**: Cache loggers during initialization

```typescript
// ✅ Cache loggers
let factLogger: ILogger;
let operatorLogger: ILogger;

initialize: async (context) => {
    factLogger = context.loggerContext.createFactLogger('myFact');
    operatorLogger = context.loggerContext.createOperatorLogger('myOperator');
}
```

### Debug Logging

Enable debug logging to troubleshoot plugin issues:

```bash
# Environment variable
XFI_LOG_LEVEL=debug

# Or in code
LoggerProvider.getLogger().setLevel('debug');
```

### Validation

Verify plugin logging setup:

```typescript
// Check logger availability
console.log('Logger available:', pluginLogger.isInitialized());
console.log('Has injected logger:', LoggerProvider.hasInjectedLogger());

// Test plugin logger
const testLogger = pluginLogger.createLogger('test-plugin');
testLogger.info('Test message');
```

## Support and Contributing

For issues or questions about the Universal Plugin Logging System:

1. Check this documentation
2. Review existing plugin examples
3. Check the integration tests
4. File an issue with detailed reproduction steps

When contributing new plugins, please follow the recommended patterns outlined in this guide. 