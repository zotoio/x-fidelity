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

### Building and Development (Using Yarn Workspaces)
```bash
# Install dependencies
yarn install

# Build all packages (in dependency order)
yarn build

# Build specific packages
yarn workspace @x-fidelity/core build
yarn workspace x-fidelity build
yarn workspace x-fidelity-vscode build
yarn workspace @x-fidelity/plugins build

# Clean all build artifacts
yarn clean
```

### Testing (Using Yarn Workspaces)
```bash
# Run all tests across packages
yarn test

# Test specific packages
yarn workspace @x-fidelity/core test
yarn workspace @x-fidelity/plugins test
yarn workspace x-fidelity-vscode test

# Run consistency testing specifically (CLI package)
yarn workspace x-fidelity test:consistency

# Run quick consistency test
yarn workspace x-fidelity test:consistency:quick
```

### CLI Global Install Testing (Using Yarn Workspaces)
```bash
# Set up Docker-based global install testing environment
yarn workspace x-fidelity global:setup

# Test local package global installation (from workspace)
yarn workspace x-fidelity global:test:local

# Test published package global installation (from npm registry)
yarn workspace x-fidelity global:test:published

# Run both local and published package tests
yarn workspace x-fidelity global:test
```

### VSCode Extension Development (Using Yarn Workspaces)
```bash
# Launch extension in debug mode
yarn workspace x-fidelity-vscode dev

# Launch with fresh user data
yarn workspace x-fidelity-vscode dev:fresh

# Launch with watch mode
yarn workspace x-fidelity-vscode dev:watch

# Package extension
yarn workspace x-fidelity-vscode package

# Build extension for development
yarn workspace x-fidelity-vscode dev:build
```

### Linting and Code Quality (Using Yarn Workspaces)
```bash
# Lint all packages
yarn lint

# Lint specific packages
yarn workspace @x-fidelity/core lint
yarn workspace x-fidelity-vscode lint
yarn workspace x-fidelity lint

# Lint with auto-fix
yarn lint:fix
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
- Use **yarn workspaces** for build/test/lint commands: `yarn build`, `yarn test`, `yarn lint`
- Build script handles dependency order between packages
- Build dependencies manually specified in root package.json build script

### Testing Strategy
- Always run `yarn test` from workspace root after significant changes
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