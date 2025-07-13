# X-Fidelity Development Workflow Guide

This guide provides a comprehensive overview of the local development workflow for the X-Fidelity monorepo using Nx.

## 🚀 Quick Start

```bash
# 1. Install dependencies
yarn install

# 2. Build all packages
npx nx run-many --target=build --all

# 3. Run tests to verify everything works
npx nx run-many --target=test --all

# 4. Start developing!
```

## 📁 Repository Structure

This is an Nx monorepo with the following packages:

- **`packages/x-fidelity-core`**: Core analysis engine and utilities
- **`packages/x-fidelity-vscode`**: VSCode extension
- **`packages/x-fidelity-cli`**: Command-line interface
- **`packages/x-fidelity-server`**: Configuration server
- **`packages/x-fidelity-plugins`**: Built-in plugins (AST, filesystem, etc.)
- **`packages/x-fidelity-types`**: Shared TypeScript types
- **`packages/x-fidelity-democonfig`**: Demo configurations and rules
- **`packages/x-fidelity-fixtures`**: Test fixtures

## 🛠️ Essential Nx Commands

### Building

```bash
# Build all packages
npx nx run-many --target=build --all

# Build specific package (automatically builds dependencies)
npx nx run core:build
npx nx run cli:build
npx nx run vscode:build

# Build only packages that changed since last commit
npx nx affected --target=build

# Build with watch mode (rebuilds on file changes)
npx nx run-many --target=build --all --watch
```

### Testing

```bash
# Run all tests
npx nx run-many --target=test --all

# Run tests in parallel (faster)
npx nx run-many --target=test --all --parallel

# Test specific package
npx nx run core:test
npx nx run plugins:test

# Test only packages that changed
npx nx affected --target=test

# Run tests with coverage
npx nx run core:test:coverage
```

### Linting

```bash
# Lint all packages
npx nx run-many --target=lint --all

# Lint specific package
npx nx run core:lint
npx nx run vscode:lint

# Lint with auto-fix
npx nx run-many --target=lint --all --fix
```

### Cleaning & Cache Management

```bash
# Reset Nx cache (useful when having build issues)
npx nx reset

# Clean all packages
npx nx run-many --target=clean --all

# Clean specific package
npx nx run core:clean
```

## 🎯 Development Workflows

### 1. Core Engine Development

Working on the analysis engine, config manager, or plugin system:

```bash
# Build and test core
npx nx run core:build
npx nx run core:test

# Build core and all packages that depend on it
npx nx run-many --target=build --projects=core,cli,vscode,server

# Watch mode for core development
npx nx run core:build --watch &
npx nx run core:test --watch
```

### 2. CLI Development

Working on the command-line interface:

```bash
# Build CLI (automatically builds dependencies: types, core, plugins, server)
npx nx run cli:build

# Test CLI functionality
npx nx run cli:test

# Test global install scenarios
npx nx run cli:global:test:local

# Run CLI with demo fixtures
cd packages/x-fidelity-fixtures/node-fullstack
npx x-fidelity .
```

### 3. VSCode Extension Development

Working on the VSCode extension:

```bash
# Build extension (automatically builds dependencies)
npx nx run vscode:build

# Launch extension in debug mode (opens new VSCode window)
npx nx run vscode:dev

# Launch with fresh profile (clean user settings)
npx nx run vscode:dev:fresh

# Run extension tests
npx nx run vscode:test:unit
npx nx run vscode:test:integration

# Package extension for testing
npx nx run vscode:package
```

### 4. Plugin Development

Working on AST, filesystem, or other plugins:

```bash
# Build plugins (automatically builds types, core)
npx nx run plugins:build

# Test plugins
npx nx run plugins:test

# Test specific plugin functionality
npx nx run plugins:test --testNamePattern="astFact"

# Build all packages that use plugins
npx nx run-many --target=build --projects=plugins,cli,vscode
```

### 5. Full-Stack Development

Working across multiple packages:

```bash
# Build everything
npx nx run-many --target=build --all

# Test everything
npx nx run-many --target=test --all --parallel

# Only build/test what changed
npx nx affected --target=build
npx nx affected --target=test

# Watch mode for multiple packages
npx nx run-many --target=build --projects=core,plugins,cli --watch
```

## 🔧 Useful Nx Features

### Dependency Visualization

```bash
# Show project dependency graph in browser
npx nx graph

# Show dependencies for specific project
npx nx graph --focus=core
npx nx graph --focus=vscode
```

### Project Information

```bash
# List all projects
npx nx show projects

# Show project details
npx nx show project core
npx nx show project vscode

# Show project configuration
npx nx show project core --web
```

### Affected Commands

```bash
# See what's affected by your changes
npx nx affected:graph

# Build only affected projects
npx nx affected --target=build

# Test only affected projects
npx nx affected --target=test

# Lint only affected projects
npx nx affected --target=lint
```

## 🚨 Troubleshooting

### Build Issues

```bash
# Reset Nx cache and rebuild
npx nx reset
npx nx run-many --target=build --all

# Clean and rebuild specific package
npx nx run core:clean
npx nx run core:build

# Check for dependency issues
npx nx graph
```

### Test Issues

```bash
# Run tests with verbose output
npx nx run core:test --verbose

# Run specific test file
npx nx run core:test --testPathPattern=configManager

# Clear test cache
npx nx reset
npx nx run core:test
```

### VSCode Extension Issues

```bash
# Rebuild all dependencies for VSCode
npx nx run-many --target=build --projects=types,core,plugins,cli
npx nx run vscode:dev:build

# Run with fresh profile
npx nx run vscode:dev:fresh

# Check extension logs in VSCode Output panel
```

## 📊 Performance Tips

### Parallel Execution

```bash
# Run tests in parallel (faster)
npx nx run-many --target=test --all --parallel

# Build multiple projects in parallel
npx nx run-many --target=build --projects=core,plugins,types --parallel
```

### Selective Building

```bash
# Only build what changed
npx nx affected --target=build

# Build specific projects and their dependencies
npx nx run cli:build  # builds types, core, plugins, server first

# Skip cache for fresh build
npx nx run core:build --skip-nx-cache
```

### Watch Mode

```bash
# Watch mode for development
npx nx run core:build --watch
npx nx run vscode:dev:watch

# Watch multiple projects
npx nx run-many --target=build --projects=core,plugins --watch
```

## 🎯 Common Development Tasks

### Adding a New Rule

1. Create rule JSON in `packages/x-fidelity-democonfig/src/rules/`
2. Test rule: `npx nx run cli:build && cd packages/x-fidelity-fixtures/node-fullstack && npx x-fidelity .`
3. Add test: `npx nx run core:test`

### Adding a New Plugin

1. Create plugin in `packages/x-fidelity-plugins/src/xfiPlugin{Name}/`
2. Export from `packages/x-fidelity-plugins/src/index.ts`
3. Build and test: `npx nx run plugins:build && npx nx run plugins:test`

### Debugging Issues

1. Check Nx graph: `npx nx graph`
2. Verify builds: `npx nx run-many --target=build --all`
3. Run tests: `npx nx run-many --target=test --all`
4. Check specific package: `npx nx show project <name>`

### Before Committing

```bash
# Build everything
npx nx run-many --target=build --all

# Test everything
npx nx run-many --target=test --all

# Lint everything
npx nx run-many --target=lint --all

# Or just test what changed
npx nx affected --target=build
npx nx affected --target=test
npx nx affected --target=lint
```

## 📚 Additional Resources

- [Nx Documentation](https://nx.dev)
- [Project README](./README.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [VSCode Extension Development](./packages/x-fidelity-vscode/DEVELOPMENT.md)
- [Claude.md Instructions](./CLAUDE.md)

## 🆘 Getting Help

If you encounter issues:

1. Check this workflow guide
2. Reset Nx cache: `npx nx reset`
3. Verify dependencies: `yarn install`
4. Check project structure: `npx nx graph`
5. Review recent changes: `git status`

For VSCode extension development, press F5 to launch in debug mode and use the Control Center for debugging tools.