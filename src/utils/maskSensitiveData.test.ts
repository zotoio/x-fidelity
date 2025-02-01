import { maskSensitiveData } from './maskSensitiveData';

describe('maskSensitiveData', () => {
    it('should partially mask sensitive data in objects', () => {
        const input = {
            'x-shared-secret': 'sensitive-data-12345',
            normalKey: 'normal-data',
            nestedObject: {
                'x-shared-secret': 'nested-sensitive-data',
                normalNestedKey: 'normal-nested-data'
            }
        };

        const expected = {
            'x-shared-secret': 'sensitive***-12345',
            normalKey: 'normal-data',
            nestedObject: {
                'x-shared-secret': 'nested-s***e-data',
                normalNestedKey: 'normal-nested-data'
            }
        };

        expect(maskSensitiveData(input)).toEqual(expected);
    });

    it('should handle arrays', () => {
        const input = [
            { 'x-shared-secret': 'sensitive-data' },
            { normalKey: 'normal-data' }
        ];

        const expected = [
            { 'x-shared-secret': 'sensitive***-data' },
            { normalKey: 'normal-data' }
        ];

        expect(maskSensitiveData(input)).toEqual(expected);
    });

    it('should handle sensitive strings directly', () => {
        expect(maskSensitiveData('api-key-12345')).toBe('api-key***2345');
        expect(maskSensitiveData('normal-string')).toBe('normal-string');
    });

    it('should handle short sensitive values', () => {
        expect(maskSensitiveData({ password: '123' })).toEqual({ password: '***' });
    });

    it('should return non-string/object values as-is', () => {
        expect(maskSensitiveData(123)).toBe(123);
        expect(maskSensitiveData(null)).toBe(null);
    });

    it('should mask sensitive data in nested string values', () => {
        const input = {
            config: {
                database: {
                    password: 'super-secret-password'
                }
            }
        };

        const expected = {
            config: {
                database: {
                    password: 'super-s***password'
                }
            }
        };

        expect(maskSensitiveData(input)).toEqual(expected);
    });
});
