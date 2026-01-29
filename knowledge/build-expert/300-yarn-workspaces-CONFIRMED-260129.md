# Topic: Yarn Workspace Configuration

## Fact: Nohoist Isolates VSCode and Fixtures Dependencies
### Modified: 2026-01-29
### Priority: H

The root `package.json` uses `nohoist` patterns to prevent specific packages from having their dependencies hoisted to the root `node_modules`:

```json
"workspaces": {
  "packages": [
    "packages/x-fidelity-cli",
    "packages/x-fidelity-core",
    "packages/x-fidelity-democonfig",
    "packages/x-fidelity-fixtures",
    "packages/x-fidelity-plugins",
    "packages/x-fidelity-server",
    "packages/x-fidelity-types",
    "packages/x-fidelity-vscode",
    "packages/typescript-config",
    "packages/eslint-config"
  ],
  "nohoist": [
    "**/x-fidelity-vscode",
    "**/x-fidelity-vscode/**",
    "**/x-fidelity-fixtures",
    "**/x-fidelity-fixtures/**"
  ]
}
```

**Why nohoist is needed:**
- **VSCode Extension**: The `vscode` package and extension test harness require dependencies in local `node_modules` for extension activation and VSIX packaging
- **Fixtures**: Test fixtures simulate real-world projects and need isolated `node_modules` to accurately test dependency detection

Without nohoist, these packages fail during testing and packaging because they can't locate their dependencies.

### References
1. [Root package.json](../../package.json)

---

## Fact: Package Dependency Graph Defines Build Order
### Modified: 2026-01-29
### Priority: H

The monorepo packages have explicit dependencies that form the build order graph:

```
x-fidelity-types (no dependencies)
       ↓
x-fidelity-core (depends on types)
       ↓
x-fidelity-plugins (depends on core, types)
       ↓
├─ x-fidelity-cli (depends on core, types, plugins, server, democonfig)
└─ x-fidelity-vscode (depends on core, types, plugins)
```

Supporting packages:
- `x-fidelity-democonfig`: Default configuration, no build dependencies
- `x-fidelity-fixtures`: Test fixtures, no build dependencies
- `x-fidelity-server`: Depends on core, types
- `typescript-config`: Shared tsconfig, no runtime dependencies
- `eslint-config`: Shared ESLint config, no runtime dependencies

Turbo's `^build` syntax automatically respects this graph during builds.

### References
1. [Root package.json](../../package.json)

---

## Fact: Root Scripts Orchestrate Cross-Package Operations
### Modified: 2026-01-29
### Priority: M

The root `package.json` provides unified scripts for common development operations:

**Build commands:**
```json
"build": "turbo build",                              // Incremental cached build
"build:production": "turbo build:production",        // Production optimized
"build:clean": "turbo clean && turbo build --force --no-cache",  // Full rebuild
"build:local": "turbo build --force --no-cache"     // Force rebuild, no cache
```

**Test commands:**
```json
"test": "yarn ci:quality && yarn test:consolidated", // Full test suite
"test:consolidated": "yarn clean && node scripts/test-consolidated.js",
"test:coverage": "turbo test:coverage && yarn coverage:merge && yarn coverage:check"
```

**VSCode extension shortcuts:**
```json
"vscode:dev": "yarn workspace x-fidelity-vscode dev",
"vscode:dev:fresh": "yarn workspace x-fidelity-vscode dev:fresh",
"vscode:package": "yarn workspace x-fidelity-vscode package"
```

The `yarn workspace <package-name> <script>` pattern runs scripts in specific packages while maintaining workspace context.

### References
1. [Root package.json](../../package.json)

---

## Fact: Semantic Release Handles Unified Versioning
### Modified: 2026-01-29
### Priority: M

The monorepo uses semantic-release for automated versioning and publishing:

```json
"devDependencies": {
  "@semantic-release/changelog": "^6.0.3",
  "@semantic-release/commit-analyzer": "^13.0.1",
  "@semantic-release/exec": "^7.1.0",
  "@semantic-release/git": "^10.0.1",
  "@semantic-release/github": "^11.0.3",
  "@semantic-release/npm": "^12.0.1",
  "semantic-release": "^24.2.7"
}
```

Release scripts:
```json
"release": "semantic-release",
"release:dry-run": "semantic-release --dry-run",
"publish:cli": "turbo build:production --filter=x-fidelity && cd packages/x-fidelity-cli && yarn release",
"publish:vscode": "turbo package --filter=x-fidelity-vscode && cd packages/x-fidelity-vscode && yarn release"
```

The release workflow:
1. Analyzes commits to determine version bump (major/minor/patch)
2. Generates changelog from commit messages
3. Updates version in package.json
4. Publishes to npm (CLI) or VS Code Marketplace (extension)
5. Creates GitHub release with release notes

### References
1. [Root package.json](../../package.json)
