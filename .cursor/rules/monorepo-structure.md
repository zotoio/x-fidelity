---
alwaysApply: true
crux: true
---

# X-Fidelity Monorepo Structure

X-Fidelity is a code quality analysis tool built as a monorepo with the following key packages:

## Core Packages
- **[packages/x-fidelity-cli](mdc:packages/x-fidelity-cli)** - Command-line interface for running analyses
- **[packages/x-fidelity-core](mdc:packages/x-fidelity-core)** - Core analysis engine and configuration management
- **[packages/x-fidelity-types](mdc:packages/x-fidelity-types)** - TypeScript type definitions shared across packages
- **[packages/x-fidelity-plugins](mdc:packages/x-fidelity-plugins)** - Analysis plugins (AST, patterns, dependencies, etc.)
- **[packages/x-fidelity-server](mdc:packages/x-fidelity-server)** - HTTP server for remote analysis and webhooks
- **[packages/x-fidelity-vscode](mdc:packages/x-fidelity-vscode)** - VSCode extension for IDE integration

## Configuration and Testing
- **[packages/x-fidelity-democonfig](mdc:packages/x-fidelity-democonfig)** - Default configuration used by CLI and VSCode when no config is supplied
- **[packages/x-fidelity-fixtures](mdc:packages/x-fidelity-fixtures)** - Test fixtures for validation across all packages

## Key Files
- **[.xfi-config.json](mdc:.xfi-config.json)** - Main configuration file
- **[package.json](mdc:package.json)** - Root package.json with workspace configuration
- **[yarn.lock](mdc:yarn.lock)** - Dependency lock file (use yarn, not npm)

## Development Context
The monorepo supports both Development/CI context (analyzing the X-Fidelity codebase itself) and User context (analyzing external projects). The VSCode extension and CLI automatically detect context and use appropriate configurations.
