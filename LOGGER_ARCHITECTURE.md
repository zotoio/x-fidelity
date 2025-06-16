# X-Fidelity Logger Architecture

## Overview

This document outlines the optimal logger structure for X-Fidelity, ensuring consistency across all packages while maintaining compatibility with different execution contexts (core, VSCode, CLI, server).

## Architecture Principles

1. **Single Source of Truth**: All logger interfaces are defined in `@x-fidelity/types`
2. **Provider Pattern**: Different environments use different logger providers while maintaining the same interface
3. **Flexible Signatures**: Support both `(message, meta)` and `(obj, message)` patterns for compatibility
4. **Consistent API**: Same logging interface across core, VSCode, CLI, and server contexts
5. **Performance Optimized**: Different implementations optimized for their specific context

## Package Structure

### `@x-fidelity/types` - Central Type Definitions

**Primary Interface: `ILogger`**
```typescript
export interface ILogger {
  trace(msgOrMeta: string | any, metaOrMsg?: any): void;
  debug(msgOrMeta: string | any, metaOrMsg?: any): void;
  info(msgOrMeta: string | any, metaOrMsg?: any): void;
  warn(msgOrMeta: string | any, metaOrMsg?: any): void;
  error(msgOrMeta: string | any, metaOrMsg?: any): void;
  fatal(msgOrMeta: string | any, metaOrMsg?: any): void;
  child(bindings: any): ILogger;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
  dispose?(): void;
}
```

**Key Features:**
- Flexible method signatures support both patterns: `logger.info("message", {meta})` and `logger.info({meta}, "message")`
- Comprehensive type system with LogEntry, LoggerOptions, LoggerContext
- Structured logging support with categories and performance metrics
- Security features for sensitive data masking

### `@x-fidelity/core` - Core Logger Implementation

**Provider: `PinoLoggerProvider`**
- High-performance structured logging
- Optimized for CLI and server environments
- Automatic sensitive data masking
- Configurable transport (console, file, structured)

**Usage:**
```typescript
import { logger } from '@x-fidelity/core';

// Both patterns work
logger.info("Processing file", { filename: "test.js" });
logger.info({ filename: "test.js" }, "Processing file");
```

### `@x-fidelity/vscode` - VSCode Extension Logger

**Provider: `VSCodeLoggerProvider`**
- Multiple specialized output channels (Main, Diagnostics, Performance, Security)
- LogOutputChannel support for structured logging (VS Code 1.74+)
- Telemetry integration
- Development vs production configurations

**Features:**
- Automatic channel routing based on log category
- Batch processing for performance
- Security audit logging
- Performance metrics tracking

**Usage:**
```typescript
import { initializeVSCodeLogger } from '@x-fidelity/vscode';

const logger = initializeVSCodeLogger(context, 'X-Fidelity', {
  enableDiagnostics: true,
  enablePerformanceLogging: true
});
```

### CLI Compatibility Layer

For backward compatibility with existing Pino-style code:

```typescript
import { createPinoStyleLogger, ILogger } from '@x-fidelity/cli/types';
import { logger as coreLogger } from '@x-fidelity/core';

// Create backward-compatible logger
const logger = createPinoStyleLogger(coreLogger);

// Pino-style usage still works
logger.info({ userId: '123' }, 'User logged in');
```

## Provider Pattern Implementation

### LoggerFactory

The factory uses the provider pattern to allow different environments to use different logging implementations:

```typescript
// Core package initialization
LoggerFactory.setProvider(new PinoLoggerProvider());

// VSCode package initialization  
LoggerFactory.setProvider(new VSCodeLoggerProvider('X-Fidelity'));

// Create loggers with consistent interface
const logger = LoggerFactory.createLogger({
  level: 'info',
  category: LogCategory.Analysis
});
```

## Context-Specific Optimizations

### Core/CLI Context
- **Provider**: `PinoLoggerProvider`
- **Focus**: High performance, structured logging
- **Transport**: Console with optional pretty-printing in development
- **Features**: Sensitive data masking, configurable redaction

### VSCode Context
- **Provider**: `VSCodeLoggerProvider` 
- **Focus**: Multiple specialized channels, user experience
- **Transport**: VSCode Output Channels (with LogOutputChannel support)
- **Features**: Category-based routing, batch processing, telemetry

### Server Context
- **Provider**: `PinoLoggerProvider`
- **Focus**: Performance, structured logging, audit trails
- **Transport**: Structured JSON to stdout/files
- **Features**: Request correlation, performance metrics

## Configuration Examples

### Core Package
```typescript
// Environment-based configuration
const logger = LoggerFactory.createLogger({
  level: process.env.XFI_LOG_LEVEL || 'info',
  structured: process.env.NODE_ENV === 'production',
  colorize: process.env.XFI_LOG_COLOR !== 'false',
  prefix: 'xfi-core'
});
```

### VSCode Extension
```typescript
// Feature-rich configuration for VSCode
const logger = initializeVSCodeLogger(context, 'X-Fidelity', {
  enableDiagnostics: true,
  enablePerformanceLogging: vscode.workspace.getConfiguration('x-fidelity').get('enablePerformanceLogging'),
  developmentMode: context.extensionMode === vscode.ExtensionMode.Development
});
```

## Migration Guide

### For Existing Code

1. **Import from types package:**
   ```typescript
   // Old
   import { logger } from '@x-fidelity/core';
   
   // New (still works, but more explicit)
   import { ILogger } from '@x-fidelity/types';
   import { logger } from '@x-fidelity/core';
   ```

2. **Method signatures are backward compatible:**
   ```typescript
   // All these work
   logger.info("message");
   logger.info("message", { meta: "data" });
   logger.info({ meta: "data" }, "message");
   ```

3. **Pino-style code needs adapter:**
   ```typescript
   // Old Pino style
   const logger = pino();
   logger.info({ userId: '123' }, 'User action');
   
   // New with adapter
   import { createPinoStyleLogger } from '@x-fidelity/cli/types';
   const logger = createPinoStyleLogger(coreLogger);
   logger.info({ userId: '123' }, 'User action'); // Still works
   ```

## Benefits

1. **Consistency**: Same interface across all packages
2. **Flexibility**: Different optimized implementations per context
3. **Compatibility**: Backward compatible with existing code
4. **Performance**: Context-specific optimizations
5. **Security**: Built-in sensitive data protection
6. **Maintainability**: Single source of truth for types
7. **Extensibility**: Easy to add new providers and features

## Testing

All logger implementations include comprehensive tests:

```bash
# Test core logger
yarn workspace @x-fidelity/core test --testPathPattern="logger"

# Test types
yarn workspace @x-fidelity/types test --testPathPattern="logger"

# Test VSCode logger
yarn workspace @x-fidelity/vscode test --testPathPattern="logger"
```

## Environment Variables

- `XFI_LOG_LEVEL`: Set log level (trace, debug, info, warn, error, fatal)
- `XFI_LOG_COLOR`: Enable/disable color output (true/false)
- `XFI_USE_PRETTY`: Enable pretty printing in development (true/false)
- `NODE_ENV`: Affects default structured logging behavior

## Best Practices

1. **Use appropriate log levels**: trace for fine-grained debugging, info for general flow, warn for recoverable issues, error for failures
2. **Include context**: Use child loggers or metadata for request correlation
3. **Avoid logging sensitive data**: The system automatically masks common patterns, but be cautious
4. **Use categories**: Leverage LogCategory for better organization and filtering
5. **Performance logging**: Use performance loggers for timing-sensitive operations in VSCode
6. **Security events**: Use security loggers for authentication/authorization events 