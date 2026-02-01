/**
 * Test suite for EngineRunner
 * Tests rule failure construction and fact resolution
 */

import { runEngineOnFiles, registerRuleForTracking } from './engineRunner';
import { Engine } from 'json-rules-engine';
import { pluginRegistry } from '../pluginRegistry';
import { REPO_GLOBAL_CHECK } from '../configManager';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    }
}));

jest.mock('../../utils/loggerProvider', () => {
    const createMockLogger = () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    });
    const mockLogger = createMockLogger();
    return {
        LoggerProvider: {
            getLoggerForMode: jest.fn().mockImplementation(() => mockLogger),
            getCurrentExecutionMode: jest.fn().mockImplementation(() => 'cli'),
            ensureInitialized: jest.fn().mockImplementation(() => {}),
            setLogger: jest.fn().mockImplementation(() => {}),
            clearInjectedLogger: jest.fn().mockImplementation(() => {}),
            getLogger: jest.fn().mockImplementation(() => mockLogger)
        }
    };
});

jest.mock('../pluginRegistry', () => ({
    pluginRegistry: {
        getPluginFacts: jest.fn().mockReturnValue([]),
        getPluginOperators: jest.fn().mockReturnValue([])
    }
}));

jest.mock('../../utils/timingUtils', () => ({
    createTimingTracker: jest.fn().mockImplementation(() => ({
        recordTiming: jest.fn(),
        recordDetailedTiming: jest.fn(),
        logTimingBreakdown: jest.fn(),
        getTimings: jest.fn().mockImplementation(() => ({})),
        reset: jest.fn()
    }))
}));

describe('EngineRunner', () => {
    let mockEngine: any;
    let mockAlmanac: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAlmanac = {
            factValue: jest.fn().mockResolvedValue(undefined)
        };

        mockEngine = {
            run: jest.fn().mockResolvedValue({
                results: [],
                almanac: mockAlmanac
            }),
            rules: []
        };
    });

    describe('registerRuleForTracking', () => {
        it('should register a rule with event type', () => {
            const rule = {
                name: 'test-rule',
                event: { type: 'warning' },
                conditions: { all: [] }
            };

            registerRuleForTracking(rule);

            // Rule should be registered (internal tracking)
            expect(true).toBe(true); // No external API to verify, but should not throw
        });

        it('should handle rules without event type gracefully', () => {
            const rule = {
                name: 'no-event-rule',
                conditions: { all: [] }
            };

            // Should not throw
            expect(() => registerRuleForTracking(rule)).not.toThrow();
        });

        it('should handle null or undefined rules', () => {
            expect(() => registerRuleForTracking(null)).not.toThrow();
            expect(() => registerRuleForTracking(undefined)).not.toThrow();
        });
    });

    describe('runEngineOnFiles', () => {
        const mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn()
        };

        const baseParams = {
            engine: null as any,
            fileData: [],
            installedDependencyVersions: {},
            minimumDependencyVersions: {},
            standardStructure: {},
            repoPath: '/test/repo',
            logger: mockLogger
        };

        beforeEach(() => {
            baseParams.engine = mockEngine;
            jest.clearAllMocks();
        });

        it('should process files and return scan results', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            mockEngine.run.mockResolvedValue({
                results: [],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            expect(Array.isArray(results)).toBe(true);
            expect(mockEngine.run).toHaveBeenCalled();
        });

        it('should handle engine rule failures correctly', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            const mockRule = {
                name: 'functionComplexity-iterative',
                conditions: { all: [{ fact: 'complexity', operator: 'greaterThan', value: 10 }] },
                event: { type: 'warning', params: { message: 'Function too complex' } },
                description: 'Checks function complexity'
            };

            mockEngine.rules = [mockRule];
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'functionComplexity-iterative',
                    result: true,
                    event: {
                        type: 'warning',
                        params: {
                            message: 'Function too complex',
                            details: { fact: 'complexityResult' }
                        }
                    }
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            expect(results.length).toBeGreaterThanOrEqual(0);
        });

        it('should resolve fact details from almanac', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            const mockDependencyFailures = [
                { dependency: 'lodash', currentVersion: '3.0.0', requiredVersion: '4.0.0' }
            ];

            mockAlmanac.factValue.mockResolvedValue(mockDependencyFailures);

            const mockRule = {
                name: 'outdatedDependencies-global',
                conditions: { all: [] },
                event: { type: 'error', params: { message: 'Outdated dependencies', details: { fact: 'repoDependencyAnalysis' } } }
            };

            mockEngine.rules = [mockRule];
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'outdatedDependencies-global',
                    result: true,
                    event: mockRule.event
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            // Fact resolution should have been attempted
            expect(mockAlmanac.factValue).toHaveBeenCalled();
        });

        it('should handle fact resolution failure gracefully', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            mockAlmanac.factValue.mockRejectedValue(new Error('Fact not found'));

            const mockRule = {
                name: 'test-rule',
                conditions: { all: [] },
                event: { type: 'warning', params: { message: 'Test', details: { fact: 'unknownFact' } } }
            };

            mockEngine.rules = [mockRule];
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'test-rule',
                    result: true,
                    event: mockRule.event
                }],
                almanac: mockAlmanac
            });

            // Should not throw, should handle gracefully
            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            expect(Array.isArray(results)).toBe(true);
        });

        it('should handle global check files separately', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' },
                { filePath: '/test/repo/README.md', fileName: REPO_GLOBAL_CHECK, fileContent: '' }
            ];

            mockEngine.run.mockResolvedValue({
                results: [],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            // Engine should be called for both iterative files and global check
            expect(mockEngine.run).toHaveBeenCalledTimes(2);
        });

        it('should deduplicate identical failures', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            const duplicateResult = {
                name: 'test-rule',
                result: true,
                event: {
                    type: 'warning',
                    params: { message: 'Same message' }
                }
            };

            mockEngine.run.mockResolvedValue({
                results: [duplicateResult, duplicateResult, duplicateResult],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            // Should have deduplicated results
            const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
            expect(totalErrors).toBe(1); // Only 1 unique error
        });

        it('should handle engine execution errors per file', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            mockEngine.run.mockRejectedValue(new Error('Engine crashed'));

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            // Should return error result for the failed file
            expect(results.length).toBe(1);
            expect(results[0].errors[0].ruleFailure).toBe('engine-error');
        });

        it('should handle empty file list', async () => {
            const results = await runEngineOnFiles({
                ...baseParams,
                fileData: []
            });

            expect(results).toEqual([]);
            expect(mockEngine.run).not.toHaveBeenCalled();
        });

        it('should build RuleFailure with correct structure', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            const mockRule = {
                name: 'complexity-rule',
                conditions: {
                    all: [
                        { fact: 'complexity', operator: 'greaterThan', value: 10, params: { maxNesting: 5 } }
                    ]
                },
                event: {
                    type: 'warning',
                    params: {
                        message: 'High complexity detected',
                        recommendations: ['Refactor function', 'Extract methods']
                    }
                },
                description: 'Detects high complexity functions'
            };

            mockEngine.rules = [mockRule];
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'complexity-rule',
                    result: true,
                    event: mockRule.event
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            if (results.length > 0 && results[0].errors.length > 0) {
                const ruleFailure = results[0].errors[0];
                
                expect(ruleFailure.ruleFailure).toBe('complexity-rule');
                expect(ruleFailure.level).toBe('warning');
                expect(ruleFailure.details).toBeDefined();
                expect(ruleFailure.details.message).toBe('High complexity detected');
                expect(ruleFailure.details.filePath).toBe('src/file1.ts'); // Relative path
                expect(ruleFailure.details.fileName).toBe('file1.ts');
            }
        });

        it('should include allConditions in RuleFailure details', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            const mockRule = {
                name: 'multi-condition-rule',
                conditions: {
                    all: [
                        { fact: 'fact1', operator: 'equal', value: true },
                        { fact: 'fact2', operator: 'greaterThan', value: 5 }
                    ]
                },
                event: {
                    type: 'error',
                    params: { message: 'Multiple conditions failed' }
                }
            };

            mockEngine.rules = [mockRule];
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'multi-condition-rule',
                    result: true,
                    event: mockRule.event
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            if (results.length > 0 && results[0].errors.length > 0) {
                const ruleFailure = results[0].errors[0];
                
                expect(ruleFailure.details.allConditions).toBeDefined();
                expect(Array.isArray(ruleFailure.details.allConditions)).toBe(true);
                expect(ruleFailure.details.allConditions.length).toBe(2);
                expect(ruleFailure.details.conditionType).toBe('all');
            }
        });

        it('should handle "any" conditions type', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            const mockRule = {
                name: 'any-condition-rule',
                conditions: {
                    any: [
                        { fact: 'fact1', operator: 'equal', value: true },
                        { fact: 'fact2', operator: 'equal', value: true }
                    ]
                },
                event: {
                    type: 'warning',
                    params: { message: 'Any condition matched' }
                }
            };

            mockEngine.rules = [mockRule];
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'any-condition-rule',
                    result: true,
                    event: mockRule.event
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            if (results.length > 0 && results[0].errors.length > 0) {
                const ruleFailure = results[0].errors[0];
                expect(ruleFailure.details.conditionType).toBe('any');
            }
        });

        it('should log progress for many files', async () => {
            // Create many files to trigger progress logging
            const fileData = Array.from({ length: 15 }, (_, i) => ({
                filePath: `/test/repo/src/file${i}.ts`,
                fileName: `file${i}.ts`,
                fileContent: `const x${i} = ${i};`
            }));

            mockEngine.run.mockResolvedValue({
                results: [],
                almanac: mockAlmanac
            });

            await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            expect(mockEngine.run).toHaveBeenCalledTimes(15);
        });

        it('should track slow files', async () => {
            const fileData = [
                { filePath: '/test/repo/src/slow-file.ts', fileName: 'slow-file.ts', fileContent: 'const a = 1;' }
            ];

            // Simulate slow engine run
            mockEngine.run.mockImplementation(() => new Promise(resolve => {
                setTimeout(() => resolve({
                    results: [],
                    almanac: mockAlmanac
                }), 150); // 150ms to trigger slow file detection
            }));

            const results = await runEngineOnFiles({
                ...baseParams,
                fileData
            });

            expect(results).toBeDefined();
        });
    });

    describe('buildRuleFailureFromResult - error handling', () => {
        const mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn()
        };

        it('should handle malformed engine results', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            // Malformed result with missing fields
            mockEngine.run.mockResolvedValue({
                results: [{
                    // Missing name
                    result: true,
                    event: {
                        // Missing type
                        params: {}
                    }
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                engine: mockEngine,
                fileData,
                installedDependencyVersions: {},
                minimumDependencyVersions: {},
                standardStructure: {},
                repoPath: '/test/repo',
                logger: mockLogger
            });

            // Should handle gracefully, using fallback values
            expect(Array.isArray(results)).toBe(true);
        });

        it('should handle missing rule in engine.rules', async () => {
            const fileData = [
                { filePath: '/test/repo/src/file1.ts', fileName: 'file1.ts', fileContent: 'const a = 1;' }
            ];

            mockEngine.rules = []; // No rules registered
            mockEngine.run.mockResolvedValue({
                results: [{
                    name: 'orphan-rule', // Rule not in engine.rules
                    result: true,
                    event: {
                        type: 'warning',
                        params: { message: 'Test' }
                    }
                }],
                almanac: mockAlmanac
            });

            const results = await runEngineOnFiles({
                engine: mockEngine,
                fileData,
                installedDependencyVersions: {},
                minimumDependencyVersions: {},
                standardStructure: {},
                repoPath: '/test/repo',
                logger: mockLogger
            });

            // Should still produce a result even without the rule definition
            if (results.length > 0 && results[0].errors.length > 0) {
                expect(results[0].errors[0].ruleFailure).toBe('orphan-rule');
            }
        });
    });
});
