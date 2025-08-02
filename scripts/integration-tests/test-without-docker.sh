#!/bin/bash

# X-Fidelity Integration Test (Docker-free version)
# Basic validation that can run without Docker dependency

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 X-Fidelity Integration Test (Docker-free)${NC}"
echo -e "${YELLOW}This test validates the integration test system and workflow without Docker${NC}\n"

# Test 1: Validate file structure
echo -e "${BLUE}📁 Testing integration test file structure...${NC}"

required_files=(
    "scripts/integration-tests/Dockerfile"
    "scripts/integration-tests/docker-compose.yml"
    "scripts/integration-tests/run-local-test.sh"
    "scripts/integration-tests/run-release-integration-test.sh"
    "scripts/integration-tests/validate-workflow.sh"
    "scripts/integration-tests/README.md"
    ".github/workflows/release.yml"
    "packages/x-fidelity-cli/.releaserc.json"
    "packages/x-fidelity-vscode/.releaserc.json"
)

missing_files=()
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        missing_files+=("$file")
    fi
done

if [[ ${#missing_files[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All required files present${NC}"
else
    echo -e "${RED}❌ Missing files:${NC}"
    for file in "${missing_files[@]}"; do
        echo "  - $file"
    done
    exit 1
fi

# Test 2: Validate script permissions
echo -e "\n${BLUE}🔐 Testing script permissions...${NC}"

executable_scripts=(
    "scripts/integration-tests/run-local-test.sh"
    "scripts/integration-tests/run-release-integration-test.sh"
    "scripts/integration-tests/validate-workflow.sh"
)

non_executable=()
for script in "${executable_scripts[@]}"; do
    if [[ ! -x "$script" ]]; then
        non_executable+=("$script")
    fi
done

if [[ ${#non_executable[@]} -eq 0 ]]; then
    echo -e "${GREEN}✅ All scripts are executable${NC}"
else
    echo -e "${RED}❌ Non-executable scripts:${NC}"
    for script in "${non_executable[@]}"; do
        echo "  - $script"
    done
    # Fix permissions automatically
    echo -e "${YELLOW}🔧 Fixing permissions...${NC}"
    chmod +x "${executable_scripts[@]}"
    echo -e "${GREEN}✅ Permissions fixed${NC}"
fi

# Test 3: Validate workflow configuration
echo -e "\n${BLUE}⚙️  Testing workflow configuration...${NC}"

workflow_file=".github/workflows/release.yml"

# Check for new synchronized release logic
if grep -q "test-all-packages" "$workflow_file"; then
    echo -e "${GREEN}✅ Comprehensive testing job found${NC}"
else
    echo -e "${RED}❌ test-all-packages job missing from workflow${NC}"
    exit 1
fi

if grep -q "Prepare synchronized release" "$workflow_file"; then
    echo -e "${GREEN}✅ Synchronized release logic found${NC}"
else
    echo -e "${RED}❌ Synchronized release logic missing from workflow${NC}"
    exit 1
fi

# Check that conditional logic was removed
if grep -q "needs.changes.outputs.vscode == 'true' || needs.release-cli.outputs.cli-published == 'true'" "$workflow_file"; then
    echo -e "${RED}❌ Old conditional release logic still present${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Conditional release logic properly removed${NC}"
fi

# Test 4: Validate semantic-release configurations
echo -e "\n${BLUE}📦 Testing semantic-release configurations...${NC}"

cli_releaserc="packages/x-fidelity-cli/.releaserc.json"
vscode_releaserc="packages/x-fidelity-vscode/.releaserc.json"

# Check CLI semantic-release config
if [[ -f "$cli_releaserc" ]]; then
    if grep -q "prepareCmd.*build:production" "$cli_releaserc"; then
        echo -e "${GREEN}✅ CLI build step configured in semantic-release${NC}"
    else
        echo -e "${RED}❌ CLI build step missing from semantic-release${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ CLI .releaserc.json missing${NC}"
    exit 1
fi

# Check VSCode semantic-release config
if [[ -f "$vscode_releaserc" ]]; then
    if grep -q "prepareCmd.*build:production" "$vscode_releaserc"; then
        echo -e "${GREEN}✅ VSCode build step configured in semantic-release${NC}"
    else
        echo -e "${RED}❌ VSCode build step missing from semantic-release${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ VSCode .releaserc.json missing${NC}"
    exit 1
fi

# Test 5: Basic package build validation
echo -e "\n${BLUE}🔨 Testing basic package builds...${NC}"

# Test CLI build
echo -e "${YELLOW}Testing CLI build...${NC}"
cd packages/x-fidelity-cli
if yarn build >/dev/null 2>&1; then
    if [[ -f "dist/xfidelity" ]]; then
        echo -e "${GREEN}✅ CLI builds successfully with binary${NC}"
    else
        echo -e "${RED}❌ CLI build missing binary file${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ CLI build failed${NC}"
    exit 1
fi
cd ../..

# Test VSCode build
echo -e "${YELLOW}Testing VSCode build...${NC}"
cd packages/x-fidelity-vscode
if yarn build >/dev/null 2>&1; then
    echo -e "${GREEN}✅ VSCode builds successfully${NC}"
else
    echo -e "${RED}❌ VSCode build failed${NC}"
    exit 1
fi
cd ../..

# Test 6: Integration test script validation
echo -e "\n${BLUE}📝 Testing integration test scripts...${NC}"

# Basic syntax validation for shell scripts
for script in "${executable_scripts[@]}"; do
    if bash -n "$script"; then
        echo -e "${GREEN}✅ $script syntax valid${NC}"
    else
        echo -e "${RED}❌ $script syntax error${NC}"
        exit 1
    fi
done

# Final summary
echo -e "\n${BLUE}📊 Integration Test Summary${NC}"
echo -e "${GREEN}✅ File structure validation passed${NC}"
echo -e "${GREEN}✅ Script permissions validation passed${NC}"
echo -e "${GREEN}✅ Workflow configuration validation passed${NC}"
echo -e "${GREEN}✅ Semantic-release configuration validation passed${NC}"
echo -e "${GREEN}✅ Basic package builds validation passed${NC}"
echo -e "${GREEN}✅ Integration test scripts validation passed${NC}"

echo -e "\n${GREEN}🎉 All integration tests passed without Docker!${NC}"
echo -e "\n${YELLOW}💡 To run full containerized tests:${NC}"
echo -e "   1. Install Docker and Docker Compose"
echo -e "   2. Run: ./scripts/integration-tests/run-local-test.sh"
echo -e "\n${YELLOW}📚 For more information:${NC}"
echo -e "   See: scripts/integration-tests/README.md"

exit 0