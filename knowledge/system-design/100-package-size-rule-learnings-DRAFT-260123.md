# Topic: Package Size Rule Learnings

## Fact: Plugin layout for package size analysis
### Modified: 2026-01-23
### Priority: M

The package size plugin followed a structured layout with dedicated `facts/`, `operators/`, `utils/`, and `sampleRules/` directories. This layout supports isolated testing, reusable utilities, and direct sample rule integration.

### References
1. [xfiPluginPackageSize structure](../../packages/x-fidelity-plugins/src/xfiPluginPackageSize/)
2. [Sample rule location](../../packages/x-fidelity-plugins/src/xfiPluginPackageSize/sampleRules/packageSize-global-rule.json)

---

## Fact: Global fact pattern for repo-wide sizing
### Modified: 2026-01-23
### Priority: H

Global package size analysis runs as a `global` fact and emits a structured result used by repo-wide reporting. The report generator treats this data as REPO_GLOBAL_CHECK output and builds a dedicated section when the fact data is present.

### References
1. [Global fact definition](../../packages/x-fidelity-plugins/src/xfiPluginPackageSize/facts/packageSizeFact.ts)
2. [Report extraction for global data](../../packages/x-fidelity-core/src/notifications/reportGenerator.ts)

---

## Fact: Console output respects TTY and color envs
### Modified: 2026-01-23
### Priority: M

Console table output for package sizes is gated by TTY and environment variables: `NO_COLOR` disables colors, `FORCE_COLOR` can force or disable colors, and `XFI_LOG_COLORS=false` suppresses colors. Output can also be suppressed by format or log level.

### References
1. [Color/TTY detection and table output rules](../../packages/x-fidelity-plugins/src/xfiPluginPackageSize/utils/consoleTable.ts)

---

## Fact: Report integration is self-contained with mermaid charts
### Modified: 2026-01-23
### Priority: M

Package size reporting is implemented as a self-contained report section that includes a mermaid pie chart, a tabular breakdown by package, and optional file type breakdowns when available.

### References
1. [Package size report section](../../packages/x-fidelity-core/src/notifications/reportGenerator.ts)

---

## Fact: Refactoring opportunities for shared workspace logic and types
### Modified: 2026-01-23
### Priority: L

Workspace detection and glob expansion logic is duplicated between the package size fact and dependency manifest location parsing. Additionally, package size result types are locally duplicated in the report generator and could move into `@x-fidelity/types` for reuse.

### References
1. [Workspace detection in package size fact](../../packages/x-fidelity-plugins/src/xfiPluginPackageSize/facts/packageSizeFact.ts)
2. [Workspace detection in manifest parser](../../packages/x-fidelity-plugins/src/xfiPluginDependency/utils/manifestLocationParser.ts)
3. [Local package size types in report generator](../../packages/x-fidelity-core/src/notifications/reportGenerator.ts)

