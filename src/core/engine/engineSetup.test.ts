import { setupEngine } from './engineSetup';
import { Engine } from 'json-rules-engine';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { sendTelemetry } from '../../utils/telemetry';
import { ConfigManager } from '../configManager';
import { logger } from '../../utils/logger';
import { loadRepoXFIConfig } from '../../utils/repoXFIConfigLoader';

jest.mock('json-rules-engine');
jest.mock('../../operators');
jest.mock('../../facts');
jest.mock('../../utils/telemetry');
jest.mock('../configManager');
jest.mock('../../utils/logger');
jest.mock('../../utils/repoXFIConfigLoader');

describe('setupEngine', () => {
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
        config: {
            minimumDependencyVersions: {},
            standardStructure: {},
            blacklistPatterns: [],
            whitelistPatterns: []
        }
    };

    const mockParams = {
        archetypeConfig: mockArchetypeConfig,
        archetype: 'test-archetype',
        configManager: ConfigManager,
        executionLogPrefix: 'test-prefix',
        localConfigPath: '/test/path',
        repoUrl: 'test-url'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
            archetype: mockArchetypeConfig,
            rules: [
                { name: 'rule1', conditions: { all: [] }, event: { type: 'test', params: {} } },
                { name: 'rule2', conditions: { all: [] }, event: { type: 'test', params: {} } }
            ],
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
    });

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

        const engine = await setupEngine(mockParams);

        expect(Engine).toHaveBeenCalledWith([], { replaceFactsInEventParams: true, allowUndefinedFacts: true });
        expect(loadOperators).toHaveBeenCalledWith(['operator1', 'operator2']);
        expect(loadFacts).toHaveBeenCalledWith(['fact1', 'fact2']);
        expect(ConfigManager.getConfig).toHaveBeenCalledWith({ archetype: 'test-archetype', logPrefix: 'test-prefix' });

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

        await setupEngine(mockParams);

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

    it('should not add OpenAI-related facts when OpenAI is not enabled', async () => {
        process.env.OPENAI_API_KEY = '';
        const mockAddFact = jest.fn();
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: mockAddFact,
            on: jest.fn()
        }));

        (loadFacts as jest.Mock).mockResolvedValue([
            { name: 'fact1', fn: jest.fn() },
            { name: 'openaiAnalysis', fn: jest.fn() }
        ]);

        await setupEngine(mockParams);

        expect(mockAddFact).toHaveBeenCalledTimes(1);
        expect(mockAddFact).toHaveBeenCalledWith('fact1', expect.any(Function), { priority: 1 });
        expect(mockAddFact).not.toHaveBeenCalledWith('openaiAnalysis', expect.any(Function));
    });

    it('should add OpenAI-related facts when OpenAI is enabled', async () => {
        process.env.OPENAI_API_KEY = 'test-key';
        const mockAddFact = jest.fn();
        (Engine as jest.Mock).mockImplementation(() => ({
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: mockAddFact,
            on: jest.fn()
        }));

        (loadFacts as jest.Mock).mockResolvedValue([
            { name: 'fact1', fn: jest.fn() },
            { name: 'openaiAnalysis', fn: jest.fn() }
        ]);

        await setupEngine(mockParams);

        expect(mockAddFact).toHaveBeenCalledTimes(2);
        expect(mockAddFact).toHaveBeenCalledWith('fact1', expect.any(Function), { priority: 1 });
        expect(mockAddFact).toHaveBeenCalledWith('openaiAnalysis', expect.any(Function), { priority: 1 });
    });

    describe('rule loading order', () => {
        it('should load archetype rules before additional rules', async () => {
            const mockArchetypeRule = { name: 'rule1', conditions: {}, event: {} };
            const mockAdditionalRule = { name: 'rule2', conditions: {}, event: {} };
            
            (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
                rules: [mockArchetypeRule],
                exemptions: []
            });
            
            (loadRepoXFIConfig as jest.Mock).mockResolvedValue({
                additionalRules: [mockAdditionalRule]
            });

            const mockAddRule = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: mockAddRule,
                addFact: jest.fn(),
                on: jest.fn()
            }));

            await setupEngine(mockParams);
            
            expect(mockAddRule).toHaveBeenNthCalledWith(1, mockArchetypeRule);
            expect(mockAddRule).toHaveBeenNthCalledWith(2, mockAdditionalRule);
        });

        it('should skip duplicate rules and keep first occurrence', async () => {
            const duplicateRule = { name: 'duplicate', conditions: {}, event: {} };
            const uniqueRule = { name: 'unique', conditions: {}, event: {} };
            
            (ConfigManager.getConfig as jest.Mock).mockResolvedValue({
                rules: [duplicateRule],
                exemptions: []
            });
            
            (loadRepoXFIConfig as jest.Mock).mockResolvedValue({
                additionalRules: [duplicateRule, uniqueRule]
            });

            const mockAddRule = jest.fn();
            (Engine as jest.Mock).mockImplementation(() => ({
                addOperator: jest.fn(),
                addRule: mockAddRule,
                addFact: jest.fn(),
                on: jest.fn()
            }));

            await setupEngine(mockParams);
            
            expect(mockAddRule).toHaveBeenCalledTimes(2);
            expect(mockAddRule).toHaveBeenNthCalledWith(1, duplicateRule);
            expect(mockAddRule).toHaveBeenNthCalledWith(2, uniqueRule);
        });
    });
});
