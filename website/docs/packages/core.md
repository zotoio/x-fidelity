# x-fidelity-core

The core analysis engine and utilities that power all X-Fidelity functionality.

## Overview

`x-fidelity-core` (`@x-fidelity/core`) is the heart of the X-Fidelity framework, providing the fundamental analysis engine, configuration management, and utility functions that all other packages depend on.

## Key Components

### Analysis Engine
- **Analyzer** (`core/engine/analyzer.ts`): Main entry point for codebase analysis
- **Engine Setup/Runner** (`core/engine/`): Sets up and executes the rules engine
- **Facts/Operators**: Extensible system for data collection and rule evaluation

### Configuration Management
- **ConfigManager** (`core/configManager.ts`): Manages archetype configurations and rules
- **Local Configuration**: Support for project-specific `.xfi-config.json` files
- **Remote Configuration**: Integration with configuration servers
- **Exemption System**: Time-limited rule exemptions with expiration tracking

### Plugin System
- **Plugin Registry** (`core/pluginRegistry.ts`): Dynamically loads and manages plugins
- **Dynamic Loading**: Support for both built-in and external plugins
- **Extensible Architecture**: Plugin-based facts and operators

### Utilities and Infrastructure
- **Logging System** (`utils/logger.ts`): Structured logging with multiple transports
- **Performance Monitoring** (`utils/performanceMonitor.ts`): Built-in performance tracking
- **Telemetry** (`utils/telemetry.ts`): Usage analytics and performance metrics
- **OpenAI Integration** (`utils/openai.ts`): AI-powered code analysis capabilities

### Notification System
- **Email Notifications** (`notifications/emailNotificationProvider.ts`)
- **Slack Integration** (`notifications/slackNotificationProvider.ts`)
- **Microsoft Teams** (`notifications/teamsNotificationProvider.ts`)
- **Code Owners Integration** (`notifications/codeOwnersProvider.ts`)

## Architecture

The core package follows a modular architecture:

```
core/
├── engine/           # Analysis engine and execution
├── configManager.ts  # Configuration management
├── pluginRegistry.ts # Plugin system
└── index.ts         # Public API exports

utils/
├── logger.ts        # Logging infrastructure
├── telemetry.ts     # Analytics and metrics
├── openai.ts        # AI integration
└── performanceMonitor.ts

notifications/
├── emailNotificationProvider.ts
├── slackNotificationProvider.ts
├── teamsNotificationProvider.ts
└── codeOwnersProvider.ts
```

## Key Features

### Rule Engine Integration
Built on [json-rules-engine](https://github.com/CacheControl/json-rules-engine), providing:
- Flexible condition evaluation
- Custom fact collection
- Extensible operator system
- Event-driven rule triggering

### Performance Optimization
- **Caching**: Intelligent caching of analysis results
- **Incremental Analysis**: Support for analyzing only changed files
- **Memory Management**: Efficient memory usage patterns
- **Async Processing**: Non-blocking analysis execution

### Error Handling
- **Graceful Degradation**: Continues analysis even when some components fail
- **Comprehensive Logging**: Detailed error reporting and stack traces
- **Recovery Mechanisms**: Automatic recovery from transient failures

## Usage

### Direct Usage (Advanced)
```typescript
import { Analyzer, ConfigManager } from '@x-fidelity/core';

const configManager = new ConfigManager();
const analyzer = new Analyzer(configManager);

const results = await analyzer.analyze({
  directory: './src',
  archetype: 'node-fullstack',
  configServer: 'https://config.example.com'
});
```

### Plugin Development
```typescript
import { XFiPlugin } from '@x-fidelity/types';

const myPlugin: XFiPlugin = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  facts: [{
    name: 'myFact',
    fn: async () => ({ result: 'data' })
  }],
  operators: [{
    name: 'myOperator',
    fn: (factValue, expectedValue) => factValue === expectedValue
  }]
};
```

## Configuration

### Environment Variables
- `XFI_LOG_LEVEL`: Set logging level (trace, debug, info, warn, error, fatal)
- `XFI_LOG_COLOR`: Enable/disable colored logging output
- `OPENAI_API_KEY`: OpenAI API key for AI-powered analysis
- `OPENAI_MODEL`: OpenAI model to use (default: 'gpt-4o')

### Performance Tuning
- **Analysis Timeout**: Configure maximum analysis duration
- **Memory Limits**: Set memory usage boundaries
- **Cache TTL**: Control cache expiration times
- **Concurrency**: Adjust parallel processing limits

## Dependencies

### Core Dependencies
- `json-rules-engine`: Rule evaluation engine
- `winston`: Logging framework
- `fs-extra`: Enhanced file system operations
- `semver`: Semantic version parsing and comparison

### Analysis Dependencies
- `@babel/parser`: JavaScript/TypeScript parsing
- `esprima`: ECMAScript parsing
- `tree-sitter`: Advanced syntax tree parsing
- `jsonpath`: JSON path expressions

### Integration Dependencies
- `axios`: HTTP client for remote configurations
- `nodemailer`: Email notification support
- `@slack/web-api`: Slack integration
- `openai`: OpenAI API client

## Testing

The core package includes comprehensive test coverage:

```bash
# Run core package tests
yarn workspace @x-fidelity/core test

# Run with coverage
yarn workspace @x-fidelity/core test:coverage

# Run specific test suites
yarn workspace @x-fidelity/core test:unit
yarn workspace @x-fidelity/core test:integration
```

## Development

### Building
```bash
# Build core package
yarn workspace @x-fidelity/core build

# Build with watch mode
yarn workspace @x-fidelity/core build:watch
```

### Debugging
- Enable debug logging: `XFI_LOG_LEVEL=debug`
- Use performance monitoring to identify bottlenecks
- Leverage telemetry data for optimization insights

## Related Packages

- **[x-fidelity-cli](./cli.md)**: Command-line interface that uses the core engine
- **[x-fidelity-vscode](../vscode-extension/overview.md)**: VSCode extension built on core
- **[x-fidelity-plugins](./plugins.md)**: Plugin implementations that extend core
- **[x-fidelity-server](./server.md)**: Configuration server using core utilities