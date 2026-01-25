# Subtask: Package Size Fact

## Metadata
- **Subtask ID**: 03
- **Feature**: Package Filesize Rule
- **Assigned Subagent**: xfi-plugin-expert
- **Dependencies**: 01, 02
- **Created**: 20260123

## Objective
Implement the `packageSizeFact` global fact that detects monorepo packages, calculates their file sizes, and returns structured data for analysis and display.

## Deliverables Checklist
- [x] Create `facts/packageSizeFact.ts` with global fact implementation
- [x] Create `facts/packageSizeFact.test.ts` with comprehensive tests
- [x] Integrate with workspace detection from manifestLocationParser
- [x] Calculate source, build, and total sizes per package
- [x] Generate file type breakdown
- [x] Update plugin index.ts to export the fact
- [x] Verify fact works with existing engine setup

## Definition of Done
- [x] Fact correctly detects yarn/npm/pnpm workspaces
- [x] Size calculations are accurate (verified via unit tests)
- [x] node_modules is always excluded
- [x] File type breakdown is accurate
- [x] Performance is acceptable (<5s for typical monorepo)
- [x] Unit tests achieve comprehensive coverage (48 tests)
- [x] No lint errors in modified files

## Implementation Notes

### Fact Structure (facts/packageSizeFact.ts)
```typescript
import { FactDefn, FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { glob } from 'glob';
import { stat } from 'fs/promises';
import { join, extname, relative } from 'path';
import { PackageSizeResult, PackageSizeInfo, PackageSizeFactParams } from '../types';
import { generatePackageSizeTable } from '../utils/consoleTable';

// Import workspace detection utilities
// These exist in the dependency plugin - consider extracting to shared utils
// For now, implement similar logic inline

export const packageSizeFact: FactDefn = {
    name: 'packageSize',
    description: 'Analyzes package sizes in a monorepo, excluding node_modules',
    type: 'global',
    fn: async (params: unknown, almanac?: unknown): Promise<PackageSizeResult> => {
        const factParams = params as PackageSizeFactParams;
        const repoPath = factParams?.repoPath || '.';
        const sourceDirs = factParams?.sourceDirs || ['src'];
        const buildDirs = factParams?.buildDirs || ['dist', 'build', 'out', 'lib'];
        const includeBreakdown = factParams?.includeBreakdown !== false;
        const maxFilesPerPackage = factParams?.maxFilesPerPackage || 10000;
        
        try {
            // Step 1: Detect workspace type and packages
            const workspaceInfo = await detectWorkspace(repoPath);
            
            // Step 2: Calculate sizes for each package
            const packages: PackageSizeInfo[] = [];
            for (const pkgPath of workspaceInfo.packagePaths) {
                const pkgInfo = await calculatePackageSize(
                    pkgPath, 
                    sourceDirs, 
                    buildDirs, 
                    includeBreakdown,
                    maxFilesPerPackage
                );
                if (pkgInfo) {
                    packages.push(pkgInfo);
                }
            }
            
            // Step 3: Calculate totals
            const totalSize = packages.reduce((sum, pkg) => sum + pkg.totalSize, 0);
            
            const result: PackageSizeResult = {
                packages,
                totalSize,
                isMonorepo: workspaceInfo.isMonorepo,
                workspaceType: workspaceInfo.workspaceType,
                analyzedAt: new Date().toISOString()
            };
            
            // Step 4: Log table to console
            const table = generatePackageSizeTable(result);
            logger.info('\n' + table);
            
            return result;
        } catch (error) {
            logger.error('Error in packageSize fact:', error);
            return {
                packages: [],
                totalSize: 0,
                isMonorepo: false,
                workspaceType: 'none',
                analyzedAt: new Date().toISOString()
            };
        }
    }
};

interface WorkspaceInfo {
    isMonorepo: boolean;
    workspaceType: 'yarn' | 'npm' | 'pnpm' | 'none';
    packagePaths: string[];
}

async function detectWorkspace(repoPath: string): Promise<WorkspaceInfo> {
    // Implementation: Check for workspaces in package.json (yarn/npm)
    // Check for pnpm-workspace.yaml
    // Return list of package paths
    // Similar to manifestLocationParser.ts logic
}

async function calculatePackageSize(
    pkgPath: string,
    sourceDirs: string[],
    buildDirs: string[],
    includeBreakdown: boolean,
    maxFiles: number
): Promise<PackageSizeInfo | null> {
    // Implementation:
    // 1. Read package.json for name
    // 2. Glob all files excluding node_modules
    // 3. Sum file sizes
    // 4. Categorize into source/build
    // 5. Build file type breakdown
}
```

### Key Implementation Details

1. **Workspace Detection**: Reuse/adapt logic from `xfiPluginDependency/utils/manifestLocationParser.ts`:
   - Check `package.json` for `workspaces` field (yarn/npm)
   - Check for `pnpm-workspace.yaml` (pnpm)
   - Expand glob patterns to find actual package directories

2. **File Size Calculation**:
   - Use `glob` with `ignore: ['**/node_modules/**']`
   - Use `fs.stat()` to get file sizes
   - Track source vs build by checking if path starts with sourceDirs/buildDirs

3. **Performance Considerations**:
   - Use `maxFilesPerPackage` limit to prevent slowdown
   - Consider using streaming/async iteration for large packages
   - Cache package.json reads

4. **File Type Breakdown**:
   - Extract extension with `path.extname()`
   - Normalize extensions (e.g., `.ts` and `.tsx` could be grouped)
   - Map common extensions to friendly names

### Reference Code
- `xfiPluginDependency/utils/manifestLocationParser.ts` - Workspace detection
- `xfiPluginFilesystem/facts/repoFilesystemFacts.ts` - File iteration patterns
- `xfiPluginRequiredFiles/facts/missingRequiredFiles.ts` - Global fact pattern

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create test fixtures with known file sizes
- Mock filesystem operations where appropriate
- Test workspace detection with various package.json formats
- Run targeted tests: `yarn workspace @x-fidelity/plugins test -- --testPathPattern="packageSizeFact"`

### Test Cases
1. Single package (not monorepo)
2. Yarn workspaces with array format
3. Yarn workspaces with packages format
4. npm workspaces
5. pnpm workspaces
6. Mixed source and build directories
7. File type breakdown accuracy
8. Performance with large package (many files)
9. Error handling (missing package.json, permissions)

## Execution Notes

### Agent Session Info
- Agent: xfi-plugin-expert
- Started: 2026-01-23
- Completed: 2026-01-23

### Work Log
1. Read subtask requirements and reference files (manifestLocationParser.ts, repoFilesystemFacts.ts, missingRequiredFiles.ts)
2. Read existing utility files (sizeFormatter.ts, consoleTable.ts) from subtask 02
3. Added `PackageSizeFactParams` type to types.ts
4. Created `facts/packageSizeFact.ts` with complete implementation:
   - `detectWorkspace()` - Detects yarn/npm/pnpm workspaces or single package
   - `expandGlobPattern()` - Expands workspace glob patterns (packages/*, apps/**, etc.)
   - `getPnpmWorkspacePackages()` - Parses pnpm-workspace.yaml
   - `getPackageJsonWorkspaces()` - Parses package.json workspaces field (array or object format)
   - `detectWorkspaceType()` - Determines workspace type from lock files
   - `calculatePackageSize()` - Calculates source/build sizes with file type breakdown
   - `getExtensionName()` - Maps file extensions to friendly names
   - `isInDirectories()` - Checks if file is in source or build directories
   - `packageSizeFact` - Main fact definition (global type, priority 10)
5. Created comprehensive test file `facts/packageSizeFact.test.ts` with 48 tests:
   - Unit tests for all helper functions
   - Workspace detection tests (yarn, npm, pnpm, single package)
   - Size calculation tests with file type breakdown
   - Edge case tests (deeply nested files, special extensions, no src/dist)
   - Fact metadata tests
6. Updated plugin index.ts to import and export the fact
7. Deleted .gitkeep placeholder file from facts/
8. Verified TypeScript build succeeds
9. All 48 tests pass with no lint errors

### Blockers Encountered
None - implementation proceeded smoothly following existing patterns.

### Files Modified
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/types.ts` - Added PackageSizeFactParams interface
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/facts/packageSizeFact.ts` - NEW: Complete fact implementation
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/facts/packageSizeFact.test.ts` - NEW: Comprehensive tests (48 tests)
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/index.ts` - Updated to export the fact
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/facts/.gitkeep` - DELETED
