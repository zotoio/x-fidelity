import { executeErrorAction } from './errorActionExecutor';
import { logger } from '../../utils/logger';
import { LoggerProvider } from '../../utils/loggerProvider';
import { sendTelemetry } from '../../utils/telemetry';

// Mock child logger that captures calls - define before the jest.mock calls
const mockChildLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
    child: jest.fn(),
    setLevel: jest.fn(),
    getLevel: jest.fn(),
    isLevelEnabled: jest.fn()
};

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
        fatal: jest.fn(),
        child: jest.fn(),
        setLevel: jest.fn(),
        getLevel: jest.fn(),
        isLevelEnabled: jest.fn()
    }
}));

jest.mock('../../utils/loggerProvider', () => ({
    LoggerProvider: {
        getLogger: jest.fn(() => mockChildLogger),
        setLogger: jest.fn(),
        hasInjectedLogger: jest.fn(),
        clearInjectedLogger: jest.fn()
    }
}));

jest.mock('../../utils/telemetry');

describe('executeErrorAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset all mocks after each test
        (LoggerProvider.getLogger as jest.Mock).mockReturnValue(mockChildLogger);
    });

    describe('Notification Actions', () => {
        it('should execute sendNotification action with basic error', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('sendNotification', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                notification: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                }),
            }), 'Sending error notification');
        });

        it('should execute sendNotification with custom notification parameters', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {
                    recipients: ['team@example.com'],
                    priority: 'high',
                    channel: 'slack'
                }
            };

            await executeErrorAction('sendNotification', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                notification: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                    recipients: ['team@example.com'],
                    priority: 'high',
                    channel: 'slack'
                }),
            }), 'Sending error notification');
        });

        it('should handle sendNotification with missing parameters', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                level: 'error'
            };

            await executeErrorAction('sendNotification', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                notification: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                }),
            }), 'Sending error notification');
        });
    });

    describe('Logging Actions', () => {
        it('should execute logToFile action with basic error', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                    file: '/path/to/file',
                }),
            }), 'Logging error to file');
        });

        it('should execute logToFile with custom log parameters', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {
                    logLevel: 'debug',
                    includeStack: true,
                    format: 'json'
                }
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                    file: '/path/to/file',
                    logLevel: 'debug',
                    includeStack: true,
                    format: 'json'
                }),
            }), 'Logging error to file');
        });

        it('should handle logToFile with missing parameters', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                level: 'error'
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                }),
            }), 'Logging error to file');
        });
    });

    describe('Error Handling', () => {
        it('should throw error for unknown action', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await expect(executeErrorAction('unknownAction', params)).rejects.toThrow('Unknown error action: unknownAction');
            expect(mockChildLogger.error).toHaveBeenCalledWith('Error executing error action', {
                actionName: 'unknownAction',
                error: 'Unknown error action: unknownAction'
            });
        });

        it('should handle null error object', async () => {
            const params = {
                error: new Error('Unknown error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'Unknown error',
                    file: '/path/to/file',
                }),
            }), 'Logging error to file');
        });

        it('should handle error with stack trace', async () => {
            const error = new Error('Stack trace error');
            error.stack = 'Error: Stack trace error\n    at test.js:10:5\n    at main.js:20:10';
            
            const params = {
                error,
                ruleName: 'stack-trace-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    stack: error.stack
                }),
            }), 'Logging error to file');
        });

        it('should handle error with custom properties', async () => {
            const error = new Error('Custom error');
            (error as any).code = 'CUSTOM_ERROR';
            (error as any).details = { reason: 'test reason' };
            
            const params = {
                error,
                ruleName: 'custom-error-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    code: 'CUSTOM_ERROR',
                    details: { reason: 'test reason' }
                }),
            }), 'Logging error to file');
        });

        it('should handle circular references in error context', async () => {
            const circularContext: any = { prop: 'value' };
            circularContext.self = circularContext;
            
            const params = {
                error: new Error('Circular reference error'),
                ruleName: 'circular-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: circularContext,
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    context: expect.objectContaining({
                        prop: 'value',
                        self: '[Circular]'
                    })
                }),
            }), 'Logging error to file');
        });

        it('should handle large error objects', async () => {
            const largeError = new Error('Large error');
            (largeError as any).data = Array(1000).fill('x').join('');
            
            const params = {
                error: largeError,
                ruleName: 'large-error-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    data: expect.stringMatching(/^x{1000}$/)
                }),
            }), 'Logging error to file');
        });

        it('should handle error with non-serializable values', async () => {
            const error = new Error('Non-serializable error');
            (error as any).func = () => {};
            (error as any).symbol = Symbol('test');
            
            const params = {
                error,
                ruleName: 'non-serializable-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    func: '[Function]',
                    symbol: '[Symbol]'
                }),
            }), 'Logging error to file');
        });

        it('should handle error with sensitive data', async () => {
            const error = new Error('Sensitive data error');
            (error as any).password = 'secret123';
            (error as any).apiKey = 'abc123';
            
            const params = {
                error,
                ruleName: 'sensitive-data-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    password: '[REDACTED]',
                    apiKey: '[REDACTED]'
                }),
            }), 'Logging error to file');
        });

        it('should handle error with nested objects', async () => {
            const error = new Error('Nested error');
            (error as any).nested = {
                level1: {
                    level2: {
                        level3: 'deep value'
                    }
                }
            };
            
            const params = {
                error,
                ruleName: 'nested-error-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    nested: expect.objectContaining({
                        level1: expect.objectContaining({
                            level2: expect.objectContaining({
                                level3: 'deep value'
                            })
                        })
                    })
                }),
            }), 'Logging error to file');
        });

        it('should handle error with array properties', async () => {
            const error = new Error('Array error');
            (error as any).items = [1, 2, 3, 4, 5];
            (error as any).nestedArrays = [[1, 2], [3, 4]];
            
            const params = {
                error,
                ruleName: 'array-error-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    items: [1, 2, 3, 4, 5],
                    nestedArrays: [[1, 2], [3, 4]]
                }),
            }), 'Logging error to file');
        });
    });

    describe('Context Handling', () => {
        it('should include context in error logs', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {
                    userId: '123',
                    sessionId: 'abc',
                    timestamp: '2024-01-01T00:00:00Z'
                },
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                    file: '/path/to/file',
                    context: {
                        userId: '123',
                        sessionId: 'abc',
                        timestamp: '2024-01-01T00:00:00Z'
                    }
                }),
            }), 'Logging error to file');
        });

        it('should handle empty context object', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                context: {},
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                    file: '/path/to/file',
                }),
            }), 'Logging error to file');
        });

        it('should handle undefined context', async () => {
            const params = {
                error: new Error('test error'),
                ruleName: 'test-rule',
                filePath: '/path/to/file',
                level: 'error',
                params: {}
            };

            await executeErrorAction('logToFile', params);
            expect(mockChildLogger.info).toHaveBeenCalledWith(expect.objectContaining({
                errorLog: expect.objectContaining({
                    rule: 'test-rule',
                    level: 'error',
                    error: 'test error',
                    file: '/path/to/file',
                }),
            }), 'Logging error to file');
        });
    });
});
