import { setupEngine } from './engineSetup';
import { Engine } from 'json-rules-engine';
import { loadOperators } from '../../operators';
import { loadFacts } from '../../facts';
import { loadRules } from '../../rules';
import { sendTelemetry } from '../../utils/telemetry';
import { isOpenAIEnabled } from '../../utils/openaiUtils';

jest.mock('json-rules-engine');
jest.mock('../../operators');
jest.mock('../../facts');
jest.mock('../../rules');
jest.mock('../../utils/telemetry');
jest.mock('../../utils/openaiUtils');
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('setupEngine', () => {
    const mockArchetypeConfig = {
        name: 'test-archetype',
        rules: ['rule1'],
        operators: ['operator1'],
        facts: ['fact1'],
        config: {
            minimumDependencyVersions: {},
            standardStructure: {},
            blacklistPatterns: [],
            whitelistPatterns: []
        },
    };

    const mockParams = {
        archetypeConfig: mockArchetypeConfig,
        archetype: 'test-archetype',
        configManager: {} as any,
        executionLogPrefix: 'test-prefix',
        localConfigPath: '/test/path',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.OPENAI_API_KEY = 'test-key';
    });

    it('should set up engine with correct configurations', async () => {
        const mockEngine = {
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
        };
        (Engine as jest.Mock).mockImplementation(() => mockEngine);

        (loadOperators as jest.Mock).mockResolvedValue([{ name: 'operator1', fn: jest.fn() }]);
        (loadFacts as jest.Mock).mockResolvedValue([{ name: 'fact1', fn: jest.fn() }]);
        (loadRules as jest.Mock).mockResolvedValue([{ name: 'rule1' }]);
        (isOpenAIEnabled as jest.Mock).mockReturnValue(true);

        await setupEngine(mockParams);

        expect(Engine).toHaveBeenCalled();
        expect(loadOperators).toHaveBeenCalledWith(['operator1']);
        expect(loadFacts).toHaveBeenCalledWith(['fact1']);
        expect(loadRules).toHaveBeenCalledWith(expect.objectContaining({
            archetype: 'test-archetype',
            ruleNames: ['rule1'],
        }));
        expect(mockEngine.addOperator).toHaveBeenCalled();
        expect(mockEngine.addRule).toHaveBeenCalled();
        expect(mockEngine.addFact).toHaveBeenCalled();
        expect(mockEngine.on).toHaveBeenCalledWith('success', expect.any(Function));
    });

    it('should not add OpenAI-related operators and facts when OpenAI is disabled', async () => {
        const mockEngine = {
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
        };
        (Engine as jest.Mock).mockImplementation(() => mockEngine);

        (loadOperators as jest.Mock).mockResolvedValue([
            { name: 'operator1', fn: jest.fn() },
            { name: 'openaiOperator', fn: jest.fn() },
        ]);
        (loadFacts as jest.Mock).mockResolvedValue([
            { name: 'fact1', fn: jest.fn() },
            { name: 'openaiAnalysis', fn: jest.fn() },
        ]);
        (loadRules as jest.Mock).mockResolvedValue([{ name: 'rule1' }]);
        (isOpenAIEnabled as jest.Mock).mockReturnValue(false);

        await setupEngine(mockParams);

        expect(mockEngine.addOperator).toHaveBeenCalledTimes(1);
        expect(mockEngine.addFact).toHaveBeenCalledTimes(1);
        expect(mockEngine.addOperator).not.toHaveBeenCalledWith('openaiOperator', expect.any(Function));
        expect(mockEngine.addFact).not.toHaveBeenCalledWith('openaiAnalysis', expect.any(Function));
    });

    it('should send telemetry on warning and fatality events', async () => {
        const mockEngine = {
            addOperator: jest.fn(),
            addRule: jest.fn(),
            addFact: jest.fn(),
            on: jest.fn(),
        };
        (Engine as jest.Mock).mockImplementation(() => mockEngine);

        (loadOperators as jest.Mock).mockResolvedValue([{ name: 'operator1', fn: jest.fn() }]);
        (loadFacts as jest.Mock).mockResolvedValue([{ name: 'fact1', fn: jest.fn() }]);
        (loadRules as jest.Mock).mockResolvedValue([{ name: 'rule1' }]);

        await setupEngine(mockParams);

        const successCallback = mockEngine.on.mock.calls[0][1];

        // Test warning event
        await successCallback({ type: 'warning', params: { message: 'Test warning' } });
        expect(sendTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'warning',
                metadata: expect.objectContaining({
                    archetype: 'test-archetype',
                }),
            }),
            'test-prefix'
        );

        // Test fatality event
        await successCallback({ type: 'fatality', params: { message: 'Test fatality' } });
        expect(sendTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'fatality',
                metadata: expect.objectContaining({
                    archetype: 'test-archetype',
                }),
            }),
            'test-prefix'
        );
    });
});
