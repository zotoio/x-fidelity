# Topic: esbuild Bundling Patterns

## Fact: CLI Bundle Uses Alias Resolution for Internal Packages
### Modified: 2026-01-29
### Priority: H

The CLI bundler uses esbuild's `alias` configuration to bundle all `@x-fidelity/*` packages directly from source, creating a self-contained CLI binary:

```javascript
alias: {
  '@x-fidelity/core': path.resolve(__dirname, '../x-fidelity-core/src/index.ts'),
  '@x-fidelity/types': path.resolve(__dirname, '../x-fidelity-types/src/index.ts'),
  '@x-fidelity/plugins': path.resolve(__dirname, '../x-fidelity-plugins/src/index.ts'),
  '@x-fidelity/server': path.resolve(__dirname, '../x-fidelity-server/src/index.ts'),
  '@x-fidelity/democonfig': path.resolve(__dirname, '../x-fidelity-democonfig/src/index.js')
}
```

This approach:
- Bundles internal packages from TypeScript source (not `dist/`)
- Eliminates need for users to install workspace packages separately
- Results in single `dist/index.js` file containing all X-Fidelity logic
- Reduces runtime import failures for globally-installed CLI

### References
1. [CLI esbuild.config.js](../../packages/x-fidelity-cli/esbuild.config.js)

---

## Fact: Native Modules Must Be Marked External
### Modified: 2026-01-29
### Priority: H

Both CLI and VSCode bundlers mark native Node.js modules as external since they contain platform-specific `.node` binaries that cannot be bundled:

**CLI externals:**
```javascript
external: [
  'vscode',           // Only available in VSCode context
  'fsevents',         // macOS filesystem events (native)
  'tree-sitter',      // Native TreeSitter bindings
  'tree-sitter-javascript',
  'tree-sitter-typescript',
  'web-tree-sitter'
]
```

**VSCode externals:**
```javascript
external: [
  'vscode',           // Provided by VSCode runtime
  'electron',         // Provided by VSCode/Electron runtime
  'original-fs',      // Electron's native fs
  'fsevents',
  'chokidar',
  'web-tree-sitter'   // Keep external to prevent class name mangling
]
```

The comment about tree-sitter in VSCode config notes these were previously removed from externals to prevent VSIX failures - the worker now bundles tree-sitter for better compatibility.

### References
1. [CLI esbuild.config.js](../../packages/x-fidelity-cli/esbuild.config.js)
2. [VSCode esbuild.config.js](../../packages/x-fidelity-vscode/esbuild.config.js)

---

## Fact: VSCode Extension Builds Separate Worker Bundle
### Modified: 2026-01-29
### Priority: H

The VSCode extension builds two separate bundles in parallel:

1. **TreeSitter Worker** (`dist/treeSitterWorker.js`):
   - Entry: `../x-fidelity-plugins/src/sharedPluginUtils/astUtils/treeSitterWorker.ts`
   - Runs in separate Node.js worker thread for CPU-intensive AST parsing
   - Bundles tree-sitter modules (not external) for VSIX compatibility

2. **Main Extension** (`dist/extension.js`):
   - Entry: `src/extension.ts`
   - Runs in VSCode's main extension process
   - Uses production optimizations: `drop: ['console', 'debugger']`

```javascript
const [workerResult, extensionResult] = await Promise.all([
  workerCtx.rebuild(),
  ctx.rebuild()
]);
```

The parallel build strategy improves build performance while ensuring both bundles are consistent.

### References
1. [VSCode esbuild.config.js](../../packages/x-fidelity-vscode/esbuild.config.js)

---

## Fact: Production Builds Enable Minification and Drop Debug Code
### Modified: 2026-01-29
### Priority: M

Production builds (`--production` flag) differ from development in several ways:

```javascript
const production = process.argv.includes('--production');

{
  minify: production,              // Compress code in production
  sourcemap: !production,          // No sourcemaps in production
  sourcesContent: false,           // Never include source content in maps
  drop: production ? ['console', 'debugger'] : [],  // Remove debug code
  define: {
    'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development')
  }
}
```

The CLI bundler also has a custom plugin to replace dynamic imports with static ones for proper bundling:

```javascript
// Replace dynamic imports with static imports for bundling
contents = contents.replace(
  /await this\.dynamicImport\('@x-fidelity\/plugins'\)/g,
  'await import("@x-fidelity/plugins")'
);
```

### References
1. [CLI esbuild.config.js](../../packages/x-fidelity-cli/esbuild.config.js)
2. [VSCode esbuild.config.js](../../packages/x-fidelity-vscode/esbuild.config.js)
