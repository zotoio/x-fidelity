# Topic: Common Issues

## Fact: Error Handling Patterns
### Modified: 2026-01-29
### Priority: M

Common issues to watch for in error handling:

*   **Missing Error Types**: Errors should be typed (e.g., using `StandardError` or specific error classes) rather than generic `Error` where possible.
*   **Swallowed Errors**: `catch` blocks must not be empty or just log to console without re-throwing or handling the error state.
*   **Console Logging**: Use the provided `logger` or `ExecutionContext` logger instead of `console.log` or `console.error`.

### References
1.  [packages/x-fidelity-core/src/utils/standardErrorHandler.ts](../../packages/x-fidelity-core/src/utils/standardErrorHandler.ts)
2.  [packages/x-fidelity-core/src/utils/logger.ts](../../packages/x-fidelity-core/src/utils/logger.ts)

## Fact: Type Safety Anti-Patterns
### Modified: 2026-01-29
### Priority: H

Avoid these type safety violations:

*   **`as any` Assertions**: Using `as any` bypasses the type checker and defeats the purpose of TypeScript. Use stricter types or `unknown` with type guards.
*   **Implicit Any**: Implicit `any` is forbidden by `strict: true`. All parameters and return types should be explicitly typed if not inferred correctly.
*   **Non-Null Assertions**: Avoid `!` (non-null assertion) unless absolutely certain; prefer optional chaining `?.` or null checks.

### References
1.  [tsconfig.base.json](../../tsconfig.base.json)
2.  [eslint.config.js](../../eslint.config.js)

## Fact: Performance Red Flags
### Modified: 2026-01-29
### Priority: M

Performance issues to catch during review:

*   **Sync File I/O**: Avoid synchronous `fs` calls (e.g., `readFileSync`) in high-throughput paths; use asynchronous versions.
*   **Large Object copying**: Be mindful of deep cloning or spreading large objects repeatedly.
*   **Regex Performance**: Ensure regular expressions are not vulnerable to catastrophic backtracking (ReDoS).

### References
1.  [packages/x-fidelity-core/src/utils/pathUtils.ts](../../packages/x-fidelity-core/src/utils/pathUtils.ts)
