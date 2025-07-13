# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a monorepo containing the X-Fidelity framework for opinionated code adherence checks. The main packages are:

- `packages/x-fidelity-core`: Core analysis engine and utilities 
- `packages/x-fidelity-vscode`: VSCode extension for X-Fidelity integration
- `packages/x-fidelity-cli`: Command-line interface
- `packages/x-fidelity-server`: Configuration server for centralized rule management
- `packages/x-fidelity-plugins`: Built-in plugins (AST analysis, filesystem checks, etc.)
- `packages/x-fidelity-types`: Shared TypeScript types
- `packages/x-fidelity-democonfig`: Demo configurations and rules
- `packages/x-fidelity-fixtures`: Test fixtures

## Common Commands

### Building and Development (Using Nx)
```bash
# Install dependencies
yarn install

# Build all packages using Nx
npx nx run-many --target=build --all

# Build specific packages
npx nx run core:build
npx nx run cli:build
npx nx run vscode:build
npx nx run plugins:build

# Build with dependencies (Nx handles dependency order automatically)
npx nx run cli:build  # builds types, core, plugins, server first

# Clean all build artifacts
npx nx reset
npx nx run-many --target=clean --all
```

### Testing (Using Nx)
```bash
# Run all tests across packages
npx nx run-many --target=test --all

# Run tests in parallel (faster)
npx nx run-many --target=test --all --parallel

# Test specific packages
npx nx run core:test
npx nx run plugins:test
npx nx run vscode:test

# Run consistency testing specifically (CLI package)
npx nx run cli:test:consistency

# Run quick consistency test
npx nx run cli:test:consistency:quick
```

### CLI Global Install Testing (Using Nx)
```bash
# Set up Docker-based global install testing environment
npx nx run cli:global:setup

# Test local package global installation (from workspace)
npx nx run cli:global:test:local

# Test published package global installation (from npm registry)
npx nx run cli:global:test:published

# Run both local and published package tests
npx nx run cli:global:test
```

### VSCode Extension Development (Using Nx)
```bash
# Launch extension in debug mode
npx nx run vscode:dev

# Launch with fresh user data
npx nx run vscode:dev:fresh

# Launch with watch mode
npx nx run vscode:dev:watch

# Package extension
npx nx run vscode:package

# Build extension for development
npx nx run vscode:dev:build
```

### Linting and Code Quality (Using Nx)
```bash
# Lint all packages
npx nx run-many --target=lint --all

# Lint specific packages
npx nx run core:lint
npx nx run vscode:lint
npx nx run cli:lint

# Lint with auto-fix
npx nx run-many --target=lint --all --fix
```

### Nx-Specific Commands
```bash
# Show project dependency graph
npx nx graph

# Show all available projects
npx nx show projects

# Show details about a specific project
npx nx show project core
npx nx show project vscode

# Run affected tests (only test projects that changed)
npx nx affected --target=test

# Run affected builds (only build projects that changed)
npx nx affected --target=build

# Reset Nx cache (if having build issues)
npx nx reset
```

## High-Level Architecture

### Core Analysis Engine (`x-fidelity-core`)
- **Analyzer** (`core/engine/analyzer.ts`): Main entry point for codebase analysis
- **ConfigManager** (`core/configManager.ts`): Manages archetype configurations and rules
- **Plugin Registry** (`core/pluginRegistry.ts`): Dynamically loads and manages plugins
- **Engine Setup/Runner** (`core/engine/`): Sets up and executes the rules engine
- **Facts/Operators**: Extensible system for data collection and rule evaluation

### Plugin System (`x-fidelity-plugins`)
Plugin-based architecture for extensibility:
- **AST Plugin**: JavaScript/TypeScript abstract syntax tree analysis
- **Filesystem Plugin**: File structure and content analysis
- **Dependency Plugin**: Package dependency version checking
- **OpenAI Plugin**: AI-powered code analysis
- **React Patterns Plugin**: React-specific pattern detection
- **Remote Validator Plugin**: External API validation

### VSCode Extension (`x-fidelity-vscode`)
- **Extension Manager** (`core/extensionManager.ts`): Main extension coordinator
- **Analysis Manager** (`analysis/analysisManager.ts`): Handles analysis workflows
- **Tree View Providers**: Issues and control center UI components
- **Diagnostic Provider**: VSCode diagnostics integration
- **Report Management**: Analysis result handling and visualization

### Configuration Server (`x-fidelity-server`)
- **Config Server** (`configServer.ts`): Serves archetype configurations and rules
- **Cache Manager** (`cacheManager.ts`): Caches configurations for performance
- **Route Handlers**: REST API endpoints for configuration management
- **GitHub Webhooks**: Integration for configuration updates

## Key Concepts

### Archetypes
Project templates that define:
- Rules to apply (global and per-file)
- Plugins to load
- Minimum dependency versions
- Expected directory structure
- File inclusion/exclusion patterns

### Rules
JSON-based rule definitions using json-rules-engine:
- **Global rules**: Apply to entire repository (suffix: `-global`)
- **Iterative rules**: Apply to each file (suffix: `-iterative`)
- **Conditions**: When the rule should trigger
- **Events**: What happens when rule triggers (warning/fatality)

### Facts and Operators
- **Facts**: Data collectors (file content, dependencies, AST nodes)
- **Operators**: Comparison functions (version checks, pattern matching)
- Both provided by plugins for extensibility

## Development Guidelines

### Package Management
- Use **yarn** for dependency installation: `yarn install`
- Use **Nx** for build/test/lint commands: `npx nx run-many --target=build --all`
- Nx automatically handles dependency order between packages
- Build dependencies are automatically built when needed: `npx nx run cli:build` builds core, types, plugins first

### Testing Strategy
- Always run `npx nx run-many --target=test --all` from workspace root after significant changes
- Use `npx nx affected --target=test` to only test changed packages
- VSCode extension tests use: `packages/x-fidelity-fixtures/node-fullstack` as test workspace
- Fix failing tests without changing implementation unless test is incorrect

#### CLI Global Install Testing
- **Location**: `global-install-testing/` directory with Docker-based test environments
- **Framework**: BATS (Bash Automated Testing System) for integration testing
- **Test Types**:
  - **Local Package Testing**: Tests `yarn pack` + global install of development build
  - **Published Package Testing**: Tests `yarn global add x-fidelity` from npm registry
- **Docker Environments**: Clean Node.js Alpine containers to simulate fresh installs
- **CI Integration**: Automated testing in GitHub Actions with cross-platform support
- **Test Coverage**: Command availability, functionality, bundle integrity, cleanup

### Code Quality
- ESLint configuration in `eslint.config.js` with TypeScript rules
- Consistent logging using ExecutionContext for traceability
- Plugin system for extensibility rather than core modifications

### VSCode Extension Specifics
- Main entry: `packages/x-fidelity-vscode/src/extension.ts`
- Test workspace: `packages/x-fidelity-fixtures/node-fullstack`
- Uses esbuild for bundling, launches with F5 in VSCode for debugging
- Output written to `.xfiResults/` directory in analyzed workspace

## Important Notes

- Files in `temp/` directory are reference-only, do not modify
- Update README.md and website documentation when making changes
- Use consistent error handling and logging patterns
- Follow cursor rules in `.cursor/rules/core-tenets.mdc`