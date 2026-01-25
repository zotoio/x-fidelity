# Subtask: Plugin Scaffold

## Metadata
- **Subtask ID**: 01
- **Feature**: Package Filesize Rule
- **Assigned Subagent**: xfi-plugin-expert
- **Dependencies**: None
- **Created**: 20260123

## Objective
Create the foundational plugin structure for `xfiPluginPackageSize` following the established X-Fidelity plugin architecture. This includes the directory structure, type definitions, and plugin registration.

## Deliverables Checklist
- [x] Create plugin directory `packages/x-fidelity-plugins/src/xfiPluginPackageSize/`
- [x] Create `index.ts` with plugin export and registration
- [x] Create `types.ts` with all type definitions
- [x] Create placeholder files for facts and operators directories
- [x] Register plugin in `packages/x-fidelity-plugins/src/index.ts`
- [x] Verify plugin loads without errors

## Definition of Done
- [x] Plugin directory structure matches established patterns
- [x] Types are comprehensive and well-documented
- [x] Plugin exports correctly from the plugins package
- [x] No TypeScript compilation errors
- [x] No lint errors in modified files

## Implementation Notes

### Directory Structure to Create
```
packages/x-fidelity-plugins/src/xfiPluginPackageSize/
├── index.ts
├── types.ts
├── facts/
│   └── .gitkeep (placeholder)
├── operators/
│   └── .gitkeep (placeholder)
├── utils/
│   └── .gitkeep (placeholder)
└── sampleRules/
    └── .gitkeep (placeholder)
```

### Type Definitions (types.ts)
```typescript
/**
 * Information about a single package's size
 */
export interface PackageSizeInfo {
  /** Package name from package.json */
  name: string;
  /** Relative path to package root */
  path: string;
  /** Size of source files in bytes */
  sourceSize: number;
  /** Size of build output in bytes */
  buildSize: number;
  /** Total package size in bytes (excluding node_modules) */
  totalSize: number;
  /** Breakdown by file extension (extension -> bytes) */
  fileTypeBreakdown: Record<string, number>;
  /** Whether this package exceeds warning threshold */
  exceedsWarning?: boolean;
  /** Whether this package exceeds fatality threshold */
  exceedsFatality?: boolean;
}

/**
 * Result of package size analysis
 */
export interface PackageSizeResult {
  /** List of packages with their sizes */
  packages: PackageSizeInfo[];
  /** Total size of all packages combined */
  totalSize: number;
  /** Whether this is a monorepo */
  isMonorepo: boolean;
  /** Type of workspace detected */
  workspaceType: 'yarn' | 'npm' | 'pnpm' | 'none';
  /** Timestamp of analysis */
  analyzedAt: string;
}

/**
 * Threshold configuration for package size warnings
 */
export interface PackageSizeThresholds {
  /** Bytes at which to issue a warning (default: 1MB) */
  warningThresholdBytes: number;
  /** Bytes at which to issue a fatality (default: 5MB) */
  fatalityThresholdBytes: number;
}

/**
 * Parameters for the packageSize fact
 */
export interface PackageSizeFactParams {
  /** Repository path to analyze */
  repoPath?: string;
  /** Directories to treat as source (default: ['src']) */
  sourceDirs?: string[];
  /** Directories to treat as build output (default: ['dist', 'build', 'out']) */
  buildDirs?: string[];
  /** Whether to include file type breakdown (default: true) */
  includeBreakdown?: boolean;
  /** Maximum files to scan per package (performance limit) */
  maxFilesPerPackage?: number;
}

/**
 * Parameters for the packageSizeThreshold operator
 */
export interface PackageSizeThresholdParams extends PackageSizeThresholds {
  /** The package size result to evaluate */
  packageSizeResult?: PackageSizeResult;
  /** Result fact name for storage */
  resultFact?: string;
}
```

### Plugin Index (index.ts)
```typescript
import { XFiPlugin, PluginError } from '@x-fidelity/types';
// Facts and operators will be imported after implementation
// import { packageSizeFact } from './facts/packageSizeFact';
// import { packageSizeThresholdOperator } from './operators/packageSizeThreshold';

export const xfiPluginPackageSize: XFiPlugin = {
    name: 'xfiPluginPackageSize',
    version: '1.0.0',
    description: 'Plugin for analyzing package sizes in monorepos',
    facts: [],  // Will add packageSizeFact after implementation
    operators: [],  // Will add packageSizeThresholdOperator after implementation
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfiPluginPackageSize',
        details: error.stack
    })
};
```

### Reference Files
- `xfiPluginRequiredFiles/index.ts` - Similar global-rule plugin pattern
- `xfiPluginDependency/index.ts` - Complex plugin with utilities

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Verify TypeScript compilation: `yarn workspace @x-fidelity/plugins build`
- Check plugin loads: Import test in isolation
- Verify no lint errors: `yarn workspace @x-fidelity/plugins lint`

## Execution Notes

### Agent Session Info
- Agent: xfi-plugin-expert
- Started: 2026-01-23
- Completed: 2026-01-23

### Work Log
1. Read subtask file and plugin architecture documentation
2. Reviewed reference plugins (xfiPluginRequiredFiles, xfiPluginDependency) for established patterns
3. Created plugin directory structure:
   - `packages/x-fidelity-plugins/src/xfiPluginPackageSize/`
   - `facts/`, `operators/`, `utils/`, `sampleRules/` subdirectories with `.gitkeep` placeholders
4. Created `types.ts` with comprehensive type definitions:
   - `PackageSizeInfo` - Single package size information
   - `PackageSizeResult` - Full analysis result
   - `PackageSizeThresholds` - Warning/fatality threshold configuration
   - `PackageSizeFactParams` - Parameters for the fact
   - `PackageSizeThresholdParams` - Parameters for the operator
5. Created `index.ts` with plugin export following XFiPlugin interface
6. Registered plugin in `packages/x-fidelity-plugins/src/index.ts`:
   - Added static export
   - Added to `availablePlugins` registry for dynamic loading
7. Verified TypeScript compilation: `yarn workspace @x-fidelity/plugins build` - SUCCESS
8. Verified linting: `yarn workspace @x-fidelity/plugins lint` - SUCCESS

### Blockers Encountered
None - all tasks completed successfully.

### Files Modified
1. `packages/x-fidelity-plugins/src/xfiPluginPackageSize/index.ts` (created)
2. `packages/x-fidelity-plugins/src/xfiPluginPackageSize/types.ts` (created)
3. `packages/x-fidelity-plugins/src/xfiPluginPackageSize/facts/.gitkeep` (created)
4. `packages/x-fidelity-plugins/src/xfiPluginPackageSize/operators/.gitkeep` (created)
5. `packages/x-fidelity-plugins/src/xfiPluginPackageSize/utils/.gitkeep` (created)
6. `packages/x-fidelity-plugins/src/xfiPluginPackageSize/sampleRules/.gitkeep` (created)
7. `packages/x-fidelity-plugins/src/index.ts` (modified - added plugin export and registry entry)
