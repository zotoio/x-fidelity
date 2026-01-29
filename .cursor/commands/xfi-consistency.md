# xfi-consistency

Verify that CLI and VSCode extension produce identical analysis results.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-consistency-testing` skill at `.cursor/skills/xfi-consistency-testing/SKILL.md`
- **Subagent**: Use `xfi-vscode-expert` for extension expertise

## Why Consistency Matters

The CLI and VSCode extension must always produce identical analysis results:
- Same archetype used
- Same rules evaluated
- Same issues detected with identical locations
- Same severity levels

**Inconsistency indicates a bug that must be fixed before release.**

## Workflow

1. **Read the skill file** for complete consistency testing guide

2. **Ensure clean build**:
   ```bash
   yarn build
   ```

3. **Run CLI analysis**:
   ```bash
   cd packages/x-fidelity-fixtures/node-fullstack
   npx xfi --mode vscode --archetype node-fullstack > cli-results.json
   ```

4. **Run VSCode extension analysis**:
   - Open `packages/x-fidelity-fixtures/node-fullstack` in VSCode
   - Wait for extension to analyze
   - Check issues in tree view

5. **Compare results**:
   - Issue counts match
   - File paths identical
   - Line numbers match
   - Severity levels match

6. **Use xfi-vscode-expert subagent** if inconsistencies found

## Consistency Checklist

```
Consistency Verification:
- [ ] Build all packages
- [ ] Run CLI analysis
- [ ] Run VSCode extension analysis
- [ ] Compare issue counts
- [ ] Compare issue locations
- [ ] Verify severity levels match
```

## What to Compare

| Aspect | CLI | VSCode |
|--------|-----|--------|
| Total issues | Count from JSON/output | Tree view count |
| Issue files | File paths in results | Files in tree view |
| Issue locations | Line:column in results | Diagnostic ranges |
| Severity | warning/fatality | warning/error icons |

## Integration Tests

```bash
# Run VSCode extension integration tests
yarn workspace x-fidelity-vscode test:integration

# Run all VSCode tests
yarn workspace x-fidelity-vscode test:all
```

## Common Inconsistencies

### Different Issue Counts
- Different working directory
- Different archetype detected
- File system caching

### Different File Paths
- Absolute vs relative paths
- Symlink resolution

### Missing Diagnostics in VSCode
- Extension not activated
- Diagnostics not registered
- File not in workspace

## Debugging

```bash
# CLI with full debug
xfi --debug --mode vscode 2>&1 | tee cli-debug.log

# VSCode: Enable debug logging
# Output panel > X-Fidelity Debug
```

## Test Workspace

The standard test workspace is:
```
packages/x-fidelity-fixtures/node-fullstack/
```

## Key Files

| Purpose | Location |
|---------|----------|
| Test workspace | `packages/x-fidelity-fixtures/node-fullstack/` |
| Integration tests | `packages/x-fidelity-vscode/src/test/integration/` |
| CI workflow | `.github/workflows/vscode-extension-ci.yml` |
