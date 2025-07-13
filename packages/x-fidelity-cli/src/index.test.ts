import { 
    analyzeCodebase,
    sendTelemetry,
    CLIOptions
} from '@x-fidelity/core';
import { startServer } from '@x-fidelity/server';
import { options } from './cli';
import { main } from './index';

jest.setTimeout(30000); // 30 seconds

// Mock console methods to capture output
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

jest.mock('@x-fidelity/core', () => ({
    analyzeCodebase: jest.fn(),
    sendTelemetry: jest.fn(),
    validateArchetypeConfig: jest.fn(),
    ExecutionContext: {
        startExecution: jest.fn().mockReturnValue('test-exec-id'),
        getCurrentExecutionId: jest.fn().mockReturnValue('test-exec-id'),
        getCurrentContext: jest.fn().mockReturnValue(null),
        updateContext: jest.fn(),
        endExecution: jest.fn(),
        createLoggerBindings: jest.fn().mockReturnValue({}),
        getExecutionPrefix: jest.fn().mockReturnValue('[test-exec-id]'),
        isExecutionActive: jest.fn().mockReturnValue(true),
        prefixMessage: jest.fn((msg) => `[test-exec-id] ${msg}`)
    },
    LoggerProvider: {
        initializeForPlugins: jest.fn(),
        setLogger: jest.fn(),
        getLogger: jest.fn().mockImplementation(() => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            trace: jest.fn(),
            fatal: jest.fn(),
            setLevel: jest.fn(),
            getLevel: jest.fn().mockReturnValue('info'),
            isLevelEnabled: jest.fn().mockReturnValue(true)
        })),
        hasInjectedLogger: jest.fn().mockReturnValue(false),
        clearInjectedLogger: jest.fn()
    }
}));

// Mock the PinoLogger
jest.mock('./utils/pinoLogger', () => ({
    PinoLogger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
        isLevelEnabled: jest.fn().mockReturnValue(true),
        child: jest.fn().mockReturnThis()
    }))
}));

jest.mock('@x-fidelity/server', () => ({
    startServer: jest.fn()
}));

jest.mock('./cli', () => ({
    initCLI: jest.fn(),
    options: {
        mode: 'client',
        dir: '.',
        archetype: 'node-fullstack',
        configServer: undefined,
        localConfigPath: undefined,
        port: undefined,
        examine: false,
        extensions: [],
        openaiEnabled: false
    },
    DEMO_CONFIG_PATH: '/mock/demo/config/path'
}));

describe('index', () => {
    let originalProcessExit: (code?: number | undefined) => never;

    beforeAll(() => {
        originalProcessExit = process.exit;
        process.exit = jest.fn() as any;
    });

    afterAll(() => {
        process.exit = originalProcessExit;
        mockConsoleLog.mockRestore();
        mockConsoleWarn.mockRestore();
        mockConsoleError.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockConsoleLog.mockClear();
        mockConsoleWarn.mockClear();
        mockConsoleError.mockClear();
        // Reset options to default values for each test
        (options as any).mode = 'client';
        (options as any).dir = '.';
        (options as any).archetype = 'node-fullstack';
        (options as any).configServer = undefined;
        (options as any).localConfigPath = undefined;
        (options as any).port = undefined;
        (options as any).examine = false;
        (options as any).extensions = [];
        (options as any).openaiEnabled = false;
    });

    it('should start server when mode is server', async () => {
        (options as any).mode = 'server';
        (options as any).port = 8888;

        await main();

        expect(startServer).toHaveBeenCalledWith({
            customPort: '8888',
            executionLogPrefix: expect.any(String)
        });
    });

    it('should handle non-fatal warnings in codebase analysis', async () => {
        (options as any).mode = 'client';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                totalIssues: 1,
                warningCount: 1,
                fatalityCount: 0,
                errorCount: 0,
                exemptCount: 0,
                issueDetails: [
                    { filePath: 'test.js', errors: [{ level: 'warning', ruleFailure: 'Test warning' }] }
                ]
            }
        } as any);

        await main();

        // Check that warnings without fatal errors cause exit code 0
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should fail when errorCount > 0', async () => {
        (options as any).mode = 'client';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                totalIssues: 2,
                warningCount: 1,
                fatalityCount: 0,
                errorCount: 1,
                exemptCount: 0,
                issueDetails: [
                    { filePath: 'test.js', errors: [
                        { level: 'warning', ruleFailure: 'Test warning' },
                        { level: 'error', ruleFailure: 'Test error' }
                    ]}
                ]
            }
        } as any);

        await main();

        // Check that errors cause exit code 1
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle errors during execution', async () => {
        (options as any).mode = 'client';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockRejectedValue(new Error('Test error'));

        await main();

        expect(sendTelemetry).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'execution failure',
                metadata: expect.objectContaining({
                    errorMessage: 'Test error',
                    archetype: 'node-fullstack',
                    repoPath: expect.any(String), // Now expects absolute path instead of '.'
                    options: expect.any(Object)
                }),
                timestamp: expect.any(String)
            })
        );
        expect(process.exit).toHaveBeenCalledWith(1);
    }, 10000);
});
