#!/bin/bash

# Local Integration Test Runner for X-Fidelity Release Workflow
# Provides convenient interface for running release workflow integration tests

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Help message
show_help() {
    cat << EOF
X-Fidelity Release Workflow Integration Test Runner

USAGE:
    $0 [COMMAND] [OPTIONS]

COMMANDS:
    test            Run full integration test suite (default)
    validate        Validate workflow configuration only
    build           Build test container without running tests
    clean           Clean up test artifacts and containers
    logs            Show logs from last test run
    report          Generate and display test report
    help            Show this help message

OPTIONS:
    --rebuild       Force rebuild of test container
    --verbose       Enable verbose output
    --keep-running  Keep container running after tests for debugging

EXAMPLES:
    $0                          # Run full integration test
    $0 test --verbose           # Run tests with verbose output  
    $0 validate                 # Only validate workflow config
    $0 build --rebuild          # Force rebuild test container
    $0 clean                    # Clean up all test artifacts

DESCRIPTION:
    This script runs comprehensive integration tests to validate that the X-Fidelity
    release workflow properly builds, tests, and releases both CLI and VSCode extension
    packages under different change scenarios.

    The tests simulate:
    - CLI-only changes
    - VSCode-only changes  
    - Both packages changed
    - Core dependency changes
    - No changes (synchronized release)

    All tests run in a containerized environment that mimics GitHub Actions.

EOF
}

# Setup test environment
setup() {
    echo -e "${BLUE}🛠️  Setting up integration test environment${NC}"
    
    # Create results directory
    mkdir -p "$RESULTS_DIR"
    
    # Ensure Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is required but not installed${NC}"
        exit 1
    fi
    
    # Ensure Docker Compose is available (try both new and old commands)
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is required but not installed${NC}"
        echo -e "${YELLOW}💡 Install Docker Compose: https://docs.docker.com/compose/install/${NC}"
        exit 1
    fi
    
    cd "$SCRIPT_DIR"
    echo -e "${GREEN}✅ Environment setup complete${NC}"
}

# Build test container
build_container() {
    local rebuild=${1:-false}
    
    echo -e "${BLUE}🔨 Building integration test container${NC}"
    
    cd "$SCRIPT_DIR"
    
    if [[ "$rebuild" == "true" ]]; then
        echo "🔄 Force rebuilding container..."
        docker compose build --no-cache release-integration-test
    else
        docker compose build release-integration-test
    fi
    
    echo -e "${GREEN}✅ Container build complete${NC}"
}

# Run integration tests
run_tests() {
    local verbose=${1:-false}
    local keep_running=${2:-false}
    
    echo -e "${BLUE}🧪 Running X-Fidelity release integration tests${NC}"
    
    cd "$SCRIPT_DIR"
    
    # Make sure results directory exists and is writable
    mkdir -p "$RESULTS_DIR"
    chmod 777 "$RESULTS_DIR"
    
    # Make scripts executable
    chmod +x run-release-integration-test.sh
    chmod +x validate-workflow.sh
    
    # Set docker compose options
    local compose_args=""
    if [[ "$verbose" == "true" ]]; then
        compose_args="--verbose"
    fi
    
    # Run the integration test
    if [[ "$keep_running" == "true" ]]; then
        echo "🔄 Running container in interactive mode..."
        docker compose run --rm release-integration-test bash
    else
        echo "🚀 Executing integration test suite..."
        docker compose run --rm release-integration-test
    fi
    
    # Check if tests passed
    local exit_code=$?
    if [[ $exit_code -eq 0 ]]; then
        echo -e "\n${GREEN}🎉 Integration tests completed successfully!${NC}"
        show_results_summary
    else
        echo -e "\n${RED}❌ Integration tests failed (exit code: $exit_code)${NC}"
        show_failure_help
    fi
    
    return $exit_code
}

# Validate workflow only
validate_workflow() {
    echo -e "${BLUE}🔍 Validating release workflow configuration${NC}"
    
    cd "$SCRIPT_DIR"
    
    # Make sure results directory exists and is writable
    mkdir -p "$RESULTS_DIR"
    chmod 777 "$RESULTS_DIR"
    chmod +x validate-workflow.sh
    
    # Run workflow validation
    docker compose run --rm workflow-validator
    
    echo -e "${GREEN}✅ Workflow validation complete${NC}"
    
    # Show recommendations if they exist
    if [[ -f "$RESULTS_DIR/workflow-recommendations.md" ]]; then
        echo -e "\n${YELLOW}📋 Workflow Recommendations:${NC}"
        cat "$RESULTS_DIR/workflow-recommendations.md" | head -20
        echo -e "\n${BLUE}📄 Full recommendations: $RESULTS_DIR/workflow-recommendations.md${NC}"
    fi
}

# Show test results summary
show_results_summary() {
    echo -e "\n${BLUE}📊 Test Results Summary${NC}"
    
    if [[ -f "$RESULTS_DIR/integration-test-report.md" ]]; then
        echo "📄 Full report: $RESULTS_DIR/integration-test-report.md"
        
        # Show key results
        echo -e "\n${YELLOW}Key Findings:${NC}"
        if grep -q "All integration tests passed" "$RESULTS_DIR/integration-test-report.md"; then
            echo -e "${GREEN}✅ All test scenarios passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Some scenarios need attention${NC}"
        fi
    fi
    
    if [[ -f "$RESULTS_DIR/integration-test.log" ]]; then
        echo -e "\n${YELLOW}Test Summary:${NC}"
        grep -E "(SUCCESS|FAIL|ERROR)" "$RESULTS_DIR/integration-test.log" | tail -10
    fi
}

# Show failure help
show_failure_help() {
    echo -e "\n${YELLOW}🔧 Troubleshooting Help${NC}"
    echo "1. Check test logs: $RESULTS_DIR/integration-test.log"
    echo "2. Run with verbose output: $0 test --verbose"
    echo "3. Debug interactively: $0 test --keep-running"
    echo "4. Validate workflow: $0 validate"
    echo "5. Clean and retry: $0 clean && $0 test"
}

# Clean up test artifacts
clean() {
    echo -e "${BLUE}🧹 Cleaning up test artifacts${NC}"
    
    cd "$SCRIPT_DIR"
    
    # Stop and remove containers
    docker compose down --remove-orphans || true
    
    # Remove test images
    docker compose down --rmi local || true
    
    # Clean results directory
    rm -rf "$RESULTS_DIR"
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Show logs from last test run
show_logs() {
    echo -e "${BLUE}📋 Showing logs from last test run${NC}"
    
    if [[ -f "$RESULTS_DIR/integration-test.log" ]]; then
        cat "$RESULTS_DIR/integration-test.log"
    else
        echo -e "${YELLOW}⚠️  No log file found. Run tests first.${NC}"
    fi
}

# Generate and display report
show_report() {
    echo -e "${BLUE}📊 Displaying test report${NC}"
    
    if [[ -f "$RESULTS_DIR/integration-test-report.md" ]]; then
        cat "$RESULTS_DIR/integration-test-report.md"
    else
        echo -e "${YELLOW}⚠️  No report found. Run tests first.${NC}"
    fi
}

# Parse command line arguments
parse_args() {
    local command=""
    local rebuild=false
    local verbose=false
    local keep_running=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            test|validate|build|clean|logs|report|help)
                command="$1"
                shift
                ;;
            --rebuild)
                rebuild=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --keep-running)
                keep_running=true
                shift
                ;;
            *)
                echo -e "${RED}❌ Unknown option: $1${NC}"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Default command is test
    if [[ -z "$command" ]]; then
        command="test"
    fi
    
    echo "$command $rebuild $verbose $keep_running"
}

# Main execution
main() {
    local args=$(parse_args "$@")
    local command=$(echo $args | cut -d' ' -f1)
    local rebuild=$(echo $args | cut -d' ' -f2)
    local verbose=$(echo $args | cut -d' ' -f3)
    local keep_running=$(echo $args | cut -d' ' -f4)
    
    echo -e "${BLUE}🚀 X-Fidelity Release Workflow Integration Test${NC}"
    echo -e "${BLUE}Command: $command${NC}\n"
    
    case $command in
        test)
            setup
            build_container $rebuild
            run_tests $verbose $keep_running
            ;;
        validate)
            setup
            build_container $rebuild
            validate_workflow
            ;;
        build)
            setup
            build_container $rebuild
            ;;
        clean)
            clean
            ;;
        logs)
            show_logs
            ;;
        report)
            show_report
            ;;
        help)
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function with all arguments
main "$@"