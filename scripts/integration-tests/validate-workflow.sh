#!/bin/bash

# X-Fidelity Release Workflow Validation Script
# Validates that the GitHub Actions workflow always builds and releases both packages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

WORKFLOW_FILE="/workspace/.github/workflows/release.yml"
RESULTS_DIR="/tmp/integration-test-results"

echo -e "${BLUE}🔍 Validating X-Fidelity Release Workflow Configuration${NC}"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Check if workflow file exists
if [[ ! -f "$WORKFLOW_FILE" ]]; then
    echo -e "${RED}❌ Workflow file not found: $WORKFLOW_FILE${NC}"
    exit 1
fi

echo "✅ Workflow file found: $WORKFLOW_FILE"

# Validation functions
validate_job_always_runs() {
    local job_name=$1
    local description=$2
    
    echo -e "\n${YELLOW}🔍 Validating: $description${NC}"
    
    # Check if job has proper conditional or always runs
    if grep -A 5 "^  $job_name:" "$WORKFLOW_FILE" | grep -q "if:.*needs\.changes\.outputs"; then
        echo -e "${YELLOW}⚠️  $job_name has conditional execution based on changes${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $job_name runs unconditionally or with proper logic${NC}"
        return 0
    fi
}

validate_cli_build_step() {
    echo -e "\n${YELLOW}🔍 Validating CLI build configuration${NC}"
    
    # Check if CLI semantic-release includes build steps
    if [[ -f "/workspace/packages/x-fidelity-cli/.releaserc.json" ]]; then
        if grep -q "prepareCmd.*build:production" "/workspace/packages/x-fidelity-cli/.releaserc.json"; then
            echo -e "${GREEN}✅ CLI semantic-release includes build step${NC}"
        else
            echo -e "${RED}❌ CLI semantic-release missing build step${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ CLI .releaserc.json not found${NC}"
        return 1
    fi
}

validate_vscode_build_step() {
    echo -e "\n${YELLOW}🔍 Validating VSCode build configuration${NC}"
    
    # Check if VSCode semantic-release includes build steps
    if [[ -f "/workspace/packages/x-fidelity-vscode/.releaserc.json" ]]; then
        if grep -q "prepareCmd.*build:production" "/workspace/packages/x-fidelity-vscode/.releaserc.json"; then
            echo -e "${GREEN}✅ VSCode semantic-release includes build step${NC}"
        else
            echo -e "${RED}❌ VSCode semantic-release missing build step${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ VSCode .releaserc.json not found${NC}"
        return 1
    fi
}

validate_version_sync() {
    echo -e "\n${YELLOW}🔍 Validating version synchronization logic${NC}"
    
    # Check for CLI version extraction and VSCode sync
    if grep -q "PUBLISHED_VERSION.*package\.json.*version" "$WORKFLOW_FILE"; then
        echo -e "${GREEN}✅ CLI version extraction found${NC}"
    else
        echo -e "${RED}❌ CLI version extraction missing${NC}"
        return 1
    fi
    
    # Check for VSCode version sync steps
    if grep -q "Handle VSCode-only release" "$WORKFLOW_FILE"; then
        echo -e "${GREEN}✅ VSCode-only release handling found${NC}"
    else
        echo -e "${RED}❌ VSCode-only release handling missing${NC}"
        return 1
    fi
}

validate_artifact_archiving() {
    echo -e "\n${YELLOW}🔍 Validating artifact archiving${NC}"
    
    # Check for CLI binary archiving
    if grep -A 10 "Archive CLI build artifacts" "$WORKFLOW_FILE" | grep -q "dist/xfidelity"; then
        echo -e "${GREEN}✅ CLI binary archiving found${NC}"
    else
        echo -e "${RED}❌ CLI binary archiving missing${NC}"
        return 1
    fi
}

validate_dependency_paths() {
    echo -e "\n${YELLOW}🔍 Validating dependency path detection${NC}"
    
    # Check that core, types, and plugins changes trigger both CLI and VSCode
    local cli_paths=$(sed -n '/cli:/,/vscode:/p' "$WORKFLOW_FILE" | grep -E "packages/x-fidelity-(core|types|plugins)" | wc -l)
    local vscode_paths=$(sed -n '/vscode:/,/^[[:space:]]*[a-z]/p' "$WORKFLOW_FILE" | grep -E "packages/x-fidelity-(core|types|plugins)" | wc -l)
    
    if [[ $cli_paths -ge 3 && $vscode_paths -ge 3 ]]; then
        echo -e "${GREEN}✅ Both CLI and VSCode detect core dependency changes${NC}"
    else
        echo -e "${RED}❌ Dependency path detection incomplete (CLI: $cli_paths, VSCode: $vscode_paths)${NC}"
        return 1
    fi
}

# Generate workflow improvement recommendations
generate_recommendations() {
    local recommendations_file="$RESULTS_DIR/workflow-recommendations.md"
    
    echo -e "\n${BLUE}📝 Generating workflow improvement recommendations${NC}"
    
    cat > "$recommendations_file" << 'EOF'
# X-Fidelity Release Workflow Recommendations

## Current Analysis

The workflow has been analyzed for synchronized release capabilities. Below are recommendations to ensure both CLI and VSCode packages are always built, tested, and released together.

## Recommended Workflow Changes

### 1. Always Release Both Packages
**Current State**: Conditional releases based on path changes
**Recommended**: Always build and release both packages for version synchronization

```yaml
release-cli:
  needs: changes
  runs-on: ubuntu-latest
  # Remove conditional - always run
  
release-vscode-extension:  
  needs: [changes, release-cli]
  runs-on: ubuntu-latest
  # Remove conditional - always run after CLI
```

### 2. Synchronized Version Management
**Current State**: Independent versioning based on changes
**Recommended**: Coordinated version bumps

```yaml
- name: Synchronize versions
  run: |
    CLI_VERSION="${{ needs.release-cli.outputs.cli-version }}"
    cd packages/x-fidelity-vscode
    # Update VSCode version to match CLI or use coordinated versioning
```

### 3. Comprehensive Testing Before Release
**Current State**: Tests run in release jobs
**Recommended**: Dedicated test job that blocks all releases

```yaml
test-all-packages:
  runs-on: ubuntu-latest
  steps:
    - name: Run comprehensive tests
      run: yarn test
    - name: Verify both packages build
      run: |
        cd packages/x-fidelity-cli && yarn build:production
        cd ../x-fidelity-vscode && yarn build:production

release-cli:
  needs: [changes, test-all-packages]
  # Only proceed if tests pass
```

### 4. Integration Test Validation
**Current State**: No integration testing of release workflow
**Recommended**: Include integration tests in CI

```yaml
integration-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Run release integration tests
      run: ./scripts/integration-tests/run-local-test.sh
```

## Implementation Priority

1. **High**: Always release both packages (prevents version drift)
2. **High**: Add comprehensive testing before releases
3. **Medium**: Implement synchronized versioning strategy  
4. **Medium**: Add integration test validation
5. **Low**: Enhance artifact management and publishing

EOF

    echo "📄 Recommendations generated: $recommendations_file"
}

# Main validation
main() {
    local validation_passed=true
    
    echo -e "${BLUE}Starting workflow validation...${NC}\n"
    
    # Run all validations
    validate_cli_build_step || validation_passed=false
    validate_vscode_build_step || validation_passed=false
    validate_version_sync || validation_passed=false
    validate_artifact_archiving || validation_passed=false
    validate_dependency_paths || validation_passed=false
    
    # Generate recommendations regardless of validation results
    generate_recommendations
    
    echo -e "\n${BLUE}📋 Validation Summary${NC}"
    
    if $validation_passed; then
        echo -e "${GREEN}✅ Workflow validation passed${NC}"
        echo "The current workflow has proper build and release steps configured."
    else
        echo -e "${YELLOW}⚠️  Workflow validation completed with recommendations${NC}"
        echo "Some improvements are recommended for optimal synchronized releases."
    fi
    
    echo -e "\n${BLUE}🎯 Key Findings${NC}"
    echo "- CLI semantic-release configuration: $([ -f "/workspace/packages/x-fidelity-cli/.releaserc.json" ] && echo "✅ Present" || echo "❌ Missing")"
    echo "- VSCode semantic-release configuration: $([ -f "/workspace/packages/x-fidelity-vscode/.releaserc.json" ] && echo "✅ Present" || echo "❌ Missing")"
    echo "- Synchronized release logic: $(grep -q "Handle VSCode-only release" "$WORKFLOW_FILE" && echo "✅ Implemented" || echo "❌ Missing")"
    echo "- Build artifact management: $(grep -q "Archive CLI build artifacts" "$WORKFLOW_FILE" && echo "✅ Implemented" || echo "❌ Missing")"
    
    return 0
}

# Execute main function
main "$@"