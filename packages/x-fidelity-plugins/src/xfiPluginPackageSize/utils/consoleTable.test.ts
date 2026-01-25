/**
 * Tests for Console Table Utilities
 *
 * Comprehensive tests for table formatting, list output, and summary generation.
 */

import {
    generatePackageSizeTable,
    generatePackageSizeList,
    generatePackageSizeSummary,
    shouldUseColors,
    shouldOutputPackageSizeTable
} from './consoleTable';
import type { PackageSizeResult, PackageSizeInfo } from '../types';

/**
 * Helper to create a mock package info
 */
function createMockPackage(overrides: Partial<PackageSizeInfo> = {}): PackageSizeInfo {
    return {
        name: 'test-package',
        path: 'packages/test-package',
        totalSize: 1024 * 100, // 100 KB
        sourceSize: 1024 * 80, // 80 KB
        buildSize: 1024 * 20, // 20 KB
        sourceBreakdown: { '.ts': 1024 * 80 },
        buildBreakdown: { '.js': 1024 * 20 },
        exceedsWarning: false,
        exceedsFatality: false,
        ...overrides
    };
}

/**
 * Helper to create a mock result
 */
function createMockResult(overrides: Partial<PackageSizeResult> = {}): PackageSizeResult {
    return {
        packages: [],
        totalSize: 0,
        workspaceType: 'yarn',
        isMonorepo: true,
        analyzedAt: '2026-01-23T12:00:00.000Z',
        workspaceRoot: '/test/repo',
        ...overrides
    };
}

describe('consoleTable', () => {
    describe('generatePackageSizeTable', () => {
        it('should generate table for empty packages', () => {
            const result = createMockResult({ packages: [] });
            const table = generatePackageSizeTable({ result });

            expect(table).toContain('Package Size Analysis');
            expect(table).toContain('No packages found');
            expect(table).toContain('Total: 0 Bytes across 0 packages');
        });

        it('should generate table for single package', () => {
            const pkg = createMockPackage({ name: 'my-package' });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('Package Size Analysis');
            expect(table).toContain('my-package');
            expect(table).toContain('Package');
            expect(table).toContain('Source');
            expect(table).toContain('Build');
            expect(table).toContain('Total');
            expect(table).toContain('Total: 100 KB across 1 package');
        });

        it('should generate table for multiple packages sorted by size', () => {
            const pkg1 = createMockPackage({ name: 'small-pkg', totalSize: 1024 });
            const pkg2 = createMockPackage({ name: 'large-pkg', totalSize: 1024 * 1024 });
            const pkg3 = createMockPackage({ name: 'medium-pkg', totalSize: 1024 * 100 });

            const result = createMockResult({
                packages: [pkg1, pkg2, pkg3],
                totalSize: pkg1.totalSize + pkg2.totalSize + pkg3.totalSize
            });

            const table = generatePackageSizeTable({ result });
            const lines = table.split('\n');

            // Find the data rows (after headers, before footer)
            const dataLines = lines.filter(
                (l) =>
                    l.includes('│') &&
                    (l.includes('large-pkg') || l.includes('medium-pkg') || l.includes('small-pkg'))
            );

            expect(dataLines.length).toBe(3);
            // First data row should be largest
            expect(dataLines[0]).toContain('large-pkg');
            // Last data row should be smallest
            expect(dataLines[2]).toContain('small-pkg');
        });

        it('should show warning indicators when exceedsWarning is true', () => {
            const pkg = createMockPackage({
                name: 'warning-pkg',
                exceedsWarning: true,
                exceedsFatality: false
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('!');
        });

        it('should show fatality indicators when exceedsFatality is true', () => {
            const pkg = createMockPackage({
                name: 'fatal-pkg',
                exceedsWarning: true,
                exceedsFatality: true
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('!!');
        });

        it('should hide indicators when showIndicators is false', () => {
            const pkg = createMockPackage({
                name: 'fatal-pkg',
                exceedsWarning: true,
                exceedsFatality: true
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const table = generatePackageSizeTable({ result, config: { showIndicators: false } });

            // Should not have the fatality indicator
            const lines = table.split('\n').filter((l) => l.includes('fatal-pkg'));
            expect(lines[0]).not.toContain('!!');
        });

        it('should truncate long package names', () => {
            const longName = 'this-is-a-very-long-package-name-that-should-be-truncated';
            const pkg = createMockPackage({ name: longName });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('...');
            expect(table).not.toContain(longName);
        });

        it('should show correct workspace type for monorepo', () => {
            const result = createMockResult({
                workspaceType: 'yarn',
                isMonorepo: true
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('Workspace: yarn (monorepo)');
        });

        it('should show correct workspace type for single package', () => {
            const result = createMockResult({
                workspaceType: 'npm',
                isMonorepo: false
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('Workspace: npm (single package)');
        });

        it('should format sizes correctly in table', () => {
            const pkg = createMockPackage({
                name: 'sized-pkg',
                sourceSize: 1024 * 1024, // 1 MB
                buildSize: 512 * 1024, // 512 KB
                totalSize: 1.5 * 1024 * 1024 // 1.5 MB
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const table = generatePackageSizeTable({ result });

            expect(table).toContain('1 MB');
            expect(table).toContain('512 KB');
            expect(table).toContain('1.5 MB');
        });

        it('should have proper box drawing characters', () => {
            const result = createMockResult({
                packages: [createMockPackage()]
            });

            const table = generatePackageSizeTable({ result });

            // Check for box drawing characters
            expect(table).toContain('┌');
            expect(table).toContain('┐');
            expect(table).toContain('└');
            expect(table).toContain('┘');
            expect(table).toContain('├');
            expect(table).toContain('┤');
            expect(table).toContain('┬');
            expect(table).toContain('┴');
            expect(table).toContain('┼');
            expect(table).toContain('│');
            expect(table).toContain('─');
        });
    });

    describe('generatePackageSizeList', () => {
        it('should generate list for empty packages', () => {
            const result = createMockResult({ packages: [] });
            const list = generatePackageSizeList({ result });

            expect(list).toContain('Package Size Analysis');
            expect(list).toContain('No packages found');
            expect(list).toContain('Total: 0 Bytes');
        });

        it('should generate list for single package', () => {
            const pkg = createMockPackage({
                name: 'my-package',
                sourceSize: 1024 * 10,
                buildSize: 1024 * 5,
                totalSize: 1024 * 15
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const list = generatePackageSizeList({ result });

            expect(list).toContain('my-package');
            expect(list).toContain('Source: 10 KB');
            expect(list).toContain('Build:  5 KB');
            expect(list).toContain('Total:  15 KB');
        });

        it('should show WARNING label for warnings', () => {
            const pkg = createMockPackage({
                name: 'warning-pkg',
                exceedsWarning: true
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const list = generatePackageSizeList({ result });

            expect(list).toContain('[WARNING]');
        });

        it('should show FATALITY label for fatalities', () => {
            const pkg = createMockPackage({
                name: 'fatal-pkg',
                exceedsFatality: true
            });
            const result = createMockResult({
                packages: [pkg],
                totalSize: pkg.totalSize
            });

            const list = generatePackageSizeList({ result });

            expect(list).toContain('[FATALITY]');
        });

        it('should sort packages by size descending', () => {
            const pkg1 = createMockPackage({ name: 'small', totalSize: 100 });
            const pkg2 = createMockPackage({ name: 'large', totalSize: 10000 });

            const result = createMockResult({
                packages: [pkg1, pkg2],
                totalSize: pkg1.totalSize + pkg2.totalSize
            });

            const list = generatePackageSizeList({ result });
            const largeIndex = list.indexOf('large');
            const smallIndex = list.indexOf('small');

            expect(largeIndex).toBeLessThan(smallIndex);
        });

        it('should show workspace type and monorepo status', () => {
            const result = createMockResult({
                workspaceType: 'pnpm',
                isMonorepo: true
            });

            const list = generatePackageSizeList({ result });

            expect(list).toContain('Type: pnpm (monorepo)');
        });
    });

    describe('generatePackageSizeSummary', () => {
        it('should generate summary for empty packages', () => {
            const result = createMockResult({ packages: [] });
            const summary = generatePackageSizeSummary({ result });

            expect(summary).toBe('0 packages, 0 Bytes total');
        });

        it('should generate summary with package count and total size', () => {
            const result = createMockResult({
                packages: [createMockPackage(), createMockPackage()],
                totalSize: 1024 * 1024
            });

            const summary = generatePackageSizeSummary({ result });

            expect(summary).toBe('2 packages, 1 MB total');
        });

        it('should include warning count in summary', () => {
            const pkg1 = createMockPackage({ exceedsWarning: true });
            const pkg2 = createMockPackage({ exceedsWarning: false });

            const result = createMockResult({
                packages: [pkg1, pkg2],
                totalSize: 1024
            });

            const summary = generatePackageSizeSummary({ result });

            expect(summary).toContain('(1 warning)');
        });

        it('should pluralize warnings correctly', () => {
            const pkg1 = createMockPackage({ exceedsWarning: true });
            const pkg2 = createMockPackage({ exceedsWarning: true });

            const result = createMockResult({
                packages: [pkg1, pkg2],
                totalSize: 1024
            });

            const summary = generatePackageSizeSummary({ result });

            expect(summary).toContain('(2 warnings)');
        });

        it('should include fatality count in summary', () => {
            const pkg = createMockPackage({ exceedsFatality: true, exceedsWarning: true });

            const result = createMockResult({
                packages: [pkg],
                totalSize: 1024
            });

            const summary = generatePackageSizeSummary({ result });

            expect(summary).toContain('(1 fatality)');
        });

        it('should prioritize fatality over warning in summary', () => {
            const pkg1 = createMockPackage({ exceedsFatality: true, exceedsWarning: true });
            const pkg2 = createMockPackage({ exceedsWarning: true });

            const result = createMockResult({
                packages: [pkg1, pkg2],
                totalSize: 1024
            });

            const summary = generatePackageSizeSummary({ result });

            // Should show fatality count, not warning count
            expect(summary).toContain('(1 fatality)');
            expect(summary).not.toContain('warning');
        });

        it('should not show status when no issues', () => {
            const pkg = createMockPackage({
                exceedsWarning: false,
                exceedsFatality: false
            });

            const result = createMockResult({
                packages: [pkg],
                totalSize: 1024
            });

            const summary = generatePackageSizeSummary({ result });

            expect(summary).toBe('1 packages, 1 KB total');
        });
    });

    describe('shouldUseColors', () => {
        const originalEnv = process.env;
        const originalIsTTY = process.stdout.isTTY;

        beforeEach(() => {
            // Reset environment for each test
            process.env = { ...originalEnv };
            delete process.env.NO_COLOR;
            delete process.env.FORCE_COLOR;
            delete process.env.XFI_LOG_COLORS;
        });

        afterEach(() => {
            process.env = originalEnv;
            Object.defineProperty(process.stdout, 'isTTY', {
                value: originalIsTTY,
                writable: true,
                configurable: true
            });
        });

        it('should respect explicit useColors config', () => {
            expect(shouldUseColors({ useColors: true })).toBe(true);
            expect(shouldUseColors({ useColors: false })).toBe(false);
        });

        it('should return false when NO_COLOR is set', () => {
            process.env.NO_COLOR = '1';
            expect(shouldUseColors()).toBe(false);
        });

        it('should return true when FORCE_COLOR is 1', () => {
            process.env.FORCE_COLOR = '1';
            expect(shouldUseColors()).toBe(true);
        });

        it('should return false when FORCE_COLOR is 0', () => {
            process.env.FORCE_COLOR = '0';
            expect(shouldUseColors()).toBe(false);
        });

        it('should return false when XFI_LOG_COLORS is false', () => {
            process.env.XFI_LOG_COLORS = 'false';
            expect(shouldUseColors()).toBe(false);
        });

        it('should default to TTY detection when no env vars set', () => {
            // Mock TTY
            Object.defineProperty(process.stdout, 'isTTY', {
                value: true,
                writable: true,
                configurable: true
            });
            expect(shouldUseColors()).toBe(true);

            Object.defineProperty(process.stdout, 'isTTY', {
                value: false,
                writable: true,
                configurable: true
            });
            expect(shouldUseColors()).toBe(false);
        });
        
        it('should return true when FORCE_COLOR is true', () => {
            process.env.FORCE_COLOR = 'true';
            expect(shouldUseColors()).toBe(true);
        });
        
        it('should return false when FORCE_COLOR is false', () => {
            process.env.FORCE_COLOR = 'false';
            expect(shouldUseColors()).toBe(false);
        });
    });

    describe('shouldOutputPackageSizeTable', () => {
        it('should return true by default', () => {
            expect(shouldOutputPackageSizeTable()).toBe(true);
            expect(shouldOutputPackageSizeTable({})).toBe(true);
        });

        it('should return false when noPackageSizeTable is true', () => {
            expect(shouldOutputPackageSizeTable({ noPackageSizeTable: true })).toBe(false);
        });

        it('should return false when outputFormat is json', () => {
            expect(shouldOutputPackageSizeTable({ outputFormat: 'json' })).toBe(false);
        });

        it('should return true when outputFormat is human', () => {
            expect(shouldOutputPackageSizeTable({ outputFormat: 'human' })).toBe(true);
        });

        it('should return false when quiet is true', () => {
            expect(shouldOutputPackageSizeTable({ quiet: true })).toBe(false);
        });

        it('should return true when verbose is true', () => {
            expect(shouldOutputPackageSizeTable({ verbose: true })).toBe(true);
        });

        it('should return false when logLevel is error', () => {
            expect(shouldOutputPackageSizeTable({ logLevel: 'error' })).toBe(false);
        });

        it('should return false when logLevel is fatal', () => {
            expect(shouldOutputPackageSizeTable({ logLevel: 'fatal' })).toBe(false);
        });

        it('should return true when logLevel is info', () => {
            expect(shouldOutputPackageSizeTable({ logLevel: 'info' })).toBe(true);
        });

        it('should return true when logLevel is debug', () => {
            expect(shouldOutputPackageSizeTable({ logLevel: 'debug' })).toBe(true);
        });
    });

    describe('colored output', () => {
        it('should include ANSI codes when useColors is true', () => {
            const result = createMockResult({
                packages: [createMockPackage({ name: 'colored-pkg' })]
            });

            const table = generatePackageSizeTable({ 
                result, 
                config: { useColors: true } 
            });

            // Check for ANSI escape codes
            expect(table).toContain('\x1b[');
        });

        it('should not include ANSI codes when useColors is false', () => {
            const result = createMockResult({
                packages: [createMockPackage({ name: 'plain-pkg' })]
            });

            const table = generatePackageSizeTable({ 
                result, 
                config: { useColors: false } 
            });

            // Should not contain ANSI escape codes
            expect(table).not.toContain('\x1b[');
        });

        it('should show verbose details when verbose is true', () => {
            const result = createMockResult({
                packages: [createMockPackage({ name: 'verbose-pkg' })]
            });

            const table = generatePackageSizeTable({ 
                result, 
                config: { verbose: true, useColors: false } 
            });

            expect(table).toContain('Details:');
            expect(table).toContain('All packages within thresholds');
            expect(table).toContain('Analyzed at:');
        });

        it('should show warning count in verbose mode', () => {
            const result = createMockResult({
                packages: [
                    createMockPackage({ name: 'warning-pkg', exceedsWarning: true }),
                    createMockPackage({ name: 'ok-pkg' })
                ]
            });

            const table = generatePackageSizeTable({ 
                result, 
                config: { verbose: true, useColors: false } 
            });

            expect(table).toContain('1 package(s) exceed warning threshold');
        });

        it('should show fatality count in verbose mode', () => {
            const result = createMockResult({
                packages: [
                    createMockPackage({ name: 'fatal-pkg', exceedsFatality: true, exceedsWarning: true })
                ]
            });

            const table = generatePackageSizeTable({ 
                result, 
                config: { verbose: true, useColors: false } 
            });

            expect(table).toContain('1 package(s) exceed fatality threshold');
        });

        it('should not show verbose details when verbose is false', () => {
            const result = createMockResult({
                packages: [createMockPackage({ name: 'normal-pkg' })]
            });

            const table = generatePackageSizeTable({ 
                result, 
                config: { verbose: false, useColors: false } 
            });

            expect(table).not.toContain('Details:');
            expect(table).not.toContain('Analyzed at:');
        });
    });

    describe('generatePackageSizeList with colors', () => {
        it('should include ANSI codes in list when useColors is true', () => {
            const result = createMockResult({
                packages: [createMockPackage({ name: 'list-pkg' })]
            });

            const list = generatePackageSizeList({ 
                result, 
                config: { useColors: true } 
            });

            expect(list).toContain('\x1b[');
        });

        it('should not include ANSI codes in list when useColors is false', () => {
            const result = createMockResult({
                packages: [createMockPackage({ name: 'plain-list-pkg' })]
            });

            const list = generatePackageSizeList({ 
                result, 
                config: { useColors: false } 
            });

            expect(list).not.toContain('\x1b[');
        });
    });
});
