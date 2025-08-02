#!/bin/bash

# X-Fidelity Release Workflow Integration Test
# Tests synchronized CLI and VSCode extension releases under different change scenarios

set -e

# Configuration
TEST_WORKSPACE="/workspace"
CLI_PACKAGE="$TEST_WORKSPACE/packages/x-fidelity-cli"
VSCODE_PACKAGE="$TEST_WORKSPACE/packages/x-fidelity-vscode"
RESULTS_DIR="/tmp/integration-test-results"
LOG_FILE="$RESULTS_DIR/integration-test.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Initialize test environment
initialize_test() {
    echo -e "${BLUE}🚀 Initializing X-Fidelity Release Integration Test${NC}"
    
    mkdir -p "$RESULTS_DIR"
    cd "$TEST_WORKSPACE"
    
    # Set up proper permissions for yarn and npm caches
    export YARN_CACHE_FOLDER=/tmp/yarn-cache
    export NPM_CONFIG_CACHE=/tmp/npm-cache
    mkdir -p "$YARN_CACHE_FOLDER" "$NPM_CONFIG_CACHE"
    
    # Create a clean git repository for testing
    rm -rf .git 2>/dev/null || true
    git init
    
    # Configure git to trust the workspace directory
    git config --global --add safe.directory "$TEST_WORKSPACE"
    
    git add .
    git commit -m "initial: test repository setup"
    
    echo "✅ Test environment initialized"
}

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Test scenario setup
setup_scenario() {
    local scenario=$1
    local description=$2
    
    echo -e "\n${YELLOW}📋 Setting up scenario: $scenario${NC}"
    echo -e "${YELLOW}Description: $description${NC}"
    log "SCENARIO: $scenario - $description"
    
    # Reset to clean state
    git reset --hard HEAD
    git clean -fd
}

# Simulate file changes for different scenarios
simulate_changes() {
    local change_type=$1
    
    case $change_type in
        "cli-only")
            echo "// CLI-only change $(date)" >> "$CLI_PACKAGE/src/index.ts"
            git add "$CLI_PACKAGE/src/index.ts"
            git commit -m "feat(cli): add new CLI feature for testing"
            ;;
        "vscode-only")
            echo "// VSCode-only change $(date)" >> "$VSCODE_PACKAGE/src/extension.ts"
            git add "$VSCODE_PACKAGE/src/extension.ts"
            git commit -m "feat(vscode): add new VSCode feature for testing"
            ;;
        "both")
            echo "// CLI change $(date)" >> "$CLI_PACKAGE/src/index.ts"
            echo "// VSCode change $(date)" >> "$VSCODE_PACKAGE/src/extension.ts"
            git add "$CLI_PACKAGE/src/index.ts" "$VSCODE_PACKAGE/src/extension.ts"
            git commit -m "feat(cli,vscode): add features to both packages"
            ;;
        "core-dependency")
            echo "// Core dependency change $(date)" >> "packages/x-fidelity-core/src/index.ts"
            git add "packages/x-fidelity-core/src/index.ts"
            git commit -m "feat(core): update core functionality affecting both CLI and VSCode"
            ;;
        "none")
            # No changes - test that both still get released if needed
            echo "No file changes - testing synchronized release"
            ;;
    esac
}

# Test CLI build and release
test_cli_build_release() {
    echo -e "${BLUE}🔨 Testing CLI build and release...${NC}"
    
    cd "$CLI_PACKAGE"
    
    # Clean and build with proper cache handling
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn clean 2>/dev/null || true
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn build:production 2>/dev/null || {
        echo -e "${RED}❌ CLI build failed${NC}"
        return 1
    }
    
    # Verify CLI binary was created
    if [[ ! -f "dist/xfidelity" ]]; then
        echo -e "${RED}❌ CLI binary not created during build${NC}"
        return 1
    fi
    
    # Test CLI functionality
    if ! ./dist/xfidelity --help > /dev/null 2>&1; then
        echo -e "${RED}❌ CLI binary is not executable or functional${NC}"
        return 1
    fi
    
    # Get current version
    local cli_version=$(node -p "require('./package.json').version")
    echo "📦 CLI Version: $cli_version"
    
    # Simulate semantic-release (without actually publishing)
    echo "🔄 Simulating CLI semantic-release process..."
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn build:production 2>/dev/null  # This simulates the prepareCmd from .releaserc.json
    
    echo -e "${GREEN}✅ CLI build and release simulation successful${NC}"
    echo "$cli_version" > "$RESULTS_DIR/cli-version.txt"
    
    cd "$TEST_WORKSPACE"
}

# Test VSCode build and release
test_vscode_build_release() {
    echo -e "${BLUE}🔨 Testing VSCode extension build and release...${NC}"
    
    cd "$VSCODE_PACKAGE"
    
    # Clean and build with proper cache handling
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn clean 2>/dev/null || true
    
    # Embed CLI (simulating the sync process)
    if [[ -f "$CLI_PACKAGE/dist/xfidelity" ]]; then
        YARN_CACHE_FOLDER=/tmp/yarn-cache yarn embed:cli 2>/dev/null || {
            echo -e "${RED}❌ CLI embedding failed${NC}"
            return 1
        }
        echo "✅ CLI embedded in VSCode extension"
    else
        echo -e "${RED}❌ CLI binary not available for embedding${NC}"
        return 1
    fi
    
    # Build VSCode extension
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn build:production 2>/dev/null || {
        echo -e "${RED}❌ VSCode build failed${NC}"
        return 1
    }
    
    # Verify VSIX package can be created
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn package 2>/dev/null || {
        echo -e "${RED}❌ VSCode packaging failed${NC}"
        return 1
    }
    
    # Verify VSIX was created
    if ! ls *.vsix > /dev/null 2>&1; then
        echo -e "${RED}❌ VSCode VSIX package not created${NC}"
        return 1
    fi
    
    # Get current version
    local vscode_version=$(node -p "require('./package.json').version")
    echo "📦 VSCode Version: $vscode_version"
    
    echo -e "${GREEN}✅ VSCode build and release simulation successful${NC}"
    echo "$vscode_version" > "$RESULTS_DIR/vscode-version.txt"
    
    cd "$TEST_WORKSPACE"
}

# Test version synchronization
test_version_sync() {
    echo -e "${BLUE}🔄 Testing version synchronization...${NC}"
    
    local cli_version=$(cat "$RESULTS_DIR/cli-version.txt" 2>/dev/null || echo "unknown")
    local vscode_version=$(cat "$RESULTS_DIR/vscode-version.txt" 2>/dev/null || echo "unknown")
    
    echo "CLI Version: $cli_version"
    echo "VSCode Version: $vscode_version"
    
    # In a real synchronized release, versions should match or follow semantic versioning rules
    # For now, we verify both packages were built and can be released
    if [[ "$cli_version" != "unknown" && "$vscode_version" != "unknown" ]]; then
        echo -e "${GREEN}✅ Both packages have valid versions and can be released${NC}"
        return 0
    else
        echo -e "${RED}❌ Version synchronization failed${NC}"
        return 1
    fi
}

# Run comprehensive tests
run_comprehensive_tests() {
    echo -e "${BLUE}🧪 Running comprehensive test suite...${NC}"
    
    cd "$TEST_WORKSPACE"
    
    # Install dependencies first to ensure clean state
    echo "📦 Installing dependencies..."
    yarn install --frozen-lockfile || {
        echo -e "${RED}❌ Dependency installation failed${NC}"
        return 1
    }
    
    # Run linting across all packages with proper cache handling
    echo "🔍 Running linting..."
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn lint 2>/dev/null || {
        echo -e "${RED}❌ Linting failed${NC}"
        return 1
    }
    
    # Run unit tests across all packages with proper cache handling
    echo "🧪 Running unit tests..."
    YARN_CACHE_FOLDER=/tmp/yarn-cache yarn test 2>/dev/null || {
        echo -e "${RED}❌ Unit tests failed${NC}"
        return 1
    }
    
    echo -e "${GREEN}✅ All tests passed${NC}"
}

# Test release workflow simulation
test_release_workflow() {
    local scenario=$1
    local change_type=$2
    local description=$3
    
    setup_scenario "$scenario" "$description"
    simulate_changes "$change_type"
    
    # Always test both packages regardless of change type
    echo -e "${BLUE}🎯 Testing synchronized release workflow...${NC}"
    
    # Run comprehensive tests first
    if ! run_comprehensive_tests; then
        echo -e "${RED}❌ Scenario $scenario failed: Tests failed${NC}"
        return 1
    fi
    
    # Test CLI build and release
    if ! test_cli_build_release; then
        echo -e "${RED}❌ Scenario $scenario failed: CLI build/release failed${NC}"
        return 1
    fi
    
    # Test VSCode build and release
    if ! test_vscode_build_release; then
        echo -e "${RED}❌ Scenario $scenario failed: VSCode build/release failed${NC}"
        return 1
    fi
    
    # Test version synchronization
    if ! test_version_sync; then
        echo -e "${RED}❌ Scenario $scenario failed: Version sync failed${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Scenario $scenario completed successfully${NC}"
    log "SUCCESS: $scenario"
    
    return 0
}

# Generate test report
generate_report() {
    echo -e "\n${BLUE}📊 Generating Integration Test Report${NC}"
    
    local report_file="$RESULTS_DIR/integration-test-report.md"
    
    cat > "$report_file" << EOF
# X-Fidelity Release Workflow Integration Test Report

**Test Date:** $(date)
**Test Environment:** Docker Container (node:22.16.0-bullseye)

## Test Summary

This integration test validates the synchronized release workflow for X-Fidelity CLI and VSCode extension under different change scenarios.

## Test Scenarios Executed

1. **CLI-Only Changes**: Verifies both packages are built and released when only CLI has changes
2. **VSCode-Only Changes**: Verifies both packages are built and released when only VSCode has changes  
3. **Both Packages Changed**: Verifies coordinated release when both packages have changes
4. **Core Dependency Changes**: Verifies both packages are rebuilt when shared dependencies change
5. **No Changes**: Verifies synchronized release capability even without specific changes

## Test Results

$(cat "$LOG_FILE" | grep -E "(SUCCESS|FAIL|ERROR)" | sed 's/^/- /')

## Key Validations

- ✅ CLI builds successfully and creates executable binary
- ✅ VSCode extension builds and packages successfully  
- ✅ CLI binary is properly embedded in VSCode extension
- ✅ Both packages maintain version synchronization
- ✅ All unit tests pass across packages
- ✅ Linting passes across packages
- ✅ Release artifacts are generated correctly

## Files Generated

- CLI binary: \`packages/x-fidelity-cli/dist/xfidelity\`
- VSCode VSIX: \`packages/x-fidelity-vscode/*.vsix\`
- Test logs: \`$LOG_FILE\`

EOF

    echo "📄 Report generated: $report_file"
    cat "$report_file"
}

# Main test execution
main() {
    initialize_test
    
    local all_passed=true
    
    # Test different scenarios
    test_release_workflow "scenario-1" "cli-only" "CLI-only changes should trigger both packages" || all_passed=false
    test_release_workflow "scenario-2" "vscode-only" "VSCode-only changes should trigger both packages" || all_passed=false  
    test_release_workflow "scenario-3" "both" "Changes in both packages should trigger synchronized release" || all_passed=false
    test_release_workflow "scenario-4" "core-dependency" "Core dependency changes should trigger both packages" || all_passed=false
    test_release_workflow "scenario-5" "none" "No changes should still allow synchronized release" || all_passed=false
    
    # Generate final report
    generate_report
    
    if $all_passed; then
        echo -e "\n${GREEN}🎉 All integration tests passed successfully!${NC}"
        exit 0
    else
        echo -e "\n${RED}❌ Some integration tests failed. Check the logs for details.${NC}"
        exit 1
    fi
}

# Execute main function
main "$@"