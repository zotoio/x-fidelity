# VSCode Extension Development

This guide covers development setup, architecture, and contribution guidelines for the X-Fidelity VSCode extension.

## Development Setup

### Prerequisites

- **Node.js**: Version 18 or higher
- **Yarn**: For package management
- **VSCode**: Latest stable version
- **Git**: For version control

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/zotoio/x-fidelity.git
cd x-fidelity

# Install dependencies for all packages
yarn install

# Build all packages
yarn build

# Launch extension in debug mode
yarn vscode:dev
```

### Development Commands

The monorepo provides several convenient commands for extension development:

```bash
# Build and launch extension in debug mode
yarn vscode:dev

# Build and launch with fresh user data (clean state)
yarn vscode:dev:fresh

# Build, launch, and watch for changes (recommended for active development)
yarn vscode:dev:watch

# Package the extension for distribution
yarn vscode:package

# Run extension tests
yarn workspace x-fidelity-vscode test

# Run specific test suites
yarn workspace x-fidelity-vscode test:unit
yarn workspace x-fidelity-vscode test:integration
```

## Architecture Overview

### Package Structure

The VSCode extension is located at `packages/x-fidelity-vscode/` and follows this structure:

```
packages/x-fidelity-vscode/
├── src/
│   ├── core/                    # Core extension logic
│   │   ├── extensionManager.ts  # Main extension coordinator
│   │   └── ...
│   ├── analysis/               # Analysis workflow management
│   │   ├── analysisManager.ts  # Analysis execution and coordination
│   │   └── ...
│   ├── ui/                     # User interface components
│   │   ├── treeViews/         # Tree view providers
│   │   ├── panels/            # Panel and webview providers
│   │   └── statusBar/         # Status bar items
│   ├── diagnostics/           # VSCode diagnostics integration
│   ├── reports/               # Report generation and management
│   ├── utils/                 # Utilities and helpers
│   ├── test/                  # Test files
│   └── extension.ts           # Main entry point
├── package.json               # Extension manifest
├── tsconfig.json             # TypeScript configuration
└── .vscode-test.mjs          # Test configuration
```

### Key Components

#### 1. Extension Manager (`core/extensionManager.ts`)
- **Main Coordinator**: Orchestrates all extension functionality
- **Lifecycle Management**: Handles extension activation and deactivation
- **Component Integration**: Coordinates between UI, analysis, and core components
- **Error Handling**: Centralized error handling and recovery

#### 2. Analysis Manager (`analysis/analysisManager.ts`)
- **Workflow Management**: Manages analysis execution workflows
- **Progress Tracking**: Provides progress updates during analysis
- **Result Processing**: Handles analysis results and reporting
- **Performance Monitoring**: Tracks analysis performance metrics

#### 3. UI Components (`ui/`)
- **Tree View Providers**: Issues tree, control center tree
- **Status Bar Integration**: Real-time status updates
- **Panel Providers**: Custom panels and webviews
- **Command Handlers**: VSCode command implementations

#### 4. Diagnostics Provider (`diagnostics/`)
- **VSCode Integration**: Native diagnostics integration
- **Problem Panel**: Issues displayed in Problems panel
- **Inline Decorations**: Code highlighting and decorations
- **Quick Fixes**: Suggested fixes where applicable

### Dependencies

#### Core Dependencies
- `@x-fidelity/core`: Core analysis engine
- `@x-fidelity/plugins`: Built-in plugin system
- `@x-fidelity/types`: Shared TypeScript types

#### VSCode Dependencies
- `vscode`: VSCode extension API
- `@types/vscode`: TypeScript definitions for VSCode API

#### Build Dependencies
- `esbuild`: Fast bundling for extension distribution
- `@vscode/test-cli`: VSCode extension testing framework

## Development Workflow

### 1. Making Changes

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes to the extension code
# Files are typically in packages/x-fidelity-vscode/src/

# Test your changes
yarn vscode:dev:watch  # This will automatically rebuild on changes
```

### 2. Testing

#### Unit Tests
```bash
# Run unit tests
yarn workspace x-fidelity-vscode test:unit

# Run tests with coverage
yarn workspace x-fidelity-vscode test:coverage
```

#### Integration Tests
```bash
# Run integration tests (requires VSCode)
yarn workspace x-fidelity-vscode test:integration

# Run all tests
yarn workspace x-fidelity-vscode test
```

#### Manual Testing
1. **Launch Debug Extension**: Use `yarn vscode:dev`
2. **Open Test Workspace**: Use `packages/x-fidelity-fixtures/node-fullstack`
3. **Test Features**: Exercise extension functionality
4. **Check Output**: Monitor X-Fidelity Debug output channel

### 3. Performance Testing

#### Built-in Performance Monitoring
```bash
# Monitor performance during development
# Use these commands in the Extension Development Host:
# - X-Fidelity: Show Performance Report
# - X-Fidelity: Show WASM Status
# - X-Fidelity: Worker Statistics
```

#### Performance Profiling
- **Chrome DevTools**: Use `Help > Toggle Developer Tools` in Extension Development Host
- **Built-in Metrics**: Monitor timing and memory usage through extension APIs
- **Analysis Timing**: Track analysis operation performance

### 4. Debugging

#### Debug Configuration
The extension includes comprehensive debug configurations:

```typescript
// Launch configuration is in .vscode/launch.json
{
  "name": "Launch Extension",
  "type": "extensionHost",
  "request": "launch",
  "runtimeExecutable": "${execPath}",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}/packages/x-fidelity-vscode"]
}
```

#### Debug Tools
- **Breakpoints**: Set breakpoints in TypeScript source files
- **Console Logging**: Use the extension's logger for structured logging
- **Output Channels**: Monitor multiple output channels for different types of information
- **Developer Tools**: Access Chrome DevTools for web-based debugging

## Code Patterns and Best Practices

### 1. Error Handling

Use consistent error handling patterns:

```typescript
try {
  await performOperation();
  logger.info('Operation completed successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Operation failed', { error: errorMessage });
  
  // Show user-friendly error message
  vscode.window.showErrorMessage(
    `Operation failed: ${errorMessage}`,
    'Show Details'
  ).then(choice => {
    if (choice === 'Show Details') {
      vscode.commands.executeCommand('workbench.action.output.toggleOutput');
    }
  });
  
  throw error;
}
```

### 2. Logging

Use structured logging for better debugging:

```typescript
import { logger } from '../utils/logger';

// Good: Structured logging with context
logger.info('Analysis started', { 
  workspace: workspace.name,
  archetype: config.archetype,
  fileCount: files.length 
});

// Good: Error logging with details
logger.error('Analysis failed', { 
  error: error.message,
  stack: error.stack,
  operation: 'file-analysis'
});
```

### 3. Performance Monitoring

Wrap operations with performance monitoring:

```typescript
await performanceMonitor.timeOperation('operationName', async () => {
  // Your operation here
  await performLongRunningTask();
});
```

### 4. Disposable Resources

Properly manage disposable resources:

```typescript
export class MyComponent implements vscode.Disposable {
  private disposables: vscode.Disposable[] = [];
  
  constructor() {
    // Register disposables
    this.disposables.push(
      vscode.commands.registerCommand('my.command', this.handleCommand)
    );
  }
  
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
  }
}
```

## Testing Guidelines

### 1. Test Structure

Organize tests following this pattern:

```typescript
// packages/x-fidelity-vscode/src/test/suite/component.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Component Test Suite', () => {
  
  setup(async () => {
    // Setup before each test
  });
  
  teardown(async () => {
    // Cleanup after each test
  });
  
  test('should perform expected behavior', async () => {
    // Test implementation
    assert.strictEqual(actual, expected);
  });
  
});
```

### 2. Integration Tests

Use the test workspace for integration tests:

```typescript
// Test against the fixture workspace
const workspaceUri = vscode.Uri.file('/path/to/x-fidelity-fixtures/node-fullstack');
await vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
```

### 3. Performance Tests

Include performance assertions:

```typescript
test('analysis should complete within reasonable time', async () => {
  const startTime = performance.now();
  await analysisManager.runAnalysis();
  const duration = performance.now() - startTime;
  
  assert.ok(duration < 30000, `Analysis took too long: ${duration}ms`);
});
```

## Contributing Guidelines

### 1. Code Standards

- **TypeScript**: Use strict TypeScript configuration
- **ESLint**: Follow the project's ESLint configuration
- **Prettier**: Use Prettier for code formatting
- **Comments**: Document complex logic and public APIs

### 2. Commit Messages

Follow conventional commit format:

```
feat(vscode): add new analysis tree view
fix(vscode): resolve memory leak in analysis manager
docs(vscode): update development guide
test(vscode): add integration tests for diagnostics
```

### 3. Pull Request Process

1. **Create Feature Branch**: From `master` branch
2. **Make Changes**: Implement feature or fix
3. **Add Tests**: Include appropriate test coverage
4. **Update Documentation**: Update relevant documentation
5. **Test Thoroughly**: Run all tests and manual testing
6. **Submit PR**: With clear description and test instructions

### 4. Documentation

- **Code Comments**: Document complex algorithms and business logic
- **README Updates**: Update package README if needed
- **Website Docs**: Update website documentation for user-facing changes
- **Changelog**: Include changes in package changelog

## Build and Distribution

### 1. Development Build

```bash
# Build for development
yarn workspace x-fidelity-vscode build

# Build with watch mode
yarn workspace x-fidelity-vscode build:watch
```

### 2. Production Build

```bash
# Build for production
yarn workspace x-fidelity-vscode build:prod

# Package for distribution
yarn vscode:package
```

### 3. Testing Distribution

```bash
# Create package
yarn vscode:package

# Install locally for testing
code --install-extension packages/x-fidelity-vscode/x-fidelity-vscode-*.vsix
```

## Troubleshooting Development Issues

### 1. Extension Won't Load

- **Check Dependencies**: Ensure all packages are built (`yarn build`)
- **Check Logs**: Review Extension Development Host console
- **Reset State**: Try `yarn vscode:dev:fresh` for clean state

### 2. Tests Failing

- **Update Fixtures**: Ensure test fixtures are up to date
- **Check VSCode Version**: Verify compatibility with your VSCode version
- **Clean Build**: Run `yarn clean && yarn build` and retry

### 3. Performance Issues

- **Profile Operations**: Use built-in performance monitoring
- **Check Memory**: Monitor memory usage patterns
- **Optimize Patterns**: Review file exclusion patterns

### 4. WASM Issues

- **Check Status**: Use `X-Fidelity: Show WASM Status` command
- **Review Logs**: Check for WASM initialization errors
- **Fallback Mode**: Verify fallback mechanisms work correctly

## Next Steps

- [Features Overview](./features.md) - Understanding extension capabilities
- [Configuration Guide](../local-config.md) - Advanced configuration
- [Plugin Development](../plugins/overview.md) - Creating custom plugins
- [Contributing Guidelines](../contributing.md) - General contribution guidelines