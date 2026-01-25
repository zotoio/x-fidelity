/**
 * Type definitions for Package Size Plugin
 *
 * These types define the structure of package size analysis results.
 */

/**
 * Size breakdown by file extension or category
 */
export interface SizeBreakdown {
    /** File extension or category name */
    [extension: string]: number;
}

/**
 * Information about a single package's size
 */
export interface PackageSizeInfo {
    /** Package name */
    name: string;
    /** Path to the package relative to workspace root */
    path: string;
    /** Total size in bytes (source + build) */
    totalSize: number;
    /** Source file size in bytes (excluding node_modules, build output) */
    sourceSize: number;
    /** Build/dist output size in bytes */
    buildSize: number;
    /** Size breakdown by file extension for source files */
    sourceBreakdown: SizeBreakdown;
    /** Size breakdown by file extension for build files */
    buildBreakdown: SizeBreakdown;
    /** Whether this package exceeds the warning threshold */
    exceedsWarning: boolean;
    /** Whether this package exceeds the fatality threshold */
    exceedsFatality: boolean;
    /** Warning threshold in bytes (if configured) */
    warningThreshold?: number;
    /** Fatality threshold in bytes (if configured) */
    fatalityThreshold?: number;
}

/**
 * Workspace type detection result
 */
export type WorkspaceType = 'yarn' | 'pnpm' | 'npm' | 'unknown';

/**
 * Complete result of package size analysis
 */
export interface PackageSizeResult {
    /** List of analyzed packages */
    packages: PackageSizeInfo[];
    /** Total size of all packages combined */
    totalSize: number;
    /** Detected workspace type */
    workspaceType: WorkspaceType;
    /** Whether this is a monorepo */
    isMonorepo: boolean;
    /** Timestamp of the analysis */
    analyzedAt: string;
    /** Path to the workspace root */
    workspaceRoot: string;
}

/**
 * Configuration for package size thresholds
 */
export interface PackageSizeThresholds {
    /** Warning threshold per package (in bytes or human-readable string) */
    warningThreshold?: number | string;
    /** Fatality threshold per package (in bytes or human-readable string) */
    fatalityThreshold?: number | string;
    /** Total workspace warning threshold */
    totalWarningThreshold?: number | string;
    /** Total workspace fatality threshold */
    totalFatalityThreshold?: number | string;
}

/**
 * Parameters passed to the packageSizeThreshold operator via rule JSON value
 */
export interface PackageSizeThresholdParams {
    /** Warning threshold in bytes (default: 1MB = 1048576) */
    warningThresholdBytes?: number;
    /** Fatality threshold in bytes (default: 5MB = 5242880) */
    fatalityThresholdBytes?: number;
}

/**
 * Parameters for the packageSize fact
 */
export interface PackageSizeFactParams {
    /** Path to the repository root */
    repoPath?: string;
    /** Directories considered as source (default: ['src']) */
    sourceDirs?: string[];
    /** Directories considered as build output (default: ['dist', 'build', 'out', 'lib']) */
    buildDirs?: string[];
    /** Whether to include file type breakdown (default: true) */
    includeBreakdown?: boolean;
    /** Maximum files to process per package (default: 10000) */
    maxFilesPerPackage?: number;
    /** Suppress console table output (default: false) */
    noPackageSizeTable?: boolean;
}
