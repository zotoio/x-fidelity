import { analyzeCodebase } from './core/engine/analyzer';
import { startServer } from './server/configServer';
import { sendTelemetry } from './utils/telemetry';
import { logger } from './utils/logger';
import { options } from './core/cli';

jest.mock('./core/engine/analyzer');
jest.mock('./server/configServer');
jest.mock('./utils/telemetry');
jest.mock('./utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  setLogPrefix: jest.fn(),
  setLogLevel: jest.fn(),
  getLogPrefix: jest.fn().mockReturnValue('mockLogPrefix'),
  initializeLogger: jest.fn(),
  generateLogPrefix: jest.fn().mockReturnValue('mockLogPrefix'),
}));
jest.mock('./core/cli', () => ({
  options: {
    mode: 'client',
    dir: '/test/dir',
    archetype: 'test-archetype',
    configServer: 'http://test-server',
    localConfigPath: '/test/local/config',
  }
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
    originalProcessExit = process.exit;
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    process.exit = originalProcessExit;
  });

  it('should start server when mode is server', async () => {
    options.mode = 'server';
    options.port = '8888';

    const { main } = await import('./index');
    await main();

    expect(startServer).toHaveBeenCalledWith(
      expect.objectContaining({
        customPort: '8888',
        executionLogPrefix: expect.any(String)
      })
    );
  });

  it('should analyze codebase when mode is client', async () => {
    options.mode = 'client';

    const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
    mockAnalyzeCodebase.mockResolvedValue({
      XFI_RESULT: {
        totalIssues: 0,
        warningCount: 0,
        fatalityCount: 0,
        issueDetails: []
      }
    } as any);

    const { main } = await import('./index');
    await main();

    expect(analyzeCodebase).toHaveBeenCalledWith(expect.objectContaining({
      repoPath: '/test/dir',
      archetype: 'test-archetype',
      configServer: 'http://test-server',
      localConfigPath: '/test/local/config',
      executionLogPrefix: expect.any(String)
    }));
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SUCCESS! hi-fi codebase detected.'));
  });

  it('should handle fatal errors in codebase analysis', async () => {
    options.mode = 'client';

    const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
    mockAnalyzeCodebase.mockResolvedValue({
      XFI_RESULT: {
        totalIssues: 2,
        warningCount: 1,
        fatalityCount: 1,
        issueDetails: [
          { filePath: 'test.js', errors: [{ level: 'warning', ruleFailure: 'Test warning' }] },
          { filePath: 'test2.js', errors: [{ level: 'fatality', ruleFailure: 'Test fatality' }] }
        ]
      }
    } as any);

    const { main } = await import('./index');
    await main();

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('THERE WERE 1 FATAL ERRORS DETECTED TO BE IMMEDIATELY ADDRESSED!'));
  }, 10000); // Increase timeout to 10 seconds

  it('should handle non-fatal warnings in codebase analysis', async () => {
    options.mode = 'client';

    const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
    mockAnalyzeCodebase.mockResolvedValue({
      XFI_RESULT: {
        totalIssues: 1,
        warningCount: 1,
        fatalityCount: 0,
        issueDetails: [
          { filePath: 'test.js', errors: [{ level: 'warning', ruleFailure: 'Test warning' }] }
        ]
      }
    } as any);

    const { main } = await import('./index');
    await main();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No fatal errors were found, however please review the above warnings.'));
  });

  it('should handle errors during execution', async () => {
    options.mode = 'client';

    const mockAnalyzeCodebase = analyzeCodebase as jest.MockedFunction<typeof analyzeCodebase>;
    mockAnalyzeCodebase.mockRejectedValue(new Error('Test error'));

    const { main } = await import('./index');
    await main();

    expect(sendTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'execution failure',
        metadata: expect.objectContaining({
          errorMessage: 'Test error'
        })
      }),
      expect.any(String)
    );
    //expect(process.exit).toHaveBeenCalledWith(1);
  }, 10000); // Increase timeout to 10 seconds

});
