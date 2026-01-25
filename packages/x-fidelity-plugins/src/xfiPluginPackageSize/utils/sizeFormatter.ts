/**
 * Size Formatter Utilities
 *
 * Provides functions for converting between bytes and human-readable size strings,
 * and formatting size breakdowns by file type.
 */

/**
 * Format bytes as human-readable string
 * @param params.bytes Number of bytes
 * @param params.decimals Number of decimal places (default: 2)
 * @returns Formatted string like "1.5 MB"
 */
export function formatBytes({
    bytes,
    decimals = 2
}: {
    bytes: number;
    decimals?: number;
}): string {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 0) return '-' + formatBytes({ bytes: -bytes, decimals });

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    // Handle values less than 1 byte (fractional)
    if (bytes < 1) {
        return parseFloat(bytes.toFixed(decimals)) + ' ' + sizes[0];
    }

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const index = Math.min(Math.max(i, 0), sizes.length - 1);

    return parseFloat((bytes / Math.pow(k, index)).toFixed(decimals)) + ' ' + sizes[index];
}

/**
 * Parse human-readable size string to bytes
 * @param params.sizeStr String like "1.5 MB" or "500 KB"
 * @returns Number of bytes
 * @throws Error if the size string is invalid
 */
export function parseBytes({ sizeStr }: { sizeStr: string }): number {
    const match = sizeStr.trim().match(/^([\d.]+)\s*(Bytes?|KB|MB|GB|TB)$/i);
    if (!match) {
        throw new Error(`Invalid size string: ${sizeStr}`);
    }

    const value = parseFloat(match[1]);
    if (isNaN(value)) {
        throw new Error(`Invalid size string: ${sizeStr}`);
    }

    const unit = match[2].toUpperCase();

    const multipliers: Record<string, number> = {
        BYTE: 1,
        BYTES: 1,
        KB: 1024,
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
        TB: 1024 * 1024 * 1024 * 1024
    };

    return Math.round(value * (multipliers[unit] || 1));
}

/**
 * Format breakdown by file type
 * @param params.breakdown Record of extension -> bytes
 * @param params.limit Maximum number of types to show (default: 5)
 * @returns Formatted string like "TypeScript: 200 KB, JSON: 50 KB"
 */
export function formatBreakdown({
    breakdown,
    limit = 5
}: {
    breakdown: Record<string, number>;
    limit?: number;
}): string {
    const entries = Object.entries(breakdown);
    if (entries.length === 0) {
        return '';
    }

    const sorted = entries.sort(([, a], [, b]) => b - a).slice(0, limit);

    return sorted.map(([ext, bytes]) => `${ext}: ${formatBytes({ bytes })}`).join(', ');
}
