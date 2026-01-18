# xfi-build

Build the X-Fidelity monorepo and diagnose any build failures.

## Instructions

1. Run the build from workspace root:
   ```bash
   yarn build
   ```

2. If build succeeds:
   - Report success with build summary
   - Note any warnings that should be addressed

3. If build fails:
   - Use the **xfi-build-expert subagent** to diagnose the failure
   - The subagent is expert in: Turbo, yarn workspaces, esbuild, TypeScript compilation

## Build Commands Reference

```bash
# Build all packages with Turbo
yarn build

# Clean and rebuild everything
yarn build:clean

# Force rebuild without cache
yarn build:local

# Clean all build artifacts
yarn clean

# Build specific package
yarn workspace @x-fidelity/core build
yarn workspace @x-fidelity/plugins build
yarn workspace x-fidelity build
yarn workspace x-fidelity-vscode build
```

## Package Dependency Order

The build must respect this dependency graph:

```
@x-fidelity/types
      ↓
@x-fidelity/core ← @x-fidelity/plugins
      ↓                    ↓
x-fidelity (CLI)    x-fidelity-vscode
```

## Common Build Issues

1. **TypeScript errors**: Check type definitions and imports
2. **Turbo cache issues**: Try `yarn build:local` to bypass cache
3. **Dependency errors**: Check workspace hoisting in root package.json
4. **esbuild issues**: Review externals configuration
5. **Build order**: Ensure dependencies are built first

## Key Build Files

- `turbo.json` - Task definitions and dependency graph
- `package.json` (root) - Workspace configuration
- `packages/*/package.json` - Individual package configs
- `packages/x-fidelity-cli/esbuild.config.js` - CLI bundling
- `packages/x-fidelity-vscode/esbuild.config.js` - VSCode extension bundling

## Output Format

```
## Build Results

### Status: [SUCCESS/FAILED]

### Build Summary
- Packages built: X
- Time: Xs
- Cache hits: X

### Errors (if any)
[Detailed error analysis]

### Warnings
[Any warnings to address]

### Recommended Fixes
[Specific actions to resolve build failures]
```
