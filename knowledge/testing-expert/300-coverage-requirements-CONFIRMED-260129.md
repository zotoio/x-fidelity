# Topic: Coverage Requirements and Configuration

## Fact: Centralized Coverage Thresholds Configuration
### Modified: 2026-01-29
### Priority: H

Coverage thresholds are centralized in `coverage-thresholds.config.js` at the repository root. This ensures consistency across all packages:

```javascript
const coverageThresholds = {
  global: { statements: 35, branches: 35, functions: 30, lines: 35 },
  
  "packages/x-fidelity-core/": { statements: 60.0, branches: 50.0, functions: 55.0, lines: 60.0 },
  "packages/x-fidelity-cli/": { statements: 45.0, branches: 45.0, functions: 45.0, lines: 45.0 },
  "packages/x-fidelity-plugins/": { statements: 55.0, branches: 50.0, functions: 58.0, lines: 55.0 },
  "packages/x-fidelity-server/": { statements: 60.0, branches: 40.0, functions: 47.0, lines: 60.0 },
  "packages/x-fidelity-types/": { statements: 92.0, branches: 95.0, functions: 65.0, lines: 92.0 },
  "packages/x-fidelity-vscode/": { statements: 15.0, branches: 15.0, functions: 15.0, lines: 15.0 }
};

// Helper functions
function getPackageThresholds(packagePath) { return coverageThresholds[packagePath] || coverageThresholds.global; }
function createCoverageThresholds(packagePaths) { /* returns filtered thresholds */ }
```

Individual jest.config.js files reference this via comment noting thresholds are managed centrally.

### References
1. [coverage-thresholds.config.js](../../coverage-thresholds.config.js)
2. [Core jest.config.js](../../packages/x-fidelity-core/jest.config.js)

---

## Fact: Coverage Report Merging Across Packages
### Modified: 2026-01-29
### Priority: H

The `scripts/merge-coverage.js` script combines coverage reports from all packages into a unified report:

**Process**:
1. Finds all `packages/*/coverage/coverage-final.json` files
2. Merges JSON objects into single `coverage/coverage-final.json`
3. Concatenates all `lcov.info` files
4. Calculates totals for statements, branches, functions, lines
5. Generates `coverage/coverage-summary.json`

**Coverage metrics calculated**:
```javascript
// For each file in coverage data
totalStatements += Object.keys(file.s).length;
coveredStatements += Object.values(file.s).filter(v => v > 0).length;
// Similar for branches (file.b), functions (file.f), lines (from statementMap)
```

**Usage**: `yarn coverage:merge` after running tests with coverage

### References
1. [merge-coverage.js](../../scripts/merge-coverage.js)

---

## Fact: Codecov Integration Configuration
### Modified: 2026-01-29
### Priority: M

The `codecov.yml` file configures coverage reporting for CI:

**Package-specific targets**:
- core: 60%, cli: 45%, plugins: 55%, server: 60%, types: 92%, vscode: 15%

**Patch coverage** (for PRs): 70% target with 10% threshold

**Ignored paths** (not counted in coverage):
```yaml
ignore:
  - "**/*.d.ts"
  - "**/*.test.ts"
  - "**/test/**"
  - "**/coverage/**"
  - "packages/x-fidelity-fixtures/**"
  - "packages/x-fidelity-democonfig/**"
  - "website/**"
  - "scripts/**"
```

**Flags for test types**: `unittests` (carryforward: true), `integration` (carryforward: false)

### References
1. [codecov.yml](../../codecov.yml)

---

## Fact: Coverage Threshold Validation Script
### Modified: 2026-01-29
### Priority: M

The `scripts/check-coverage-thresholds.js` script validates merged coverage against thresholds:

**Validation process**:
1. Reads `coverage/coverage-final.json` and `coverage/coverage-summary.json`
2. Loads thresholds from `coverage-thresholds.config.js`
3. Compares actual coverage percentages against threshold values
4. Exits with code 1 if any threshold is not met

**Output format**:
```
📊 Coverage Report:
   Statements: 1234/2000 (61.7%)
   Branches:   456/800 (57%)
   Functions:  234/400 (58.5%)
   Lines:      1200/1950 (61.5%)

🎯 Threshold Check:
   ✅ Statements: 61.7% (threshold: 35%)
   ✅ Branches: 57% (threshold: 35%)
   ...
```

**Usage**: `yarn coverage:check` (requires `yarn coverage:merge` first)

### References
1. [check-coverage-thresholds.js](../../scripts/check-coverage-thresholds.js)
2. [coverage-thresholds.config.js](../../coverage-thresholds.config.js)
