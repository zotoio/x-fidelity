import { LoggerProvider, ExecutionContext, PrefixingLogger } from '@x-fidelity/core';
import { ILogger } from '@x-fidelity/types';

// Mock all external dependencies to avoid import issues
jest.mock('@x-fidelity/server', () => ({
    startServer: jest.fn()
}));

jest.mock('fs/promises', () => ({
    writeFile: jest.fn().mockResolvedValue(undefined),
    mkdir: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    dirname: jest.fn((path) => path.split('/').slice(0, -1).join('/'))
}));

jest.mock('prettyjson', () => ({
    render: jest.fn().mockReturnValue('Pretty printed result')
}));

describe('CLI Log Prefix Integration', () => {
    let mockLogger: jest.Mocked<ILogger>;
    let logCalls: Array<{ level: string; message: string; meta?: any }>;

    beforeEach(() => {
        logCalls = [];
        
        // Create a mock logger that captures all log calls
        mockLogger = {
            trace: jest.fn((msgOrMeta, metaOrMsg) => {
                logCalls.push({ level: 'trace', message: typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta), meta: metaOrMsg });
            }),
            debug: jest.fn((msgOrMeta, metaOrMsg) => {
                logCalls.push({ level: 'debug', message: typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta), meta: metaOrMsg });
            }),
            info: jest.fn((msgOrMeta, metaOrMsg) => {
                logCalls.push({ level: 'info', message: typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta), meta: metaOrMsg });
            }),
            warn: jest.fn((msgOrMeta, metaOrMsg) => {
                logCalls.push({ level: 'warn', message: typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta), meta: metaOrMsg });
            }),
            error: jest.fn((msgOrMeta, metaOrMsg) => {
                logCalls.push({ level: 'error', message: typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta), meta: metaOrMsg });
            }),
            fatal: jest.fn((msgOrMeta, metaOrMsg) => {
                logCalls.push({ level: 'fatal', message: typeof msgOrMeta === 'string' ? msgOrMeta : JSON.stringify(msgOrMeta), meta: metaOrMsg });
            }),
            setLevel: jest.fn(),
            getLevel: jest.fn().mockReturnValue('info'),
            isLevelEnabled: jest.fn().mockReturnValue(true),
            child: jest.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
        LoggerProvider.clearInjectedLogger();
        ExecutionContext.endExecution();
    });

    describe('PrefixingLogger Integration', () => {
        it('should consistently add execution ID prefix to all log messages', () => {
            // Start execution context
            ExecutionContext.startExecution({
                component: 'CLI',
                operation: 'test-analyze'
            });

            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            // Set mock logger in provider
            LoggerProvider.setLogger(mockLogger);

            // Get logger from provider (should be wrapped with PrefixingLogger)
            const logger = LoggerProvider.getLogger();
            expect(logger).toBeInstanceOf(PrefixingLogger);

            // Test various log messages
            logger.info('Starting analysis');
            logger.info('{"XFI_RESULT": {"totalIssues": 0}}');
            logger.info('\nPretty printed result\n\n');
            logger.warn('Warning message');
            logger.error('Error message');

            // Verify all messages have the execution ID prefix
            logCalls.forEach(call => {
                expect(call.message).toContain(expectedPrefix);
                expect(call.message).toMatch(/\[([a-f0-9-]+)\]/);
            });

            // Verify consistent execution ID across all calls
            const executionIds = new Set<string>();
            logCalls.forEach(call => {
                const matches = [...call.message.matchAll(/\[([a-f0-9-]+)\]/g)];
                matches.forEach(match => {
                    executionIds.add(match[1]);
                });
            });

            expect(executionIds.size).toBe(1);
            expect(Array.from(executionIds)[0]).toBe(executionId);
        });

        it('should handle JSON result strings with execution ID prefix', () => {
            ExecutionContext.startExecution({
                component: 'CLI',
                operation: 'test-analyze'
            });

            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            LoggerProvider.setLogger(mockLogger);
            const logger = LoggerProvider.getLogger();

            // Simulate logging the JSON result string (as done in CLI)
            const resultString = JSON.stringify({
                XFI_RESULT: {
                    totalIssues: 0,
                    warningCount: 0,
                    fatalityCount: 0,
                    repoPath: './test-repo'
                }
            });

            logger.info(resultString);

            const jsonLogCall = logCalls.find(call => call.message.includes('XFI_RESULT'));
            expect(jsonLogCall).toBeDefined();
            expect(jsonLogCall!.message).toContain(expectedPrefix);
            expect(jsonLogCall!.message).toMatch(/\[([a-f0-9-]+)\]/);
        });

        it('should handle pretty-printed results with execution ID prefix', () => {
            ExecutionContext.startExecution({
                component: 'CLI',
                operation: 'test-analyze'
            });

            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            LoggerProvider.setLogger(mockLogger);
            const logger = LoggerProvider.getLogger();

            // Simulate logging the pretty-printed result (as done in CLI)
            const prettyResult = '\nPretty printed XFI result\n\n';
            logger.info(prettyResult);

            const prettyLogCall = logCalls.find(call => call.message.includes('Pretty printed'));
            expect(prettyLogCall).toBeDefined();
            expect(prettyLogCall!.message).toContain(expectedPrefix);
            expect(prettyLogCall!.message).toMatch(/\[([a-f0-9-]+)\]/);
        });

        it('should maintain consistent prefix across different outcome messages', () => {
            ExecutionContext.startExecution({
                component: 'CLI',
                operation: 'test-analyze'
            });

            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            LoggerProvider.setLogger(mockLogger);
            const logger = LoggerProvider.getLogger();

            // Simulate different CLI outcome scenarios
            const outcomeMessage = (message: string) => `\n==========================================================================\n${message}\n==========================================================================`;

            // Success case
            logger.info(outcomeMessage('HIGH FIDELITY APPROVED! No issues were found in the codebase.'));
            logger.info('{"XFI_RESULT": {"totalIssues": 0}}');
            logger.info('\nPretty printed success result\n\n');

            // Warning case
            logger.warn(outcomeMessage('No fatal errors were found, however please review the following warnings.'));
            logger.info('{"XFI_RESULT": {"totalIssues": 2, "warningCount": 2}}');
            logger.warn('\nPretty printed warning result\n\n');

            // Error case
            logger.error(outcomeMessage('THERE WERE 1 UNEXPECTED ERRORS!'));
            logger.info('{"XFI_RESULT": {"totalIssues": 1, "errorCount": 1}}');
            logger.error('\nPretty printed error result\n\n');

            // Verify all outcome messages have consistent prefix
            logCalls.forEach(call => {
                expect(call.message).toContain(expectedPrefix);
                expect(call.message).toMatch(/\[([a-f0-9-]+)\]/);
            });

            // Verify single execution ID across all messages
            const executionIds = new Set<string>();
            logCalls.forEach(call => {
                const matches = [...call.message.matchAll(/\[([a-f0-9-]+)\]/g)];
                matches.forEach(match => {
                    executionIds.add(match[1]);
                });
            });

            expect(executionIds.size).toBe(1);
            expect(Array.from(executionIds)[0]).toBe(executionId);
        });

        it('should use different execution IDs for different runs', () => {
            const executionIds = new Set<string>();

            // Run multiple execution contexts
            for (let i = 0; i < 3; i++) {
                logCalls = [];
                
                ExecutionContext.startExecution({
                    component: 'CLI',
                    operation: `test-analyze-${i}`
                });

                const executionId = ExecutionContext.getCurrentExecutionId();
                if (executionId) {
                    executionIds.add(executionId);
                }

                LoggerProvider.setLogger(mockLogger);
                const logger = LoggerProvider.getLogger();

                logger.info(`Test run ${i}`);

                ExecutionContext.endExecution();
            }

            // Each run should have a unique execution ID
            expect(executionIds.size).toBe(3);
            
            // Verify execution ID format (flexible to handle different formats)
            executionIds.forEach(id => {
                expect(id).toMatch(/^[a-f0-9-]+$/); // Accept hex characters and dashes
                expect(id.length).toBeGreaterThan(0);
            });
        });

        it('should handle child loggers with consistent prefixing', () => {
            ExecutionContext.startExecution({
                component: 'CLI',
                operation: 'test-analyze'
            });

            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            LoggerProvider.setLogger(mockLogger);
            const parentLogger = LoggerProvider.getLogger();
            const childLogger = parentLogger.child({ component: 'analyzer' });

            parentLogger.info('Parent logger message');
            childLogger.info('Child logger message');

            // Both parent and child should have the same execution ID prefix
            expect(logCalls.length).toBe(2);
            logCalls.forEach(call => {
                expect(call.message).toContain(expectedPrefix);
                expect(call.message).toMatch(/\[([a-f0-9-]+)\]/);
            });

            // Extract execution IDs to verify they're the same
            const extractedIds = logCalls.map(call => {
                const match = call.message.match(/\[([a-f0-9-]+)\]/);
                return match ? match[1] : null;
            }).filter(Boolean);

            expect(extractedIds.length).toBe(2);
            expect(extractedIds[0]).toBe(extractedIds[1]);
            expect(extractedIds[0]).toBe(executionId);
        });
    });
}); 