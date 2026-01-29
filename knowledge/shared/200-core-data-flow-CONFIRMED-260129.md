# Topic: Core Data Flow

## Fact: Analyzer Orchestrates End-To-End Analysis Flow
### Modified: 2026-01-29
### Priority: H

`analyzeCodebase` is the primary entry point for analysis. It initializes logging and execution context, loads configuration via `ConfigManager`, loads plugins and their facts, collects dependency and filesystem facts, inserts the `REPO_GLOBAL_CHECK` marker, sets up the rules engine, and runs the engine to produce result metadata.

### References
1. [Analyzer entry point](../../packages/x-fidelity-core/src/core/engine/analyzer.ts)

---

## Fact: Configuration Sources Have A Defined Precedence
### Modified: 2026-01-29
### Priority: H

Configuration resolution uses a priority order: explicit config server, GitHub config location, or local config path first, then an `XFI_CONFIG_PATH` environment override, then central home directory configs, and finally bundled demo config as the fallback. `ConfigManager` delegates resolution to `CentralConfigManager` before loading archetype rules and exemptions.

### References
1. [Central config resolution order](../../packages/x-fidelity-core/src/config/centralConfigManager.ts)
2. [ConfigManager initialization flow](../../packages/x-fidelity-core/src/core/configManager.ts)

---

## Fact: Plugins Supply Facts And Operators To The Engine
### Modified: 2026-01-29
### Priority: H

Plugins are registered in the plugin registry and expose facts/operators that are injected into the rules engine. Non-global facts are added during engine setup, global facts are precomputed in the analyzer, and operators from all plugins are registered so rules can evaluate conditions against the collected facts.

### References
1. [Plugin registry responsibilities](../../packages/x-fidelity-core/src/core/pluginRegistry.ts)
2. [Engine setup fact/operator loading](../../packages/x-fidelity-core/src/core/engine/engineSetup.ts)
3. [Analyzer global fact handling](../../packages/x-fidelity-core/src/core/engine/analyzer.ts)

---

## Fact: Rule Execution Distinguishes Iterative And Global Checks
### Modified: 2026-01-29
### Priority: M

Rule execution processes iterative file checks first and then a global repository check. The analyzer adds a `REPO_GLOBAL_CHECK` sentinel file, and the engine runner executes rules for each file plus the global pass, building rule failures from engine results.

### References
1. [Global check marker](../../packages/x-fidelity-core/src/core/configManager.ts)
2. [Engine runner execution flow](../../packages/x-fidelity-core/src/core/engine/engineRunner.ts)

---
