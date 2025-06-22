#!/bin/bash

# X-Fidelity VSCode Extension - Quick Verification Script
# Professional quick check following Microsoft's best practices

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

echo -e "${BOLD}${MAGENTA}🚀 X-Fidelity VSCode Extension - Quick Verification${RESET}"
echo -e "${CYAN}Following Microsoft's VSCode Extension Testing Guidelines${RESET}\n"

# Function to print status
success() {
    echo -e "${GREEN}✅ $1${RESET}"
}

fail() {
    echo -e "${RED}❌ $1${RESET}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${RESET}"
}

info() {
    echo -e "${BLUE}ℹ️  $1${RESET}"
}

# Navigate to extension directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR/.."

# Quick checks
echo -e "${BOLD}📋 Quick Extension Status Check${RESET}"

# 1. Check if built
if [ -d "dist" ] && [ -f "dist/extension.js" ]; then
    success "Extension built successfully"
else
    fail "Extension not built - run 'yarn build' first"
    exit 1
fi

# 2. Check dependencies
if [ -d "node_modules" ]; then
    success "Dependencies installed"
else
    fail "Dependencies missing - run 'yarn install'"
    exit 1
fi

# 3. Check TypeScript compilation
if yarn tsc --noEmit > /dev/null 2>&1; then
    success "TypeScript compilation clean"
else
    fail "TypeScript compilation errors found"
fi

# 4. Quick package.json validation
if grep -q "x-fidelity-vscode" package.json; then
    success "Package.json name correct"
else
    fail "Package.json name incorrect"
fi

# 5. Check for VSIX
if ls *.vsix 1> /dev/null 2>&1; then
    success "VSIX package exists"
else
    warn "No VSIX package (run 'yarn package' to create)"
fi

echo ""
echo -e "${BOLD}🎯 Ready for Development!${RESET}"
echo -e "${CYAN}Next Steps:${RESET}"
echo -e "  ${GREEN}•${RESET} Press ${BOLD}F5${RESET} in VSCode to launch extension"
echo -e "  ${GREEN}•${RESET} Or run: ${BOLD}yarn dev${RESET}"
echo -e "  ${GREEN}•${RESET} Test with: ${BOLD}Ctrl+Shift+P${RESET} → 'X-Fidelity: Test Extension'"
echo -e "  ${GREEN}•${RESET} Full verification: ${BOLD}yarn verify:all${RESET}"

echo ""
echo -e "${BOLD}⚡ Lightning Status: READY${RESET}" 