# Subtask: Threshold Operator

## Metadata
- **Subtask ID**: 04
- **Feature**: Package Filesize Rule
- **Assigned Subagent**: xfi-plugin-expert
- **Dependencies**: 03
- **Created**: 20260123

## Objective
Implement the `packageSizeThreshold` operator that compares package sizes against configurable warning and fatality thresholds, returning whether any packages exceed the limits.

## Deliverables Checklist
- [x] Create `operators/packageSizeThreshold.ts` with operator implementation
- [x] Create `operators/packageSizeThreshold.test.ts` with comprehensive tests
- [x] Support configurable warning threshold (default 1MB)
- [x] Support configurable fatality threshold (default 5MB)
- [x] Return detailed info about which packages exceed thresholds
- [x] Update plugin index.ts to export the operator

## Definition of Done
- [x] Operator correctly identifies packages exceeding thresholds
- [x] Default thresholds match requirements (1MB warning, 5MB fatality)
- [x] Thresholds are configurable via rule parameters
- [x] Unit tests achieve 100% coverage
- [x] No lint errors in modified files

## Implementation Notes

### Operator Structure (operators/packageSizeThreshold.ts)
```typescript
import { OperatorDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import { 
    PackageSizeResult, 
    PackageSizeInfo, 
    PackageSizeThresholdParams 
} from '../types';
import { formatBytes } from '../utils/sizeFormatter';

// Default thresholds
const DEFAULT_WARNING_BYTES = 1 * 1024 * 1024;  // 1 MB
const DEFAULT_FATALITY_BYTES = 5 * 1024 * 1024; // 5 MB

export const packageSizeThresholdOperator: OperatorDefn = {
    name: 'packageSizeThreshold',
    description: 'Checks if any packages exceed size thresholds',
    fn: (factValue: unknown, jsonValue: unknown): boolean => {
        const result = factValue as PackageSizeResult;
        const params = jsonValue as PackageSizeThresholdParams;
        
        if (!result || !result.packages) {
            logger.debug('packageSizeThreshold: No package size data available');
            return false;
        }
        
        const warningThreshold = params?.warningThresholdBytes ?? DEFAULT_WARNING_BYTES;
        const fatalityThreshold = params?.fatalityThresholdBytes ?? DEFAULT_FATALITY_BYTES;
        
        // Mark packages that exceed thresholds
        let hasExceededThreshold = false;
        const exceedingPackages: Array<{
            name: string;
            size: number;
            level: 'warning' | 'fatality';
        }> = [];
        
        for (const pkg of result.packages) {
            if (pkg.totalSize >= fatalityThreshold) {
                pkg.exceedsFatality = true;
                pkg.exceedsWarning = true;
                hasExceededThreshold = true;
                exceedingPackages.push({
                    name: pkg.name,
                    size: pkg.totalSize,
                    level: 'fatality'
                });
            } else if (pkg.totalSize >= warningThreshold) {
                pkg.exceedsWarning = true;
                hasExceededThreshold = true;
                exceedingPackages.push({
                    name: pkg.name,
                    size: pkg.totalSize,
                    level: 'warning'
                });
            }
        }
        
        // Log exceeded packages
        if (exceedingPackages.length > 0) {
            logger.warn(`Package size thresholds exceeded:`);
            for (const pkg of exceedingPackages) {
                const emoji = pkg.level === 'fatality' ? '🔥' : '⚠️';
                logger.warn(
                    `  ${emoji} ${pkg.name}: ${formatBytes(pkg.size)} ` +
                    `(${pkg.level} threshold: ${formatBytes(pkg.level === 'fatality' ? fatalityThreshold : warningThreshold)})`
                );
            }
        }
        
        return hasExceededThreshold;
    }
};

/**
 * Helper function to get packages exceeding specific level
 */
export function getExceedingPackages(
    result: PackageSizeResult, 
    level: 'warning' | 'fatality'
): PackageSizeInfo[] {
    return result.packages.filter(pkg => 
        level === 'fatality' ? pkg.exceedsFatality : pkg.exceedsWarning
    );
}

/**
 * Helper to format threshold violation message for rule events
 */
export function formatThresholdMessage(
    result: PackageSizeResult,
    thresholds: PackageSizeThresholdParams
): string {
    const fatalities = getExceedingPackages(result, 'fatality');
    const warnings = getExceedingPackages(result, 'warning')
        .filter(p => !p.exceedsFatality); // Only pure warnings
    
    const parts: string[] = [];
    
    if (fatalities.length > 0) {
        parts.push(
            `${fatalities.length} package(s) exceed fatality threshold ` +
            `(${formatBytes(thresholds.fatalityThresholdBytes)}): ` +
            fatalities.map(p => `${p.name} (${formatBytes(p.totalSize)})`).join(', ')
        );
    }
    
    if (warnings.length > 0) {
        parts.push(
            `${warnings.length} package(s) exceed warning threshold ` +
            `(${formatBytes(thresholds.warningThresholdBytes)}): ` +
            warnings.map(p => `${p.name} (${formatBytes(p.totalSize)})`).join(', ')
        );
    }
    
    return parts.join('. ');
}
```

### Operator Behavior

1. **Input**: 
   - `factValue`: The `PackageSizeResult` from the packageSize fact
   - `jsonValue`: Threshold configuration parameters

2. **Output**: 
   - `true` if any package exceeds warning OR fatality threshold
   - `false` if all packages are under thresholds

3. **Side Effects**:
   - Updates `exceedsWarning` and `exceedsFatality` flags on each package
   - Logs warnings for exceeding packages

### Rule Integration
The operator will be used in rules like:
```json
{
    "fact": "packageSize",
    "operator": "packageSizeThreshold",
    "value": {
        "warningThresholdBytes": 1048576,
        "fatalityThresholdBytes": 5242880
    }
}
```

### Reference Code
- `xfiPluginRequiredFiles/operators/missingRequiredFiles.ts` - Similar operator pattern
- `xfiPluginDependency/operators/outdatedFramework.ts` - Complex threshold logic

## Testing Strategy
**IMPORTANT**: Do NOT trigger global test suites. Instead:
- Create mock PackageSizeResult objects for testing
- Test all threshold boundary conditions
- Run targeted tests: `yarn workspace @x-fidelity/plugins test -- --testPathPattern="packageSizeThreshold"`

### Test Cases
1. No packages (empty result)
2. All packages under warning threshold
3. One package at warning threshold (exactly)
4. One package over warning, under fatality
5. One package at fatality threshold (exactly)
6. One package over fatality threshold
7. Multiple packages with mixed threshold states
8. Custom threshold values
9. Default threshold values

## Execution Notes

### Agent Session Info
- Agent: xfi-plugin-expert
- Started: 2026-01-23
- Completed: 2026-01-23

### Work Log
1. Read subtask requirements and existing plugin structure
2. Added `PackageSizeThresholdParams` interface to types.ts for operator parameters
3. Created `operators/packageSizeThreshold.ts` with:
   - `packageSizeThresholdOperator` - main operator that checks thresholds
   - `getExceedingPackages()` - helper to filter packages by threshold level
   - `formatThresholdMessage()` - helper for rule event messages
   - Default thresholds: 1MB warning, 5MB fatality (exported as constants)
4. Created comprehensive test suite with 33 test cases covering:
   - Operator metadata
   - Default threshold values
   - Edge cases (null, undefined, empty packages)
   - Warning threshold boundary conditions (exact, under, over)
   - Fatality threshold boundary conditions (exact, under, over)
   - Multiple packages with mixed threshold states
   - Custom threshold configuration
   - Threshold storage on package objects
   - Logging behavior verification
   - Helper function coverage
5. Updated plugin index.ts to export operator and helper functions
6. Removed `.gitkeep` placeholder from operators directory
7. All tests pass (33/33), no lint errors

### Blockers Encountered
- Minor: Jest `--testPathPattern` option was deprecated in favor of `--testPathPatterns`

### Files Modified
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/types.ts` - Added `PackageSizeThresholdParams` interface
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/operators/packageSizeThreshold.ts` - Created operator implementation
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/operators/packageSizeThreshold.test.ts` - Created test suite
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/index.ts` - Updated to export operator
- `packages/x-fidelity-plugins/src/xfiPluginPackageSize/operators/.gitkeep` - Deleted
