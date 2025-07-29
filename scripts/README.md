# X-Fidelity Scripts

This directory contains various scripts for development, testing, and maintenance.

## 🧪 Consolidated Test Runner

**`test-consolidated.js`** - Comprehensive test runner with fresh execution and automatic reporting.

### Features

- **✅ Fresh execution**: Always uses `--force --no-cache` for turbo commands
- **📊 Accurate test counting**: All tests executed fresh, no cache artifacts
- **📊 Comprehensive reporting**: Generates markdown report with detailed breakdowns
- **🤖 Auto-commit**: Automatically commits report when `--commit` flag used or in CI
- **🏃 Real-time results**: Shows actual current test state, not cached data

### Usage

```bash
# Run with auto-commit
node scripts/test-consolidated.js --commit

# Run without auto-commit (default)
node scripts/test-consolidated.js
```

### Execution Behavior

The script always runs with `--force --no-cache` flags to ensure:

1. **Fresh execution**: All tests run from scratch
2. **No cache interference**: Bypasses any turbo cache
3. **Accurate counts**: Test totals reflect actual current state
4. **Reliable results**: No stale or cached test data

### Auto-Commit

When `--commit` flag is provided or running in CI (`process.env.CI`), the script automatically commits the updated `CONSOLIDATED-TEST-REPORT.md` with a descriptive commit message.

### Example Output

```
🧪 UNIT TESTS:
   ✅ Passed: 194 tests
   ❌ Failed: 0 tests  
   ⏭️  Skipped: 0 tests
   📊 Total: 194 tests across 6 packages

📦 PACKAGE BREAKDOWN:
   x-fidelity-core      🏃 Executed  Tests: 59P/0F/0S (59 total)
   x-fidelity-plugins   🏃 Executed  Tests: 11P/0F/0S (11 total)
   x-fidelity-vscode    🏃 Executed  Tests: 79P/0F/0S (79 total)
```

## Other Scripts

- **`merge-coverage.js`** - Merges coverage reports from all packages
- **`check-coverage-thresholds.js`** - Validates coverage meets minimum thresholds
- **`test-pr-workflow.js`** - Validates PR workflow configuration