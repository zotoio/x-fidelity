/**
 * Console Table Utilities
 *
 * Provides functions for generating formatted console tables
 * displaying package size analysis results with terminal-aware formatting.
 */

import type { PackageSizeResult, PackageSizeInfo } from '../types';
import { formatBytes } from './sizeFormatter';

/**
 * ANSI color codes for terminal output
 */
const ANSI = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    
    // Colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    
    // Background colors
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m',
};

/**
 * Configuration for table output
 */
export interface TableConfig {
    /** Include file type breakdown column */
    includeBreakdown?: boolean;
    /** Maximum width for package name column */
    maxNameWidth?: number;
    /** Show warning/fatality indicators */
    showIndicators?: boolean;
    /** Enable colored output (defaults to process.stdout.isTTY) */
    useColors?: boolean;
    /** Include verbose information (breakdown details) */
    verbose?: boolean;
}

/**
 * Options for determining if table output should be displayed
 */
export interface TableOutputOptions {
    /** Suppress all table output */
    noPackageSizeTable?: boolean;
    /** Quiet mode - minimal output */
    quiet?: boolean;
    /** Verbose mode - extra output */
    verbose?: boolean;
    /** Current log level */
    logLevel?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    /** Forced output format (json suppresses table) */
    outputFormat?: 'human' | 'json';
}

/**
 * Determine if colors should be used in output
 * Respects TTY, environment variables, and explicit configuration
 */
export function shouldUseColors(config?: { useColors?: boolean }): boolean {
    // Explicit configuration takes precedence
    if (config?.useColors !== undefined) {
        return config.useColors;
    }
    
    // Check environment variables for color forcing/disabling
    const env = process.env;
    
    // NO_COLOR is a standard for disabling colors
    // https://no-color.org/
    if (env.NO_COLOR !== undefined) {
        return false;
    }
    
    // FORCE_COLOR forces colors even without TTY
    if (env.FORCE_COLOR === '1' || env.FORCE_COLOR === 'true') {
        return true;
    }
    
    if (env.FORCE_COLOR === '0' || env.FORCE_COLOR === 'false') {
        return false;
    }
    
    // XFI_LOG_COLORS is X-Fidelity specific
    if (env.XFI_LOG_COLORS === 'false') {
        return false;
    }
    
    // Default to TTY detection
    return process.stdout.isTTY === true;
}

/**
 * Determine if the package size table should be output
 * @param options Configuration options
 * @returns true if table should be displayed
 */
export function shouldOutputPackageSizeTable(options: TableOutputOptions = {}): boolean {
    // Explicit suppression via flag
    if (options.noPackageSizeTable) {
        return false;
    }
    
    // JSON output format suppresses table
    if (options.outputFormat === 'json') {
        return false;
    }
    
    // Quiet mode suppresses table
    if (options.quiet) {
        return false;
    }
    
    // Log level 'error' or 'fatal' suppresses info-level output
    if (options.logLevel === 'error' || options.logLevel === 'fatal') {
        return false;
    }
    
    // Default: show table
    return true;
}

/**
 * Apply color to text if colors are enabled
 */
function colorize(text: string, color: string, useColors: boolean): string {
    if (!useColors) return text;
    return `${color}${text}${ANSI.reset}`;
}

/**
 * Column widths for the table
 */
const COLUMN_WIDTHS = {
    name: 21,
    source: 9,
    build: 9,
    total: 9,
    indicator: 4
};

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str String to truncate
 * @param maxLen Maximum length
 * @returns Truncated string
 */
function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + '...';
}

/**
 * Pad a string to a specific width (left-aligned)
 * @param str String to pad
 * @param width Target width
 * @returns Padded string
 */
function padEnd(str: string, width: number): string {
    if (str.length >= width) return str.slice(0, width);
    return str + ' '.repeat(width - str.length);
}

/**
 * Pad a string to a specific width (right-aligned)
 * @param str String to pad
 * @param width Target width
 * @returns Padded string
 */
function padStart(str: string, width: number): string {
    if (str.length >= width) return str.slice(0, width);
    return ' '.repeat(width - str.length) + str;
}

/**
 * Generate a horizontal border line
 * @param leftChar Left corner character
 * @param midChar Middle intersection character
 * @param rightChar Right corner character
 * @returns Border line string
 */
function generateBorderLine(leftChar: string, midChar: string, rightChar: string): string {
    const segments = [
        '─'.repeat(COLUMN_WIDTHS.name + 2),
        '─'.repeat(COLUMN_WIDTHS.source + 2),
        '─'.repeat(COLUMN_WIDTHS.build + 2),
        '─'.repeat(COLUMN_WIDTHS.total + COLUMN_WIDTHS.indicator + 3)
    ];
    return leftChar + segments.join(midChar) + rightChar;
}

/**
 * Generate formatted console table for package sizes
 * @param params.result Package size analysis result
 * @param params.config Table configuration options
 * @returns Formatted table string
 */
export function generatePackageSizeTable({
    result,
    config = {}
}: {
    result: PackageSizeResult;
    config?: TableConfig;
}): string {
    const { showIndicators = true, verbose = false } = config;
    const useColors = shouldUseColors(config);

    const lines: string[] = [];

    // Calculate total width for header
    const totalWidth =
        COLUMN_WIDTHS.name +
        COLUMN_WIDTHS.source +
        COLUMN_WIDTHS.build +
        COLUMN_WIDTHS.total +
        COLUMN_WIDTHS.indicator +
        11; // separators and padding

    // Top border
    lines.push(generateBorderLine('┌', '┬', '┐'));

    // Title with optional color
    const title = 'Package Size Analysis';
    const coloredTitle = colorize(title, ANSI.bold + ANSI.cyan, useColors);
    const titlePadding = Math.floor((totalWidth - title.length) / 2);
    // For colored output, we need to account for invisible ANSI codes in padding calculation
    const titleLine = '│' + ' '.repeat(titlePadding) + coloredTitle + ' '.repeat(totalWidth - titlePadding - title.length) + '│';
    lines.push(titleLine);

    // Header separator
    lines.push(generateBorderLine('├', '┼', '┤'));

    // Header row with optional color
    const headerColor = ANSI.bold;
    const headerLine =
        '│ ' +
        colorize(padEnd('Package', COLUMN_WIDTHS.name), headerColor, useColors) +
        ' │ ' +
        colorize(padEnd('Source', COLUMN_WIDTHS.source), headerColor, useColors) +
        ' │ ' +
        colorize(padEnd('Build', COLUMN_WIDTHS.build), headerColor, useColors) +
        ' │ ' +
        colorize(padEnd('Total', COLUMN_WIDTHS.total + COLUMN_WIDTHS.indicator), headerColor, useColors) +
        ' │';
    lines.push(headerLine);

    // Header bottom separator
    lines.push(generateBorderLine('├', '┼', '┤'));

    // Handle empty packages
    if (result.packages.length === 0) {
        const emptyMessage = 'No packages found';
        const coloredEmpty = colorize(emptyMessage, ANSI.dim, useColors);
        const emptyPadding = Math.floor((totalWidth - emptyMessage.length) / 2);
        lines.push('│' + ' '.repeat(emptyPadding) + coloredEmpty + ' '.repeat(totalWidth - emptyPadding - emptyMessage.length) + '│');
    } else {
        // Sort by total size descending
        const sortedPackages = [...result.packages].sort((a, b) => b.totalSize - a.totalSize);

        for (const pkg of sortedPackages) {
            const name = truncate(pkg.name, COLUMN_WIDTHS.name);
            const source = padStart(formatBytes({ bytes: pkg.sourceSize }), COLUMN_WIDTHS.source);
            const build = padStart(formatBytes({ bytes: pkg.buildSize }), COLUMN_WIDTHS.build);
            const total = padStart(formatBytes({ bytes: pkg.totalSize }), COLUMN_WIDTHS.total);

            let indicator = '    ';
            let rowColor = '';
            
            if (showIndicators) {
                if (pkg.exceedsFatality) {
                    indicator = ' !! ';
                    rowColor = ANSI.red;
                } else if (pkg.exceedsWarning) {
                    indicator = ' !  ';
                    rowColor = ANSI.yellow;
                }
            }

            // Build the row with optional coloring
            const coloredIndicator = indicator.trim() 
                ? colorize(indicator, rowColor + ANSI.bold, useColors) 
                : indicator;
            
            // Color the entire row if there's a warning/fatality
            const nameCell = rowColor 
                ? colorize(padEnd(name, COLUMN_WIDTHS.name), rowColor, useColors)
                : padEnd(name, COLUMN_WIDTHS.name);
            
            const row =
                '│ ' +
                nameCell +
                ' │ ' +
                source +
                ' │ ' +
                build +
                ' │ ' +
                total +
                coloredIndicator +
                '│';
            lines.push(row);
        }
    }

    // Bottom border
    lines.push(generateBorderLine('└', '┴', '┘'));

    // Summary with optional color
    lines.push('');
    const summaryLabel = colorize('Total:', ANSI.bold, useColors);
    const packageWord = result.packages.length === 1 ? 'package' : 'packages';
    lines.push(`${summaryLabel} ${formatBytes({ bytes: result.totalSize })} across ${result.packages.length} ${packageWord}`);
    
    const workspaceLabel = colorize('Workspace:', ANSI.bold, useColors);
    const workspaceInfo = `${result.workspaceType}${result.isMonorepo ? ' (monorepo)' : ' (single package)'}`;
    lines.push(`${workspaceLabel} ${workspaceInfo}`);

    // Verbose mode: show additional details
    if (verbose && result.packages.length > 0) {
        lines.push('');
        const detailsLabel = colorize('Details:', ANSI.bold, useColors);
        lines.push(detailsLabel);
        
        const warningCount = result.packages.filter(p => p.exceedsWarning && !p.exceedsFatality).length;
        const fatalityCount = result.packages.filter(p => p.exceedsFatality).length;
        
        if (fatalityCount > 0) {
            const fatalMsg = `  ${fatalityCount} package(s) exceed fatality threshold`;
            lines.push(colorize(fatalMsg, ANSI.red, useColors));
        }
        if (warningCount > 0) {
            const warnMsg = `  ${warningCount} package(s) exceed warning threshold`;
            lines.push(colorize(warnMsg, ANSI.yellow, useColors));
        }
        if (fatalityCount === 0 && warningCount === 0) {
            const okMsg = '  All packages within thresholds';
            lines.push(colorize(okMsg, ANSI.green, useColors));
        }
        
        lines.push(`  Analyzed at: ${result.analyzedAt}`);
    }

    return lines.join('\n');
}

/**
 * Generate a simple list format for package sizes (alternative to table)
 * @param params.result Package size analysis result
 * @param params.config Table configuration options
 * @returns Formatted list string
 */
export function generatePackageSizeList({
    result,
    config = {}
}: {
    result: PackageSizeResult;
    config?: TableConfig;
}): string {
    const useColors = shouldUseColors(config);
    const lines: string[] = [];

    const title = colorize('Package Size Analysis', ANSI.bold + ANSI.cyan, useColors);
    lines.push(title);
    lines.push('='.repeat(50));
    lines.push('');

    if (result.packages.length === 0) {
        lines.push(colorize('No packages found', ANSI.dim, useColors));
    } else {
        const sortedPackages = [...result.packages].sort((a, b) => b.totalSize - a.totalSize);

        for (const pkg of sortedPackages) {
            let status = '';
            let statusColor = '';
            
            if (pkg.exceedsFatality) {
                status = ' [FATALITY]';
                statusColor = ANSI.red + ANSI.bold;
            } else if (pkg.exceedsWarning) {
                status = ' [WARNING]';
                statusColor = ANSI.yellow + ANSI.bold;
            }

            const coloredStatus = status ? colorize(status, statusColor, useColors) : '';
            const pkgName = colorize(pkg.name, ANSI.bold, useColors);
            
            lines.push(`${pkgName}${coloredStatus}`);
            lines.push(`  Source: ${formatBytes({ bytes: pkg.sourceSize })}`);
            lines.push(`  Build:  ${formatBytes({ bytes: pkg.buildSize })}`);
            lines.push(`  Total:  ${formatBytes({ bytes: pkg.totalSize })}`);
            lines.push('');
        }
    }

    lines.push('-'.repeat(50));
    lines.push(`${colorize('Total:', ANSI.bold, useColors)} ${formatBytes({ bytes: result.totalSize })}`);
    lines.push(`${colorize('Type:', ANSI.bold, useColors)} ${result.workspaceType} (${result.isMonorepo ? 'monorepo' : 'single package'})`);

    return lines.join('\n');
}

/**
 * Generate a minimal one-line summary
 * @param params.result Package size analysis result
 * @returns One-line summary string
 */
export function generatePackageSizeSummary({
    result
}: {
    result: PackageSizeResult;
}): string {
    const warnings = result.packages.filter((p) => p.exceedsWarning && !p.exceedsFatality).length;
    const fatalities = result.packages.filter((p) => p.exceedsFatality).length;

    let status = '';
    if (fatalities > 0) {
        status = ` (${fatalities} fatality)`;
    } else if (warnings > 0) {
        status = ` (${warnings} warning${warnings > 1 ? 's' : ''})`;
    }

    return `${result.packages.length} packages, ${formatBytes({ bytes: result.totalSize })} total${status}`;
}
