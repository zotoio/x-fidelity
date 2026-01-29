# Topic: Quality Standards

## Fact: ESLint Configuration Rules
### Modified: 2026-01-29
### Priority: H

The project uses a flat ESLint configuration with strict rules to maintain code quality:

*   **No Unused Variables**: `@typescript-eslint/no-unused-vars` is set to "error" (ignore `^_`).
*   **No Explicit Any**: `@typescript-eslint/no-explicit-any` is set to "warn" (avoid using `any`).
*   **Floating Promises**: `@typescript-eslint/no-floating-promises` is "error" (must handle promises).
*   **Type Imports**: `@typescript-eslint/consistent-type-imports` enforces `import type`.
*   **Console/Debugger**: `no-console` is "warn", `no-debugger` is "error".

### References
1.  [eslint.config.js](../../eslint.config.js)
2.  [packages/eslint-config/base.js](../../packages/eslint-config/base.js)

## Fact: TypeScript Strict Mode
### Modified: 2026-01-29
### Priority: H

The codebase enforces strict TypeScript settings via `tsconfig.base.json`:

*   `"strict": true`: Enables all strict type checking options (noImplicitAny, strictNullChecks, etc.).
*   `"forceConsistentCasingInFileNames": true`: Prevents issues on case-insensitive filesystems.
*   `"skipLibCheck": true`: Skips type checking of declaration files.

### References
1.  [tsconfig.base.json](../../tsconfig.base.json)

## Fact: Test Coverage Requirement
### Modified: 2026-01-29
### Priority: H

All packages must maintain 100% test coverage.

*   Tests must pass before merge.
*   If unit tests fail, implementation should not be changed unless it is broken; fix the test instead if the test logic is outdated.
*   New features must have corresponding unit tests.

### References
1.  [.cursor/rules/development-workflow.mdc](../../.cursor/rules/development-workflow.mdc)
2.  [.cursor/rules/core-tenets.mdc](../../.cursor/rules/core-tenets.mdc)
