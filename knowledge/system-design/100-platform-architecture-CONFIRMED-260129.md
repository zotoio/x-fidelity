# Topic: Platform Architecture

## Fact: Package Responsibilities Define Platform Layers
### Modified: 2026-01-29
### Priority: H

X-Fidelity is organized as a monorepo with distinct package responsibilities. The core package provides the analysis engine, configuration management, and plugin registry. Plugins extend analysis via facts and operators. The CLI and VSCode extension consume core capabilities to run analyses in different environments, while the server package hosts configuration services. Shared types define contracts used across all packages.

### References
1. [Repository architecture overview](../../AGENTS.md)

---

## Fact: Analyzer Orchestrates The Core Execution Pipeline
### Modified: 2026-01-29
### Priority: H

The analysis flow is orchestrated by `analyzeCodebase`, which initializes logging, resolves configuration through `ConfigManager`, prepares plugins and facts, adds the `REPO_GLOBAL_CHECK` sentinel, builds a rules engine, and executes checks across files and a global pass to produce results.

### References
1. [Analyzer entry point](../../packages/x-fidelity-core/src/core/engine/analyzer.ts)
2. [Engine setup flow](../../packages/x-fidelity-core/src/core/engine/engineSetup.ts)
3. [Engine execution flow](../../packages/x-fidelity-core/src/core/engine/engineRunner.ts)
4. [Config manager initialization](../../packages/x-fidelity-core/src/core/configManager.ts)

---

## Fact: Shared Types Define Cross-Package Contracts
### Modified: 2026-01-29
### Priority: H

Cross-package interfaces (facts, operators, rule failures, execution config, and plugin contracts) are standardized in the types package. These shared types define fact execution modes, rule failure structures, and plugin contexts, enabling consistent contracts between core, plugins, CLI, and VSCode.

### References
1. [Core analysis types](../../packages/x-fidelity-types/src/core.ts)
2. [Plugin interfaces and context](../../packages/x-fidelity-types/src/plugins.ts)

---
