import { validateInput, validateUrlInput, validateTelemetryData } from './inputValidation';

describe('validateInput', () => {
    it('should return false for undefined or null input', () => {
        expect(validateInput(undefined).isValid).toBe(false);
        expect(validateInput(null as any).isValid).toBe(false);
    });

    it('should return false for potential directory traversal attempts', () => {
        expect(validateInput('../somepath').isValid).toBe(false);
        expect(validateInput('~/somepath').isValid).toBe(false);
        expect(validateInput('..\\somepath').isValid).toBe(false);
        expect(validateInput('C:\\Windows\\System32').isValid).toBe(false);
        expect(validateInput('/etc/passwd').isValid).toBe(false);
        expect(validateInput('../../../etc/passwd').isValid).toBe(false);
        expect(validateInput('..%2f..%2f..%2fetc%2fpasswd').isValid).toBe(false);
    });

    it('should return false for inputs with suspicious characters', () => {
        expect(validateInput('some;command').isValid).toBe(false);
        expect(validateInput('some|pipe').isValid).toBe(false);
        expect(validateInput('some`backtick`').isValid).toBe(false);
        expect(validateInput('some$(command)').isValid).toBe(false);
        expect(validateInput('some${variable}').isValid).toBe(false);
        expect(validateInput('some&command').isValid).toBe(false);
        expect(validateInput('some>output').isValid).toBe(false);
        expect(validateInput('some<input').isValid).toBe(false);
        expect(validateInput('some*pattern').isValid).toBe(false);
        expect(validateInput('some?wildcard').isValid).toBe(false);
    });

    it('should return false for inputs with potential SQL injection', () => {
        expect(validateInput("'; DROP TABLE users; --").isValid).toBe(false);
        expect(validateInput("' OR '1'='1").isValid).toBe(false);
        expect(validateInput("' UNION SELECT * FROM users; --").isValid).toBe(false);
        expect(validateInput("'; WAITFOR DELAY '0:0:10'--").isValid).toBe(false);
    });

    it('should return false for inputs with potential XSS attacks', () => {
        expect(validateInput('<script>alert("xss")</script>').isValid).toBe(false);
        expect(validateInput('javascript:alert("xss")').isValid).toBe(false);
        expect(validateInput('onerror=alert("xss")').isValid).toBe(false);
        expect(validateInput('onload=alert("xss")').isValid).toBe(false);
        expect(validateInput('"><script>alert("xss")</script>').isValid).toBe(false);
    });

    it('should return false for inputs with potential command injection', () => {
        expect(validateInput('$(cat /etc/passwd)').isValid).toBe(false);
        expect(validateInput('`cat /etc/passwd`').isValid).toBe(false);
        expect(validateInput('; cat /etc/passwd').isValid).toBe(false);
        expect(validateInput('| cat /etc/passwd').isValid).toBe(false);
        expect(validateInput('&& cat /etc/passwd').isValid).toBe(false);
    });

    it('should return false for inputs with potential template injection', () => {
        expect(validateInput('${7*7}').isValid).toBe(false);
        expect(validateInput('{{7*7}}').isValid).toBe(false);
        expect(validateInput('<%= 7*7 %>').isValid).toBe(false);
        expect(validateInput('${process.env}').isValid).toBe(false);
    });

    it('should return false for inputs with potential NoSQL injection', () => {
        expect(validateInput('{"$gt": ""}').isValid).toBe(false);
        expect(validateInput('{"$ne": null}').isValid).toBe(false);
        expect(validateInput('{"$where": "1==1"}').isValid).toBe(false);
    });

    it('should return false for inputs with potential LDAP injection', () => {
        expect(validateInput('*)(uid=*))(|(uid=*').isValid).toBe(false);
        expect(validateInput('*)(|(objectclass=*').isValid).toBe(false);
        expect(validateInput('*)(|(password=*').isValid).toBe(false);
    });

    it('should return false for inputs with potential XML injection', () => {
        expect(validateInput('<!DOCTYPE test [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>').isValid).toBe(false);
        expect(validateInput('<?xml version="1.0" encoding="ISO-8859-1"?>').isValid).toBe(false);
        expect(validateInput('<!ENTITY xxe SYSTEM "file:///etc/passwd">').isValid).toBe(false);
    });

    it('should return false for inputs with potential path traversal in encoded form', () => {
        expect(validateInput('%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd').isValid).toBe(false);
        expect(validateInput('..%252f..%252f..%252fetc%252fpasswd').isValid).toBe(false);
        expect(validateInput('..%c0%af..%c0%af..%c0%afetc%c0%afpasswd').isValid).toBe(false);
    });

    it('should return false for inputs with potential null byte injection', () => {
        expect(validateInput('file.txt\0.php').isValid).toBe(false);
        expect(validateInput('file.txt%00.php').isValid).toBe(false);
        expect(validateInput('file.txt\u0000.php').isValid).toBe(false);
    });

    it('should return false for inputs with potential Unicode normalization issues', () => {
        expect(validateInput('ﬁle.txt').isValid).toBe(false); // Ligature
        expect(validateInput('ﬁle.txt').isValid).toBe(false); // Decomposed form
        expect(validateInput('ﬁle.txt').isValid).toBe(false); // Composed form
    });

    it('should return false for inputs with potential homograph attacks', () => {
        expect(validateInput('аррӏе.com').isValid).toBe(false); // Cyrillic
        expect(validateInput('аррӏе.com').isValid).toBe(false); // Mixed scripts
        expect(validateInput('аррӏе.com').isValid).toBe(false); // Similar looking
    });

    it('should return false for inputs with potential buffer overflow attempts', () => {
        expect(validateInput('A'.repeat(1001)).isValid).toBe(false);
        expect(validateInput('A'.repeat(10000)).isValid).toBe(false);
        expect(validateInput('A'.repeat(100000)).isValid).toBe(false);
    });

    it('should return false for inputs with potential regex DoS', () => {
        expect(validateInput('A'.repeat(100) + '!').isValid).toBe(false);
        expect(validateInput('(A+)+').isValid).toBe(false);
        expect(validateInput('(A|B+)+').isValid).toBe(false);
    });

    it('should return true for valid inputs', () => {
        expect(validateInput('validInput').isValid).toBe(true);
        expect(validateInput('valid/path/to/file.txt').isValid).toBe(true);
        expect(validateInput('valid-file-name.txt').isValid).toBe(true);
        expect(validateInput('valid_file_name.txt').isValid).toBe(true);
        expect(validateInput('valid123.txt').isValid).toBe(true);
    });
});

describe('validateUrlInput', () => {
    it('should return false for invalid URLs', () => {
        expect(validateUrlInput('not-a-url').isValid).toBe(false);
        expect(validateUrlInput('http://').isValid).toBe(false);
        expect(validateUrlInput('https://').isValid).toBe(false);
        expect(validateUrlInput('ftp://').isValid).toBe(false);
    });

    it('should return false for URLs with invalid protocols', () => {
        expect(validateUrlInput('javascript:alert(1)').isValid).toBe(false);
        expect(validateUrlInput('data:text/html,<script>alert(1)</script>').isValid).toBe(false);
        expect(validateUrlInput('vbscript:alert(1)').isValid).toBe(false);
        expect(validateUrlInput('file:///etc/passwd').isValid).toBe(false);
    });

    it('should return false for URLs with potential XSS', () => {
        expect(validateUrlInput('http://example.com/<script>alert(1)</script>').isValid).toBe(false);
        expect(validateUrlInput('http://example.com/"><script>alert(1)</script>').isValid).toBe(false);
        expect(validateUrlInput('http://example.com/\'><script>alert(1)</script>').isValid).toBe(false);
    });

    it('should return false for URLs with potential path traversal', () => {
        expect(validateUrlInput('http://example.com/../../../etc/passwd').isValid).toBe(false);
        expect(validateUrlInput('http://example.com/..%2f..%2f..%2fetc%2fpasswd').isValid).toBe(false);
    });

    it('should return true for valid URLs', () => {
        expect(validateUrlInput('http://example.com').isValid).toBe(true);
        expect(validateUrlInput('https://example.com/path').isValid).toBe(true);
        expect(validateUrlInput('https://example.com/path?param=value').isValid).toBe(true);
    });
});

describe('validateTelemetryData', () => {
    it('should return false for invalid telemetry data', () => {
        expect(validateTelemetryData(null as any).isValid).toBe(false);
        expect(validateTelemetryData(undefined as any).isValid).toBe(false);
        expect(validateTelemetryData('not-an-object').isValid).toBe(false);
    });

    it('should return false for telemetry data with invalid event type', () => {
        expect(validateTelemetryData({ eventType: '' }).isValid).toBe(false);
        expect(validateTelemetryData({ eventType: ' ' }).isValid).toBe(false);
        expect(validateTelemetryData({ eventType: 'invalid' }).isValid).toBe(false);
    });

    it('should return false for telemetry data with invalid metadata', () => {
        expect(validateTelemetryData({ eventType: 'test', metadata: null }).isValid).toBe(false);
        expect(validateTelemetryData({ eventType: 'test', metadata: 'not-an-object' }).isValid).toBe(false);
    });

    it('should return false for telemetry data with sensitive information', () => {
        expect(validateTelemetryData({ 
            eventType: 'test', 
            metadata: { 
                password: 'secret123',
                apiKey: 'abc123',
                token: 'xyz789'
            } 
        }).isValid).toBe(false);
    });

    it('should return true for valid telemetry data', () => {
        expect(validateTelemetryData({ 
            eventType: 'test', 
            metadata: { 
                action: 'test-action',
                status: 'success'
            } 
        }).isValid).toBe(true);
    });
});
