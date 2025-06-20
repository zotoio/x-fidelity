# X-Fidelity CLI-VSCode Consistency Testing Framework

## 🎯 Overview

This framework provides comprehensive tools to identify and resolve inconsistencies between the X-Fidelity CLI and VSCode extension analysis results. It creates reproducible test repositories, runs analysis through both interfaces, and generates detailed comparison reports.

## 🚨 Critical Problem Statement

**The Issue**: CLI and VSCode extension are detecting different issues in the same codebase, creating confusion and undermining user trust.

**Root Causes Identified**:
1. **Configuration Path Resolution Differences**
2. **Caching Strategy Mismatches** 
3. **Options/State Management Inconsistencies**
4. **Analysis Context Variations**

## 🧪 Framework Components

### 1. ConsistencyTester Class
- Creates reproducible test repositories
- Simulates both CLI and VSCode analysis
- Compares results with detailed metrics
- Generates comprehensive reports

### 2. Test Repository Templates
- Pre-configured projects with known issues
- Multiple archetypes (node-fullstack, react-spa)
- Expected issue definitions for validation

### 3. CLI Testing Tool
- Command-line interface for running tests
- Multiple test modes and output formats
- Integration with CI/CD pipelines

## 📋 Quick Start

### 1. Validate Framework Installation

```bash
# Validate the testing framework itself
yarn test:consistency:validate
```

### 2. Run Quick Consistency Check

```bash
# Test specific archetype
yarn test:consistency:quick

# Or run full test suite
yarn test:consistency
```

### 3. Generate Baseline Report

```bash
# Create baseline to measure improvements against
yarn test:consistency:baseline
```

## 🔧 Available Commands

### NPM Scripts (Recommended)

```bash
# Run Jest-based consistency tests with detailed output
yarn test:consistency

# Quick manual test with immediate feedback
yarn test:consistency:quick

# Generate baseline report (documents current state)
yarn test:consistency:baseline

# Validate framework integrity
yarn test:consistency:validate
```

### Direct CLI Usage

```bash
# Build first
yarn build

# Navigate to core package
cd packages/x-fidelity-core

# Quick test for specific archetype
node dist/test-utils/consistencyTestingCLI.js quick node-fullstack

# Test existing repository
node dist/test-utils/consistencyTestingCLI.js test-repo /path/to/repo node-fullstack

# Full test suite with report
node dist/test-utils/consistencyTestingCLI.js suite --output consistency-report.txt

# Generate baseline report
node dist/test-utils/consistencyTestingCLI.js baseline

# Manual test with detailed output
node dist/test-utils/consistencyTestingCLI.js manual --output manual-results.txt

# Validate framework
node dist/test-utils/consistencyTestingCLI.js validate
```

## 📊 Understanding Test Results

### Consistency Status

- ✅ **CONSISTENT**: CLI and VSCode produce identical results
- ❌ **INCONSISTENT**: Discrepancies detected (see details below)

### Discrepancy Types

1. **Missing in CLI**: Issues found by VSCode but not CLI
2. **Missing in VSCode**: Issues found by CLI but not VSCode  
3. **Level Mismatches**: Same rule, different severity levels
4. **Configuration Differences**: Different config resolution

### Sample Report Output

```
========================================
  X-FIDELITY CONSISTENCY TEST REPORT
========================================

Test: node-fullstack-basic
Archetype: node-fullstack
Status: ❌ INCONSISTENT
Total Discrepancies: 3

RESULTS SUMMARY:
CLI Total Issues: 5
VSCode Total Issues: 7
Difference: 2

DISCREPANCY BREAKDOWN:
Critical: 1
High: 2
Medium: 0
Low: 0

ISSUES MISSING IN CLI:
  📄 src/index.ts:
    ❌ missing-error-handling [warning]

CONFIGURATION DIFFERENCES:
  🔧 fileCount [high impact]:
    CLI: 15
    VSCode: 17

RECOMMENDATIONS:
  🔍 File discovery differences detected - check exclude/include patterns
  🔧 Rule execution differences - check plugin loading order
```

## 🎯 Testing Strategies

### 1. Baseline Testing (Start Here)

```bash
# Generate baseline report to understand current state
yarn test:consistency:baseline

# Review the generated consistency-baseline.txt
cat consistency-baseline.txt
```

**Purpose**: Document current inconsistencies as a baseline for improvement.

### 2. Development Testing

```bash
# Quick feedback during development
yarn test:consistency:quick
```

**Purpose**: Fast iteration and immediate feedback on changes.

### 3. Comprehensive Testing

```bash
# Full test suite with detailed analysis
yarn test:consistency
```

**Purpose**: Thorough validation before releases.

### 4. Repository-Specific Testing

```bash
# Test your actual project
cd packages/x-fidelity-core
node dist/test-utils/consistencyTestingCLI.js test-repo /path/to/your/project node-fullstack
```

**Purpose**: Validate consistency on real-world codebases.

## 🔍 Troubleshooting Common Issues

### 1. Tests Timeout or Hang

**Symptoms**: Tests run for >2 minutes without completing

**Solutions**:
- Check that both CLI and VSCode packages are built (`yarn build`)
- Verify no other X-Fidelity processes are running
- Check available memory (analysis can be memory-intensive)

```bash
# Kill any hanging processes
pkill -f "x-fidelity"

# Clean build and retry
yarn build:clean
yarn test:consistency:quick
```

### 2. "Module Not Found" Errors

**Symptoms**: Import/require errors when running tests

**Solutions**:
- Ensure packages are built: `yarn build`
- Check TypeScript compilation: `yarn workspace x-fidelity-core build`
- Verify file paths in import statements

### 3. Configuration Path Issues

**Symptoms**: Different config paths in CLI vs VSCode

**Solutions**:
- Check environment variables: `echo $XFI_CONFIG_PATH`
- Verify demo config exists: `ls packages/x-fidelity-democonfig/src/`
- Review VSCode config resolution in output

### 4. High Discrepancy Counts

**Symptoms**: Many inconsistencies detected

**Expected**: This is normal initially - the framework documents current state

**Actions**:
1. Generate baseline: `yarn test:consistency:baseline`
2. Prioritize high-impact discrepancies (config differences)
3. Address systematically using the improvement plan

## 📈 Interpreting Results for Development

### Priority Order for Fixing Discrepancies

1. **Critical/High Impact Config Differences**
   - Different archetypes detected
   - File count mismatches (discovery issues)
   - Configuration path resolution

2. **Missing Issues (High Impact)**
   - Rules not executing in one context
   - Plugin loading differences

3. **Level Mismatches (Medium Impact)**
   - Same rule, different severity
   - Rule configuration inconsistencies

4. **Low Impact Differences**
   - Minor timing variations
   - Non-functional differences

### Example Development Workflow

```bash
# 1. Generate baseline
yarn test:consistency:baseline

# 2. Review critical issues in consistency-baseline.txt
cat consistency-baseline.txt | grep -A 5 "CRITICAL\|HIGH"

# 3. Make targeted fixes

# 4. Re-test to measure improvement
yarn test:consistency:quick

# 5. Generate new baseline to track progress
yarn test:consistency:baseline
```

## 🧩 Framework Architecture

### Test Repository Structure

```typescript
interface TestRepository {
  name: string;                    // Unique test identifier
  archetype: string;              // X-Fidelity archetype
  files: TestFile[];              // Source files to create
  expectedIssues: ExpectedIssue[]; // Known issues for validation
  description: string;            // Test description
}
```

### Comparison Logic

1. **Create Test Repository**: Generate temp directory with test files
2. **Run CLI Analysis**: Simulate CLI execution with proper options
3. **Run VSCode Analysis**: Simulate extension execution with config resolution
4. **Compare Results**: Detailed analysis of differences
5. **Generate Report**: Human-readable and machine-parseable output

### Mock Logger Implementation

Both CLI and VSCode simulations use appropriate logger implementations:
- **CLI**: PinoLogger simulation with file output
- **VSCode**: VSCodeLogger simulation with output channel

## 🚀 Integration with CI/CD

### GitHub Actions Example

```yaml
name: Consistency Testing
on: [push, pull_request]

jobs:
  consistency:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: yarn install
      - run: yarn build
      - run: yarn test:consistency:validate
      - run: yarn test:consistency
      - name: Upload baseline report
        uses: actions/upload-artifact@v3
        with:
          name: consistency-baseline
          path: consistency-baseline.txt
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "Running consistency validation..."
yarn test:consistency:validate

if [ $? -ne 0 ]; then
  echo "❌ Consistency framework validation failed"
  exit 1
fi

echo "✅ Consistency framework validated"
```

## 📚 API Reference

### Core Functions

```typescript
// Quick consistency check for specific archetype
async function quickConsistencyCheck(archetype: string): Promise<ConsistencyTestResult>

// Test existing repository
async function testExistingRepository(repoPath: string, archetype: string): Promise<ConsistencyTestResult>

// Run full test suite
async function runFullConsistencyTestSuite(): Promise<ConsistencyTestResult[]>

// Manual test with detailed output
async function runManualConsistencyTest(): Promise<ManualTestResult>

// Generate baseline report
async function generateBaselineReport(): Promise<string>
```

### ConsistencyTester Class

```typescript
class ConsistencyTester {
  // Run single test
  async runConsistencyTest(options: TestOptions): Promise<ConsistencyTestResult>
  
  // Run multiple tests
  async runConsistencyTestSuite(options?: SuiteOptions): Promise<ConsistencyTestResult[]>
}
```

## 🎯 Next Steps

1. **Start with Baseline**: `yarn test:consistency:baseline`
2. **Review Results**: Analyze the generated baseline report
3. **Prioritize Fixes**: Focus on high-impact configuration differences
4. **Iterate**: Use quick tests for development feedback
5. **Validate Progress**: Regular baseline generation to track improvements

## ❓ FAQ

**Q: Why do I see many inconsistencies initially?**
A: This is expected - the framework documents the current state to establish a baseline for improvement.

**Q: How often should I run consistency tests?**
A: 
- During development: `yarn test:consistency:quick`
- Before commits: `yarn test:consistency:validate`
- Regular baselines: Weekly or before releases

**Q: Can I add custom test repositories?**
A: Yes, modify `TEST_REPOSITORIES` in `packages/x-fidelity-core/src/test-utils/consistencyTesting.ts`

**Q: How do I test against my actual project?**
A: Use the `test-repo` command with your project path and archetype.

**Q: What if tests take too long?**
A: Check timeouts in the framework (default: 60s). Consider system resources and running processes.

---

For technical support or framework improvements, refer to the X-Fidelity development team or create an issue in the project repository. 