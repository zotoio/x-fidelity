import { invalidRemoteValidationOperator } from './invalidRemoteValidation';

describe('invalidRemoteValidationOperator', () => {
    it('should return true when factValue is invalid and compareToValue is true', () => {
        const factValue = { isValid: false };
        const result = invalidRemoteValidationOperator.fn(factValue, true);
        expect(result).toBe(true);
    });

    it('should return false when factValue is valid and compareToValue is true', () => {
        const factValue = { isValid: true };
        const result = invalidRemoteValidationOperator.fn(factValue, true);
        expect(result).toBe(false);
    });

    it('should return false when factValue is invalid', () => {
        const factValue = null;
        const result = invalidRemoteValidationOperator.fn(factValue, true);
        expect(result).toBe(false);
    });

    it('should return false when factValue does not have isValid property', () => {
        const factValue = { someOtherProperty: 'value' };
        const result = invalidRemoteValidationOperator.fn(factValue, true);
        expect(result).toBe(false);
    });
});
