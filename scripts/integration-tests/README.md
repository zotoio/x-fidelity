# X-Fidelity Release Workflow Integration Tests

This directory contains comprehensive integration tests for the X-Fidelity release workflow, designed to ensure both CLI and VSCode extension packages are always built, tested, and released together regardless of which components have changes.

## 🎯 **Purpose**

The integration tests validate that:

1. **Synchronized Releases**: Both CLI and VSCode are always released together
2. **Complete Testing**: All packages are built and tested before releases  
3. **Version Consistency**: Both packages maintain synchronized versioning
4. **Cross-platform Compatibility**: Release process works consistently across environments
5. **Artifact Generation**: All required build artifacts are properly created

## 📁 **File Structure**

```
scripts/integration-tests/
├── README.md                          # This documentation
├── Dockerfile                         # Test container definition
├── docker-compose.yml                 # Container orchestration
├── run-local-test.sh                  # Main test runner (executable)
├── run-release-integration-test.sh    # Core integration test logic
├── validate-workflow.sh               # Workflow configuration validator
├── test-without-docker.sh             # Docker-free validation test (executable)
├── test-container-setup.sh            # Docker container setup validation (executable)
└── results/                           # Test results directory (created during tests)
    ├── integration-test.log            # Detailed test execution log
    ├── integration-test-report.md      # Comprehensive test report
    └── workflow-recommendations.md     # Workflow improvement suggestions
```

## 🚀 **Quick Start**

### Prerequisites

**For Full Containerized Tests:**
- Docker (latest version)
- Docker Compose (latest version)
- Bash shell

**For Basic Validation (Docker-free):**
- Bash shell
- Node.js and Yarn (for build testing)

### Run Tests

```bash
# === DOCKER-FREE TESTING (Recommended for quick validation) ===
./scripts/integration-tests/test-without-docker.sh

# === DOCKER CONTAINER SETUP TESTING ===
./scripts/integration-tests/test-container-setup.sh

# === FULL CONTAINERIZED TESTING ===
# Run complete integration test suite
./scripts/integration-tests/run-local-test.sh

# Run with verbose output
./scripts/integration-tests/run-local-test.sh test --verbose

# Run workflow validation only
./scripts/integration-tests/run-local-test.sh validate
```

## 📋 **Test Scenarios**

The integration tests cover these critical scenarios:

### 1. **CLI-Only Changes**
**Scenario**: Only CLI package has changes  
**Expected**: Both CLI and VSCode are built, tested, and released  
**Validation**: VSCode gets sync commit and synchronized release  

### 2. **VSCode-Only Changes** 
**Scenario**: Only VSCode extension has changes  
**Expected**: Both CLI and VSCode are built, tested, and released  
**Validation**: CLI gets sync commit and synchronized release  

### 3. **Both Packages Changed**
**Scenario**: Both CLI and VSCode have changes  
**Expected**: Both packages are released with their respective changes  
**Validation**: No sync commits needed, both get natural releases  

### 4. **Core Dependency Changes**
**Scenario**: Changes in shared packages (core, types, plugins)  
**Expected**: Both CLI and VSCode detect changes and get released  
**Validation**: Path filters trigger both package releases  

### 5. **No Direct Changes**
**Scenario**: No specific package changes, but synchronized release needed  
**Expected**: Both packages get sync commits and releases  
**Validation**: Synchronized versioning maintained  

## 🔧 **Detailed Usage**

### Command Reference

```bash
# Test Commands
./run-local-test.sh test                    # Run full integration test
./run-local-test.sh test --verbose          # Verbose test output
./run-local-test.sh test --keep-running     # Keep container for debugging

# Validation Commands  
./run-local-test.sh validate                # Validate workflow config
./run-local-test.sh build                   # Build test container only
./run-local-test.sh build --rebuild         # Force rebuild container

# Utility Commands
./run-local-test.sh clean                   # Clean up test artifacts
./run-local-test.sh logs                    # Show last test logs
./run-local-test.sh report                  # Display last test report
./run-local-test.sh help                    # Show help information
```

### Environment Variables

```bash
# Optional environment variables for testing
export NODE_ENV=test                        # Test environment
export CI=true                             # Simulate CI environment
export GITHUB_ACTIONS=true                 # Simulate GitHub Actions
```

## 📊 **Test Validation**

Each test scenario validates:

### Build Validation
- ✅ CLI builds successfully and creates `dist/xfidelity` binary
- ✅ VSCode extension builds and creates `.vsix` package
- ✅ All linting passes across packages
- ✅ All unit tests pass with coverage

### Integration Validation  
- ✅ CLI binary is executable and functional
- ✅ CLI is properly embedded in VSCode extension
- ✅ VSCode extension can package successfully
- ✅ Both packages have valid version numbers

### Workflow Validation
- ✅ Semantic-release configurations are correct
- ✅ Build steps are included in release process
- ✅ Version synchronization logic works
- ✅ Artifact archiving is properly configured

## 🐛 **Troubleshooting**

### Common Issues

#### Test Failures
```bash
# Check detailed logs
./run-local-test.sh logs

# Run with verbose output for debugging
./run-local-test.sh test --verbose

# Debug interactively
./run-local-test.sh test --keep-running
```

#### Container Issues
```bash
# Clean and rebuild
./run-local-test.sh clean
./run-local-test.sh build --rebuild
./run-local-test.sh test
```

#### Permission Issues
```bash
# Ensure scripts are executable
chmod +x scripts/integration-tests/*.sh

# Fix results directory permissions
sudo chown -R $USER:$USER scripts/integration-tests/results/
```

### Log Analysis

Test logs are structured with timestamps and log levels:

```
[2024-08-02 10:00:00] SCENARIO: scenario-1 - CLI-only changes should trigger both packages
[2024-08-02 10:00:05] SUCCESS: scenario-1
[2024-08-02 10:00:10] SCENARIO: scenario-2 - VSCode-only changes should trigger both packages
```

### Debug Mode

For interactive debugging:

```bash
# Run container in interactive mode
./run-local-test.sh test --keep-running

# Inside container, run tests manually
cd /workspace
./scripts/integration-tests/run-release-integration-test.sh
```

## 📈 **Test Reports**

### Integration Test Report
Generated at: `scripts/integration-tests/results/integration-test-report.md`

Contains:
- Test execution summary
- Scenario-by-scenario results  
- Build artifact validation
- Performance metrics
- Recommendations

### Workflow Recommendations  
Generated at: `scripts/integration-tests/results/workflow-recommendations.md`

Contains:
- Workflow configuration analysis
- Suggested improvements
- Best practices alignment
- Implementation priorities

## 🔄 **CI/CD Integration**

### Local Development
```bash
# Before committing workflow changes
./scripts/integration-tests/run-local-test.sh validate

# Full integration test before major releases
./scripts/integration-tests/run-local-test.sh test
```

### GitHub Actions Integration
The tests can be integrated into GitHub Actions:

```yaml
# Example: Add to .github/workflows/ci.yml
- name: Run Release Integration Tests
  run: |
    ./scripts/integration-tests/run-local-test.sh test
    
- name: Validate Workflow Configuration  
  run: |
    ./scripts/integration-tests/run-local-test.sh validate
```

## 📚 **References**

- [GitHub Actions Workflow](../../.github/workflows/release.yml)
- [CLI Semantic Release Config](../../packages/x-fidelity-cli/.releaserc.json)
- [VSCode Semantic Release Config](../../packages/x-fidelity-vscode/.releaserc.json)
- [Main Project README](../../README.md)

## 🤝 **Contributing**

When modifying the integration tests:

1. **Test Changes Locally**: Always run tests before committing
2. **Update Documentation**: Modify this README for new scenarios
3. **Validate Workflow**: Ensure workflow changes are compatible
4. **Review Reports**: Check generated reports for insights

### Adding New Test Scenarios

1. Add scenario to `run-release-integration-test.sh`
2. Update `simulate_changes()` function for new change types
3. Add validation logic to `test_release_workflow()`
4. Update this README with new scenario documentation

## 📄 **License**

Part of the X-Fidelity project. See main project license for details.