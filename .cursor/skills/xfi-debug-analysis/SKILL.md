---
name: xfi-debug-analysis
description: Guide for debugging X-Fidelity analysis issues. Use when troubleshooting analysis failures, rule evaluation problems, VSCode extension issues, or unexpected results.
---

# Debugging X-Fidelity Analysis

This skill guides you through troubleshooting X-Fidelity analysis issues.

## Quick Diagnostic Checklist

```
Debugging Checklist:
- [ ] Check Output panel for errors
- [ ] Verify archetype detection
- [ ] Review file inclusion/exclusion patterns
- [ ] Test rule evaluation
- [ ] Compare CLI vs VSCode output
- [ ] Check plugin loading status
```

## Debug Logging

### Enable Debug Output

**CLI**:
```bash
xfi --debug
```

**VSCode Extension**:
1. Open Output panel (View > Output)
2. Select "X-Fidelity Debug" from dropdown
3. Analysis logs appear in "X-Fidelity Analysis"

### Log Levels

| Level | When to Use |
|-------|-------------|
| `info` | Normal operation (default) |
| `debug` | Detailed execution flow |
| `trace` | Full diagnostic output |

## Common Issues

### 1. Analysis Not Running

**Symptoms**: No issues found, analysis seems to skip

**Diagnostic Steps**:

```bash
# Verify files match inclusion patterns
xfi --debug 2>&1 | grep -E "(whitelist|blacklist|skip)"

# Check archetype configuration
cat .xfi-config.json
```

**Common Causes**:
- Wrong archetype configured
- All files excluded by blacklist patterns
- No files match whitelist patterns

**Solution**:
Check `whitelistPatterns` and `blacklistPatterns` in archetype config:

```json
{
    "whitelistPatterns": [".*\\.(ts|tsx|js|jsx)$"],
    "blacklistPatterns": [".*\\/node_modules\\/.*"]
}
```

### 2. Rule Not Triggering

**Symptoms**: Expected issue not appearing

**Diagnostic Steps**:

1. **Verify rule is in archetype**:
```bash
# Check archetype includes the rule
cat packages/x-fidelity-democonfig/src/{archetype}.json | grep "ruleName"
```

2. **Test fact returns expected data**:
```bash
xfi --debug 2>&1 | grep -E "fact|operator"
```

3. **Check condition logic**:
- Is it `all` (AND) or `any` (OR)?
- For iterative rules: does file match patterns?
- For global rules: is `REPO_GLOBAL_CHECK` condition present?

**Solution**:
Review rule JSON structure - see [xfi-create-rule skill](../xfi-create-rule/SKILL.md)

### 3. Rule Triggering Incorrectly (False Positives)

**Symptoms**: Issue appearing on files that should pass

**Diagnostic Steps**:

1. **Check file content matches expectation**:
```bash
# View what the fact is seeing
xfi --debug 2>&1 | grep -A5 "factName"
```

2. **Review operator logic**:
- Threshold too sensitive?
- Pattern too broad?

**Solution**:
- Adjust operator thresholds in rule params
- Add file exemptions
- Refine fact collection logic

### 4. VSCode Extension Not Finding Issues

**Symptoms**: Extension shows no issues but CLI finds them

**Diagnostic Steps**:

1. **Check Output panel**:
   - View > Output > "X-Fidelity Debug"
   - Look for errors or archetype detection

2. **Verify workspace**:
   - Is correct folder open?
   - Is it the workspace root?

3. **Run extension test**:
   - Command Palette > "X-Fidelity: Test Extension"

4. **Compare with CLI**:
```bash
cd /path/to/workspace
xfi --archetype node-fullstack
```

**Common Causes**:
- Different working directory than expected
- Archetype detection failed
- WASM files not loaded

**Solution**:
- Use Control Center to check status
- Verify archetype detection notification
- Check WASM status in Control Center

### 5. CLI-Extension Inconsistency

**Symptoms**: CLI and VSCode show different issues

**Diagnostic Steps**:

```bash
# Run consistency test
yarn test:consistency

# Check both outputs
xfi --mode cli    # Human-readable
xfi --mode vscode # Clean JSON output
```

**Common Causes**:
- Different archetype used
- Different workspace root
- Build not current

**Solution**:
```bash
# Ensure build is current
yarn build

# Verify same configuration
cat .xfi-config.json
```

### 6. Plugin Loading Errors

**Symptoms**: "Plugin not found" or "Failed to load"

**Diagnostic Steps**:

```bash
xfi --debug 2>&1 | grep -E "(plugin|load|register)"
```

**Common Causes**:
- Plugin not registered in index.ts
- Missing dependency
- Type error in plugin code

**Solution**:
1. Check `packages/x-fidelity-plugins/src/index.ts`
2. Verify plugin exports correct structure
3. Run plugin tests: `yarn workspace @x-fidelity/plugins test`

### 7. WASM/AST Parsing Errors

**Symptoms**: "Tree-sitter" errors, AST facts returning empty

**Diagnostic Steps**:

1. **Check WASM status in VSCode**:
   - Control Center > Status Overview > WASM Status

2. **Verify WASM files exist**:
```bash
ls packages/x-fidelity-vscode/dist/*.wasm
```

3. **Check language support**:
```bash
xfi --debug 2>&1 | grep -E "(tree-sitter|wasm|parse)"
```

**Solution**:
```bash
# Rebuild with WASM copy
yarn workspace x-fidelity-vscode build

# Verify WASM files
ls -la dist/*.wasm
```

### 8. Timeout Issues

**Symptoms**: Analysis taking too long or timing out

**Diagnostic Steps**:

```bash
# Check file count
find . -name "*.ts" -o -name "*.tsx" | wc -l

# Run with timing
time xfi --debug
```

**Common Causes**:
- Too many files analyzed
- Overly broad inclusion patterns
- Slow plugin operations

**Solution**:
- Refine whitelist patterns
- Expand blacklist for irrelevant directories
- VSCode extension has 5-minute timeout (configurable)

## VSCode Extension Debugging

### Using Debug Launch

1. Open `packages/x-fidelity-vscode` in VSCode
2. Press F5 (or Run > Start Debugging)
3. Select launch configuration:
   - "Run Extension" - Standard debug
   - "Extension Tests (Fresh Profile)" - Clean state

### Debug Information

Use Control Center > Development Tools > Debug Info to copy:
- Extension version
- VSCode version
- Workspace path
- Plugin status
- WASM status

### Log Files

| Output Channel | Content |
|----------------|---------|
| X-Fidelity Debug | Extension lifecycle, errors |
| X-Fidelity Analysis | Analysis execution, file processing |

File logs (if enabled with `--enable-file-logging`):
- Location: `.xfiResults/x-fidelity.log`

## Useful Debug Commands

```bash
# Full debug output
xfi --debug 2>&1 | tee debug.log

# Just errors
xfi 2>&1 | grep -i error

# Rule evaluation
xfi --debug 2>&1 | grep -E "(rule|condition|event)"

# File processing
xfi --debug 2>&1 | grep -E "(file|scan|process)"

# Plugin activity
xfi --debug 2>&1 | grep -E "(plugin|fact|operator)"
```

## Getting Help

1. **Control Center** - Check extension status and logs
2. **Debug Info** - Copy comprehensive system info
3. **Test Extension** - Verify basic functionality
4. **Compare CLI** - Run same analysis via command line

## Files Reference

| Purpose | Location |
|---------|----------|
| Debug output | Output panel > "X-Fidelity Debug" |
| Analysis logs | Output panel > "X-Fidelity Analysis" |
| File logs | `.xfiResults/x-fidelity.log` |
| Extension code | `packages/x-fidelity-vscode/src/` |
| CLI code | `packages/x-fidelity-cli/src/` |
| Core engine | `packages/x-fidelity-core/src/core/engine/` |
