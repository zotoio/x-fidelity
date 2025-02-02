import errorDemoPlugin from './errorDemoPlugin';
import { pluginRegistry } from '../../core/pluginRegistry';

describe('errorDemoPlugin', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle operator errors correctly', async () => {
        pluginRegistry.registerPlugin(errorDemoPlugin);
        const operator = errorDemoPlugin.operators?.[0];
        
        expect(() => operator?.fn(null, 'throw-operator-error')).toThrow('Operator execution failed');
    });

    it('should handle fact errors correctly', async () => {
        const fact = errorDemoPlugin.facts?.[0];
        
        await expect(fact?.fn({ errorType: 'fact-error' }, {} as any)).rejects.toThrow('Fact execution failed');
    });

    it('should handle plugin-level errors correctly', () => {
        const error = new Error('Test error');
        const handledError = errorDemoPlugin.onError?.(error);
        
        expect(handledError).toEqual({
            message: expect.stringContaining('Test error'),
            level: 'error',
            details: expect.objectContaining({
                source: 'plugin',
                originalError: error
            })
        });
    });
});
