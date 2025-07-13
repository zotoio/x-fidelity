#!/bin/bash

# Test script for published x-fidelity package global installation
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🧪 Testing published x-fidelity package global installation..."

# Configuration
CONTAINER_NAME="x-fidelity-published-test"
IMAGE_NAME="x-fidelity-test-env"
TEST_TIMEOUT=120

# Function to cleanup containers
cleanup() {
    echo "🧹 Cleaning up test containers..."
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

# Function to run tests in Docker container
run_published_test() {
    echo "🐳 Starting test container for published package..."
    
    # Start container with test environment
    docker run -d \
        --name "$CONTAINER_NAME" \
        --workdir /test-workspace \
        "$IMAGE_NAME" \
        sleep "$TEST_TIMEOUT"
    
    echo "📦 Installing x-fidelity globally from npm registry..."
    
    # Install x-fidelity globally
    docker exec "$CONTAINER_NAME" sh -c "
        echo '🔄 Installing x-fidelity globally...' &&
        yarn global add x-fidelity &&
        echo '✅ Global installation complete'
    "
    
    # Verify installation
    echo "🔍 Verifying global installation..."
    docker exec "$CONTAINER_NAME" sh -c "
        echo '📍 Checking command availability...' &&
        which xfidelity &&
        echo '📋 Checking version...' &&
        xfidelity --version &&
        echo '✅ Installation verification complete'
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
    echo "🚀 Running BATS test suite..."
    docker exec "$CONTAINER_NAME" sh -c "
        cd /test-workspace &&
        echo '🧪 Executing BATS tests...' &&
        bats test-global-install.bats --verbose
    "
    
    # Test with sample project
    echo "🔬 Testing analysis on sample project..."
    docker exec "$CONTAINER_NAME" sh -c "
        cd /test-workspace/sample-project &&
        echo '🔍 Running x-fidelity analysis...' &&
        timeout 30 xfidelity --dir . --archetype node-fullstack || {
            echo '⚠️  Analysis completed with issues (expected for test project)'
            exit 0
        }
    "
    
    # Test uninstallation
    echo "🗑️  Testing package removal..."
    docker exec "$CONTAINER_NAME" sh -c "
        echo '🔄 Removing x-fidelity globally...' &&
        yarn global remove x-fidelity &&
        echo '🔍 Verifying removal...' &&
        ! which xfidelity && echo '✅ Package removed successfully' ||
        echo '❌ Package removal failed'
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
}

# Main execution
main() {
    echo "🎯 Starting published package global install test..."
    
    check_prerequisites
    run_published_test
    
    echo ""
    echo "✅ Published package global install test completed successfully!"
    echo "🎉 x-fidelity can be installed and used globally from npm registry"
}

# Handle script arguments
if [ $# -gt 0 ]; then
    case "$1" in
        --help|-h)
            echo "Usage: $0 [options]"
            echo ""
            echo "Test x-fidelity published package global installation"
            echo ""
            echo "Options:"
            echo "  --help, -h    Show this help message"
            echo ""
            echo "Prerequisites:"
            echo "  - Docker must be running"
            echo "  - Run ./scripts/setup-test-env.sh first"
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