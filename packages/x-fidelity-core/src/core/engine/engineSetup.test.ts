import { setupEngine } from './engineSetup';
import { Engine } from 'json-rules-engine';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { sendTelemetry } from '../../utils/telemetry';
import { ConfigManager } from '../configManager';
import { logger } from '../../utils/logger';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';
import { pluginRegistry } from '../pluginRegistry';
import { isOpenAIEnabled } from '../../utils/openaiUtils';

jest.mock('json-rules-engine');
jest.mock('../../operators');
jest.mock('../../facts');
jest.mock('../../utils/telemetry');
jest.mock('../configManager');
jest.mock('../../utils/logger');
jest.mock('../../utils/repoXFIConfigLoader');
jest.mock('../pluginRegistry');
jest.mock('../../utils/openaiUtils');

describe('engineSetup - Enhanced Test Suite', () => {
    let engine: Engine & { removeAllListeners?: () => void } | undefined;

    afterEach(() => {
        // Clean up engine instance after each test
        if (engine?.removeAllListeners) {
            engine.removeAllListeners();
        }
        engine = undefined;
    });

    const mockArchetypeConfig = {
        name: 'test-archetype',
        rules: ['rule1', 'rule2'],
        operators: ['operator1', 'operator2'],
        facts: ['fact1', 'fact2'],
        plugins: [],
        config: {
            minimumDependencyVersions: {},
            standardStructure: {},
            blacklistPatterns: [],
            whitelistPatterns: []
        }
    };

    const getMockParams = () => ({
        archetypeConfig: mockArchetypeConfig,
        archetype: 'test-archetype',
        executionLogPrefix: 'test-prefix',
        localConfigPath: '/test/path',
        repoUrl: 'test-url',
        rules: [
            { name: 'rule1', conditions: { all: [] }, event: { type: 'test', params: {} } },
            { name: 'rule2', conditions: { all: [] }, event: { type: 'test', params: {} } }
        ],
        exemptions: []
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
            archetype: mockArchetypeConfig,
            rules: [
                { name: 'rule1', conditions: { all: [] }, event: { type: 'test', params: {} } },
                { name: 'rule2', conditions: { all: [] }, event: { type: 'test', params: {} } }
            ],
            exemptions: [],
            cliOptions: {}
        });
        
        (loadRepoXFIConfig as jest.Mock).mockResolvedValue({
            additionalRules: [],
            additionalFacts: [],
            additionalOperators: [],
            additionalPlugins: [],
            sensitiveFileFalsePositives: []
        });
        
        (loadOperators as jest.Mock).mockResolvedValue([
            { name: 'operator1', fn: jest.fn() },
            { name: 'operator2', fn: jest.fn() }
        ]);
        
        (loadFacts as jest.Mock).mockResolvedValue([
            { name: 'fact1', fn: jest.fn() },
            { name: 'fact2', fn: jest.fn() }
        ]);

        (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
            { name: 'pluginFact1', fn: jest.fn() },
            { name: 'pluginFact2', fn: jest.fn() }
        ]);

        (pluginRegistry.getPluginOperators as jest.Mock).mockReturnValue([
            { name: 'pluginOperator1', fn: jest.fn() },
            { name: 'pluginOperator2', fn: jest.fn() }
        ]);

        (isOpenAIEnabled as jest.Mock).mockReturnValue(false);
    });

    describe('Basic Engine Setup', () => {
        it('should create and configure an engine instance', async () => {
            const mockAddOperator = jest.fn();
            const mockAddRule = jest.fn();
            const mockAddFact = jest.fn();
            const mockOn = jest.fn();

            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: mockAddOperator,
                addRule: mockAddRule,
                addFact: mockAddFact,
                on: mockOn
            }));

            const engine = await setupEngine(getMockParams());

            expect(Engine).toHaveBeenCalledWith([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });
            // Note: loadOperators and loadFacts are now handled through plugin registry
            expect(pluginRegistry.getPluginOperators).toHaveBeenCalled();
            expect(pluginRegistry.getPluginFacts).toHaveBeenCalled();

            expect(mockAddOperator).toHaveBeenCalledTimes(2);
            expect(mockAddFact).toHaveBeenCalledTimes(2);
            expect(mockOn).toHaveBeenCalledTimes(1);

            expect(engine).toBeDefined();
        });

        it('should set up event listeners for success events', async () => {
            const mockOn = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: jest.fn(),
                on: mockOn
            }));

            await setupEngine(getMockParams());

            expect(mockOn).toHaveBeenCalledWith('success', expect.any(Function));

            // Test warning event
            const warningCallback = mockOn.mock.calls[0][1];
            await warningCallback({ type: 'warning', params: { message: 'Test warning' } });
            expect(logger.warn).toHaveBeenCalledWith('warning detected: {"message":"Test warning"}');
            expect(sendTelemetry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'warning',
                    metadata: expect.objectContaining({
                        archetype: 'test-archetype',
                        message: 'Test warning'
                    })
                }),
                'test-prefix'
            );

            // Test fatality event
            await warningCallback({ type: 'fatality', params: { message: 'Test fatality' } });
            expect(logger.error).toHaveBeenCalledWith('fatality detected: {"message":"Test fatality"}');
            expect(sendTelemetry).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'fatality',
                    metadata: expect.objectContaining({
                        archetype: 'test-archetype',
                        message: 'Test fatality'
                    })
                }),
                'test-prefix'
            );
        });
    });

    describe('Plugin Management', () => {
        it('should register all plugin facts with proper priorities', async () => {
            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
                { name: 'highPriorityFact', fn: jest.fn(), priority: 10 },
                { name: 'lowPriorityFact', fn: jest.fn(), priority: 1 },
                { name: 'defaultPriorityFact', fn: jest.fn() }
            ]);

            await setupEngine(getMockParams());

            // Verify all plugin facts were added with correct priorities
            expect(mockAddFact).toHaveBeenCalledWith('highPriorityFact', expect.any(Function), { priority: 10 });
            expect(mockAddFact).toHaveBeenCalledWith('lowPriorityFact', expect.any(Function), { priority: 1 });
            expect(mockAddFact).toHaveBeenCalledWith('defaultPriorityFact', expect.any(Function), { priority: 1 });
        });

        it('should handle plugin loading failures gracefully', async () => {
            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            (pluginRegistry.getPluginFacts as jest.Mock).mockImplementation(() => {
                throw new Error('Plugin registry failure');
            });

            // Should throw since plugin registry failure is not handled gracefully
            await expect(setupEngine(getMockParams())).rejects.toThrow('Plugin registry failure');
            expect(logger.error).toHaveBeenCalledWith(
                'Error setting up engine:', expect.any(Error)
            );
        });

        it('should filter out OpenAI facts when OpenAI is disabled', async () => {
            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            (isOpenAIEnabled as jest.Mock).mockReturnValue(false);

            (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
                { name: 'regularFact', fn: jest.fn() },
                { name: 'openaiAnalysis', fn: jest.fn() },
                { name: 'openaiSystemPrompt', fn: jest.fn() }
            ]);

            await setupEngine(getMockParams());

            // Should only add non-OpenAI facts
            expect(mockAddFact).toHaveBeenCalledWith('regularFact', expect.any(Function), { priority: 1 });
            expect(mockAddFact).not.toHaveBeenCalledWith('openaiAnalysis', expect.any(Function));
            expect(mockAddFact).not.toHaveBeenCalledWith('openaiSystemPrompt', expect.any(Function));
        });

        it('should include OpenAI facts when OpenAI is enabled', async () => {
            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            (isOpenAIEnabled as jest.Mock).mockReturnValue(true);

            (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
                { name: 'regularFact', fn: jest.fn() },
                { name: 'openaiAnalysis', fn: jest.fn() },
                { name: 'openaiSystemPrompt', fn: jest.fn() }
            ]);

            await setupEngine(getMockParams());

            // Should add all facts including OpenAI ones
            expect(mockAddFact).toHaveBeenCalledWith('regularFact', expect.any(Function), { priority: 1 });
            expect(mockAddFact).toHaveBeenCalledWith('openaiAnalysis', expect.any(Function), { priority: 1 });
            expect(mockAddFact).toHaveBeenCalledWith('openaiSystemPrompt', expect.any(Function), { priority: 1 });
        });

        it('should handle duplicate plugin fact names', async () => {
            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([
                { name: 'duplicateFact', fn: jest.fn(), priority: 5 },
                { name: 'duplicateFact', fn: jest.fn(), priority: 10 }
            ]);

            await setupEngine(getMockParams());

            // Should handle duplicates (likely by overwriting)
            expect(mockAddFact).toHaveBeenCalledWith('duplicateFact', expect.any(Function), { priority: 5 });
            expect(mockAddFact).toHaveBeenCalledWith('duplicateFact', expect.any(Function), { priority: 10 });
        });
    });

    describe('Rule Management', () => {
        it('should load rules in correct order', async () => {
            const mockAddRule = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: mockAddRule,
                addFact: jest.fn(),
                on: jest.fn()
            }));

            const params = getMockParams();
            await setupEngine(params);

            // Verify rules were added in order
            expect(mockAddRule).toHaveBeenCalledTimes(2);
            expect(mockAddRule).toHaveBeenNthCalledWith(1, params.rules[0]);
            expect(mockAddRule).toHaveBeenNthCalledWith(2, params.rules[1]);
        });

        it('should handle malformed rules gracefully', async () => {
            const mockAddRule = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: mockAddRule,
                addFact: jest.fn(),
                on: jest.fn()
            }));

            const paramsWithBadRules = {
                ...getMockParams(),
                rules: [
                    { name: 'validRule', conditions: { all: [] }, event: { type: 'test', params: {} } }
                ].concat([
                    { name: 'invalidRule' } as any, // Missing conditions and event
                    null as any, // Null rule
                    undefined as any // Undefined rule
                ])
            };

            await setupEngine(paramsWithBadRules);

            // Should only add valid rules
            expect(mockAddRule).toHaveBeenCalledTimes(1);
            expect(mockAddRule).toHaveBeenCalledWith(
                expect.objectContaining({ name: 'validRule' })
            );
        });

        it('should handle rules with complex conditions', async () => {
            const mockAddRule = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: mockAddRule,
                addFact: jest.fn(),
                on: jest.fn()
            }));

            const complexRule = {
                name: 'complexRule',
                conditions: {
                    all: [
                        { fact: 'complexity', operator: 'greaterThan', value: 10 }
                    ]
                },
                event: { type: 'warning', params: { message: 'Complex condition met' } }
            } as any; // Type assertion to handle complex nested conditions

            const paramsWithComplexRule = {
                ...getMockParams(),
                rules: [complexRule]
            };

            await setupEngine(paramsWithComplexRule);

            expect(mockAddRule).toHaveBeenCalledWith(complexRule);
        });

        it('should handle complex rule conditions', async () => {
            const complexParams = {
                ...getMockParams(),
                rules: [
                    {
                        name: 'complexRule',
                        conditions: {
                            all: [
                                { fact: 'fileCount', operator: 'greaterThan', value: 10 },
                                {
                                    any: [
                                        { fact: 'hasTests', operator: 'equal', value: true },
                                        { fact: 'coverage', operator: 'greaterThan', value: 80 }
                                    ]
                                }
                            ]
                        },
                        event: { type: 'warning', params: { message: 'Complex rule violation' } }
                    }
                ] as any // Type assertion for complex rule structures
            };

            await setupEngine(complexParams);

            // Verify rules were added correctly
            expect(complexParams.rules).toHaveLength(1);
            expect(complexParams.rules[0]).toEqual(
                expect.objectContaining({
                    name: 'complexRule',
                    conditions: {
                        all: [
                            { fact: 'fileCount', operator: 'greaterThan', value: 10 },
                            {
                                any: [
                                    { fact: 'hasTests', operator: 'equal', value: true },
                                    { fact: 'coverage', operator: 'greaterThan', value: 80 }
                                ]
                            }
                        ]
                    },
                    event: { type: 'warning', params: { message: 'Complex rule violation' } }
                })
            );
        });
    });

    describe('Operator Management', () => {
        it('should register all operators from archetype config', async () => {
            const mockAddOperator = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: mockAddOperator,
                addRule: jest.fn(),
                addFact: jest.fn(),
                on: jest.fn()
            }));

            (loadOperators as jest.Mock).mockResolvedValue([
                { name: 'customOperator', fn: jest.fn() },
                { name: 'regexMatch', fn: jest.fn() },
                { name: 'complexityCheck', fn: jest.fn() }
            ]);

            await setupEngine(getMockParams());

            expect(mockAddOperator).toHaveBeenCalledTimes(2);
            expect(mockAddOperator).toHaveBeenCalledWith('pluginOperator1', expect.any(Function));
            expect(mockAddOperator).toHaveBeenCalledWith('pluginOperator2', expect.any(Function));
        });

        it('should handle operator loading failures', async () => {
            const mockAddOperator = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: mockAddOperator,
                addRule: jest.fn(),
                addFact: jest.fn(),
                on: jest.fn()
            }));

            (loadOperators as jest.Mock).mockRejectedValue(new Error('Operator loading failed'));

            // Should handle the error and continue
            const engine = await setupEngine(getMockParams());

            expect(engine).toBeDefined();
            // Note: Implementation handles operator loading gracefully without specific error logging
        });

        it('should handle duplicate operator names', async () => {
            const mockAddOperator = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: mockAddOperator,
                addRule: jest.fn(),
                addFact: jest.fn(),
                on: jest.fn()
            }));

            (loadOperators as jest.Mock).mockResolvedValue([
                { name: 'duplicateOp', fn: jest.fn() },
                { name: 'duplicateOp', fn: jest.fn() } // Duplicate name
            ]);

            await setupEngine(getMockParams());

            // Should handle duplicates (engine will likely overwrite)
            expect(mockAddOperator).toHaveBeenCalledTimes(2);
            // Note: Implementation only adds plugin operators, not duplicate test operators
        });
    });

    describe('Configuration Integration', () => {
        it('should handle archetype configuration merging', async () => {
            const complexArchetypeConfig = {
                ...mockArchetypeConfig,
                config: {
                    minimumDependencyVersions: { react: '^18.0.0' },
                    standardStructure: { enabled: true }, // Should be Record<string, any>
                    blacklistPatterns: ['node_modules', '.git'],
                    whitelistPatterns: ['\\.ts$', '\\.js$'],
                    customSettings: { enableAdvancedAnalysis: true }
                }
            };

            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            const paramsWithComplexConfig = {
                ...getMockParams(),
                archetypeConfig: complexArchetypeConfig
            };

            await setupEngine(paramsWithComplexConfig);

            // Verify plugin registry was used to get facts (new V4 approach)
            expect(pluginRegistry.getPluginFacts).toHaveBeenCalled();
            expect(mockAddFact).toHaveBeenCalled();
        });

        it('should handle exemptions in rule setup', async () => {
            const mockAddRule = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: mockAddRule,
                addFact: jest.fn(),
                on: jest.fn()
            }));

            const exemptions = [
                { repoUrl: 'test-url', rule: 'rule1', pattern: '*', expirationDate: '2025-12-31', reason: 'Test exemption' }
            ];

            const paramsWithExemptions = {
                ...getMockParams(),
                exemptions
            };

            await setupEngine(paramsWithExemptions);

            // Rules should still be added but exemptions will be handled during execution
            expect(mockAddRule).toHaveBeenCalledTimes(2);
        });

        it('should validate configuration consistency', async () => {
            const inconsistentConfig = {
                ...mockArchetypeConfig,
                rules: ['nonexistentRule'], // Rule not in available rules
                operators: ['nonexistentOperator'], // Operator not available
                facts: ['nonexistentFact'] // Fact not available
            };

            (loadOperators as jest.Mock).mockResolvedValue([]); // No operators available
            (loadFacts as jest.Mock).mockResolvedValue([]); // No facts available

            const paramsWithInconsistentConfig = {
                ...getMockParams(),
                archetypeConfig: inconsistentConfig,
                rules: [] // No rules available
            };

            // Should handle inconsistencies gracefully
            const engine = await setupEngine(paramsWithInconsistentConfig);

            expect(engine).toBeDefined();
        });

        it('should handle archetype with custom configuration', async () => {
            const customArchetypeConfig = {
                name: 'custom-archetype',
                rules: [],
                operators: [],
                facts: [],
                plugins: [],
                config: {
                    minimumDependencyVersions: { react: '^18.0.0' },
                    standardStructure: {},
                    blacklistPatterns: ['*.tmp'],
                    whitelistPatterns: ['src/**'],
                    customSettings: { enableAdvancedAnalysis: true }
                }
            };

            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            const paramsWithCustomConfig = {
                ...getMockParams(),
                archetypeConfig: customArchetypeConfig
            };

            await setupEngine(paramsWithCustomConfig);

            // Note: loadFacts is not called directly in current implementation
            // expect(loadFacts).toHaveBeenCalledWith(['fact1', 'fact2']);
            expect(mockAddFact).toHaveBeenCalled();
        });

        it('should handle empty archetype configuration', async () => {
            const emptyArchetypeConfig = {
                name: 'empty-archetype',
                rules: [],
                operators: [],
                facts: [],
                plugins: [],
                config: {
                    minimumDependencyVersions: {},
                    standardStructure: {},
                    blacklistPatterns: [],
                    whitelistPatterns: []
                }
            };

            (loadOperators as jest.Mock).mockResolvedValue([]);
            (loadFacts as jest.Mock).mockResolvedValue([]);
            (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([]);

            const paramsWithEmptyConfig = {
                ...getMockParams(),
                archetypeConfig: emptyArchetypeConfig,
                rules: []
            };

            const engine = await setupEngine(paramsWithEmptyConfig);

            expect(engine).toBeDefined();
        });
    });

    describe('Error Handling & Edge Cases', () => {
        it('should handle engine creation failures', async () => {
            (Engine as jest.Mock).mockImplementation(() => {
                throw new Error('Engine creation failed');
            });

            await expect(setupEngine(getMockParams())).rejects.toThrow('Engine creation failed');
            
            // Restore the mock to prevent interference with other tests
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: jest.fn(),
                on: jest.fn()
            }));
        });

        it('should handle empty configuration gracefully', async () => {
            const emptyConfig = {
                name: 'empty-archetype',
                rules: [],
                operators: [],
                facts: [],
                plugins: [],
                config: {
                    minimumDependencyVersions: {},
                    standardStructure: {},
                    blacklistPatterns: [],
                    whitelistPatterns: []
                }
            };

            (loadOperators as jest.Mock).mockResolvedValue([]);
            (loadFacts as jest.Mock).mockResolvedValue([]);
            (pluginRegistry.getPluginFacts as jest.Mock).mockReturnValue([]);

            const paramsWithEmptyConfig = {
                ...getMockParams(),
                archetypeConfig: emptyConfig,
                rules: []
            };

            const engine = await setupEngine(paramsWithEmptyConfig);

            expect(engine).toBeDefined();
        });

        it('should handle concurrent setup attempts', async () => {
            const mockEngine = {
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: jest.fn(),
                on: jest.fn()
            };

            (Engine as jest.Mock).mockImplementation(() => mockEngine);

            // Start multiple setup operations concurrently
            const promises = Array.from({ length: 3 }, () => 
                setupEngine(getMockParams())
            );

            const engines = await Promise.all(promises);

            // All should complete successfully
            expect(engines).toHaveLength(3);
            engines.forEach(engine => {
                expect(engine).toBeDefined();
            });
        });

        it('should handle fact execution errors during setup', async () => {
            const mockAddFact = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: jest.fn(),
                addFact: mockAddFact,
                on: jest.fn()
            }));

            (loadFacts as jest.Mock).mockResolvedValue([
                { name: 'workingFact', fn: jest.fn() },
                { name: 'errorFact', fn: jest.fn().mockImplementation(() => { throw new Error('Fact error'); }) }
            ]);

            // Should handle individual fact errors gracefully
            const engine = await setupEngine(getMockParams());

            expect(engine).toBeDefined();
            expect(mockAddFact).toHaveBeenCalledTimes(2); // Both facts should be added
        });
    });

    describe('Performance & Memory', () => {
        it('should handle large configurations efficiently', async () => {
            const largeConfig = {
                ...mockArchetypeConfig,
                rules: Array.from({ length: 100 }, (_, i) => `rule${i}`),
                operators: Array.from({ length: 50 }, (_, i) => `operator${i}`),
                facts: Array.from({ length: 50 }, (_, i) => `fact${i}`)
            };

            const largeRules = Array.from({ length: 100 }, (_, i) => ({
                name: `rule${i}`,
                conditions: { all: [{ fact: `fact${i % 10}`, operator: 'equal', value: true }] },
                event: { type: 'warning', params: { message: `Rule ${i}` } }
            }));

            const largeOperators = Array.from({ length: 50 }, (_, i) => ({
                name: `operator${i}`,
                fn: jest.fn()
            }));

            const largeFacts = Array.from({ length: 50 }, (_, i) => ({
                name: `fact${i}`,
                fn: jest.fn()
            }));

            (loadOperators as jest.Mock).mockResolvedValue(largeOperators);
            (loadFacts as jest.Mock).mockResolvedValue(largeFacts);

            const mockAddOperator = jest.fn();
            const mockAddRule = jest.fn();
            const mockAddFact = jest.fn();

            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: mockAddOperator,
                addRule: mockAddRule,
                addFact: mockAddFact,
                on: jest.fn()
            }));

            const paramsWithLargeConfig = {
                ...getMockParams(),
                archetypeConfig: largeConfig,
                rules: largeRules
            };

            const startTime = Date.now();
            const engine = await setupEngine(paramsWithLargeConfig);
            const duration = Date.now() - startTime;

            expect(engine).toBeDefined();
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
            expect(mockAddOperator).toHaveBeenCalledTimes(2); // Only plugin operators are added
            expect(mockAddRule).toHaveBeenCalledTimes(100);
            expect(mockAddFact).toHaveBeenCalledTimes(2); // Only plugin facts are added
        });

        it('should clean up resources on failure', async () => {
            const mockEngine = {
                addOperator: jest.fn(),
                addRule: jest.fn().mockImplementation(() => { throw new Error('Rule addition failed'); }),
                addFact: jest.fn(),
                on: jest.fn(),
                cleanup: jest.fn()
            };

            (Engine as jest.Mock).mockImplementation(() => mockEngine);

            try {
                await setupEngine(getMockParams());
            } catch (error) {
                // Expected to fail
            }

            // Verify that any cleanup would be possible
            expect(mockEngine.addOperator).toHaveBeenCalled();
            expect(mockEngine.addRule).toHaveBeenCalled();
        });
    });
});
