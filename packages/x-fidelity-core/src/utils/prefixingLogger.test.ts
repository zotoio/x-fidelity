import { PrefixingLogger } from './loggerProvider';
import { ExecutionContext } from './executionContext';
import { ILogger } from '@x-fidelity/types';

describe('PrefixingLogger', () => {
    let mockBaseLogger: jest.Mocked<ILogger>;
    let prefixingLogger: PrefixingLogger;

    beforeEach(() => {
        // Create mock base logger
        mockBaseLogger = {
            trace: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            fatal: jest.fn(),
            setLevel: jest.fn(),
            getLevel: jest.fn().mockReturnValue('info'),
            isLevelEnabled: jest.fn().mockReturnValue(true),
            child: jest.fn().mockReturnThis()
        };

        // Start execution context for testing
        ExecutionContext.startExecution({
            component: 'test',
            operation: 'unit-test'
        });

        // Create PrefixingLogger instance
        prefixingLogger = new PrefixingLogger(mockBaseLogger);
    });

    afterEach(() => {
        // Clean up execution context
        ExecutionContext.endExecution();
        jest.clearAllMocks();
    });

    describe('Execution ID Prefix Consistency', () => {
        it('should add execution ID prefix to all log levels', () => {
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

            // Verify all calls have the execution ID prefix
            expect(mockBaseLogger.trace).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, undefined);
            expect(mockBaseLogger.debug).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, undefined);
            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, undefined);
            expect(mockBaseLogger.warn).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, undefined);
            expect(mockBaseLogger.error).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, undefined);
            expect(mockBaseLogger.fatal).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, undefined);
        });

        it('should handle object messages with message property', () => {
            const testObj = { message: 'Test object message', data: 'test' };
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(testObj);

            expect(mockBaseLogger.info).toHaveBeenCalledWith({
                ...testObj,
                message: `${expectedPrefix} ${testObj.message}`
            }, undefined);
        });

        it('should handle object messages without message property', () => {
            const testObj = { data: 'test', value: 123 };
            const executionId = ExecutionContext.getCurrentExecutionId();

            prefixingLogger.info(testObj);

            // Object without message property should be passed as-is (no prefix added)
            expect(mockBaseLogger.info).toHaveBeenCalledWith(testObj, undefined);
        });

        it('should handle mixed string and metadata parameters', () => {
            const testMessage = 'Test message';
            const testMeta = { userId: '123', action: 'test' };
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(testMessage, testMeta);

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${testMessage}`, testMeta);
        });

        it('should maintain consistent prefix across multiple log calls', () => {
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info('First message');
            prefixingLogger.warn('Second message');
            prefixingLogger.error('Third message');

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} First message`, undefined);
            expect(mockBaseLogger.warn).toHaveBeenCalledWith(`${expectedPrefix} Second message`, undefined);
            expect(mockBaseLogger.error).toHaveBeenCalledWith(`${expectedPrefix} Third message`, undefined);
        });

        it('should handle empty execution context gracefully', () => {
            // End current execution context
            ExecutionContext.endExecution();

            prefixingLogger.info('Test message');

            // Should still work, just without prefix
            expect(mockBaseLogger.info).toHaveBeenCalledWith('Test message', undefined);
        });

        it('should handle static prefix when provided', () => {
            const staticPrefix = '[STATIC-PREFIX]';
            const staticPrefixLogger = new PrefixingLogger(mockBaseLogger, staticPrefix);

            staticPrefixLogger.info('Test message');

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${staticPrefix} Test message`, undefined);
        });

        it('should create child logger with same prefixing behavior', () => {
            const childLogger = prefixingLogger.child({ component: 'child' });
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            // Child logger should also be a PrefixingLogger
            expect(childLogger).toBeInstanceOf(PrefixingLogger);

            // Test that child logger also adds prefixes
            childLogger.info('Child message');

            expect(mockBaseLogger.child).toHaveBeenCalledWith({ component: 'child' });
            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} Child message`, undefined);
        });
    });

    describe('Cross-Execution Consistency', () => {
        it('should use different prefixes for different executions', () => {
            const firstExecutionId = ExecutionContext.getCurrentExecutionId();
            prefixingLogger.info('First execution message');

            // Start new execution
            ExecutionContext.endExecution();
            ExecutionContext.startExecution({
                component: 'test',
                operation: 'second-test'
            });

            const secondExecutionId = ExecutionContext.getCurrentExecutionId();
            prefixingLogger.info('Second execution message');

            expect(firstExecutionId).not.toBe(secondExecutionId);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(1, `[${firstExecutionId}] First execution message`, undefined);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(2, `[${secondExecutionId}] Second execution message`, undefined);
        });

        it('should maintain prefix consistency within same execution', () => {
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            // Multiple loggers in same execution should use same prefix
            const logger1 = new PrefixingLogger(mockBaseLogger);
            const logger2 = new PrefixingLogger(mockBaseLogger);

            logger1.info('Logger 1 message');
            logger2.info('Logger 2 message');

            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(1, `${expectedPrefix} Logger 1 message`, undefined);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(2, `${expectedPrefix} Logger 2 message`, undefined);
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle very long messages', () => {
            const longMessage = 'A'.repeat(10000);
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(longMessage);

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${longMessage}`, undefined);
        });

        it('should handle special characters in messages', () => {
            const specialMessage = 'Message with 特殊字符 and émojis 🚀 and newlines\n\ttabs';
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(specialMessage);

            expect(mockBaseLogger.info).toHaveBeenCalledWith(`${expectedPrefix} ${specialMessage}`, undefined);
        });

        it('should handle null and undefined messages', () => {
            const executionId = ExecutionContext.getCurrentExecutionId();
            const expectedPrefix = `[${executionId}]`;

            prefixingLogger.info(null as any);
            prefixingLogger.info(undefined as any);

            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(1, `${expectedPrefix} null`, undefined);
            expect(mockBaseLogger.info).toHaveBeenNthCalledWith(2, `${expectedPrefix} undefined`, undefined);
        });
    });
}); 