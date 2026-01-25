/**
 * Package Size Threshold Operator
 *
 * Checks if any packages exceed configurable size thresholds.
 * Returns true if ANY package exceeds warning OR fatality threshold.
 */

import { OperatorDefn } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';
import {
    PackageSizeResult,
    PackageSizeInfo,
    PackageSizeThresholdParams
} from '../types';
import { formatBytes } from '../utils/sizeFormatter';

// Default thresholds
export const DEFAULT_WARNING_BYTES = 1 * 1024 * 1024; // 1 MB
export const DEFAULT_FATALITY_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Package Size Threshold Operator
 *
 * Compares package sizes against configurable warning and fatality thresholds.
 * Mutates the PackageSizeResult to mark packages that exceed thresholds.
 */
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

        logger.debug(
            `packageSizeThreshold: Checking ${result.packages.length} packages ` +
            `(warning: ${formatBytes({ bytes: warningThreshold })}, ` +
            `fatality: ${formatBytes({ bytes: fatalityThreshold })})`
        );

        // Mark packages that exceed thresholds
        let hasExceededThreshold = false;
        const exceedingPackages: Array<{
            name: string;
            size: number;
            level: 'warning' | 'fatality';
        }> = [];

        for (const pkg of result.packages) {
            // Store thresholds on the package for reference
            pkg.warningThreshold = warningThreshold;
            pkg.fatalityThreshold = fatalityThreshold;

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
                pkg.exceedsFatality = false;
                hasExceededThreshold = true;
                exceedingPackages.push({
                    name: pkg.name,
                    size: pkg.totalSize,
                    level: 'warning'
                });
            } else {
                pkg.exceedsWarning = false;
                pkg.exceedsFatality = false;
            }
        }

        // Log exceeded packages
        if (exceedingPackages.length > 0) {
            logger.warn('Package size thresholds exceeded:');
            for (const pkg of exceedingPackages) {
                const emoji = pkg.level === 'fatality' ? '🔥' : '⚠️';
                const threshold = pkg.level === 'fatality' ? fatalityThreshold : warningThreshold;
                logger.warn(
                    `  ${emoji} ${pkg.name}: ${formatBytes({ bytes: pkg.size })} ` +
                    `(${pkg.level} threshold: ${formatBytes({ bytes: threshold })})`
                );
            }
        }

        return hasExceededThreshold;
    }
};

/**
 * Helper function to get packages exceeding specific level
 * @param result The PackageSizeResult from the fact
 * @param level The threshold level to check ('warning' or 'fatality')
 * @returns Array of packages exceeding the specified threshold level
 */
export function getExceedingPackages(
    result: PackageSizeResult,
    level: 'warning' | 'fatality'
): PackageSizeInfo[] {
    if (!result || !result.packages) {
        return [];
    }
    return result.packages.filter(pkg =>
        level === 'fatality' ? pkg.exceedsFatality : pkg.exceedsWarning
    );
}

/**
 * Helper to format threshold violation message for rule events
 * @param result The PackageSizeResult with packages already checked by the operator
 * @param thresholds The threshold parameters used
 * @returns Human-readable message describing the violations
 */
export function formatThresholdMessage(
    result: PackageSizeResult,
    thresholds: PackageSizeThresholdParams
): string {
    if (!result || !result.packages) {
        return 'No package data available';
    }

    const warningThreshold = thresholds?.warningThresholdBytes ?? DEFAULT_WARNING_BYTES;
    const fatalityThreshold = thresholds?.fatalityThresholdBytes ?? DEFAULT_FATALITY_BYTES;

    const fatalities = getExceedingPackages(result, 'fatality');
    const warnings = getExceedingPackages(result, 'warning')
        .filter(p => !p.exceedsFatality); // Only pure warnings

    const parts: string[] = [];

    if (fatalities.length > 0) {
        parts.push(
            `${fatalities.length} package(s) exceed fatality threshold ` +
            `(${formatBytes({ bytes: fatalityThreshold })}): ` +
            fatalities.map(p => `${p.name} (${formatBytes({ bytes: p.totalSize })})`).join(', ')
        );
    }

    if (warnings.length > 0) {
        parts.push(
            `${warnings.length} package(s) exceed warning threshold ` +
            `(${formatBytes({ bytes: warningThreshold })}): ` +
            warnings.map(p => `${p.name} (${formatBytes({ bytes: p.totalSize })})`).join(', ')
        );
    }

    return parts.length > 0 ? parts.join('. ') : 'No packages exceed thresholds';
}
