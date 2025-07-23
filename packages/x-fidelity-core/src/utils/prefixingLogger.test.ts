import { PrefixingLogger } from './loggerProvider';
import { ExecutionContext } from './executionContext';
import { ILogger } from '@x-fidelity/types';

describe('PrefixingLogger', () => {
    let mockBaseLogger: jest.Mocked<ILogger>;
    let prefixingLogger: PrefixingLogger;

    beforeEach(() => {
        // Start execution context for each test
        ExecutionContext.startExecution({
            component: 'Core',
            operation: 'unit-test'
        });

        mockBaseLogger = {
            trace: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn(),
            setLevel: jest.fn(),
            getLevel: jest.fn(),
            isLevelEnabled: jest.fn()
        };

        prefixingLogger = new PrefixingLogger(mockBaseLogger, undefined, {
            enablePrefix: true,
            enableCorrelationMetadata: true
        });
    });

    afterEach(() => {
        ExecutionContext.endExecution();
        jest.clearAllMocks();
    });

    describe('Execution ID Prefix Consistency', () => {
        it('should add execution ID prefix to all log levels with correlation metadata', () => {
            const testMessage = 'Test message';
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            // Test all log levels
            prefixingLogger.trace(testMessage);
            prefixingLogger.debug(testMessage);
            prefixingLogger.info(testMessage);
            prefixingLogger.warn(testMessage);
            prefixingLogger.error(testMessage);
            prefixingLogger.fatal(testMessage);

            // Verify all calls have the execution ID prefix AND correlation metadata
            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.trace).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
            expect(mockBaseLogger.debug).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
            expect(mockBaseLogger.warn).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
            expect(mockBaseLogger.error).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
            expect(mockBaseLogger.fatal).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
        });

        it('should handle object messages with message property and add correlation metadata', () => {
            const testObj = { message: 'Test object message', data: 'test' };
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(testObj);

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenCalledWith({
                ...testObj,
                message: `${expectedPrefix} ${testObj.message}`
            }, expectedMeta);
        });

        it('should handle object messages without message property and add correlation metadata', () => {
            const testObj = { data: 'test', value: 123 };
            const executionId = ExecutionContext.getCurrentExecutionId();

            prefixingLogger.info(testObj);

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            // Object without message property should be passed as-is (no prefix added)
            expect(mockBaseLogger.info).toHaveBeenCalledWith(testObj, expectedMeta);
        });

        it('should handle mixed string and metadata parameters with enhanced correlation metadata', () => {
            const testMessage = 'Test message';
            const testMeta = { userId: '123', action: 'test' };
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(testMessage, testMeta);

            const expectedMeta = expect.objectContaining({
                ...testMeta,
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test',
                executionStartTime: expect.any(Number)
            });

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, expectedMeta);
        });

        it('should maintain consistent prefix across multiple log calls with correlation metadata', () => {
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info('First message');
            prefixingLogger.warn('Second message');
            prefixingLogger.error('Third message');

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} First message`, expectedMeta);
            expect(mockBaseLogger.warn).toHaveBeenCalledWith(`${expectedPrefix} Second message`, expectedMeta);
            expect(mockBaseLogger.error).toHaveBeenCalledWith(`${expectedPrefix} Third message`, expectedMeta);
        });

        it('should handle static prefix when provided with correlation metadata', () => {
            const staticPrefix = '[STATIC-PREFIX]';
            const staticPrefixLogger = new PrefixingLogger(mockBaseLogger, staticPrefix, {
                enablePrefix: true,
                enableCorrelationMetadata: true
            });
            const executionId = ExecutionContext.getCurrentExecutionId();

            staticPrefixLogger.info('Test message');

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${staticPrefix} Test message`, expectedMeta);
        });

        it('should provide access to base logger when needed', () => {
            const baseLogger = prefixingLogger.getBaseLogger();
            
            expect(baseLogger).toBe(mockBaseLogger);
        });
    });

    describe('Cross-Execution Consistency', () => {
        it('should use different prefixes for different executions with different correlation IDs', () => {
            const firstExecutionId = ExecutionContext.getCurrentExecutionId();
            prefixingLogger.info('First execution message');

            // Start new execution
            ExecutionContext.endExecution();
            ExecutionContext.startExecution({
                component: 'Core',
                operation: 'second-test'
            });

            const secondExecutionId = ExecutionContext.getCurrentExecutionId();
            prefixingLogger.info('Second execution message');

            expect(firstExecutionId).not.toBe(secondExecutionId);
            
            const firstExpectedMeta = expect.objectContaining({
                correlationId: firstExecutionId,
                component: 'Core',
                operation: 'unit-test'
            });
            
            const secondExpectedMeta = expect.objectContaining({
                correlationId: secondExecutionId,
                component: 'Core',
                operation: 'second-test'
            });

            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(1, `[${firstExecutionId}] First execution message`, firstExpectedMeta);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(2, `[${secondExecutionId}] Second execution message`, secondExpectedMeta);
        });

        it('should maintain prefix consistency within same execution with same correlation ID', () => {
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            const logger1 = new PrefixingLogger(mockBaseLogger, undefined, {
                enablePrefix: true,
                enableCorrelationMetadata: true
            });
            const logger2 = new PrefixingLogger(mockBaseLogger, undefined, {
                enablePrefix: true,
                enableCorrelationMetadata: true
            });

            logger1.info('Logger 1 message');
            logger2.info('Logger 2 message');

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(1, `${expectedPrefix} Logger 1 message`, expectedMeta);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(2, `${expectedPrefix} Logger 2 message`, expectedMeta);
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle very long messages with correlation metadata', () => {
            const longMessage = 'A'.repeat(10000);
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(longMessage);

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${longMessage}`, expectedMeta);
        });

        it('should handle special characters in messages with correlation metadata', () => {
            const specialMessage = 'Message with 特殊字符 and émojis 🚀 and newlines\n\ttabs';
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(specialMessage);

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${specialMessage}`, expectedMeta);
        });

        it('should handle null and undefined messages with correlation metadata', () => {
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(null as any);
            prefixingLogger.info(undefined as any);

            const expectedMeta = expect.objectContaining({
                correlationId: executionId,
                component: 'Core',
                operation: 'unit-test'
            });

            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(1, `${expectedPrefix} null`, expectedMeta);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(2, `${expectedPrefix} undefined`, expectedMeta);
        });
    });
}); 