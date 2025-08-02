#!/bin/bash

# Test Container Setup - Validates Docker container configuration without full tests
# This script tests that the Docker container can be built and basic operations work

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🐳 Testing Docker Container Setup${NC}"
echo -e "${YELLOW}This validates the container can be built and basic operations work${NC}\n"

# Check Docker availability
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is required but not installed${NC}"
    exit 1
fi

# Check Docker Compose availability
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is required but not installed${NC}"
    exit 1
fi

cd "$SCRIPT_DIR"

echo -e "${BLUE}🔨 Building test container...${NC}"
docker compose build release-integration-test

echo -e "\n${BLUE}🧪 Testing basic container operations...${NC}"

# Test 1: Container can start and yarn is available
echo -e "${YELLOW}Testing yarn availability...${NC}"
if docker compose run --rm release-integration-test yarn --version; then
    echo -e "${GREEN}✅ Yarn is available in container${NC}"
else
    echo -e "${RED}❌ Yarn not available in container${NC}"
    exit 1
fi

# Test 2: Git operations work
echo -e "\n${YELLOW}Testing git operations...${NC}"
if docker compose run --rm release-integration-test bash -c "cd /workspace && git status"; then
    echo -e "${GREEN}✅ Git operations work in container${NC}"
else
    echo -e "${RED}❌ Git operations failed in container${NC}"
    exit 1
fi

# Test 3: File system permissions
echo -e "\n${YELLOW}Testing file system permissions...${NC}"
if docker compose run --rm release-integration-test bash -c "cd /workspace && touch test-file && rm test-file"; then
    echo -e "${GREEN}✅ File system is writable${NC}"
else
    echo -e "${RED}❌ File system permission issues${NC}"
    exit 1
fi

# Test 4: Yarn cache operations
echo -e "\n${YELLOW}Testing yarn cache operations...${NC}"
if docker compose run --rm release-integration-test bash -c "export YARN_CACHE_FOLDER=/tmp/yarn-cache && yarn install --check-files"; then
    echo -e "${GREEN}✅ Yarn cache operations work${NC}"
else
    echo -e "${RED}❌ Yarn cache operations failed${NC}"
    exit 1
fi

# Test 5: Basic package build test
echo -e "\n${YELLOW}Testing basic CLI build...${NC}"
if docker compose run --rm release-integration-test bash -c "cd /workspace/packages/x-fidelity-cli && YARN_CACHE_FOLDER=/tmp/yarn-cache yarn build 2>/dev/null"; then
    echo -e "${GREEN}✅ CLI builds successfully in container${NC}"
else
    echo -e "${RED}❌ CLI build failed in container${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 All container setup tests passed!${NC}"
echo -e "\n${BLUE}📋 Summary:${NC}"
echo -e "✅ Container builds successfully"
echo -e "✅ Yarn is properly installed and configured"
echo -e "✅ Git operations work with proper permissions"
echo -e "✅ File system is writable (no read-only errors)"
echo -e "✅ Yarn cache operations work correctly"
echo -e "✅ Package builds work in containerized environment"

echo -e "\n${YELLOW}💡 The container is ready for full integration tests!${NC}"
echo -e "Run: ./scripts/integration-tests/run-local-test.sh"

# Cleanup
echo -e "\n${BLUE}🧹 Cleaning up test artifacts...${NC}"
docker compose down --remove-orphans >/dev/null 2>&1 || true

echo -e "${GREEN}✅ Container setup validation complete!${NC}"