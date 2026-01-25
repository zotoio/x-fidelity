# Plan: Package Filesize Rule

## Status
Completed

## Overview
Create a new X-Fidelity plugin that provides a filesize view of each package in a monorepo during analysis. The feature will display package sizes in a formatted console table, support configurable warning/error thresholds, and include the data in analysis reports. It will automatically detect yarn/npm workspaces and provide human-readable size breakdowns by file type.

## Key Decisions

1. **New Plugin**: Create `xfiPluginPackageSize` in `packages/x-fidelity-plugins/` following the established plugin architecture pattern with facts, operators, sample rules, and types.

2. **Measurement Scope**: Measure total package size excluding `node_modules`. Include separate tracking for source files and build output where detected.

3. **Monorepo Detection**: Leverage existing workspace detection code from `manifestLocationParser.ts` to find yarn/npm/pnpm workspace packages.

4. **Global Rule**: Implement as a global rule (runs once per analysis, not per-file) similar to `missingRequiredFiles-global`.

5. **Configurable Thresholds**: Warning at 1MB and error/fatality at 5MB by default, configurable per-archetype via rule parameters.

6. **Console Output**: Formatted table with columns: Package Name, Source Size, Build Size, Total Size, sorted by total size descending. Human-readable sizes (KB, MB, GB).

7. **File Type Breakdown**: Optional breakdown showing size by file extension (e.g., "TypeScript: 200KB, JSON: 50KB").

8. **Report Integration**: Include package size data in the analysis report markdown, following the existing report generator patterns.

## Requirements

1. Create new plugin `xfiPluginPackageSize` with standard plugin structure
2. Implement `packageSizeFact` global fact to collect package sizes
3. Implement `packageSizeThreshold` operator for threshold comparisons
4. Auto-detect monorepo structure (yarn/npm/pnpm workspaces)
5. Calculate sizes excluding `node_modules`
6. Display formatted table in console during analysis
7. Support configurable thresholds (warning/fatality levels)
8. Include breakdown by file type
9. Human-readable size formatting (KB, MB, GB)
10. Include package size data in analysis reports
11. Create sample rule for democonfig
12. Comprehensive unit tests with 100% coverage
13. Update documentation (README, website)

## Design Notes

### Plugin Structure
```
xfiPluginPackageSize/
├── index.ts                 # Plugin export
├── facts/
│   ├── packageSizeFact.ts   # Global fact for size collection
│   └── packageSizeFact.test.ts
├── operators/
│   ├── packageSizeThreshold.ts    # Threshold comparison
│   └── packageSizeThreshold.test.ts
├── utils/
│   ├── sizeFormatter.ts     # Human-readable formatting
│   ├── sizeFormatter.test.ts
│   ├── consoleTable.ts      # Table output formatting
│   └── consoleTable.test.ts
├── sampleRules/
│   └── packageSize-global-rule.json
└── types.ts                 # Type definitions
```

### Fact Output Structure
```typescript
interface PackageSizeResult {
  packages: PackageSizeInfo[];
  totalSize: number;
  isMonorepo: boolean;
  workspaceType: 'yarn' | 'npm' | 'pnpm' | 'none';
}

interface PackageSizeInfo {
  name: string;
  path: string;
  sourceSize: number;      // bytes
  buildSize: number;       // bytes
  totalSize: number;       // bytes
  fileTypeBreakdown: Record<string, number>;  // extension -> bytes
}
```

### Threshold Configuration
```json
{
  "warningThresholdBytes": 1048576,   // 1MB
  "fatalityThresholdBytes": 5242880   // 5MB
}
```

### Console Output Example
```
┌─────────────────────────────────────────────────────────────────┐
│                    Package Size Analysis                        │
├───────────────────────┬───────────┬───────────┬─────────────────┤
│ Package               │ Source    │ Build     │ Total           │
├───────────────────────┼───────────┼───────────┼─────────────────┤
│ x-fidelity-core       │ 245.3 KB  │ 312.1 KB  │ 557.4 KB       │
│ x-fidelity-plugins    │ 189.7 KB  │ 201.5 KB  │ 391.2 KB       │
│ x-fidelity-cli        │ 87.2 KB   │ 145.8 KB  │ 233.0 KB       │
└───────────────────────┴───────────┴───────────┴─────────────────┘
```

### Integration Points
- **ConfigManager**: Leverage workspace detection from `manifestLocationParser.ts`
- **ReportGenerator**: Add `generatePackageSizeSection()` method
- **Console Output**: Use `logger.info()` for table output during analysis

### Risks
1. **Performance**: Large monorepos with many files could be slow - mitigate with file count limits
2. **Build Directory Detection**: Different projects use `dist/`, `build/`, `out/` - need flexible detection
3. **Symlinks**: Must handle symlinked packages in monorepos correctly

## Subtask Dependency Graph

```mermaid
graph TD
    subgraph "Phase 1 - Foundation (Parallel)"
        S01[subtask-01: Plugin Scaffold]
        S02[subtask-02: Size Calculator Utils]
    end
    
    subgraph "Phase 2 - Core Implementation (After Phase 1)"
        S03[subtask-03: Package Size Fact]
    end
    
    subgraph "Phase 3 - Operator & Rule (After S03)"
        S04[subtask-04: Threshold Operator]
        S05[subtask-05: Sample Rule & Democonfig]
    end
    
    subgraph "Phase 4 - Output Integration (After S03)"
        S06[subtask-06: Console Table Output]
        S07[subtask-07: Report Generator Integration]
    end
    
    subgraph "Phase 5 - Quality (After All)"
        S08[subtask-08: Testing]
        S09[subtask-09: Documentation]
    end
    
    S01 --> S03
    S02 --> S03
    S03 --> S04
    S03 --> S05
    S03 --> S06
    S03 --> S07
    S04 --> S05
    S04 --> S08
    S05 --> S08
    S06 --> S08
    S07 --> S08
    S08 --> S09
```

## Execution Order

### Phase 1 (Parallel - No Dependencies)
| Subtask | Subagent | Description | Dependencies |
|---------|----------|-------------|--------------|
| 01 | xfi-plugin-expert | Create xfiPluginPackageSize scaffold with types | None |
| 02 | xfi-engineer | Implement size formatting and console table utilities | None |

### Phase 2 (After Phase 1)
| Subtask | Subagent | Description | Dependencies |
|---------|----------|-------------|--------------|
| 03 | xfi-plugin-expert | Implement packageSizeFact with monorepo detection | 01, 02 |

### Phase 3 (After S03, Parallel)
| Subtask | Subagent | Description | Dependencies |
|---------|----------|-------------|--------------|
| 04 | xfi-plugin-expert | Implement packageSizeThreshold operator | 03 |
| 05 | xfi-rules-expert | Create sample rule and add to democonfig | 03, 04 |

### Phase 4 (After S03, Parallel with Phase 3)
| Subtask | Subagent | Description | Dependencies |
|---------|----------|-------------|--------------|
| 06 | xfi-engineer | Integrate console table output during analysis | 03 |
| 07 | xfi-engineer | Add package size section to report generator | 03 |

### Phase 5 (After All Implementation)
| Subtask | Subagent | Description | Dependencies |
|---------|----------|-------------|--------------|
| 08 | xfi-testing-expert | Comprehensive testing with 100% coverage | 04, 05, 06, 07 |
| 09 | xfi-docs-expert | Update README and website documentation | 08 |

## Global Definition of Done
- [x] All subtasks completed
- [x] All unit tests passing (1,951 tests, 97%+ coverage)
- [x] Code review by xfi-code-reviewer completed (PASSED)
- [x] Architecture review by xfi-system-design completed (PASSED with notes for future refactoring)
- [x] Global test suite passing (verified by xfi-testing-expert)
- [x] Documentation updated by xfi-docs-expert
- [x] Knowledge captured by xfi-system-design
- [x] User approval received

## Execution Notes

### Phase 1 Completed: 2026-01-23
- **Subtask 01**: Plugin scaffold created - directory structure, types.ts, index.ts, plugin registration
- **Subtask 02**: Size utilities implemented - sizeFormatter.ts, consoleTable.ts with 53 tests passing (96-98% coverage)

### Phase 2 Completed: 2026-01-23
- **Subtask 03**: Package Size Fact implemented with workspace detection (yarn/npm/pnpm), size calculation, file type breakdown - 48 tests passing (~90% coverage)

### Phase 3 Completed: 2026-01-23
- **Subtask 04**: Threshold Operator with 33 tests - configurable warning/fatality thresholds
- **Subtask 06**: Console table output enhanced with colors, TTY detection, quiet/verbose modes - 48 tests
- **Subtask 07**: Report Generator integration with mermaid charts, size table, file breakdown - 36 new tests (132 total)

### Phase 4 Completed: 2026-01-23
- **Subtask 05**: Sample rule JSON created and integrated with node-fullstack archetype in democonfig

### Phase 5 Completed: 2026-01-23
- **Subtask 08**: Testing complete - 193 tests for package size plugin, 2441 tests globally pass, 97%+ coverage

### Phase 6 Completed: 2026-01-23
- **Subtask 09**: Documentation - README updated, website plugin page created, sidebars updated, JSDoc enhanced

### Final Review Completed: 2026-01-23
- **Code Review**: PASSED - High quality, secure, follows patterns
- **Architecture Review**: PASSED with notes for future refactoring
- **Tests**: 1,951 tests passing, 97%+ coverage
- **Knowledge Captured**: Plugin patterns and learnings documented

## Completion Checklist
- [x] Subtask 01: Plugin Scaffold - Completed
- [x] Subtask 02: Size Calculator Utils - Completed
- [x] Subtask 03: Package Size Fact - Completed
- [x] Subtask 04: Threshold Operator - Completed
- [x] Subtask 05: Sample Rule & Democonfig - Completed
- [x] Subtask 06: Console Table Output - Completed
- [x] Subtask 07: Report Generator Integration - Completed
- [x] Subtask 08: Testing - Completed
- [x] Subtask 09: Documentation - Completed
- [x] Final code review - PASSED
- [x] Final architecture review - PASSED with notes
- [x] Global tests verified - 1,951 tests passing
- [x] Documentation updated
- [x] Knowledge captured
- [x] User approval received

## Execution Instructions

To execute this plan in a new agent session:

1. Start a new conversation
2. Run: `/xfi-plan-execute`
3. Select this plan: `20260123-package-filesize-rule`
4. Confirm execution summary
5. Monitor subtask progress
6. Review final changes when prompted
7. Approve documentation updates
