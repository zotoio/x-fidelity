#!/bin/bash

# Setup script for x-fidelity global install testing environment
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔧 Setting up x-fidelity global install testing environment..."

# Function to check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required but not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo "❌ Docker is not running. Please start Docker first."
        exit 1
    fi
    
    echo "✅ Docker is available and running"
}

# Function to build test Docker images
build_test_images() {
    echo "🐳 Building test Docker images..."
    
    cd "$PROJECT_ROOT/global-install-testing"
    
    # Build clean test environment
    docker build -f Dockerfile.test-env -t x-fidelity-test-env .
    echo "✅ Built x-fidelity-test-env image"
    
    # Build local package test environment
    docker build -f Dockerfile.local-package -t x-fidelity-local-test .
    echo "✅ Built x-fidelity-local-test image"
}

# Function to copy fixtures from x-fidelity-fixtures package
copy_fixtures() {
    echo "📁 Copying fixtures from x-fidelity-fixtures package..."
    
    local fixtures_dir="$PROJECT_ROOT/global-install-testing/fixtures"
    local source_fixtures="$PROJECT_ROOT/packages/x-fidelity-fixtures/node-fullstack"
    
    # Ensure fixtures directory exists
    mkdir -p "$fixtures_dir"
    
    # Remove any existing sample-project directory
    rm -rf "$fixtures_dir/sample-project"
    
    # Copy the node-fullstack fixture as our sample project
    cp -r "$source_fixtures" "$fixtures_dir/sample-project"
    
    # Clean up any build artifacts or temporary files that shouldn't be in test
    rm -rf "$fixtures_dir/sample-project/node_modules"
    rm -f "$fixtures_dir/sample-project/yarn.lock"
    rm -f "$fixtures_dir/sample-project/test-results.json"
    rm -f "$fixtures_dir/sample-project/trace_output.log"
    rm -f "$fixtures_dir/sample-project/x-fidelity.log"
    
    echo "✅ Copied fixtures to $fixtures_dir/sample-project"
}

# Main execution
main() {
    echo "🚀 Starting x-fidelity global install testing setup..."
    
    check_docker
    build_test_images
    copy_fixtures
    
    echo ""
    echo "✅ Setup complete! You can now run global install tests using:"
    echo "   cd $PROJECT_ROOT/global-install-testing"
    echo "   ./scripts/test-published.sh    # Test published package"
    echo "   ./scripts/test-local.sh        # Test local package"
    echo ""
}

# Run main function
main "$@"