/**
 * Tests for Package Size Utils Index (exports)
 *
 * Verifies that all utility exports are properly exposed from the utils module.
 */

import {
    formatBytes,
    parseBytes,
    formatBreakdown,
    generatePackageSizeTable,
    generatePackageSizeList,
    generatePackageSizeSummary,
    shouldOutputPackageSizeTable,
    shouldUseColors
} from './index';
import type { TableConfig, TableOutputOptions } from './index';

describe('utils/index exports', () => {
    describe('sizeFormatter exports', () => {
        it('should export formatBytes function', () => {
            expect(formatBytes).toBeDefined();
            expect(typeof formatBytes).toBe('function');
            expect(formatBytes({ bytes: 1024 })).toBe('1 KB');
        });

        it('should export parseBytes function', () => {
            expect(parseBytes).toBeDefined();
            expect(typeof parseBytes).toBe('function');
            expect(parseBytes({ sizeStr: '1 KB' })).toBe(1024);
        });

        it('should export formatBreakdown function', () => {
            expect(formatBreakdown).toBeDefined();
            expect(typeof formatBreakdown).toBe('function');
            expect(formatBreakdown({ breakdown: { '.ts': 1024 } })).toBe('.ts: 1 KB');
        });
    });

    describe('consoleTable exports', () => {
        it('should export generatePackageSizeTable function', () => {
            expect(generatePackageSizeTable).toBeDefined();
            expect(typeof generatePackageSizeTable).toBe('function');
        });

        it('should export generatePackageSizeList function', () => {
            expect(generatePackageSizeList).toBeDefined();
            expect(typeof generatePackageSizeList).toBe('function');
        });

        it('should export generatePackageSizeSummary function', () => {
            expect(generatePackageSizeSummary).toBeDefined();
            expect(typeof generatePackageSizeSummary).toBe('function');
        });

        it('should export shouldOutputPackageSizeTable function', () => {
            expect(shouldOutputPackageSizeTable).toBeDefined();
            expect(typeof shouldOutputPackageSizeTable).toBe('function');
        });

        it('should export shouldUseColors function', () => {
            expect(shouldUseColors).toBeDefined();
            expect(typeof shouldUseColors).toBe('function');
        });
    });

    describe('type exports', () => {
        it('should export TableConfig type', () => {
            const config: TableConfig = {
                includeBreakdown: true,
                maxNameWidth: 30,
                showIndicators: true,
                useColors: false,
                verbose: true
            };
            expect(config.includeBreakdown).toBe(true);
        });

        it('should export TableOutputOptions type', () => {
            const options: TableOutputOptions = {
                noPackageSizeTable: false,
                quiet: false,
                verbose: true,
                logLevel: 'info',
                outputFormat: 'human'
            };
            expect(options.verbose).toBe(true);
        });
    });

    describe('integration test - utils work together', () => {
        it('should format and parse bytes consistently', () => {
            const original = 1024 * 1024;
            const formatted = formatBytes({ bytes: original });
            const parsed = parseBytes({ sizeStr: formatted });
            expect(parsed).toBe(original);
        });

        it('should generate table with formatted sizes', () => {
            const result = {
                packages: [{
                    name: 'test-pkg',
                    path: 'packages/test',
                    totalSize: 1024 * 100,
                    sourceSize: 1024 * 80,
                    buildSize: 1024 * 20,
                    sourceBreakdown: { '.ts': 1024 * 80 },
                    buildBreakdown: { '.js': 1024 * 20 },
                    exceedsWarning: false,
                    exceedsFatality: false
                }],
                totalSize: 1024 * 100,
                workspaceType: 'yarn' as const,
                isMonorepo: false,
                analyzedAt: new Date().toISOString(),
                workspaceRoot: '/test'
            };

            const table = generatePackageSizeTable({ result, config: { useColors: false } });
            expect(table).toContain('test-pkg');
            expect(table).toContain('100 KB');
        });
    });
});
