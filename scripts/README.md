# X-Fidelity Scripts

This directory contains various scripts for development, testing, and maintenance.

## 🧪 Consolidated Test Runner

**`test-consolidated.js`** - Comprehensive test runner with caching support and automatic reporting.

### Features

- **✅ Complete test counting**: Includes tests from cached packages in total count
- **💾 Persistent results cache**: Stores test results for packages that aren't re-executed
- **📊 Comprehensive reporting**: Generates markdown report with detailed breakdowns
- **🤖 Auto-commit**: Automatically commits report when `--commit` flag used or in CI
- **🏃 Cache-aware**: Shows clear distinction between executed and cached packages

### Usage

```bash
# Run with auto-commit
node scripts/test-consolidated.js --commit

# Run without auto-commit (default)
node scripts/test-consolidated.js
```

### Cache Behavior

The script maintains a `.test-results-cache.json` file (gitignored) that stores test results from previously executed packages. When packages are cached by Turbo:

1. **Fresh execution**: Test results saved to cache
2. **Cached execution**: Previous results loaded from cache
3. **Total count**: Always includes all tests regardless of cache state

### Auto-Commit

When `--commit` flag is provided or running in CI (`process.env.CI`), the script automatically commits the updated `CONSOLIDATED-TEST-REPORT.md` with a descriptive commit message.

### Example Output

```
🧪 UNIT TESTS:
   ✅ Passed: 194 tests
   ❌ Failed: 0 tests  
   ⏭️  Skipped: 0 tests
   💾 Cached: 2 packages (70 tests from cache)
   📊 Total: 194 tests across 6 packages

📦 PACKAGE BREAKDOWN:
   x-fidelity-core      💾 Cached    Tests: 59P/0F/0S (59 total)
   x-fidelity-plugins   💾 Cached    Tests: 11P/0F/0S (11 total)
   x-fidelity-vscode    🏃 Executed  Tests: 79P/0F/0S (79 total)
```

## Other Scripts

- **`merge-coverage.js`** - Merges coverage reports from all packages
- **`check-coverage-thresholds.js`** - Validates coverage meets minimum thresholds
- **`test-pr-workflow.js`** - Validates PR workflow configuration