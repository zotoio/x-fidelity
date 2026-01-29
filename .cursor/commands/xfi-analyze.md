# xfi-analyze

Troubleshoot X-Fidelity analysis issues including rule evaluation, plugin loading, and output problems.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-debug-analysis` skill at `.cursor/skills/xfi-debug-analysis/SKILL.md`
- **Subagent**: Use `xfi-debugger` for analysis troubleshooting

## Common Analysis Issues

### 1. Rule Not Triggering

**Symptoms**: Expected issue not appearing

**Check**:
- Is the rule in the archetype?
- Does the fact return expected data?
- Is the condition logic correct (all vs any)?
- Does the file match inclusion patterns?

### 2. False Positives

**Symptoms**: Issue appearing on files that should pass

**Check**:
- Is the operator threshold too sensitive?
- Is the pattern too broad?
- Does the fact data match expectations?

### 3. Plugin Loading Errors

**Symptoms**: "Plugin not found" or "Failed to load"

**Check**:
- Is the plugin registered in `packages/x-fidelity-plugins/src/index.ts`?
- Are plugin dependencies available?
- Any type errors in plugin code?

### 4. WASM/AST Issues

**Symptoms**: Tree-sitter errors, AST facts returning empty

**Check**:
- WASM status in VSCode Control Center
- WASM files exist in `packages/x-fidelity-vscode/dist/*.wasm`
- Language support for file type

## Debugging Commands

```bash
# Full debug output
xfi --debug 2>&1 | tee debug.log

# Rule evaluation
xfi --debug 2>&1 | grep -E "(rule|condition|event)"

# File processing
xfi --debug 2>&1 | grep -E "(file|scan|process)"

# Plugin activity
xfi --debug 2>&1 | grep -E "(plugin|fact|operator)"

# Check archetype detection
xfi --debug 2>&1 | grep archetype
```

## VSCode Extension Debugging

1. **Check Output panel**: View > Output > "X-Fidelity Debug"
2. **Run extension test**: Command Palette > "X-Fidelity: Test Extension"
3. **Compare with CLI**:
   ```bash
   cd /path/to/workspace
   xfi --archetype node-fullstack
   ```

## Analysis Checklist

```
Analysis Debugging:
- [ ] Check Output panel for errors
- [ ] Verify archetype detection
- [ ] Review file inclusion/exclusion patterns
- [ ] Test rule evaluation
- [ ] Compare CLI vs VSCode output
- [ ] Check plugin loading status
```

## Output Format

```
## Analysis Issue Diagnosis

### Symptom
[What's happening or not happening]

### Expected Behavior
[What should happen]

### Root Cause
[Why the analysis isn't working correctly]

### Solution
[Specific fix to apply]

### Verification
[How to confirm the fix works]
```

## Key Files

| Purpose | Location |
|---------|----------|
| Debug output | Output panel > "X-Fidelity Debug" |
| Analysis logs | Output panel > "X-Fidelity Analysis" |
| Extension code | `packages/x-fidelity-vscode/src/` |
| CLI code | `packages/x-fidelity-cli/src/` |
| Core engine | `packages/x-fidelity-core/src/core/engine/` |
