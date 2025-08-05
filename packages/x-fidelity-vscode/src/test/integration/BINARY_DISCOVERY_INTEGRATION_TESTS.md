# Binary Discovery Integration Tests

This directory contains comprehensive integration tests for the cross-platform binary discovery functionality in X-Fidelity.

## Overview

The binary discovery system is a critical component that locates Node.js-related binaries (node, npm, yarn, npx, etc.) across different operating systems and installation methods. These integration tests ensure the system works correctly in real-world environments.

## Test Files

### Core Package Tests
- **`packages/x-fidelity-core/src/utils/binaryDiscovery.integration.test.ts`** - Tests the core binary discovery functions without VSCode dependencies

### VSCode Extension Tests
- **`binaryDiscovery.crossplatform.integration.test.ts`** - Tests binary discovery in VSCode extension context across all platforms
- **`vscodeSettingOverride.integration.test.ts`** - Tests the VSCode setting override functionality (`xfidelity.nodeGlobalBinPath`)

## What Is Tested

### 🔍 **Core Binary Discovery**
- **Real System Discovery**: Tests discovery of npm, yarn, node, npx on the actual system
- **Platform-Specific Paths**: Validates OS-appropriate path detection (Windows, macOS, Linux)
- **Version Manager Support**: Tests nvm, volta, fnm detection and path resolution
- **Which/Where Commands**: Tests using system `which`/`where` commands for binary location
- **Enhanced Environment**: Tests creation of augmented PATH environment variables

### 🖥️ **Cross-Platform Scenarios**
- **Windows**: Program Files, nodejs directory, Windows path separators
- **macOS**: Homebrew paths, system paths, NVM/Volta installations
- **Linux**: System package manager paths, snap packages, manual installations

### ⚙️ **VSCode Integration**
- **Setting Configuration**: Tests VSCode configuration API integration
- **Override Paths**: Tests manual binary path override functionality
- **Tilde Expansion**: Tests `~/path` expansion in settings
- **Setting Persistence**: Tests configuration persistence across sessions

### 🛡️ **Error Handling**
- **Non-existent Binaries**: Graceful handling of missing binaries
- **Invalid Paths**: Proper fallback for invalid override paths
- **Corrupted Environment**: Recovery from corrupted PATH variables
- **Permission Errors**: Handling of filesystem permission issues

### ⚡ **Performance**
- **Response Times**: Ensures discovery completes within reasonable timeframes
- **Concurrent Operations**: Tests multiple simultaneous discovery operations
- **Resource Usage**: Validates efficient resource utilization

## Running Tests

### Local Development

```bash
# Run all binary discovery integration tests
cd packages/x-fidelity-vscode
yarn test:integration:binary

# Run VSCode setting tests specifically
yarn test:integration:vscode-setting

# Run core binary discovery tests (no VSCode dependency)
yarn test:core:binary

# Run all cross-platform tests
yarn test:integration:crossplatform
```

### Core Package Tests

```bash
# Run core integration tests directly
cd packages/x-fidelity-core
yarn test:integration:binary

# Run all integration tests
yarn test:integration
```

### CI/CD Testing

The tests are automatically run in GitHub Actions across multiple operating systems:

```bash
# Manual trigger of CI workflow
gh workflow run binary-discovery-integration.yml

# Run with debug output
gh workflow run binary-discovery-integration.yml -f debug=true
```

## Test Matrix

### Operating Systems
- **Ubuntu Latest** (Linux)
- **Windows Latest** (Windows 10/11)
- **macOS Latest** (macOS 13+)

### Node.js Versions
- **18.x** (LTS)
- **20.x** (LTS)
- **22.x** (Current)

### Installation Methods
- **System Package Managers** (apt, brew, chocolatey)
- **Node Version Managers** (nvm, volta, fnm)
- **Direct Downloads** (nodejs.org installers)
- **Container Environments** (Docker, GitHub Actions)

## Test Scenarios

### Standard Scenarios
1. **Fresh System**: Clean environment with standard Node.js installation
2. **Developer Workstation**: Multiple Node.js versions, global packages installed
3. **CI/CD Environment**: Minimal installation with specific versions
4. **Corporate Environment**: Custom installation paths, restricted permissions

### Edge Cases
1. **Missing Binaries**: yarn not installed, npx missing
2. **Corrupted Installation**: Broken symlinks, missing files
3. **Custom Paths**: Non-standard installation locations
4. **Empty Environment**: No PATH or minimal environment variables

### VSCode-Specific Scenarios
1. **Default Behavior**: No override setting configured
2. **Manual Override**: Custom path specified in settings
3. **Invalid Override**: Non-existent path in settings
4. **Tilde Paths**: Home directory expansion in settings

## Expected Results

### ✅ Success Criteria
- All binaries discoverable on properly configured systems
- Platform-specific paths correctly identified
- Version managers properly detected when present
- VSCode settings correctly override automatic discovery
- Graceful fallbacks when components are missing
- Performance within acceptable limits (< 30 seconds for all operations)

### ⚠️ Acceptable Failures
- yarn not found on systems without yarn installed
- Version managers not detected when not installed
- Custom paths inaccessible due to permissions
- Non-standard installations in unusual locations

### ❌ Failure Conditions
- node or npm not found on properly configured systems
- Crashes or unhandled exceptions
- Infinite loops or excessive timeouts
- Memory leaks or resource exhaustion
- Incorrect path detection on standard installations

## Troubleshooting

### Common Issues

#### Test Timeouts
```bash
# Increase timeout for slow systems
JEST_TIMEOUT=60000 yarn test:integration:binary
```

#### VSCode Extension Tests Failing
```bash
# Ensure VSCode test dependencies are installed
yarn build && yarn build:test
```

#### Platform-Specific Failures
```bash
# Run tests with debug output
DEBUG=* yarn test:integration:binary
```

### Debug Information

Tests output detailed information about:
- Detected binary paths and sources
- Environment variables and PATH contents
- Version manager installations
- Platform-specific path checks
- Performance metrics

### Environment Variables

- `DEBUG=*` - Enable detailed debug output
- `JEST_TIMEOUT=<ms>` - Override test timeouts
- `TEST_SCENARIO=<name>` - Run specific test scenarios
- `VSCODE_TEST_CACHE=true` - Use VSCode test caching

## Contributing

When adding new integration tests:

1. **Follow Naming Convention**: Use `*.integration.test.ts` suffix
2. **Include Platform Checks**: Test behavior on all target platforms
3. **Add Comprehensive Logging**: Output useful debug information
4. **Handle Edge Cases**: Test error conditions and fallbacks
5. **Update Documentation**: Add new scenarios to this README
6. **Test Performance**: Ensure reasonable execution times

### Test Structure Template

```typescript
describe('New Integration Test Suite', () => {
  let testHomeDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Setup test environment
    testHomeDir = path.join(os.tmpdir(), `test-${Date.now()}`);
    fs.mkdirSync(testHomeDir, { recursive: true });
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Cleanup
    process.env = originalEnv;
    if (fs.existsSync(testHomeDir)) {
      fs.rmSync(testHomeDir, { recursive: true, force: true });
    }
  });

  test('should handle specific scenario', async () => {
    // Test implementation with proper assertions
    const result = await someFunction();
    expect(result).toBeDefined();
    console.log(`✅ Test scenario completed: ${result}`);
  });
});
```

## Related Documentation

- [Binary Discovery Implementation](../../utils/binaryDiscovery.ts)
- [VSCode Setting Documentation](../../docs/NODE_BINARY_PATH_SETTING.md)
- [CLI Spawner Integration](../../utils/cliSpawner.ts)
- [Core Package Documentation](../../../x-fidelity-core/README.md)