/**
 * Package Size Plugin
 *
 * Analyzes package sizes in monorepos, detecting workspace configurations
 * (yarn/npm/pnpm) and calculating source, build, and total sizes.
 *
 * @module xfiPluginPackageSize
 *
 * @example
 * // Basic usage in archetype
 * {
 *   "plugins": ["xfiPluginPackageSize"],
 *   "rules": ["packageSize-global"]
 * }
 *
 * @example
 * // Custom rule with thresholds
 * {
 *   "fact": "packageSize",
 *   "params": {
 *     "sourceDirs": ["src"],
 *     "buildDirs": ["dist", "build"]
 *   },
 *   "operator": "packageSizeThreshold",
 *   "value": {
 *     "warningThresholdBytes": 1048576,
 *     "fatalityThresholdBytes": 5242880
 *   }
 * }
 */

import { XFiPlugin, PluginError } from '@x-fidelity/types';

// Import facts
import { packageSizeFact } from './facts/packageSizeFact';

// Import operators
import { packageSizeThresholdOperator } from './operators/packageSizeThreshold';

// Re-export types for consumers
export * from './types';

// Re-export fact for direct access
export { packageSizeFact } from './facts/packageSizeFact';

// Re-export operator and helpers for direct access
export {
    packageSizeThresholdOperator,
    getExceedingPackages,
    formatThresholdMessage,
    DEFAULT_WARNING_BYTES,
    DEFAULT_FATALITY_BYTES
} from './operators/packageSizeThreshold';

/**
 * Package Size Plugin
 *
 * Provides the `packageSize` fact and `packageSizeThreshold` operator
 * for analyzing and enforcing size limits on monorepo packages.
 *
 * @see {@link packageSizeFact} for fact implementation details
 * @see {@link packageSizeThresholdOperator} for operator implementation details
 */
export const xfiPluginPackageSize: XFiPlugin = {
    name: 'xfiPluginPackageSize',
    version: '1.0.0',
    description: 'Plugin for analyzing package sizes in monorepos',
    facts: [packageSizeFact],
    operators: [packageSizeThresholdOperator],
    onError: (error: Error): PluginError => ({
        message: error.message,
        level: 'error',
        severity: 'error',
        source: 'xfiPluginPackageSize',
        details: error.stack
    })
};
