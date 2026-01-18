# Contributing to x-fidelity

We welcome contributions to x-fidelity! This document provides guidelines for contributing to the project.

## Building with Cursor

X-Fidelity includes specialized AI tooling for Cursor IDE that significantly accelerates development. When working on the codebase, you have access to:

### Slash Commands

Use these commands in Cursor chat (type `/xfi-*`) for guided workflows:

| Command | Description |
|---------|-------------|
| `/xfi-review` | Comprehensive code review with parallel expert analysis |
| `/xfi-test` | Run tests and diagnose failures |
| `/xfi-build` | Build and diagnose issues |
| `/xfi-create-plugin` | Create new plugins with step-by-step guidance |
| `/xfi-create-rule` | Create new analysis rules |
| `/xfi-create-archetype` | Create new archetype configurations |
| `/xfi-debug` | Debug errors and exceptions |
| `/xfi-fix` | Smart routing to appropriate expert |
| `/xfi-release` | Release preparation workflow |
| `/xfi-docs` | Documentation updates |
| `/xfi-analyze` | Troubleshoot analysis issues |
| `/xfi-consistency` | CLI-Extension parity checks |
| `/xfi-security` | Security review |

### Specialized Subagents

The AI has access to domain-specific expert subagents that can be invoked for specialized tasks:

| Subagent | Expertise |
|----------|-----------|
| `xfi-build-expert` | Turbo, yarn workspaces, esbuild, TypeScript compilation |
| `xfi-testing-expert` | Jest, coverage, integration tests, VSCode extension testing |
| `xfi-plugin-expert` | Plugin architecture, facts, operators, AST analysis |
| `xfi-vscode-expert` | VSCode extension, webviews, diagnostics, packaging |
| `xfi-rules-expert` | json-rules-engine, archetypes, exemptions |
| `xfi-security-expert` | Path validation, webhooks, secret handling |
| `xfi-debugger` | Error analysis, logging, troubleshooting |
| `xfi-docs-expert` | README, website docs, CHANGELOG |
| `xfi-code-reviewer` | Balanced code review, quality assessment |

### Skills

Step-by-step guides for common development tasks (automatically loaded when relevant):

| Skill | Purpose |
|-------|---------|
| `xfi-create-plugin` | Complete plugin creation workflow |
| `xfi-create-rule` | Rule creation with fact/operator guidance |
| `xfi-create-archetype` | Archetype configuration guide |
| `xfi-release-workflow` | Release process and conventional commits |
| `xfi-debug-analysis` | Troubleshooting analysis issues |
| `xfi-consistency-testing` | CLI-Extension parity verification |
| `xfi-documentation-update` | Documentation sync guide |
| `xfi-add-package` | Adding new monorepo packages |

These tools are defined in `.cursor/commands/`, `.cursor/agents/`, and `.cursor/skills/`.

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Install dependencies with `yarn install`.
4. Build all packages with `yarn build`.
5. Create a new branch for your feature or bug fix.

## Making Changes

1. Make your changes in your feature branch.
2. Add or update tests as necessary.
3. Ensure all tests pass by running `yarn test`.
4. When modifying documentation, update both the README and website docs accordingly.
5. Ensure the code lints properly by running `yarn lint`.

## Development Workflow

This project uses Yarn Workspaces with Turbo for the monorepo build system. Here are the key commands:

### Building

```bash
# Build all packages (with Turbo)
yarn build

# Clean and rebuild everything
yarn build:clean

# Build specific package
yarn workspace @x-fidelity/core build
yarn workspace @x-fidelity/plugins build
yarn workspace x-fidelity build
yarn workspace x-fidelity-vscode build
```

### Testing

```bash
# Run all tests with quality checks
yarn test

# Test specific package
yarn workspace @x-fidelity/core test
yarn workspace @x-fidelity/plugins test
yarn workspace x-fidelity-vscode test

# VSCode extension tests
yarn workspace x-fidelity-vscode test:unit
yarn workspace x-fidelity-vscode test:integration
```

### Linting

```bash
# Lint all packages
yarn lint

# Lint with auto-fix
yarn lint:fix

# Lint specific package
yarn workspace @x-fidelity/core lint
yarn workspace x-fidelity-vscode lint
```

### VSCode Extension Development

```bash
# Launch extension in debug mode (F5)
yarn workspace x-fidelity-vscode dev

# Launch with fresh user data
yarn workspace x-fidelity-vscode dev:fresh

# Package extension
yarn workspace x-fidelity-vscode package
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
