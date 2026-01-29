# xfi-review

Perform a comprehensive code review of recent changes using specialized X-Fidelity subagents.

## Instructions

Review the current code changes by running these three subagents **in parallel**:

1. **xfi-code-reviewer subagent**: Review for code quality, patterns, anti-patterns, type safety, error handling, and X-Fidelity architectural compliance.

2. **xfi-security-expert subagent**: Check for security concerns including path validation, directory traversal prevention, input sanitization, and secret handling.

3. **xfi-testing-expert subagent**: Verify test coverage exists for changes, check that the 100% coverage requirement is maintained, and identify any missing test scenarios.

## Workflow

1. First, run `git diff` to see recent changes
2. Launch all three subagents in parallel with the diff context
3. Collect and synthesize findings from all subagents
4. Present a unified review with prioritized recommendations:
   - **Critical**: Must fix before merge
   - **Warning**: Should fix
   - **Suggestion**: Nice to have improvements
   - **Strengths**: Positive patterns to recognize

## Output Format

```
## Code Review Summary

### Critical Issues
[List any blocking issues]

### Warnings
[List issues that should be addressed]

### Suggestions
[List optional improvements]

### Strengths
[Recognize good patterns and practices]

### Test Coverage
[Summary of test coverage status]

### Security Assessment
[Summary of security review]
```

## Key Checks

- TypeScript best practices and type safety
- X-Fidelity plugin patterns (facts, operators)
- Error handling with StandardError
- Path validation for file operations
- Logging with PrefixingLogger
- Test coverage for new functionality
- Documentation updates needed
