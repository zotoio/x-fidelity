import { executeErrorAction } from './errorActionExecutor';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

describe('executeErrorAction', () => {
    it('should execute sendNotification action', async () => {
        const params = {
            error: new Error('test error'),
            rule: 'test-rule',
            level: 'error',
            params: {},
            file: { filePath: '/path/to/file' },
        };

        await executeErrorAction('sendNotification', params);
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
            notification: expect.objectContaining({
                rule: 'test-rule',
                level: 'error',
                error: 'test error',
            }),
        }), 'Sending error notification');
    });

    it('should execute logToFile action', async () => {
        const params = {
            error: new Error('test error'),
            rule: 'test-rule',
            level: 'error',
            params: {},
            file: { filePath: '/path/to/file' },
        };

        await executeErrorAction('logToFile', params);
        expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({
            errorLog: expect.objectContaining({
                rule: 'test-rule',
                level: 'error',
                error: 'test error',
                file: '/path/to/file',
            }),
        }), 'Logging error to file');
    });

    it('should throw error for unknown action', async () => {
        const params = {
            error: new Error('test error'),
            rule: 'test-rule',
            level: 'error',
            params: {},
            file: { filePath: '/path/to/file' },
        };

        await expect(executeErrorAction('unknownAction', params)).rejects.toThrow('Unknown error action: unknownAction');
    });
});
