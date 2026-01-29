# Topic: Turbo Pipeline Configuration

## Fact: Task Dependency Graph Uses Topological Build Order
### Modified: 2026-01-29
### Priority: H

Turbo tasks use `dependsOn: ["^build"]` syntax where the `^` prefix means "depend on the same task in upstream packages." This ensures packages build in correct dependency order:

```
@x-fidelity/types → @x-fidelity/core → @x-fidelity/plugins → x-fidelity (CLI)
                                                           → x-fidelity-vscode
```

The build task configuration:
```json
"build": {
  "dependsOn": ["^build"],
  "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
  "inputs": ["src/**", "package.json", "tsconfig*.json", "esbuild.config.js"]
}
```

This means before building any package, Turbo first builds all packages it depends on (via `^build`). The `inputs` array specifies which files trigger rebuilds, and `outputs` defines what gets cached.

### References
1. [turbo.json](../../turbo.json)

---

## Fact: Test Tasks Require Upstream Builds Before Execution
### Modified: 2026-01-29
### Priority: H

All test-related tasks depend on upstream package builds to ensure test code can import built dependencies:

```json
"test": {
  "dependsOn": ["^build"],
  "outputs": ["coverage/**"],
  "inputs": ["src/**", "test/**", "*.test.ts", "*.spec.ts"]
}
```

Integration and E2E tests additionally depend on their own package's build (not just upstream):
```json
"test:integration": {
  "dependsOn": ["^build", "build"],
  "outputs": ["coverage/**", ".vscode-test/**"],
  "inputs": ["src/**", "test/**", "dist/**"],
  "cache": false
}
```

The `cache: false` setting on integration/E2E tests prevents stale test results since these tests interact with the real filesystem and VS Code environment.

### References
1. [turbo.json](../../turbo.json)

---

## Fact: Global Dependencies Trigger Full Rebuilds
### Modified: 2026-01-29
### Priority: M

The `globalDependencies` array specifies files that, when changed, invalidate the entire Turbo cache and trigger rebuilds across all packages:

```json
"globalDependencies": [
  ".xfi-config.json",
  "turbo.json",
  "yarn.lock"
]
```

- `.xfi-config.json`: Main configuration affects how analysis runs across all packages
- `turbo.json`: Pipeline changes affect build ordering and caching
- `yarn.lock`: Dependency version changes could affect any package

This is why changing `yarn.lock` triggers full rebuilds - any package could be affected by updated dependencies.

### References
1. [turbo.json](../../turbo.json)

---

## Fact: Dev and Clean Tasks Disable Caching
### Modified: 2026-01-29
### Priority: M

Tasks that should never use cache have `cache: false`:

```json
"dev": {
  "cache": false,
  "persistent": true
},
"clean": {
  "cache": false,
  "outputs": ["dist/**", ".next/**", "out/**", "build/**", "coverage/**", ".vscode-test/**", "*.tsbuildinfo"]
}
```

The `dev` task is also marked `persistent: true` because it starts long-running watch processes that shouldn't be killed when Turbo completes. The `clean` task defines all directories it will remove in `outputs` for documentation purposes, but caching is disabled since clean operations should always run fresh.

### References
1. [turbo.json](../../turbo.json)
