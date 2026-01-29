# xfi-test

Run the X-Fidelity test suite and automatically diagnose any failures.

## Instructions

1. Run the test suite from the workspace root:
   ```bash
   yarn test
   ```

2. If all tests pass:
   - Report success with coverage summary
   - Verify 100% coverage threshold is maintained

3. If tests fail:
   - Use the **xfi-testing-expert subagent** to diagnose failures
   - If the issue appears to be a runtime error rather than a test issue, also engage **xfi-debugger subagent**
   - Identify root cause (test issue vs implementation issue)
   - Per workspace rules: fix the implementation, not the tests (unless implementation changed)

## Test Commands Reference

```bash
# Full test suite with quality checks
yarn test

# Specific package tests
yarn workspace @x-fidelity/core test
yarn workspace @x-fidelity/plugins test
yarn workspace x-fidelity-vscode test
yarn workspace x-fidelity test

# VSCode extension tests
yarn workspace x-fidelity-vscode test:unit
yarn workspace x-fidelity-vscode test:integration
```

## Failure Analysis Workflow

When tests fail:

1. **Capture failure details**: Test name, file, error message, stack trace
2. **Identify failure type**:
   - Assertion failure → Check expected vs actual values
   - Timeout → Check async handling
   - Mock issue → Verify mock setup
   - Import error → Check build state
3. **Determine root cause**:
   - Is the test correct? → Fix implementation
   - Did implementation change intentionally? → Update test
4. **Apply fix and re-run**

## Coverage Requirements

- All packages must maintain **100% test coverage**
- Coverage reports are in `coverage/` directories
- If coverage drops, add tests for untested code paths

## Output Format

```
## Test Results

### Status: [PASS/FAIL]

### Summary
- Total: X tests
- Passed: X
- Failed: X
- Coverage: X%

### Failures (if any)
[Detailed failure analysis]

### Recommended Fixes
[Specific actions to resolve failures]
```
