# Topic: Plugin Structure and Registration

## Fact: Standard Plugin Directory Layout
### Modified: 2026-01-29
### Priority: H

Every X-Fidelity plugin follows a standardized directory structure:

```
xfiPlugin{Name}/
├── index.ts          # Main plugin export with XFiPlugin object
├── facts/            # Data collection logic
│   ├── {name}Fact.ts
│   └── {name}Fact.test.ts
├── operators/        # Analysis and comparison logic
│   ├── {name}Operator.ts
│   └── {name}Operator.test.ts
├── sampleRules/      # Example rule configurations (JSON)
│   └── {name}-rule.json
└── types.ts          # Plugin-specific type definitions (optional)
```

The `xfiPluginSimpleExample` serves as the canonical template for new plugins. All plugins must export an `XFiPlugin` object from `index.ts` with required `name` and `version` properties.

### References
1. [xfiPluginSimpleExample/index.ts](../../packages/x-fidelity-plugins/src/xfiPluginSimpleExample/index.ts)
2. [xfiPluginAst directory structure](../../packages/x-fidelity-plugins/src/xfiPluginAst/)

---

## Fact: Plugin Registration via PluginRegistry
### Modified: 2026-01-29
### Priority: H

The `XFiPluginRegistry` is a singleton that manages all plugin lifecycle operations:

1. **Registration**: `registerPlugin(plugin: XFiPlugin)` validates structure and prevents duplicates
2. **Initialization**: Plugins with `initialize(context: PluginContext)` are called with logger context
3. **Fact/Operator Collection**: `getPluginFacts()` and `getPluginOperators()` aggregate from all plugins
4. **Status Tracking**: Tracks 'pending' | 'initializing' | 'completed' | 'failed' states
5. **Async Initialization**: Supports `waitForPlugin(name)` and `waitForAllPlugins()` for async init

Validation requirements during registration:
- Plugin must have `name` and `version` properties
- Facts must have `name` property and `fn` function
- Operators must have `name` property and `fn` function
- Duplicate plugin names are logged as warnings and skipped

```typescript
// Registration validates structure
if (!plugin || !plugin.name || !plugin.version) {
    throw new Error('Invalid plugin format - missing name or version');
}
```

### References
1. [pluginRegistry.ts](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)
2. [plugins.ts types](../../packages/x-fidelity-types/src/plugins.ts)

---

## Fact: Plugin Export and Dynamic Loading Patterns
### Modified: 2026-01-29
### Priority: H

Plugins are exported both statically and dynamically from the plugins package:

**Static Exports** (for direct imports):
```typescript
export { xfiPluginAst } from './xfiPluginAst';
export { xfiPluginDependency } from './xfiPluginDependency';
// ... other plugins
```

**Dynamic Registry** (for lazy loading):
```typescript
export const availablePlugins = {
    xfiPluginAst: () => import('./xfiPluginAst').then(m => m.xfiPluginAst),
    xfiPluginDependency: () => import('./xfiPluginDependency').then(m => m.xfiPluginDependency),
    // ... other plugins
};
```

**Builtin Plugin Discovery**:
```typescript
export function getBuiltinPluginNames(): string[] {
    return Object.keys(availablePlugins);
}
```

Current builtin plugins (10 total):
- xfiPluginAst, xfiPluginDependency, xfiPluginFilesystem
- xfiPluginOpenAI, xfiPluginPatterns, xfiPluginReactPatterns
- xfiPluginRemoteStringValidator, xfiPluginRequiredFiles
- xfiPluginSimpleExample, xfiPluginExtractValues

### References
1. [plugins/src/index.ts](../../packages/x-fidelity-plugins/src/index.ts)

---

## Fact: Plugin Naming Conventions
### Modified: 2026-01-29
### Priority: M

X-Fidelity enforces consistent naming conventions for plugins:

**Plugin Names**:
- Pattern: `xfiPlugin{PascalCaseName}` (e.g., `xfiPluginAst`, `xfiPluginDependency`)
- Directory matches export name (e.g., `xfiPluginSimpleExample/`)

**Fact Names**:
- Pattern: `{camelCaseName}` or `{camelCaseName}Fact` (e.g., `ast`, `customFact`, `functionCountFact`)
- Must be unique across all registered plugins
- File naming: `{name}Fact.ts` with corresponding `{name}Fact.test.ts`

**Operator Names**:
- Pattern: `{camelCaseName}` or `{camelCaseName}Operator` (e.g., `astComplexity`, `customOperator`)
- Must be unique across all registered plugins
- File naming: `{name}Operator.ts` or `{name}.ts` with corresponding test file

**Rule Names** (in sampleRules):
- Pattern: `{name}-iterative` for per-file rules, `{name}-global` for repository-wide rules
- File naming: `{name}-iterative-rule.json` or `{name}-global-rule.json`

### References
1. [xfiPluginSimpleExample](../../packages/x-fidelity-plugins/src/xfiPluginSimpleExample/)
2. [xfiPluginAst/sampleRules](../../packages/x-fidelity-plugins/src/xfiPluginAst/sampleRules/)

---
