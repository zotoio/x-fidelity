# Topic: Design Patterns

## Fact: Plugin Registry Uses A Singleton With Initialization Tracking
### Modified: 2026-01-29
### Priority: H

The plugin registry is implemented as a singleton, ensuring a single registry instance across the runtime. It tracks initialization status per plugin, stores initialization promises, and wraps facts/operators with logger context and error handling to enforce consistent plugin behavior.

### References
1. [Plugin registry implementation](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)

---

## Fact: Plugin Loading Uses Dynamic Import With Deduplication
### Modified: 2026-01-29
### Priority: H

Plugins are dynamically loaded with a multi-path resolution strategy (builtin plugin exports, global modules, local node_modules, plugins package, legacy paths). ConfigManager deduplicates plugins by registry name before loading to avoid duplicate registrations and improve performance.

### References
1. [Plugin load and dedup flow](../../packages/x-fidelity-core/src/core/configManager.ts)
2. [Registry-level duplicate checks](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)

---

## Fact: Fact Execution Strategy Is Type-Driven
### Modified: 2026-01-29
### Priority: M

Facts are typed as `global`, `global-function`, or `iterative-function`. Global facts are precomputed and injected as static data, global-function facts run once per repo per rule, and iterative facts run per file. This enables predictable performance and rule behavior across large repositories.

### References
1. [Fact type definitions](../../packages/x-fidelity-types/src/core.ts)
2. [Global and iterative fact handling](../../packages/x-fidelity-core/src/core/engine/analyzer.ts)

---

## Fact: Rule Tracking Registry Maps Events Back To Rules
### Modified: 2026-01-29
### Priority: M

The engine runner maintains a registry mapping rule event types to rule definitions. This registry supports building rich rule failure details even when engine events do not include full rule metadata.

### References
1. [Rule tracking registry](../../packages/x-fidelity-core/src/core/engine/engineRunner.ts)

---
