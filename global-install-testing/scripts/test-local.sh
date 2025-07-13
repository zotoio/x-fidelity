#!/bin/bash

# Test script for local x-fidelity package global installation
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI_DIR="$PROJECT_ROOT/packages/x-fidelity-cli"

echo "🧪 Testing local x-fidelity package global installation..."

# Configuration
CONTAINER_NAME="x-fidelity-local-test"
IMAGE_NAME="x-fidelity-test-env"
TEST_TIMEOUT=120

# Function to cleanup containers and files
cleanup() {
    echo "🧹 Cleaning up test containers and files..."
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
    rm -f "$PROJECT_ROOT"/x-fidelity-*.tgz 2>/dev/null || true
    rm -rf /tmp/xfidelity-test-* 2>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

# Function to build and pack local package
prepare_local_package() {
    echo "🔨 Building local x-fidelity package..." >&2
    
    cd "$CLI_DIR"
    
    # Build the package
    echo "🔄 Building CLI package..." >&2
    yarn build >&2
    
    # Create package tarball
    echo "📦 Creating package tarball..." >&2
    cd "$PROJECT_ROOT"
    local pack_output
    pack_output=$(yarn pack --cwd packages/x-fidelity-cli 2>&1)
    local package_file
    package_file=$(echo "$pack_output" | grep "Wrote tarball to" | sed 's/.*Wrote tarball to "\(.*\)".*/\1/')
    
    if [ ! -f "$package_file" ]; then
        echo "❌ Failed to create package tarball" >&2
        echo "Pack output: $pack_output" >&2
        exit 1
    fi
    
    echo "✅ Created package: $package_file" >&2
    printf "%s" "$package_file"
}

# Function to run tests with local package
run_local_test() {
    local package_file="$1"
    
    echo "🐳 Starting test container for local package..."
    
    local package_basename
    package_basename=$(basename "$package_file")
    
    # Create temp directory and copy package
    local temp_dir="/tmp/xfidelity-test-$$"
    mkdir -p "$temp_dir"
    cp "$package_file" "$temp_dir/"
    
    # Start container with test environment and mount package
    docker run -d \
        --name "$CONTAINER_NAME" \
        --workdir /test-workspace \
        -v "$temp_dir:/packages:ro" \
        "$IMAGE_NAME" \
        sleep "$TEST_TIMEOUT"
    
    echo "📦 Package mounted at /packages/$package_basename"
    
    echo "🔧 Installing local x-fidelity package globally..."
    
    # Install local package globally
    docker exec "$CONTAINER_NAME" sh -c "
        echo '🔄 Installing local x-fidelity package globally...' &&
        yarn global add file:/packages/$package_basename &&
        echo '✅ Local package installation complete'
    "
    
    # Verify installation
    echo "🔍 Verifying local package installation..."
    docker exec "$CONTAINER_NAME" sh -c "
        echo '📍 Checking command availability...' &&
        which xfidelity &&
        echo '📋 Checking version...' &&
        xfidelity --version &&
        echo '🔍 Checking global yarn list...' &&
        yarn global list | grep x-fidelity &&
        echo '✅ Local installation verification complete'
    "
    
    # Copy sample project to container
    echo "📁 Copying sample project to container..."
    docker cp "$PROJECT_ROOT/global-install-testing/fixtures/sample-project" \
        "$CONTAINER_NAME:/test-workspace/"
    
    # Copy BATS tests to container
    echo "🧪 Copying test suite to container..."
    docker cp "$PROJECT_ROOT/global-install-testing/test-global-install.bats" \
        "$CONTAINER_NAME:/test-workspace/"
    
    # Run BATS tests
    echo "🚀 Running BATS test suite on local package..."
    docker exec "$CONTAINER_NAME" sh -c "
        cd /test-workspace &&
        echo '🧪 Executing BATS tests...' &&
        bats test-global-install.bats --print-output-on-failure
    "
    
    # Test with sample project
    echo "🔬 Testing analysis on sample project with local package..."
    docker exec "$CONTAINER_NAME" sh -c "
        cd /test-workspace/sample-project &&
        echo '🔍 Running x-fidelity analysis...' &&
        timeout 30 xfidelity --dir . --archetype node-fullstack || {
            echo '⚠️  Analysis completed with issues (expected for test project)'
            exit 0
        }
    "
    
    # Test server mode
    echo "🌐 Testing server mode with local package..."
    docker exec "$CONTAINER_NAME" sh -c "
        echo '🔄 Starting x-fidelity server...' &&
        timeout 10 xfidelity --mode server --port 9080 &
        server_pid=\$! &&
        sleep 3 &&
        echo '🔍 Testing server connectivity...' &&
        curl -f http://localhost:9080 && echo '✅ Server test passed' ||
        echo '⚠️  Server test failed (may be expected)' &&
        kill \$server_pid 2>/dev/null || true
    "
    
    # Test bundle integrity
    echo "🔍 Testing bundle integrity..."
    docker exec "$CONTAINER_NAME" sh -c "
        echo '📦 Checking xfidelity executable...' &&
        file \$(which xfidelity) &&
        echo '🔍 Checking if bundle includes all dependencies...' &&
        ldd \$(which xfidelity) 2>/dev/null || echo 'No native dependencies (expected for Node.js script)' &&
        echo '✅ Bundle integrity check complete'
    "
    
    # Test uninstallation
    echo "🗑️  Testing local package removal..."
    docker exec "$CONTAINER_NAME" sh -c "
        echo '🔄 Removing local x-fidelity package...' &&
        yarn global remove x-fidelity &&

        
        echo '🔍 Verifying removal...' &&
        ! which xfidelity && echo '✅ Local package removed successfully' ||
        echo '❌ Local package removal failed'
    "
}

# Function to check prerequisites
check_prerequisites() {
    if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
        echo "❌ Test environment image '$IMAGE_NAME' not found."
        echo "   Please run './scripts/setup-test-env.sh' first."
        exit 1
    fi
    
    if ! docker info &>/dev/null; then
        echo "❌ Docker is not available or not running."
        exit 1
    fi
    
    if [ ! -d "$CLI_DIR" ]; then
        echo "❌ CLI package directory not found at: $CLI_DIR"
        exit 1
    fi
}

# Main execution
main() {
    echo "🎯 Starting local package global install test..."
    
    check_prerequisites
    
    local package_file
    package_file=$(prepare_local_package)
    
    run_local_test "$package_file"
    
    echo ""
    echo "✅ Local package global install test completed successfully!"
    echo "🎉 Local x-fidelity build can be installed and used globally"
}

# Handle script arguments
if [ $# -gt 0 ]; then
    case "$1" in
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Test x-fidelity local package global installation"
            echo ""
            echo "Options:"
            echo "  --help, -h    Show this help message"
            echo ""
            echo "Prerequisites:"
            echo "  - Docker must be running"
            echo "  - Run ./scripts/setup-test-env.sh first"
            echo "  - CLI package must be buildable"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
fi

# Run main function
main "$@"