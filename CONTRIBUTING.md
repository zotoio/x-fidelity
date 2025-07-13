# Contributing to x-fidelity

We welcome contributions to x-fidelity! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Install dependencies with `yarn install`.
4. Build all packages with `npx nx run-many --target=build --all`.
5. Create a new branch for your feature or bug fix.

## Making Changes

1. Make your changes in your feature branch.
2. Add or update tests as necessary.
3. Ensure all tests pass by running `npx nx run-many --target=test --all`.
4. When modifying documentation to cover new functionality (such as remote validation, GitHub webhook integration, enhanced telemetry, or new plugins), please update both the README and PLUGIN_GUIDANCE accordingly.
5. Ensure the code lints properly by running `npx nx run-many --target=lint --all`.

## Development Workflow with Nx

This project uses Nx as a monorepo build system. Here are the key commands:

### Building

```bash
# Build all packages
npx nx run-many --target=build --all

# Build specific package
npx nx run core:build
npx nx run cli:build
npx nx run vscode:build
npx nx run plugins:build

# Build with dependencies
npx nx run cli:build  # automatically builds dependencies first
```

### Testing

```bash
# Run all tests
npx nx run-many --target=test --all

# Test specific package
npx nx run core:test
npx nx run plugins:test

# Run tests in parallel (faster)
npx nx run-many --target=test --all --parallel
```

### Linting

```bash
# Lint all packages
npx nx run-many --target=lint --all

# Lint specific package
npx nx run core:lint
npx nx run vscode:lint
```

### Useful Nx Commands

```bash
# Show project dependencies
npx nx graph

# Show all available projects
npx nx show projects

# Show details about a specific project
npx nx show project core

# Reset Nx cache (if having issues)
npx nx reset
```

## Commit Messages

We use conventional commits to standardize our commit messages. Please use the `yarn commit` script to create your commit messages. This script will guide you through the process of creating a properly formatted commit message.

To commit your changes:

```
git add .
yarn commit
```

Follow the prompts to select the type of change, scope, and write a short description.

## Submitting a Pull Request

1. Push your changes to your fork on GitHub.
2. Create a pull request from your fork to the main x-fidelity repository.
3. In your pull request description, please provide:
   - A clear and detailed explanation of the changes
   - The motivation for the changes
   - Any potential impacts on existing functionality
   - Screenshots or code snippets if applicable

## Pull Request Review Process

1. Maintainers will review your pull request.
2. They may ask for changes or clarifications.
3. Make any requested changes in your feature branch and push the updates.
4. Once approved, a maintainer will merge your pull request.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

Thank you for contributing to x-fidelity!
