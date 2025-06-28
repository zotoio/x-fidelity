# VSCode Extension Testing Guide

## 🧪 Optimized Test Architecture

This document describes the streamlined and optimized test suite for the X-Fidelity VSCode extension.

## 📋 Test Suite Structure

### Test Files Organization

```
src/test/
├── helpers/
│   ├── testHelpers.ts          # Shared test utilities
│   └── screenshotHelper.ts     # Screenshot capture for visual testing
├── unit/
│   ├── extension.test.ts       # Extension activation & command tests
│   └── configuration.test.ts   # Configuration management tests
├── integration/
│   ├── errorHandling.test.ts   # Error handling integration tests
│   └── workspace.test.ts       # Workspace integration tests
├── suite/
│   ├── index.ts               # Test loader (not embedded tests)
│   ├── comprehensive.test.ts   # Main comprehensive test suite
│   └── progressManager.test.ts # Progress management tests
└── runTest.ts                 # Test runner entry point
```

### Removed Duplicates

The following duplicate/redundant test files have been removed:
- `src/test/integration/ui.test.ts` - UI tests consolidated into comprehensive.test.ts
- `src/test/e2e/analysisWorkflow.test.ts` - E2E workflow duplicate of comprehensive tests

## 🚀 Test Categories

### 1. Unit Tests (`test:unit`)
- **Purpose**: Test individual components in isolation
- **Files**: `src/test/unit/**/*.test.ts`
- **Timeout**: 20 seconds
- **Features**:
  - Extension activation validation
  - Command registration verification
  - Configuration management testing

### 2. Integration Tests (`test:integration`)
- **Purpose**: Test component interactions and error handling
- **Files**: `src/test/integration/**/*.test.ts`
- **Timeout**: 45 seconds
- **Features**:
  - Error handling validation
  - Workspace integration testing
  - Graceful failure scenarios

### 3. Comprehensive Tests (`test:comprehensive`)
- **Purpose**: Full end-to-end CLI-Extension consistency validation
- **Files**: `src/test/suite/comprehensive.test.ts`
- **Timeout**: 3 minutes
- **Features**:
  - CLI vs Extension analysis comparison
  - Performance measurement
  - UI workflow testing
  - Screenshot capture (when enabled)
  - Detailed consistency validation

### 4. Progress Tests (`test:progress`)
- **Purpose**: Test progress management and reporting
- **Files**: `src/test/suite/progressManager.test.ts`
- **Timeout**: 30 seconds
- **Features**:
  - Progress reporter functionality
  - Phase management
  - Cancellation handling

## 📸 Screenshot Testing

### Enable Screenshots
```bash
# Run tests with screenshot capture
yarn test:screenshots

# Environment variable approach
SCREENSHOTS=true yarn test:comprehensive
```

### Screenshot Features
- **Automatic Capture**: Screenshots taken at key test points
- **Visual Verification**: Capture VSCode UI states during testing
- **HTML Report**: Generated HTML report with clickable screenshots
- **Workflow Capture**: Multi-step screenshot sequences
- **Error Capture**: Screenshots on test failures

### Screenshot Output
- **Location**: `test-screenshots/session-[timestamp]/`
- **Format**: PNG images with descriptive names
- **Index**: HTML file with interactive screenshot gallery
- **Cleanup**: Keeps last 5 test sessions automatically

## 🔧 Test Commands

### Development Testing
```bash
# Run all tests with linting
yarn test

# Run specific test categories
yarn test:unit                 # Unit tests only
yarn test:integration         # Integration tests only
yarn test:comprehensive       # Full comprehensive tests
yarn test:progress            # Progress manager tests

# Screenshot testing
yarn test:screenshots         # Tests with screenshot capture
```

### CI/CD Testing
```bash
# Optimized for CI environments
yarn test:ci                  # All tests with CI optimizations
```

### Debug Testing
```bash
# Debug mode for development
yarn test:debug               # Open VSCode with test debugger
```

## 🎯 Test Configuration

### Test Labels in `.vscode-test.js`
- `unitTests` - Fast unit test execution
- `integrationTests` - Integration test suite
- `comprehensiveTests` - Main comprehensive test suite with CLI comparison
- `progressTests` - Progress management tests
- `allTests` - Complete test suite for CI

### Key Configuration Features
- **Workspace**: Uses monorepo root (../../) for realistic testing
- **Timeouts**: Appropriate timeouts for each test category
- **Environment**: Test-specific environment variables
- **Launch Args**: VSCode optimization flags for testing
- **Screenshots**: Optional screenshot capture support

## 🏃‍♂️ Running Tests

### Quick Start
```bash
# Basic test run
yarn test

# With screenshots
SCREENSHOTS=true yarn test:comprehensive

# Debug a specific test
yarn build:test && code --extensionDevelopmentPath=. --extensionTestsPath=./out/test/suite
```

### Test Helpers

The `testHelpers.ts` provides shared utilities:
- `ensureExtensionActivated()` - Ensures extension is ready
- `getTestWorkspace()` - Gets the test workspace folder
- `runCLIAnalysis()` - Executes CLI analysis
- `runExtensionAnalysis()` - Executes extension analysis
- `compareAnalysisResults()` - Compares CLI vs Extension results
- `executeCommandSafely()` - Safe command execution with error handling

### Screenshot Helpers

The `ScreenshotHelper` class provides:
- `captureScreen()` - Basic screenshot capture
- `captureVSCodeWindow()` - VSCode-specific screenshots
- `captureAfterCommand()` - Screenshots after command execution
- `captureWorkflow()` - Multi-step workflow screenshots

## 🔍 Test Validation

### Consistency Testing
The comprehensive test suite validates:
- **Issue Count Consistency**: CLI and Extension must find identical issue counts
- **Structure Consistency**: Issue details must have identical structure
- **Performance Tracking**: Measures and compares CLI vs Extension performance
- **UI Validation**: Ensures all UI components function correctly

### Required Environment
- **Workspace**: X-Fidelity monorepo root
- **Dependencies**: All packages built and available
- **VSCode**: Extension installed and activated
- **Display**: Xvfb for headless testing (CI)

## 🐛 Debugging Tests

### VSCode Debug Mode
```bash
# Launch VSCode with extension in debug mode
yarn dev:fresh

# Then press F5 to debug
```

### Test Debugging
```bash
# Run specific test with debugging
yarn test:debug

# View test output
yarn logs
```

### Common Issues
1. **Extension Not Activated**: Ensure extension is properly built
2. **Workspace Issues**: Verify monorepo structure is correct
3. **Timeout Errors**: Increase timeout for slow operations
4. **Screenshot Failures**: Ensure `scrot` is installed for screenshots

## 📊 Test Metrics

### Performance Targets
- **Unit Tests**: < 20 seconds total
- **Integration Tests**: < 45 seconds total
- **Comprehensive Tests**: < 3 minutes total
- **CLI-Extension Consistency**: 100% issue count match

### Coverage Goals
- ✅ Extension activation and commands
- ✅ Error handling and graceful failures
- ✅ CLI-Extension consistency
- ✅ UI component functionality
- ✅ Progress management
- ✅ Workspace integration

## 🎉 Success Criteria

A successful test run should show:
- ✅ All commands registered correctly
- ✅ Extension activates without errors
- ✅ CLI and Extension find identical issue counts
- ✅ UI components function properly
- ✅ Error handling works gracefully
- ✅ Progress reporting functions correctly
- ✅ Screenshots captured (when enabled)

This optimized test suite provides comprehensive coverage while eliminating duplication and improving maintainability. 