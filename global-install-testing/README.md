# X-Fidelity CLI Global Install Testing

This directory contains Docker-based integration tests that simulate global installation of the x-fidelity CLI package, providing true end-to-end testing of the package distribution and installation process.

## Overview

The global install testing suite addresses a critical gap in CLI testing by:

- **Simulating Real Global Installs**: Tests actual `yarn global add` scenarios in clean environments
- **Cross-Platform Testing**: Uses Docker containers to test across different Node.js environments
- **Package Integrity Verification**: Ensures bundled package works correctly when installed globally
- **Installation/Uninstallation Lifecycle**: Tests complete install → use → uninstall workflows

## Test Structure

```
global-install-testing/
├── Dockerfile.test-env          # Clean Alpine + Node.js test environment
├── Dockerfile.local-package     # Environment for testing local package builds
├── test-global-install.bats     # BATS test suite for global install scenarios
├── scripts/
│   ├── setup-test-env.sh       # Set up Docker test environments
│   ├── test-published.sh       # Test published package from npm registry
│   └── test-local.sh           # Test local package build via yarn pack
├── fixtures/
│   └── sample-project/         # Sample Node.js project for analysis testing
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Docker must be installed and running
- Yarn package manager
- x-fidelity CLI package must be buildable

### Setup

```bash
# From CLI package directory
cd packages/x-fidelity-cli

# Set up Docker test environments
yarn global:setup
```

### Running Tests

```bash
# Test local package (development build)
yarn global:test:local

# Test published package (from npm registry)
yarn global:test:published

# Run both tests
yarn global:test
```

## Test Scenarios

### Local Package Testing (`test-local.sh`)

1. **Build & Package**: Creates tarball via `yarn pack`
2. **Global Install**: Installs tarball globally in clean Docker container
3. **Functionality Tests**: Runs comprehensive BATS test suite
4. **Analysis Testing**: Tests CLI on sample project
5. **Server Mode Testing**: Verifies server functionality
6. **Bundle Integrity**: Checks executable and dependencies
7. **Cleanup Testing**: Verifies clean uninstallation

### Published Package Testing (`test-published.sh`)

1. **Registry Install**: Installs latest published version via `yarn global add x-fidelity`
2. **Functionality Tests**: Runs same BATS test suite as local testing
3. **Analysis Testing**: Tests CLI on sample project
4. **Cleanup Testing**: Verifies clean uninstallation

## BATS Test Cases

The BATS test suite (`test-global-install.bats`) includes:

- ✅ **Command Availability**: `which xfidelity` succeeds
- ✅ **Version Display**: `xfidelity --version` shows valid semver
- ✅ **Help Display**: `xfidelity --help` shows usage information
- ✅ **Directory Analysis**: CLI can analyze sample project
- ✅ **Error Handling**: Graceful handling of invalid inputs
- ✅ **Server Mode**: CLI can start in server mode
- ✅ **Permissions**: Executable has correct permissions
- ✅ **JSON Output**: CLI supports structured output formats
- ✅ **Package Management**: Installation/uninstallation lifecycle

## Docker Environments

### Base Test Environment (`Dockerfile.test-env`)

- **Base**: `node:22-alpine`
- **Tools**: bash, curl, git, jq
- **Testing**: BATS + bats-support + bats-assert
- **Purpose**: Clean environment for testing published packages

### Local Package Environment (`Dockerfile.local-package`)

- **Base**: Same as test-env
- **Additional**: Scripts for local package testing
- **Purpose**: Testing locally built packages via tarball

## CI Integration

Global install tests are integrated into the GitHub Actions CI pipeline:

```yaml
global-install-test:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - # Setup steps
    - name: Run local package global install test
      run: cd packages/x-fidelity-cli && yarn global:test:local
    - name: Run published package global install test
      run: cd packages/x-fidelity-cli && yarn global:test:published
      continue-on-error: true  # Published package may not exist yet
```

## Sample Test Project

The `fixtures/sample-project/` contains a Node.js project with intentional code quality issues:

- Unused imports and functions
- Console.log statements
- Hardcoded configuration values  
- Missing error handling
- Missing documentation
- Magic numbers

This ensures x-fidelity has realistic code to analyze during testing.

## Troubleshooting

### Docker Issues

```bash
# Check Docker is running
docker info

# Rebuild test images
cd global-install-testing
./scripts/setup-test-env.sh
```

### Package Build Issues

```bash
# Ensure CLI package builds successfully
cd packages/x-fidelity-cli
yarn build
```

### Test Failures

```bash
# Run tests with verbose output
cd packages/x-fidelity-cli
yarn global:test:local 2>&1 | tee test-output.log
```

## Extending Tests

To add new test scenarios:

1. **Add BATS Test Cases**: Edit `test-global-install.bats`
2. **Modify Sample Project**: Update `fixtures/sample-project/` 
3. **Extend Scripts**: Modify `scripts/test-*.sh` for new workflows
4. **Update CI**: Add new test steps to `.github/workflows/ci.yml`

## Benefits

This testing approach provides:

- **Real Environment Testing**: Tests in clean containers, not development environments
- **Package Distribution Verification**: Ensures published packages work correctly
- **Cross-Platform Confidence**: Docker provides consistent testing environments
- **CI/CD Integration**: Automated testing prevents regressions
- **End-to-End Coverage**: Tests complete user journey from install to usage