# Topic: Code Review Patterns

## Fact: X-Fidelity Review Checklist
### Modified: 2026-01-29
### Priority: H

The following checklist must be applied to all code reviews in the X-Fidelity repository:

1.  **Tests**: verify that `yarn test` passes and that new functionality has accompanying tests.
2.  **Linting**: verify that `yarn lint` passes without errors.
3.  **Documentation**: ensure README.md and website docs are updated if the change affects user-facing features.
4.  **Commits**: ensure commit messages follow conventional commits format (e.g., `feat:`, `fix:`).
5.  **Dependencies**: verify that `yarn` was used for dependency changes (not npm) and `yarn.lock` is updated.

### References
1.  [CONTRIBUTING.md](../../CONTRIBUTING.md)
2.  [.cursor/rules/development-workflow.mdc](../../.cursor/rules/development-workflow.mdc)

## Fact: Security Review Requirements
### Modified: 2026-01-29
### Priority: H

Code changes involving file system access or external input must undergo security review:

1.  **Path Validation**: All file paths must be validated using `pathValidator` to prevent traversal attacks.
2.  **Input Sanitization**: External input (e.g., from webhooks or CLI args) must be sanitized using `inputSanitizer`.
3.  **Secrets**: Ensure no credentials or secrets are hardcoded or logged.

### References
1.  [packages/x-fidelity-core/src/security/pathValidator.ts](../../packages/x-fidelity-core/src/security/pathValidator.ts)
2.  [packages/x-fidelity-core/src/security/inputSanitizer.ts](../../packages/x-fidelity-core/src/security/inputSanitizer.ts)

## Fact: Cross-Package Change Review
### Modified: 2026-01-29
### Priority: M

When a change affects multiple packages (e.g., `core` and `vscode`), ensure:

1.  **Consistency**: Logic changes in `core` are reflected in `vscode` extension behavior if applicable.
2.  **Versioning**: Shared packages (like `types`) are versioned correctly if published interface changes.
3.  **Build Order**: verify that changes don't introduce circular dependencies between packages.

### References
1.  [package.json](../../package.json)
2.  [.cursor/rules/monorepo-structure.mdc](../../.cursor/rules/monorepo-structure.mdc)
