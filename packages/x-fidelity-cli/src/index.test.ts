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
        clearInjectedLogger: jest.fn(),
        getCurrentExecutionMode: jest.fn().mockReturnValue('cli'),
        getLoggerForMode: jest.fn().mockImplementation(() => ({
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
        setLoggerForMode: jest.fn(),
        propagateLogLevel: jest.fn(),
        updateLogLevel: jest.fn(),
        setAutoPrefixing: jest.fn(),
        registerLoggerFactory: jest.fn()
    },
    // Add the logger export mock
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn().mockReturnValue('info'),
        isLevelEnabled: jest.fn().mockReturnValue(true)
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
        mode: 'cli',
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
        (options as any).mode = 'cli';
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
        (options as any).mode = 'cli';

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
        (options as any).mode = 'cli';

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
        (options as any).mode = 'cli';

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
    });

    it('should handle fatalities in codebase analysis', async () => {
        (options as any).mode = 'cli';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                totalIssues: 2,
                warningCount: 1,
                fatalityCount: 1,
                errorCount: 0,
                exemptCount: 0,
                issueDetails: [
                    { filePath: 'test.js', errors: [
                        { level: 'warning', ruleFailure: 'Test warning' },
                        { level: 'fatality', ruleFailure: 'Test fatality' }
                    ]}
                ],
                durationSeconds: 1.5
            }
        } as any);

        await main();

        // Check that fatalities cause exit code 1
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle clean codebase with no issues', async () => {
        (options as any).mode = 'cli';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                totalIssues: 0,
                warningCount: 0,
                fatalityCount: 0,
                errorCount: 0,
                exemptCount: 0,
                issueDetails: [],
                durationSeconds: 0.5
            }
        } as any);

        await main();

        // Check that clean codebase causes exit code 0
        expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should call analyzeCodebase with correct parameters', async () => {
        (options as any).mode = 'cli';
        (options as any).dir = '/custom/path';
        (options as any).archetype = 'java-microservice';
        (options as any).configServer = 'https://config.example.com';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                totalIssues: 0,
                warningCount: 0,
                fatalityCount: 0,
                errorCount: 0,
                exemptCount: 0,
                issueDetails: [],
                durationSeconds: 0.5
            }
        } as any);

        await main();

        expect(mockAnalyzeCodebase).toHaveBeenCalledWith(expect.objectContaining({
            archetype: 'java-microservice',
            configServer: 'https://config.example.com',
            logger: expect.any(Object),
            executionLogPrefix: expect.any(String)
        }));
    });

    describe('execution context', () => {
        it('should use correlation ID from environment when available', async () => {
            const originalCorrelationId = process.env.XFI_CORRELATION_ID;
            const originalVSCodeMode = process.env.XFI_VSCODE_MODE;
            
            process.env.XFI_CORRELATION_ID = 'test-correlation-123';
            process.env.XFI_VSCODE_MODE = 'true';
            
            (options as any).mode = 'cli';

            const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
            mockAnalyzeCodebase.mockResolvedValue({
                XFI_RESULT: {
                    totalIssues: 0,
                    warningCount: 0,
                    fatalityCount: 0,
                    errorCount: 0,
                    exemptCount: 0,
                    issueDetails: [],
                    durationSeconds: 0.5
                }
            } as any);

            await main();

            // Cleanup
            if (originalCorrelationId !== undefined) {
                process.env.XFI_CORRELATION_ID = originalCorrelationId;
            } else {
                delete process.env.XFI_CORRELATION_ID;
            }
            if (originalVSCodeMode !== undefined) {
                process.env.XFI_VSCODE_MODE = originalVSCodeMode;
            } else {
                delete process.env.XFI_VSCODE_MODE;
            }

            // Verify execution context was used
            const { ExecutionContext } = require('@x-fidelity/core');
            expect(ExecutionContext.getCurrentExecutionId).toHaveBeenCalled();
        });
    });

    describe('report generation', () => {
        it('should generate JSON output when outputFormat is json', async () => {
            (options as any).mode = 'cli';
            (options as any).outputFormat = 'json';

            const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
            mockAnalyzeCodebase.mockResolvedValue({
                XFI_RESULT: {
                    totalIssues: 0,
                    warningCount: 0,
                    fatalityCount: 0,
                    errorCount: 0,
                    exemptCount: 0,
                    issueDetails: [],
                    durationSeconds: 0.5
                }
            } as any);

            await main();

            // Should output structured JSON
            expect(mockConsoleLog).toHaveBeenCalledWith('STRUCTURED_OUTPUT_START');
            expect(mockConsoleLog).toHaveBeenCalledWith('STRUCTURED_OUTPUT_END');
            
            // Cleanup
            (options as any).outputFormat = undefined;
        });
    });

    describe('error handling edge cases', () => {
        it('should handle telemetry failure gracefully', async () => {
            (options as any).mode = 'cli';

            const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
            mockAnalyzeCodebase.mockRejectedValue(new Error('Analysis failed'));

            const mockSendTelemetry = sendTelemetry as jest.MockedFunction<typeof sendTelemetry>;
            mockSendTelemetry.mockRejectedValue(new Error('Telemetry failed'));

            await main();

            // Should still exit with error code even if telemetry fails
            expect(process.exit).toHaveBeenCalledWith(1);
        });
    });
});
