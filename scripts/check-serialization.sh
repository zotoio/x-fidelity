#!/bin/bash
# Pre-commit hook to check for unsafe serialization patterns
# Prevents toJSON errors by detecting problematic code patterns

set -e

echo "🔍 Checking for unsafe serialization patterns..."

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Counters
errors=0
warnings=0

# Check for unsafe webview.postMessage calls
echo "Checking for unsafe webview.postMessage calls..."
if grep -r "webview\.postMessage" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules | grep -v -E "(SafeWebview|safeSerialize|SerializationService)"; then
  echo -e "${RED}❌ Found unsafe webview.postMessage calls!${NC}"
  echo "Please use SafeWebview or wrap with safeSerializeForVSCode"
  echo ""
  errors=$((errors + 1))
fi

# Check for direct JSON.stringify on potentially unsafe objects
echo "Checking for unsafe JSON.stringify patterns..."
if grep -r "JSON\.stringify.*\b(diagnostic\|range\|position\|uri\|location)\b" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules -i; then
  echo -e "${YELLOW}⚠️  Found potential unsafe JSON.stringify on VSCode objects${NC}"
  echo "Consider using SerializationService instead"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for missing serialization in webview creation
echo "Checking for webview creation without serialization safeguards..."
if grep -r "createWebviewPanel" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules -A 10 | grep -v -E "(SafeWebview|SerializationService)" | grep -E "(postMessage|send)"; then
  echo -e "${YELLOW}⚠️  Found webview creation that might not use safe serialization${NC}"
  echo "Ensure webviews use SafeWebview wrapper"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for missing import of serialization utilities
echo "Checking for files with webview usage but missing serialization imports..."
files_with_webview=$(grep -r -l "webview" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules)
for file in $files_with_webview; do
  if ! grep -q -E "(SafeWebview|SerializationService|safeSerialize)" "$file"; then
    echo -e "${YELLOW}⚠️  File $file uses webview but doesn't import serialization utilities${NC}"
    warnings=$((warnings + 1))
  fi
done

# Check for Map/Set without serialization handling
echo "Checking for Map/Set usage without serialization consideration..."
if grep -r -E "\bnew\s+(Map|Set)\b" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules; then
  echo -e "${YELLOW}⚠️  Found Map/Set usage. Ensure proper serialization if these objects are passed to webviews${NC}"
  echo "Map/Set objects require special handling for serialization"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for circular reference potential
echo "Checking for potential circular reference patterns..."
if grep -r -E "this\.[a-zA-Z_][a-zA-Z0-9_]*\s*=.*this\b" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules; then
  echo -e "${YELLOW}⚠️  Found potential circular reference patterns${NC}"
  echo "Ensure objects with circular references use proper serialization"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for Error objects in data structures that might be serialized
echo "Checking for Error objects in serializable contexts..."
if grep -r -E "(errors?:\s*Error|error:\s*Error)" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules; then
  echo -e "${YELLOW}⚠️  Found Error objects in data structures${NC}"
  echo "Error objects may not serialize properly. Consider converting to plain objects"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for functions in interfaces that might be serialized
echo "Checking for function properties in interfaces..."
if grep -r -E ":\s*\([^)]*\)\s*=>" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules --exclude="*.test.ts"; then
  echo -e "${YELLOW}⚠️  Found function properties in types${NC}"
  echo "Function properties cannot be serialized. Use @NonSerializable decorator if needed"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for console.log with complex objects (might indicate debugging serialization issues)
echo "Checking for console.log with complex objects..."
complex_logs=$(grep -r -E "console\.(log|debug|info|warn|error).*\{.*\}" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules | wc -l)
if [ "$complex_logs" -gt 5 ]; then
  echo -e "${YELLOW}⚠️  Found many console.log statements with objects (${complex_logs})${NC}"
  echo "Consider using SerializationService.debugSerialization() for better debugging"
  echo ""
  warnings=$((warnings + 1))
fi

# Check for missing error handling in async operations that might involve serialization
echo "Checking for async operations without proper error handling..."
if grep -r -E "async\s+\w+.*\{[^}]*postMessage" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules | grep -v "try\|catch"; then
  echo -e "${YELLOW}⚠️  Found async operations with postMessage without error handling${NC}"
  echo "Async serialization operations should include proper error handling"
  echo ""
  warnings=$((warnings + 1))
fi

# Additional check for specific VSCode API misuse
echo "Checking for specific VSCode API serialization issues..."

# Check for TextDocument serialization attempts
if grep -r -E "(JSON\.stringify|serialize).*[Tt]extDocument" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules; then
  echo -e "${RED}❌ Found TextDocument serialization attempts!${NC}"
  echo "TextDocument objects cannot be serialized. Extract needed properties instead"
  echo ""
  errors=$((errors + 1))
fi

# Check for WorkspaceFolder serialization
if grep -r -E "(JSON\.stringify|serialize).*[Ww]orkspaceFolder" packages/x-fidelity-vscode/src --include="*.ts" --exclude-dir=node_modules; then
  echo -e "${RED}❌ Found WorkspaceFolder serialization attempts!${NC}"
  echo "WorkspaceFolder objects cannot be serialized. Use uri.fsPath instead"
  echo ""
  errors=$((errors + 1))
fi

# Summary
echo ""
echo "=== Serialization Safety Check Summary ==="
echo -e "Errors: ${RED}$errors${NC}"
echo -e "Warnings: ${YELLOW}$warnings${NC}"

if [ $errors -gt 0 ]; then
  echo -e "${RED}❌ Serialization safety check failed with $errors errors!${NC}"
  echo ""
  echo "Fix these issues before committing:"
  echo "1. Use SafeWebview instead of direct webview.postMessage"
  echo "2. Use SerializationService for complex objects"
  echo "3. Wrap VSCode objects with serialization utilities"
  echo "4. Avoid serializing TextDocument, WorkspaceFolder, and other complex VSCode objects"
  echo ""
  echo "For help, see: packages/x-fidelity-vscode/SERIALIZATION_GUIDE.md"
  exit 1
fi

if [ $warnings -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Serialization safety check completed with $warnings warnings${NC}"
  echo "Consider addressing these warnings to improve serialization safety"
else
  echo -e "${GREEN}✅ Serialization safety check passed!${NC}"
fi

echo ""
echo "To run this check manually: ./scripts/check-serialization.sh"
echo "To skip this check: git commit --no-verify" 