#!/bin/bash

# X-Fidelity Renovate Local Runner
# This script allows you to run Renovate locally for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 X-Fidelity Renovate Local Runner${NC}"
echo "========================================"

# Check if renovate is installed
if ! command -v renovate &> /dev/null; then
    echo -e "${YELLOW}⚠️  Renovate CLI not found. Installing globally...${NC}"
    npm install -g renovate
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}❌ GITHUB_TOKEN environment variable is required${NC}"
    echo "Please set your GitHub personal access token:"
    echo "export GITHUB_TOKEN=your_token_here"
    exit 1
fi

# Default values
DRY_RUN=${DRY_RUN:-true}
LOG_LEVEL=${LOG_LEVEL:-info}
REPO_NAME=${REPO_NAME:-$(git remote get-url origin | sed 's/.*github.com[:/]\([^.]*\).*/\1/')}

echo -e "${GREEN}📋 Configuration:${NC}"
echo "  Repository: $REPO_NAME"
echo "  Dry Run: $DRY_RUN"
echo "  Log Level: $LOG_LEVEL"
echo ""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-dry-run)
            DRY_RUN=false
            shift
            ;;
        --debug)
            LOG_LEVEL=debug
            shift
            ;;
        --trace)
            LOG_LEVEL=trace
            shift
            ;;
        --repo)
            REPO_NAME="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run       Run in dry-run mode (default)"
            echo "  --no-dry-run    Actually create PRs"
            echo "  --debug         Enable debug logging"
            echo "  --trace         Enable trace logging"
            echo "  --repo REPO     Specify repository (owner/name)"
            echo "  -h, --help      Show this help"
            echo ""
            echo "Environment variables:"
            echo "  GITHUB_TOKEN    GitHub personal access token (required)"
            echo "  DRY_RUN         Set to 'false' to create actual PRs"
            echo "  LOG_LEVEL       Set log level (info, debug, trace)"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 Running Renovate...${NC}"

# Set environment variables for Renovate
export RENOVATE_TOKEN="$GITHUB_TOKEN"
export RENOVATE_GIT_AUTHOR="renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>"
export RENOVATE_DRY_RUN="$DRY_RUN"

# Run Renovate
if [ "$DRY_RUN" = "true" ]; then
    LOG_LEVEL="$LOG_LEVEL" renovate \
        --platform=github \
        --token="$RENOVATE_TOKEN" \
        --git-author="$RENOVATE_GIT_AUTHOR" \
        --dry-run=full \
        "$REPO_NAME"
else
    LOG_LEVEL="$LOG_LEVEL" renovate \
        --platform=github \
        --token="$RENOVATE_TOKEN" \
        --git-author="$RENOVATE_GIT_AUTHOR" \
        "$REPO_NAME"
fi

echo ""
if [ "$DRY_RUN" = "true" ]; then
    echo -e "${GREEN}✅ Dry run completed successfully!${NC}"
    echo -e "${YELLOW}💡 To create actual PRs, run with --no-dry-run${NC}"
else
    echo -e "${GREEN}✅ Renovate completed successfully!${NC}"
    echo -e "${BLUE}📋 Check your repository for new pull requests${NC}"
fi 