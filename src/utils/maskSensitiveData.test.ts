import { maskSensitiveData } from './maskSensitiveData';

describe('maskSensitiveData', () => {
    it('should mask sensitive data in objects', () => {
        const input = {
            'x-shared-secret': 'sensitive-data',
            normalKey: 'normal-data',
            nestedObject: {
                'x-shared-secret': 'nested-sensitive-data',
                normalNestedKey: 'normal-nested-data'
            }
        };

        const expected = {
            'x-shared-secret': '********',
            normalKey: 'normal-data',
            nestedObject: {
                'x-shared-secret': '********',
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
            { 'x-shared-secret': '********' },
            { normalKey: 'normal-data' }
        ];

        expect(maskSensitiveData(input)).toEqual(expected);
    });

    it('should return non-object values as-is', () => {
        expect(maskSensitiveData('string')).toBe('string');
        expect(maskSensitiveData(123)).toBe(123);
        expect(maskSensitiveData(null)).toBe(null);
    });
});
