# Local Codecov Validation

This document describes the local codecov validation features that allow you to check coverage thresholds and validate codecov configuration without uploading to codecov servers.

## Overview

The local codecov validation system provides:
- ✅ **Configuration validation** - Validate `codecov.yml` syntax and settings
- 📊 **Coverage threshold checking** - Check if coverage meets codecov targets
- 🎯 **Package-specific validation** - Individual package coverage validation  
- 🚀 **Pre-upload validation** - Ensure everything is ready before uploading to codecov
- 📋 **Detailed reporting** - Clear feedback on coverage status and targets

## Files Added

### Configuration
- **`codecov.yml`** - Codecov configuration with package-specific targets
- **`scripts/codecov-local.js`** - Local validation script

### Dependencies
- **`js-yaml`** - Added for parsing codecov.yml configuration

## Available Scripts

### 🔧 Core Scripts

```bash
# Run local codecov validation (requires existing coverage data)
yarn codecov:local

# Generate coverage and run codecov validation  
yarn codecov:validate

# Run full test suite with coverage and codecov validation
yarn codecov:check

# Validate codecov configuration only
yarn codecov:config
```

### 📊 Coverage Workflow

```bash
# 1. Generate test coverage
yarn test:coverage

# 2. Merge coverage reports  
yarn coverage:merge

# 3. Validate against codecov targets
yarn codecov:local

# 4. Upload to codecov (existing)
yarn coverage:upload
```

## Codecov Configuration

### Package Targets

The `codecov.yml` defines coverage targets for each package:

| Package | Target | Threshold |
|---------|--------|-----------|
| **Overall Project** | 35% | ±1% |
| **x-fidelity-core** | 60% | ±1% |
| **x-fidelity-cli** | 45% | ±1% |
| **x-fidelity-plugins** | 55% | ±1% |
| **x-fidelity-server** | 60% | ±1% |
| **x-fidelity-types** | 92% | ±1% |
| **x-fidelity-vscode** | 15% | ±5% |

### Status Checks

The configuration includes:
- **Project-level** status checks for overall coverage
- **Package-specific** status checks for granular control
- **Patch-level** status checks for new code coverage (70% target)

## Usage Examples

### Basic Local Validation

```bash
# Check current coverage against codecov targets
yarn codecov:validate
```

**Output:**
```
📊 Checking coverage against codecov targets...

📈 Overall Project Coverage:
   Target: 35% (threshold: ±1%)
   Actual: 39.36%
   ✅ Target met (+4.36%)

📈 x-fidelity-vscode Coverage:
   Target: 15% (threshold: ±5%)
   Actual: 19.62%
   ✅ Target met (+4.62%)
```

### Full Test and Validation

```bash
# Run complete test suite with codecov validation
yarn codecov:check
```

### Configuration Only

```bash
# Validate codecov.yml syntax and structure
yarn codecov:config
```

## Validation Results

### ✅ Success (Exit Code 0)
- All coverage targets met
- Configuration is valid
- Ready for codecov upload

### ⚠️ Targets Not Met (Exit Code 1)
- Some packages below coverage targets
- Configuration is valid
- Upload is still possible but targets should be addressed

### ❌ Configuration Error (Exit Code 1) 
- Invalid `codecov.yml` syntax
- Missing required sections
- Upload will likely fail

## Integration with CI/CD

### Local Development
```bash
# Before committing
yarn codecov:check

# Quick validation
yarn codecov:validate
```

### CI Pipeline Integration
The existing CI pipeline already uploads to codecov. The local validation can be added as a pre-upload step:

```yaml
- name: Validate codecov configuration
  run: yarn codecov:validate

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  # ... existing configuration
```

## Troubleshooting

### Common Issues

**1. Missing Coverage Data**
```
❌ coverage-summary.json not found. Run yarn test:coverage first.
```
**Solution:** Run `yarn test:coverage` to generate coverage data.

**2. Configuration Errors**
```
❌ Missing required section: coverage.status
```
**Solution:** Check `codecov.yml` syntax and required sections.

**3. Targets Not Met**
```
❌ Target missed (-1.56%)
```
**Solution:** Either improve test coverage or adjust targets in `codecov.yml`.

### Debug Information

The validation script provides detailed information:
- Package-specific coverage percentages
- Exact differences from targets (+/- percentages)
- Configuration validation results
- Helpful tips and next steps

## Customization

### Adjusting Targets

Edit `codecov.yml` to modify coverage targets:

```yaml
coverage:
  status:
    project:
      vscode:
        target: 20%  # Increase from 15%
        threshold: 2%  # Allow 2% variance
```

### Adding New Packages

1. Add package configuration to `codecov.yml`
2. Update the `loadPackageCoverage()` function in `scripts/codecov-local.js`
3. Test with `yarn codecov:validate`

## Benefits

### 🚀 **Faster Feedback**
- Validate coverage locally before CI
- Catch issues early in development
- No need to wait for CI feedback

### 🎯 **Target Awareness**  
- Clear visibility into coverage targets
- Package-specific feedback
- Actionable improvement suggestions

### 🔧 **Configuration Safety**
- Validate codecov.yml syntax locally
- Prevent upload failures due to configuration errors
- Test configuration changes before deployment

### 📊 **Developer Experience**
- Rich, colored output with emojis
- Clear pass/fail indicators
- Helpful tips and next steps

## Related Commands

```bash
# Existing coverage commands
yarn test:coverage         # Run tests with coverage
yarn coverage:merge        # Merge package coverage reports  
yarn coverage:check        # Check coverage thresholds
yarn coverage:upload       # Upload to codecov

# New codecov local commands
yarn codecov:local         # Local validation only
yarn codecov:validate      # Merge + validate
yarn codecov:check         # Test + validate
yarn codecov:config        # Config validation only
```