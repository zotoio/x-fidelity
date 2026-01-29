# Topic: Feature Design Patterns

## Fact: Repo Config Extends Features With Additional Plugins And Rules
### Modified: 2026-01-29
### Priority: H

Repo-level configuration can extend the analysis pipeline by declaring additional plugins and rules. The analyzer loads repo config, triggers plugin loading via ConfigManager, validates custom rules, and injects them into the engine at runtime.

### References
1. [Repo config loading and plugin extension](../../packages/x-fidelity-core/src/core/engine/analyzer.ts)
2. [Plugin loading implementation](../../packages/x-fidelity-core/src/core/configManager.ts)

---

## Fact: Global Sentinel Enables Repo-Wide Checks
### Modified: 2026-01-29
### Priority: M

Global analysis is enabled by injecting the `REPO_GLOBAL_CHECK` sentinel into the file list and running a separate global pass after iterative file checks. This pattern lets rules operate on repository-wide facts while sharing the same execution engine.

### References
1. [Global check sentinel](../../packages/x-fidelity-core/src/core/configManager.ts)
2. [Analyzer global sentinel insertion](../../packages/x-fidelity-core/src/core/engine/analyzer.ts)
3. [Engine runner global pass](../../packages/x-fidelity-core/src/core/engine/engineRunner.ts)

---

## Fact: Plugin Lifecycle And Logging Context Standardize Feature Instrumentation
### Modified: 2026-01-29
### Priority: M

Plugin interfaces include optional lifecycle hooks (`initialize`, `cleanup`) and a structured `PluginContext` with logger utilities. The registry supplies logger context and wraps plugin facts/operators to ensure consistent logging and error handling across features.

### References
1. [Plugin contracts and context](../../packages/x-fidelity-types/src/plugins.ts)
2. [Registry logger wrapping and initialization](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)

---
