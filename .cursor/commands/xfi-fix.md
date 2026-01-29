# xfi-fix

Intelligently route problems to the appropriate X-Fidelity expert subagent.

## Instructions

Analyze the current problem and automatically delegate to the most appropriate expert subagent.

## Problem Routing

| Problem Type | Subagent | Skill |
|--------------|----------|-------|
| Build errors, CI failures | `xfi-build-expert` | - |
| Test failures, coverage gaps | `xfi-testing-expert` | - |
| Analysis issues, rule problems | `xfi-debugger` | `xfi-debug-analysis` |
| Security concerns, path issues | `xfi-security-expert` | - |
| Plugin development issues | `xfi-plugin-expert` | - |
| VSCode extension problems | `xfi-vscode-expert` | - |
| Documentation needs | `xfi-docs-expert` | `xfi-documentation-update` |
| Rule/archetype configuration | `xfi-rules-expert` | - |

## Workflow

1. **Analyze the problem**:
   - Read any error messages or logs provided
   - Check for terminal output
   - Identify the problem category

2. **Route to appropriate expert**:
   - Build errors → `xfi-build-expert`
   - Test failures → `xfi-testing-expert`
   - Runtime errors → `xfi-debugger`
   - Security issues → `xfi-security-expert`

3. **If multiple domains affected**:
   - Launch relevant subagents **in parallel**
   - Synthesize findings from all experts
   - Prioritize fixes by impact

4. **Apply the fix**:
   - Follow expert recommendations
   - Verify with tests: `yarn test`
   - Verify build: `yarn build`

## Detection Patterns

### Build Errors
Look for:
- TypeScript compilation errors
- esbuild bundle failures
- Turbo task failures
- Missing dependencies

### Test Failures
Look for:
- Jest assertion errors
- Timeout failures
- Coverage threshold failures
- Mock setup issues

### Analysis Issues
Look for:
- Rule not triggering
- False positives
- Plugin loading errors
- WASM/AST parsing issues

### Security Issues
Look for:
- Path traversal attempts
- Unvalidated user input
- Exposed secrets
- Missing path validation

## Quick Fixes

```bash
# Clean build
yarn build:clean

# Run tests
yarn test

# Check specific package
yarn workspace @x-fidelity/core test
yarn workspace @x-fidelity/plugins test

# Rebuild VSCode extension
yarn workspace x-fidelity-vscode build
```

## Output Format

```
## Problem Analysis

### Problem Type
[Category of issue detected]

### Routed To
[Subagent(s) engaged]

### Root Cause
[What's causing the issue]

### Solution
[Specific fix to apply]

### Verification Steps
[How to confirm the fix]
```
