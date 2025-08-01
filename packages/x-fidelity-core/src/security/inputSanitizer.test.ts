import { sanitizeString, validateInput, validateEmail } from './inputSanitizer';
import { SecurityError } from './index';

describe('inputSanitizer', () => {
    describe('sanitizeString', () => {
        it('should return clean input unchanged', () => {
            expect(sanitizeString('hello world')).toBe('hello world');
            expect(sanitizeString('test123')).toBe('test123');
            expect(sanitizeString('file-name_test.txt')).toBe('file-name_test.txt');
        });

        it('should remove control characters', () => {
            const inputWithControls = 'test' + String.fromCharCode(0, 1, 2) + 'string';
            const result = sanitizeString(inputWithControls);
            expect(result).toBe('teststring');
        });

        it('should throw on input too long', () => {
            const longInput = 'a'.repeat(10000);
            expect(() => sanitizeString(longInput, 100)).toThrow(SecurityError);
        });

        it('should handle custom max length', () => {
            const input = 'test string';
            expect(() => sanitizeString(input, 20)).not.toThrow();
            expect(() => sanitizeString(input, 5)).toThrow(SecurityError);
        });

        it('should throw on non-string input', () => {
            expect(() => sanitizeString(123 as any)).toThrow(SecurityError);
            expect(() => sanitizeString(null as any)).toThrow(SecurityError);
            expect(() => sanitizeString(undefined as any)).toThrow(SecurityError);
        });

        it('should handle empty strings', () => {
            expect(sanitizeString('')).toBe('');
            expect(sanitizeString('   ')).toBe('   ');
        });

        it('should use default max length', () => {
            const normalInput = 'normal input string';
            expect(() => sanitizeString(normalInput)).not.toThrow();
        });
    });

    describe('validateInput', () => {
        it('should return true for safe input', () => {
            expect(validateInput('normal input')).toBe(true);
            expect(validateInput('user@example.com')).toBe(true);
            expect(validateInput('test123')).toBe(true);
        });

        it('should return false for dangerous input by default', () => {
            expect(validateInput('<script>alert("xss")</script>')).toBe(false);
            expect(validateInput('${evil_command}')).toBe(false);
            expect(validateInput('`dangerous`')).toBe(false);
        });

        it('should allow dangerous input when explicitly permitted', () => {
            expect(validateInput('<script>alert("xss")</script>', true)).toBe(true);
            expect(validateInput('${evil_command}', true)).toBe(true);
        });

        it('should handle various dangerous patterns', () => {
            expect(validateInput("'; DROP TABLE users; --")).toBe(false);
            expect(validateInput('test; rm -rf /')).toBe(false);
            expect(validateInput('test && evil')).toBe(false);
            expect(validateInput('test | dangerous')).toBe(false);
        });

        it('should handle empty strings', () => {
            expect(validateInput('')).toBe(true);
            expect(validateInput('   ')).toBe(true);
        });

        it('should handle unicode characters', () => {
            expect(validateInput('Hello 世界')).toBe(true);
            expect(validateInput('Test 🎉 emoji')).toBe(true);
        });
    });

    describe('validateEmail', () => {
        it('should return true for valid emails', () => {
            expect(validateEmail('user@example.com')).toBe(true);
            expect(validateEmail('test.email@domain.org')).toBe(true);
            expect(validateEmail('user123@test-domain.net')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(validateEmail('invalid-email')).toBe(false);
            expect(validateEmail('@domain.com')).toBe(false);
            expect(validateEmail('user@')).toBe(false);
            expect(validateEmail('user@domain')).toBe(false);
        });

        it('should handle email length limits', () => {
            const longEmail = 'a'.repeat(250) + '@example.com';
            expect(validateEmail(longEmail)).toBe(false);
        });

        it('should reject emails with spaces', () => {
            expect(validateEmail('user name@example.com')).toBe(false);
            expect(validateEmail('user@exam ple.com')).toBe(false);
        });

        it('should handle edge cases', () => {
            expect(validateEmail('')).toBe(false);
            expect(validateEmail('user@@domain.com')).toBe(false);
            expect(validateEmail('user@domain..com')).toBe(true); // Simple regex allows consecutive dots
        });
    });

    describe('SecurityError integration', () => {
        it('should throw SecurityError for invalid inputs in sanitizeString', () => {
            expect(() => sanitizeString(null as any)).toThrow(SecurityError);
            expect(() => sanitizeString(123 as any)).toThrow(SecurityError);
        });

        it('should throw SecurityError for inputs that are too long', () => {
            const longInput = 'a'.repeat(10000);
            expect(() => sanitizeString(longInput, 100)).toThrow(SecurityError);
        });
    });

    describe('edge cases', () => {
        it('should handle complex email patterns', () => {
            expect(validateEmail('user+tag@example.com')).toBe(true);
            expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
        });

        it('should handle dangerous patterns in validation', () => {
            expect(validateInput('<script>alert("xss")</script>')).toBe(false);
            expect(validateInput('javascript:void(0)')).toBe(false);
            expect(validateInput('data:text/html,<script>alert(1)</script>')).toBe(false);
        });

        it('should handle control characters in sanitization', () => {
            const controlChars = String.fromCharCode(0, 1, 2, 3, 4, 5, 6, 7, 8, 14, 15);
            const result = sanitizeString('test' + controlChars + 'string');
            expect(result).toBe('teststring');
        });

        it('should handle very long but safe inputs', () => {
            const longSafeInput = 'safe'.repeat(100);
            expect(() => sanitizeString(longSafeInput, 1000)).not.toThrow();
            expect(validateInput(longSafeInput)).toBe(true);
        });
    });
});