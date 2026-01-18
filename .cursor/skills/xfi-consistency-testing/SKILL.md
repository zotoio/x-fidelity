---
name: xfi-consistency-testing
description: Guide for ensuring CLI and VSCode extension produce identical analysis results. Use when verifying CLI-Extension parity, debugging output differences, or setting up consistency checks.
---

# CLI-Extension Consistency Testing

This skill guides you through ensuring X-Fidelity CLI and VSCode extension produce identical results.

## Why Consistency Matters

The CLI and VSCode extension should always produce identical analysis results:
- **Same archetype** used for analysis
- **Same rules** evaluated
- **Same issues** detected with identical locations
- **Same severity levels** for all issues

Inconsistency indicates a bug that must be fixed before release.

## Quick Consistency Check

```
Consistency Verification:
- [ ] Build all packages
- [ ] Run CLI analysis
- [ ] Run VSCode extension analysis
- [ ] Compare issue counts
- [ ] Compare issue locations
- [ ] Verify severity levels match
```

## Manual Consistency Testing

### 1. Ensure Clean Build

```bash
# Build everything from workspace root
yarn build

# Or clean build
yarn build:clean
```

### 2. Run CLI Analysis

```bash
# Navigate to test workspace
cd packages/x-fidelity-fixtures/node-fullstack

# Run CLI with vscode mode (clean JSON output)
npx xfi --mode vscode --archetype node-fullstack > cli-results.json

# Or with human-readable output
npx xfi --mode cli --archetype node-fullstack
```

### 3. Run VSCode Extension Analysis

1. Open `packages/x-fidelity-fixtures/node-fullstack` in VSCode
2. Wait for extension to activate and analyze
3. Check issues in tree view (lightning icon)
4. View Output panel > "X-Fidelity Analysis" for details

### 4. Compare Results

**What to Compare**:

| Aspect | CLI | VSCode |
|--------|-----|--------|
| Total issues | Count from JSON/output | Tree view count |
| Issue files | File paths in results | Files in tree view |
| Issue locations | Line:column in results | Diagnostic ranges |
| Severity | warning/fatality | warning/error icons |

**Expected Outcome**:
- Identical issue counts
- Identical file paths
- Identical line numbers (column may vary slightly)
- Matching severity levels

## Integration Test Approach

### Test File Structure

Integration tests for consistency live in:
```
packages/x-fidelity-vscode/src/test/integration/
├── analysis-completion.test.ts   # Verifies analysis runs
├── diagnostics.test.ts           # Verifies diagnostics match
└── rule-validation.test.ts       # Verifies rules evaluate correctly
```

### Running Integration Tests

```bash
# Run VSCode extension integration tests
yarn workspace x-fidelity-vscode test:integration

# Run all VSCode tests
yarn workspace x-fidelity-vscode test:all
```

### Writing Consistency Tests

```typescript
import * as vscode from 'vscode';
import { execSync } from 'child_process';

test('CLI and extension should produce matching results', async function() {
    // Run CLI analysis
    const cliOutput = execSync(
        'npx xfi --mode vscode --archetype node-fullstack',
        { cwd: workspacePath, encoding: 'utf8' }
    );
    const cliResults = JSON.parse(cliOutput);

    // Get extension results
    await vscode.commands.executeCommand('xfidelity.runAnalysis');
    const extensionResults = await vscode.commands.executeCommand(
        'xfidelity.getTestResults'
    );

    // Compare
    expect(extensionResults.summary.totalIssues)
        .toBe(cliResults.summary.totalIssues);
});
```

## Common Inconsistencies

### 1. Different Issue Counts

**Symptoms**: CLI finds more/fewer issues than extension

**Causes**:
- Different working directory
- Different archetype detected
- File system caching

**Debug**:
```bash
# Check CLI working directory
pwd

# Verify archetype in both
xfi --debug 2>&1 | grep archetype
# Check VSCode Output panel for archetype detection
```

### 2. Different File Paths

**Symptoms**: Same issues but different paths

**Causes**:
- Absolute vs relative paths
- Path separator differences (Windows)
- Symlink resolution

**Solution**:
Normalize paths before comparison:
```typescript
const normalize = (p: string) => path.resolve(p).toLowerCase();
```

### 3. Different Line Numbers

**Symptoms**: Issues on different lines

**Causes**:
- Source map differences
- AST parsing differences
- Cached file content

**Debug**:
```bash
# Ensure both use same file content
git status  # No uncommitted changes
yarn build  # Fresh build
```

### 4. Missing Diagnostics in VSCode

**Symptoms**: CLI finds issues, VSCode shows none

**Causes**:
- Extension not activated
- Diagnostics not registered
- File not in workspace

**Check**:
```typescript
// Verify diagnostics collection
const diagnostics = vscode.languages.getDiagnostics();
for (const [uri, diags] of diagnostics) {
    console.log(`${uri.path}: ${diags.length} issues`);
}
```

## Test Workspace

The standard test workspace is:
```
packages/x-fidelity-fixtures/node-fullstack/
```

This workspace contains:
- Known issues for testing
- Multiple file types
- Various patterns to detect

## CI Integration

### GitHub Actions

Consistency is checked in CI:
- `.github/workflows/vscode-extension-ci.yml`
- Runs on PRs and merges
- Fails build on inconsistency

### Artifacts

Consistency test reports are saved as artifacts:
- 30-day retention
- Contains both CLI and extension output
- Useful for debugging failures

## Debugging Consistency Failures

### 1. Get Detailed Output

```bash
# CLI with full debug
xfi --debug --mode vscode 2>&1 | tee cli-debug.log

# VSCode: Enable debug logging
# Output panel > X-Fidelity Debug
```

### 2. Compare JSON Output

```bash
# Save both outputs
xfi --mode vscode > cli.json
# Export extension results via command

# Diff the outputs
diff cli.json extension.json
```

### 3. Check Specific Issue

```bash
# Find issue in CLI output
grep "specificRule" cli.json

# Find in VSCode
# Tree view > expand issue > check details
```

## Best Practices

1. **Always test with fixtures workspace** - Known baseline
2. **Build before testing** - Ensure latest code
3. **Use same archetype** - Explicit in both contexts
4. **Compare normalized output** - Handle path differences
5. **Check after any core changes** - Engine, rules, plugins

## Files Reference

| Purpose | Location |
|---------|----------|
| Test workspace | `packages/x-fidelity-fixtures/node-fullstack/` |
| Integration tests | `packages/x-fidelity-vscode/src/test/integration/` |
| Test helpers | `packages/x-fidelity-vscode/src/test/helpers/testHelpers.ts` |
| CI workflow | `.github/workflows/vscode-extension-ci.yml` |
| Extension tests | `packages/x-fidelity-vscode/src/test/` |
