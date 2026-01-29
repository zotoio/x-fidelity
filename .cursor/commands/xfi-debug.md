# xfi-debug

Debug errors, exceptions, and unexpected behavior in X-Fidelity.

## Instructions

This command uses:
- **Skill**: Read and follow the `xfi-debug-analysis` skill at `.cursor/skills/xfi-debug-analysis/SKILL.md`
- **Subagent**: Use `xfi-debugger` for expert error analysis and troubleshooting

## Workflow

1. **Capture error information**:
   - Error message and stack trace
   - Error code if available (see ranges below)
   - Context: file, function, inputs
   - Recent changes that may have caused the issue

2. **Use xfi-debugger subagent** to:
   - Analyze the error category from the code
   - Review relevant log output
   - Identify reproduction steps
   - Form and test hypothesis

3. **Apply the fix**:
   - Make minimal surgical change
   - Add error handling if missing
   - Improve logging for future debugging
   - Verify fix with tests

## Error Code Ranges

| Range | Category |
|-------|----------|
| 1000-1099 | Configuration errors |
| 1100-1199 | Plugin errors |
| 1200-1299 | Analysis errors |
| 1300-1399 | File system errors |
| 1400-1499 | Network errors |
| 1500-1599 | Validation errors |
| 1600-1699 | Internal errors |

## Debugging Checklist

```
Debugging Checklist:
- [ ] Error message captured completely
- [ ] Stack trace reviewed for root cause
- [ ] Recent code changes checked
- [ ] Related tests examined
- [ ] Log output analyzed
- [ ] Reproduction steps identified
- [ ] Fix verified with tests
```

## Debug Commands

```bash
# CLI with verbose output
xfidelity . --verbose

# Debug specific file
xfidelity . --file src/specific/file.ts --verbose

# Full debug output
xfi --debug 2>&1 | tee debug.log

# Just errors
xfi 2>&1 | grep -i error
```

## VSCode Extension Debugging

1. **Check Output panels**:
   - "X-Fidelity Debug" - Extension debug logs
   - "X-Fidelity Analysis" - Analysis output

2. **Use Control Center**:
   - Debug Info - Copy system information
   - View Logs - Detailed output

3. **F5 Debug Launch**:
   - "Run Extension" - Standard debugging
   - "Extension Tests" - Debug tests

## StandardError Pattern

```typescript
throw new StandardError(
  'CONFIG_LOAD_ERROR',          // Error code
  `Failed to load: ${error.message}`,  // Message
  { 
    originalError: error,        // Wrapped error
    configPath,                  // Context
    errorCode: 1001              // Numeric code
  }
);
```

## Output Format

```
## Debug Analysis

### Error Summary
[Brief description of the error]

### Error Code
[If applicable: 1000-1699]

### Root Cause
[What's actually causing the issue]

### Evidence
[Logs, stack traces, test output]

### Location
[File:line where fix is needed]

### Solution
[Specific code change required]

### Verification
[How to confirm the fix works]

### Prevention
[How to avoid this in future]
```
