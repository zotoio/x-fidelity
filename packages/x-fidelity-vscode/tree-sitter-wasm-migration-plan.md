# Tree-sitter to WASM Migration Plan for X-Fidelity

## Overview
Converting x-fidelity monorepo from native Tree-sitter (with node-gyp compilation) to WebAssembly Tree-sitter for better cross-platform compatibility.

## Migration Strategy
1. Start with `x-fidelity-core` package conversion
2. Update `x-fidelity-plugins` to use new async core
3. Convert CLI and server packages  
4. Update VSCode extension last
5. Run full test suite after each package conversion

## Current State Analysis
- Core uses: tree-sitter@^0.22.4, tree-sitter-javascript@^0.23.1, tree-sitter-typescript@^0.23.2
- Plugins uses: same tree-sitter packages
- VSCode already has tree-sitter bundling setup (from previous work)
- Worker-based architecture exists but uses native tree-sitter

## Package Conversion Status

### ✅ x-fidelity-core
- [ ] Remove native tree-sitter dependencies  
- [ ] Add web-tree-sitter dependency
- [ ] Update core options for WASM initialization
- [ ] Create WASM parser initialization utilities

### ✅ x-fidelity-plugins  
- [ ] Update AST plugin to use WASM tree-sitter
- [ ] Convert worker to WASM initialization
- [ ] Update fact providers to be async
- [ ] Bundle WASM files with plugin

### ✅ x-fidelity-cli
- [ ] Update CLI commands to await parser initialization
- [ ] Add WASM loading error handling
- [ ] Update progress reporting for async initialization

### ✅ x-fidelity-vscode  
- [ ] Update extension to use WASM tree-sitter
- [ ] Bundle WASM files with extension
- [ ] Update worker configuration

### ✅ x-fidelity-server
- [ ] Update analysis endpoints for async parser
- [ ] Add parser instance management
- [ ] Serve WASM files

## Breaking Changes
- All parser initialization methods are now async
- Plugin factory methods return Promises  
- VSCode extension activation may take slightly longer
- ~50ms initialization overhead, 10-15% runtime performance impact

## Files to Update

### Core Package
- [ ] packages/x-fidelity-core/package.json - dependencies
- [ ] packages/x-fidelity-core/src/core/options.ts - WASM options
- [ ] packages/x-fidelity-core/src/utils/wasmParser.ts - NEW: WASM utilities

### Plugins Package  
- [ ] packages/x-fidelity-plugins/package.json - dependencies
- [ ] packages/x-fidelity-plugins/src/xfiPluginAst/worker/treeSitterWorker.ts - WASM worker
- [ ] packages/x-fidelity-plugins/src/xfiPluginAst/worker/treeSitterManager.ts - async manager
- [ ] packages/x-fidelity-plugins/src/sharedPluginUtils/astUtils.ts - async utilities
- [ ] packages/x-fidelity-plugins/src/xfiPluginAst/facts/*.ts - async facts

### CLI Package
- [ ] packages/x-fidelity-cli/src/commands/*.ts - async command handlers

### VSCode Package
- [ ] packages/x-fidelity-vscode/esbuild.config.js - WASM bundling
- [ ] packages/x-fidelity-vscode/src/extension.ts - async activation

### Server Package
- [ ] packages/x-fidelity-server/src/api/*.ts - async endpoints

## Testing Strategy
- Convert tests to async where needed
- Add WASM initialization performance benchmarks
- Validate cross-platform compatibility
- Test memory usage and performance impact

## Rollback Plan
- Keep native tree-sitter packages available as fallback
- Environment variable to switch between native/WASM
- Gradual deployment with feature flags
