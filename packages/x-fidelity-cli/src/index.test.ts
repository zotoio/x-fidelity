import { 
    analyzeCodebase,
    sendTelemetry,
    logger,
    CLIOptions
} from '@x-fidelity/core';
import { startServer } from '@x-fidelity/server';
import { main } from './index';
import { options } from './cli';

jest.setTimeout(30000); // 30 seconds

jest.mock('@x-fidelity/core', () => ({
    analyzeCodebase: jest.fn(),
    sendTelemetry: jest.fn(),
    validateArchetypeConfig: jest.fn(),
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn()
    },
    setLogPrefix: jest.fn(),
    setLogLevel: jest.fn(),
    getLogPrefix: jest.fn().mockReturnValue('mockLogPrefix'),
    initializeLogger: jest.fn(),
    generateLogPrefix: jest.fn().mockReturnValue('mockLogPrefix')
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
    });

    beforeEach(() => {
        jest.clearAllMocks();
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

    it('should analyze codebase when mode is analyze', async () => {
        (options as any).mode = 'client';
        (options as any).dir = '.';
        (options as any).archetype = 'node-fullstack';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                archetype: 'node-fullstack',
                repoPath: '.',
                fileCount: 1,
                totalIssues: 0,
                warningCount: 0,
                fatalityCount: 0,
                errorCount: 0,
                exemptCount: 0,
                issueDetails: [],
                startTime: Date.now(),
                finishTime: Date.now(),
                durationSeconds: 0.1,
                telemetryData: {},
                options: {},
                repoXFIConfig: {},
                memoryUsage: {},
                repoUrl: '',
                xfiVersion: '1.0.0',
                factMetrics: {}
            }
        } as any);

        await main();

        expect(analyzeCodebase).toHaveBeenCalledWith(expect.objectContaining({
            repoPath: '.',
            archetype: 'node-fullstack',
            configServer: undefined,
            localConfigPath: undefined,
            executionLogPrefix: expect.any(String)
        }));
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('HIGH FIDELITY APPROVED!'));
    });

    it('should handle fatal errors in codebase analysis', async () => {
        (options as any).mode = 'client';

        const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
        mockAnalyzeCodebase.mockResolvedValue({
            XFI_RESULT: {
                totalIssues: 2,
                warningCount: 1,
                fatalityCount: 1,
                errorCount: 0,
                exemptCount: 0,
                issueDetails: [
                    { filePath: 'test.js', errors: [{ level: 'warning', ruleFailure: 'Test warning' }] },
                    { filePath: 'test2.js', errors: [{ level: 'fatality', ruleFailure: 'Test fatality' }] }
                ]
            }
        } as any);

        await main();

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('THERE WERE 1 FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!'));
        expect(process.exit).toHaveBeenCalledWith(1);
    }, 10000);

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

        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No fatal errors were found'));
        expect(process.exit).toHaveBeenCalledWith(0);
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
                    repoPath: '.',
                    options: expect.any(Object)
                }),
                timestamp: expect.any(String)
            })
        );
        expect(process.exit).toHaveBeenCalledWith(1);
    }, 10000);
});
