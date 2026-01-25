// Mock must be at the top before any imports
jest.mock('@x-fidelity/core', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn()
    }
}));

import {
    packageSizeThresholdOperator,
    getExceedingPackages,
    formatThresholdMessage,
    DEFAULT_WARNING_BYTES,
    DEFAULT_FATALITY_BYTES
} from './packageSizeThreshold';
import { PackageSizeResult, PackageSizeInfo } from '../types';
import { logger } from '@x-fidelity/core';

/**
 * Helper to create a mock PackageSizeInfo
 */
function createMockPackage(
    name: string,
    totalSize: number,
    overrides: Partial<PackageSizeInfo> = {}
): PackageSizeInfo {
    return {
        name,
        path: `packages/${name}`,
        totalSize,
        sourceSize: Math.floor(totalSize * 0.6),
        buildSize: Math.floor(totalSize * 0.4),
        sourceBreakdown: {},
        buildBreakdown: {},
        exceedsWarning: false,
        exceedsFatality: false,
        ...overrides
    };
}

/**
 * Helper to create a mock PackageSizeResult
 */
function createMockResult(packages: PackageSizeInfo[]): PackageSizeResult {
    return {
        packages,
        totalSize: packages.reduce((sum, pkg) => sum + pkg.totalSize, 0),
        workspaceType: 'yarn',
        isMonorepo: packages.length > 1,
        analyzedAt: new Date().toISOString(),
        workspaceRoot: '/test/workspace'
    };
}

describe('packageSizeThresholdOperator', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('operator metadata', () => {
        it('should have correct name', () => {
            expect(packageSizeThresholdOperator.name).toBe('packageSizeThreshold');
        });

        it('should have a description', () => {
            expect(packageSizeThresholdOperator.description).toBe(
                'Checks if any packages exceed size thresholds'
            );
        });
    });

    describe('default thresholds', () => {
        it('should have default warning threshold of 1MB', () => {
            expect(DEFAULT_WARNING_BYTES).toBe(1 * 1024 * 1024);
        });

        it('should have default fatality threshold of 5MB', () => {
            expect(DEFAULT_FATALITY_BYTES).toBe(5 * 1024 * 1024);
        });
    });

    describe('edge cases - invalid input', () => {
        it('should return false when factValue is null', () => {
            const result = packageSizeThresholdOperator.fn(null, {});
            expect(result).toBe(false);
            expect(logger.debug).toHaveBeenCalledWith(
                'packageSizeThreshold: No package size data available'
            );
        });

        it('should return false when factValue is undefined', () => {
            const result = packageSizeThresholdOperator.fn(undefined, {});
            expect(result).toBe(false);
        });

        it('should return false when packages array is missing', () => {
            const result = packageSizeThresholdOperator.fn({ totalSize: 100 }, {});
            expect(result).toBe(false);
        });

        it('should return false for empty packages array', () => {
            const factValue = createMockResult([]);
            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(false);
        });
    });

    describe('all packages under warning threshold', () => {
        it('should return false when all packages are under warning threshold', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', 500 * 1024), // 500 KB
                createMockPackage('pkg-b', 800 * 1024), // 800 KB
                createMockPackage('pkg-c', 100 * 1024) // 100 KB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(false);

            // Verify packages are marked correctly
            for (const pkg of factValue.packages) {
                expect(pkg.exceedsWarning).toBe(false);
                expect(pkg.exceedsFatality).toBe(false);
            }
        });
    });

    describe('warning threshold - exact boundary', () => {
        it('should return true when package is exactly at warning threshold', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', DEFAULT_WARNING_BYTES) // Exactly 1 MB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsWarning).toBe(true);
            expect(factValue.packages[0].exceedsFatality).toBe(false);
        });

        it('should return false when package is 1 byte under warning threshold', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', DEFAULT_WARNING_BYTES - 1)
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(false);
            expect(factValue.packages[0].exceedsWarning).toBe(false);
            expect(factValue.packages[0].exceedsFatality).toBe(false);
        });
    });

    describe('warning threshold - over but under fatality', () => {
        it('should return true and mark exceedsWarning when package exceeds warning but not fatality', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', 2 * 1024 * 1024) // 2 MB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsWarning).toBe(true);
            expect(factValue.packages[0].exceedsFatality).toBe(false);

            expect(logger.warn).toHaveBeenCalledWith('Package size thresholds exceeded:');
        });
    });

    describe('fatality threshold - exact boundary', () => {
        it('should return true when package is exactly at fatality threshold', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', DEFAULT_FATALITY_BYTES) // Exactly 5 MB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsWarning).toBe(true);
            expect(factValue.packages[0].exceedsFatality).toBe(true);
        });

        it('should return warning only when 1 byte under fatality threshold', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', DEFAULT_FATALITY_BYTES - 1)
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsWarning).toBe(true);
            expect(factValue.packages[0].exceedsFatality).toBe(false);
        });
    });

    describe('fatality threshold - over', () => {
        it('should return true and mark both flags when package exceeds fatality', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', 10 * 1024 * 1024) // 10 MB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsWarning).toBe(true);
            expect(factValue.packages[0].exceedsFatality).toBe(true);
        });
    });

    describe('multiple packages with mixed threshold states', () => {
        it('should correctly categorize multiple packages with different sizes', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-small', 500 * 1024), // Under warning
                createMockPackage('pkg-warning', 2 * 1024 * 1024), // Over warning, under fatality
                createMockPackage('pkg-fatal', 6 * 1024 * 1024), // Over fatality
                createMockPackage('pkg-edge', DEFAULT_WARNING_BYTES) // Exactly at warning
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {});
            expect(result).toBe(true);

            // Verify each package
            expect(factValue.packages[0].exceedsWarning).toBe(false);
            expect(factValue.packages[0].exceedsFatality).toBe(false);

            expect(factValue.packages[1].exceedsWarning).toBe(true);
            expect(factValue.packages[1].exceedsFatality).toBe(false);

            expect(factValue.packages[2].exceedsWarning).toBe(true);
            expect(factValue.packages[2].exceedsFatality).toBe(true);

            expect(factValue.packages[3].exceedsWarning).toBe(true);
            expect(factValue.packages[3].exceedsFatality).toBe(false);
        });
    });

    describe('custom threshold values', () => {
        it('should use custom warning threshold', () => {
            const customWarning = 512 * 1024; // 512 KB
            const factValue = createMockResult([
                createMockPackage('pkg-a', 600 * 1024) // 600 KB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {
                warningThresholdBytes: customWarning
            });

            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsWarning).toBe(true);
            expect(factValue.packages[0].warningThreshold).toBe(customWarning);
        });

        it('should use custom fatality threshold', () => {
            const customFatality = 2 * 1024 * 1024; // 2 MB
            const factValue = createMockResult([
                createMockPackage('pkg-a', 3 * 1024 * 1024) // 3 MB
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {
                fatalityThresholdBytes: customFatality
            });

            expect(result).toBe(true);
            expect(factValue.packages[0].exceedsFatality).toBe(true);
            expect(factValue.packages[0].fatalityThreshold).toBe(customFatality);
        });

        it('should use both custom thresholds together', () => {
            const customWarning = 100 * 1024; // 100 KB
            const customFatality = 500 * 1024; // 500 KB

            const factValue = createMockResult([
                createMockPackage('pkg-tiny', 50 * 1024), // Under custom warning
                createMockPackage('pkg-medium', 200 * 1024), // Over custom warning
                createMockPackage('pkg-large', 600 * 1024) // Over custom fatality
            ]);

            const result = packageSizeThresholdOperator.fn(factValue, {
                warningThresholdBytes: customWarning,
                fatalityThresholdBytes: customFatality
            });

            expect(result).toBe(true);

            expect(factValue.packages[0].exceedsWarning).toBe(false);
            expect(factValue.packages[0].exceedsFatality).toBe(false);

            expect(factValue.packages[1].exceedsWarning).toBe(true);
            expect(factValue.packages[1].exceedsFatality).toBe(false);

            expect(factValue.packages[2].exceedsWarning).toBe(true);
            expect(factValue.packages[2].exceedsFatality).toBe(true);
        });
    });

    describe('threshold storage on packages', () => {
        it('should store threshold values on each package', () => {
            const warningThreshold = 512 * 1024;
            const fatalityThreshold = 2 * 1024 * 1024;

            const factValue = createMockResult([
                createMockPackage('pkg-a', 100 * 1024)
            ]);

            packageSizeThresholdOperator.fn(factValue, {
                warningThresholdBytes: warningThreshold,
                fatalityThresholdBytes: fatalityThreshold
            });

            expect(factValue.packages[0].warningThreshold).toBe(warningThreshold);
            expect(factValue.packages[0].fatalityThreshold).toBe(fatalityThreshold);
        });
    });

    describe('logging behavior', () => {
        it('should log debug message with threshold info', () => {
            const factValue = createMockResult([
                createMockPackage('pkg-a', 100 * 1024)
            ]);

            packageSizeThresholdOperator.fn(factValue, {});

            expect(logger.debug).toHaveBeenCalledWith(
                expect.stringContaining('Checking 1 packages')
            );
        });

        it('should log warning messages for exceeding packages', () => {
            const factValue = createMockResult([
                createMockPackage('over-package', 2 * 1024 * 1024)
            ]);

            packageSizeThresholdOperator.fn(factValue, {});

            expect(logger.warn).toHaveBeenCalledWith('Package size thresholds exceeded:');
            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('over-package')
            );
        });

        it('should not log warnings when no packages exceed thresholds', () => {
            const factValue = createMockResult([
                createMockPackage('small-package', 100 * 1024)
            ]);

            packageSizeThresholdOperator.fn(factValue, {});

            expect(logger.warn).not.toHaveBeenCalled();
        });
    });
});

describe('getExceedingPackages', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return empty array for null result', () => {
        const result = getExceedingPackages(null as unknown as PackageSizeResult, 'warning');
        expect(result).toEqual([]);
    });

    it('should return empty array for result with no packages', () => {
        const result = getExceedingPackages({} as PackageSizeResult, 'warning');
        expect(result).toEqual([]);
    });

    it('should return packages exceeding warning threshold', () => {
        const packages = [
            createMockPackage('pkg-a', 100),
            createMockPackage('pkg-b', 200),
            createMockPackage('pkg-c', 300)
        ];
        packages[0].exceedsWarning = false;
        packages[1].exceedsWarning = true;
        packages[2].exceedsWarning = true;
        packages[2].exceedsFatality = true;

        const factValue = createMockResult(packages);
        const result = getExceedingPackages(factValue, 'warning');

        expect(result).toHaveLength(2);
        expect(result.map(p => p.name)).toContain('pkg-b');
        expect(result.map(p => p.name)).toContain('pkg-c');
    });

    it('should return only packages exceeding fatality threshold', () => {
        const packages = [
            createMockPackage('pkg-a', 100),
            createMockPackage('pkg-b', 200),
            createMockPackage('pkg-c', 300)
        ];
        packages[0].exceedsFatality = false;
        packages[1].exceedsFatality = false;
        packages[2].exceedsFatality = true;

        const factValue = createMockResult(packages);
        const result = getExceedingPackages(factValue, 'fatality');

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('pkg-c');
    });
});

describe('formatThresholdMessage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return appropriate message for null result', () => {
        const message = formatThresholdMessage(null as unknown as PackageSizeResult, {});
        expect(message).toBe('No package data available');
    });

    it('should return appropriate message when no packages exceed thresholds', () => {
        const packages = [createMockPackage('pkg-a', 100)];
        packages[0].exceedsWarning = false;
        packages[0].exceedsFatality = false;

        const factValue = createMockResult(packages);
        const message = formatThresholdMessage(factValue, {});

        expect(message).toBe('No packages exceed thresholds');
    });

    it('should format message for warning threshold violations', () => {
        const packages = [createMockPackage('pkg-over', 2 * 1024 * 1024)];
        packages[0].exceedsWarning = true;
        packages[0].exceedsFatality = false;

        const factValue = createMockResult(packages);
        const message = formatThresholdMessage(factValue, {
            warningThresholdBytes: DEFAULT_WARNING_BYTES,
            fatalityThresholdBytes: DEFAULT_FATALITY_BYTES
        });

        expect(message).toContain('1 package(s) exceed warning threshold');
        expect(message).toContain('pkg-over');
        expect(message).toContain('1 MB');
    });

    it('should format message for fatality threshold violations', () => {
        const packages = [createMockPackage('pkg-fatal', 6 * 1024 * 1024)];
        packages[0].exceedsWarning = true;
        packages[0].exceedsFatality = true;

        const factValue = createMockResult(packages);
        const message = formatThresholdMessage(factValue, {
            warningThresholdBytes: DEFAULT_WARNING_BYTES,
            fatalityThresholdBytes: DEFAULT_FATALITY_BYTES
        });

        expect(message).toContain('1 package(s) exceed fatality threshold');
        expect(message).toContain('pkg-fatal');
        expect(message).toContain('5 MB');
    });

    it('should format message for mixed violations', () => {
        const packages = [
            createMockPackage('pkg-warning', 2 * 1024 * 1024),
            createMockPackage('pkg-fatal', 6 * 1024 * 1024)
        ];
        packages[0].exceedsWarning = true;
        packages[0].exceedsFatality = false;
        packages[1].exceedsWarning = true;
        packages[1].exceedsFatality = true;

        const factValue = createMockResult(packages);
        const message = formatThresholdMessage(factValue, {
            warningThresholdBytes: DEFAULT_WARNING_BYTES,
            fatalityThresholdBytes: DEFAULT_FATALITY_BYTES
        });

        expect(message).toContain('1 package(s) exceed fatality threshold');
        expect(message).toContain('1 package(s) exceed warning threshold');
        expect(message).toContain('pkg-warning');
        expect(message).toContain('pkg-fatal');
    });

    it('should use default thresholds when not provided', () => {
        const packages = [createMockPackage('pkg-over', 2 * 1024 * 1024)];
        packages[0].exceedsWarning = true;
        packages[0].exceedsFatality = false;

        const factValue = createMockResult(packages);
        const message = formatThresholdMessage(factValue, {});

        expect(message).toContain('1 MB'); // Default warning threshold
    });
});
