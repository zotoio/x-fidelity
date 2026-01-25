/**
 * Tests for Package Size Plugin Index (exports)
 *
 * Verifies that all exports from the plugin are properly exposed.
 */

import {
    xfiPluginPackageSize,
    packageSizeFact,
    packageSizeThresholdOperator,
    getExceedingPackages,
    formatThresholdMessage,
    DEFAULT_WARNING_BYTES,
    DEFAULT_FATALITY_BYTES
} from './index';
import type {
    PackageSizeResult,
    PackageSizeInfo,
    PackageSizeThresholds,
    PackageSizeThresholdParams,
    PackageSizeFactParams,
    SizeBreakdown,
    WorkspaceType
} from './index';

describe('xfiPluginPackageSize exports', () => {
    describe('plugin object', () => {
        it('should export the plugin object with correct structure', () => {
            expect(xfiPluginPackageSize).toBeDefined();
            expect(xfiPluginPackageSize.name).toBe('xfiPluginPackageSize');
            expect(xfiPluginPackageSize.version).toBe('1.0.0');
            expect(xfiPluginPackageSize.description).toBe('Plugin for analyzing package sizes in monorepos');
        });

        it('should have facts array with packageSizeFact', () => {
            expect(xfiPluginPackageSize.facts).toBeDefined();
            expect(Array.isArray(xfiPluginPackageSize.facts)).toBe(true);
            expect(xfiPluginPackageSize.facts).toHaveLength(1);
            expect(xfiPluginPackageSize.facts[0].name).toBe('packageSize');
        });

        it('should have operators array with packageSizeThresholdOperator', () => {
            expect(xfiPluginPackageSize.operators).toBeDefined();
            expect(Array.isArray(xfiPluginPackageSize.operators)).toBe(true);
            expect(xfiPluginPackageSize.operators).toHaveLength(1);
            expect(xfiPluginPackageSize.operators[0].name).toBe('packageSizeThreshold');
        });

        it('should have an onError handler', () => {
            expect(xfiPluginPackageSize.onError).toBeDefined();
            expect(typeof xfiPluginPackageSize.onError).toBe('function');
        });

        it('should return proper PluginError from onError', () => {
            const testError = new Error('Test error message');
            testError.stack = 'Error: Test error message\n    at test.js:1:1';
            
            const result = xfiPluginPackageSize.onError(testError);
            
            expect(result).toEqual({
                message: 'Test error message',
                level: 'error',
                severity: 'error',
                source: 'xfiPluginPackageSize',
                details: testError.stack
            });
        });
    });

    describe('fact exports', () => {
        it('should export packageSizeFact', () => {
            expect(packageSizeFact).toBeDefined();
            expect(packageSizeFact.name).toBe('packageSize');
            expect(packageSizeFact.type).toBe('global');
            expect(typeof packageSizeFact.fn).toBe('function');
        });
    });

    describe('operator exports', () => {
        it('should export packageSizeThresholdOperator', () => {
            expect(packageSizeThresholdOperator).toBeDefined();
            expect(packageSizeThresholdOperator.name).toBe('packageSizeThreshold');
            expect(typeof packageSizeThresholdOperator.fn).toBe('function');
        });

        it('should export getExceedingPackages helper', () => {
            expect(getExceedingPackages).toBeDefined();
            expect(typeof getExceedingPackages).toBe('function');
        });

        it('should export formatThresholdMessage helper', () => {
            expect(formatThresholdMessage).toBeDefined();
            expect(typeof formatThresholdMessage).toBe('function');
        });

        it('should export DEFAULT_WARNING_BYTES constant', () => {
            expect(DEFAULT_WARNING_BYTES).toBeDefined();
            expect(DEFAULT_WARNING_BYTES).toBe(1 * 1024 * 1024);
        });

        it('should export DEFAULT_FATALITY_BYTES constant', () => {
            expect(DEFAULT_FATALITY_BYTES).toBeDefined();
            expect(DEFAULT_FATALITY_BYTES).toBe(5 * 1024 * 1024);
        });
    });

    describe('type exports', () => {
        it('should export types correctly (compile-time check)', () => {
            // These are compile-time checks - if types aren't exported, TypeScript will fail
            const sizeBreakdown: SizeBreakdown = { '.ts': 100 };
            expect(sizeBreakdown['.ts']).toBe(100);

            const workspaceType: WorkspaceType = 'yarn';
            expect(workspaceType).toBe('yarn');

            const thresholds: PackageSizeThresholds = {
                warningThreshold: '1 MB',
                fatalityThreshold: '5 MB'
            };
            expect(thresholds.warningThreshold).toBe('1 MB');

            const thresholdParams: PackageSizeThresholdParams = {
                warningThresholdBytes: 1024,
                fatalityThresholdBytes: 5120
            };
            expect(thresholdParams.warningThresholdBytes).toBe(1024);

            const factParams: PackageSizeFactParams = {
                repoPath: '/test',
                sourceDirs: ['src'],
                buildDirs: ['dist']
            };
            expect(factParams.repoPath).toBe('/test');

            const packageInfo: PackageSizeInfo = {
                name: 'test',
                path: 'packages/test',
                totalSize: 1000,
                sourceSize: 600,
                buildSize: 400,
                sourceBreakdown: {},
                buildBreakdown: {},
                exceedsWarning: false,
                exceedsFatality: false
            };
            expect(packageInfo.name).toBe('test');

            const result: PackageSizeResult = {
                packages: [],
                totalSize: 0,
                workspaceType: 'npm',
                isMonorepo: false,
                analyzedAt: new Date().toISOString(),
                workspaceRoot: '/test'
            };
            expect(result.packages).toEqual([]);
        });
    });
});
