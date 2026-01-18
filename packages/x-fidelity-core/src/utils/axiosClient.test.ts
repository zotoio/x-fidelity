import { axiosClient, validateUrl, validateUrlAsync, createSanitizedUrl, isAxiosError } from './axiosClient';

// Note: We don't mock axios fully since we're testing security validation
// which happens before any actual HTTP requests are made.
// All security checks happen before the actual HTTP request is attempted.

describe('axiosClient', () => {

    describe('exports', () => {
        it('should export validateUrl function', () => {
            expect(typeof validateUrl).toBe('function');
        });

        it('should export validateUrlAsync function', () => {
            expect(typeof validateUrlAsync).toBe('function');
        });

        it('should export createSanitizedUrl function', () => {
            expect(typeof createSanitizedUrl).toBe('function');
        });

        it('should export isAxiosError function', () => {
            expect(typeof isAxiosError).toBe('function');
        });

        it('should export axiosClient object with HTTP methods', () => {
            expect(typeof axiosClient.get).toBe('function');
            expect(typeof axiosClient.post).toBe('function');
            expect(typeof axiosClient.put).toBe('function');
            expect(typeof axiosClient.delete).toBe('function');
        });
    });

    describe('axiosClient.get', () => {
        it('should reject GET request to non-allowlisted domain', async () => {
            await expect(axiosClient.get('https://evil.com/api'))
                .rejects.toThrow('Domain not in allowlist');
        });

        it('should reject GET request with HTTP protocol', async () => {
            await expect(axiosClient.get('http://api.github.com/repos'))
                .rejects.toThrow('Only HTTPS allowed');
        });

        it('should reject GET request to private IP', async () => {
            await expect(axiosClient.get('https://10.0.0.1/api'))
                .rejects.toThrow('private IP');
        });

        it('should reject GET request to localhost', async () => {
            await expect(axiosClient.get('https://localhost/api'))
                .rejects.toThrow('Blocked request to localhost');
        });

        it('should reject GET request to 127.0.0.1', async () => {
            await expect(axiosClient.get('https://127.0.0.1/api'))
                .rejects.toThrow('private IP');
        });

        it('should reject GET request to 0.0.0.0', async () => {
            await expect(axiosClient.get('https://0.0.0.0/api'))
                .rejects.toThrow('Blocked request to localhost');
        });
    });

    describe('axiosClient.post', () => {
        it('should reject POST request to non-allowlisted domain', async () => {
            await expect(axiosClient.post('https://evil.com/api', { data: 'test' }))
                .rejects.toThrow('Domain not in allowlist');
        });

        it('should reject POST request with HTTP protocol', async () => {
            await expect(axiosClient.post('http://api.github.com/repos', {}))
                .rejects.toThrow('Only HTTPS allowed');
        });
    });

    describe('axiosClient.put', () => {
        it('should reject PUT request to non-allowlisted domain', async () => {
            await expect(axiosClient.put('https://evil.com/api', { data: 'test' }))
                .rejects.toThrow('Domain not in allowlist');
        });

        it('should reject PUT request to private IP', async () => {
            await expect(axiosClient.put('https://192.168.1.1/api', {}))
                .rejects.toThrow('private IP');
        });
    });

    describe('axiosClient.delete', () => {
        it('should reject DELETE request to non-allowlisted domain', async () => {
            await expect(axiosClient.delete('https://evil.com/api/1'))
                .rejects.toThrow('Domain not in allowlist');
        });

        it('should reject DELETE request to localhost', async () => {
            await expect(axiosClient.delete('https://localhost/api/1'))
                .rejects.toThrow('Blocked request to localhost');
        });
    });

    describe('security validations', () => {
        it('should block localhost in various forms', async () => {
            await expect(axiosClient.get('https://localhost/api'))
                .rejects.toThrow('localhost');
            await expect(axiosClient.get('https://127.0.0.1/api'))
                .rejects.toThrow('private IP');
            await expect(axiosClient.get('https://0.0.0.0/api'))
                .rejects.toThrow('localhost');
        });

        it('should reject malformed URLs', async () => {
            await expect(axiosClient.get('not-a-url'))
                .rejects.toThrow('Invalid URL format');
        });

        it('should reject empty URL', async () => {
            await expect(axiosClient.get(''))
                .rejects.toThrow('Invalid URL format');
        });
    });

    describe('validateUrl (re-exported from urlValidator)', () => {
        it('should validate GitHub URLs as safe', () => {
            expect(validateUrl('https://api.github.com/repos')).toBe(true);
            expect(validateUrl('https://github.com/owner/repo')).toBe(true);
            expect(validateUrl('https://raw.githubusercontent.com/file')).toBe(true);
        });

        it('should reject unsafe URLs', () => {
            expect(validateUrl('http://api.github.com/repos')).toBe(false);
            expect(validateUrl('https://evil.com/path')).toBe(false);
            expect(validateUrl('https://10.0.0.1/api')).toBe(false);
        });

        it('should reject URLs with private IPs', () => {
            expect(validateUrl('https://192.168.1.1/api')).toBe(false);
            expect(validateUrl('https://172.16.0.1/api')).toBe(false);
            expect(validateUrl('https://10.255.255.255/api')).toBe(false);
        });

        it('should reject localhost', () => {
            expect(validateUrl('https://localhost/api')).toBe(false);
            expect(validateUrl('https://127.0.0.1/api')).toBe(false);
        });

        it('should return false for invalid URLs', () => {
            expect(validateUrl('not-a-url')).toBe(false);
            expect(validateUrl('')).toBe(false);
        });
    });

    describe('validateUrlAsync (re-exported from urlValidator)', () => {
        it('should asynchronously validate GitHub URLs as safe', async () => {
            await expect(validateUrlAsync('https://api.github.com/repos')).resolves.toBe(true);
        });

        it('should asynchronously reject unsafe URLs', async () => {
            await expect(validateUrlAsync('https://evil.com/path')).resolves.toBe(false);
        });

        it('should asynchronously reject HTTP URLs', async () => {
            await expect(validateUrlAsync('http://api.github.com/repos')).resolves.toBe(false);
        });

        it('should asynchronously reject private IPs', async () => {
            await expect(validateUrlAsync('https://10.0.0.1/api')).resolves.toBe(false);
        });
    });

    describe('createSanitizedUrl (re-exported from urlValidator)', () => {
        it('should sanitize valid URLs', () => {
            expect(createSanitizedUrl('https://api.github.com/path')).toBe('https://api.github.com/path');
        });

        it('should throw for non-allowlisted domains', () => {
            expect(() => createSanitizedUrl('https://evil.com/path')).toThrow('Domain not in allowlist');
        });

        it('should throw for HTTP protocol', () => {
            expect(() => createSanitizedUrl('http://api.github.com/path')).toThrow('Only HTTPS allowed');
        });

        it('should throw for private IPs', () => {
            expect(() => createSanitizedUrl('https://10.0.0.1/api')).toThrow('private IP');
        });

        it('should throw for localhost', () => {
            expect(() => createSanitizedUrl('https://localhost/api')).toThrow('localhost');
        });

        it('should preserve query strings', () => {
            expect(createSanitizedUrl('https://api.github.com/path?query=value'))
                .toBe('https://api.github.com/path?query=value');
        });

        it('should strip credentials from URL', () => {
            const result = createSanitizedUrl('https://user:pass@api.github.com/path');
            expect(result).toBe('https://api.github.com/path');
            expect(result).not.toContain('user');
            expect(result).not.toContain('pass');
        });
    });

    describe('isAxiosError', () => {
        it('should correctly identify axios errors', () => {
            const axiosError = {
                isAxiosError: true,
                config: {},
                response: { status: 500 }
            };
            expect(isAxiosError(axiosError)).toBe(true);
        });

        it('should return false for non-axios errors', () => {
            expect(isAxiosError(new Error('regular error'))).toBe(false);
            expect(isAxiosError({ message: 'not axios' })).toBe(false);
        });

        it('should return false for null and undefined', () => {
            expect(isAxiosError(null)).toBe(false);
            expect(isAxiosError(undefined)).toBe(false);
        });
    });

    describe('SSRF protection', () => {
        it('should block all private IP ranges', async () => {
            const privateIPs = [
                '10.0.0.1',
                '10.255.255.255',
                '172.16.0.1',
                '172.31.255.255',
                '192.168.0.1',
                '192.168.255.255',
                '127.0.0.1',
                '127.0.0.2',
                '169.254.1.1',
            ];

            for (const ip of privateIPs) {
                await expect(axiosClient.get(`https://${ip}/api`))
                    .rejects.toThrow();
            }
        });

        it('should block protocol smuggling attempts', async () => {
            await expect(axiosClient.get('https://api.github.com@evil.com/path'))
                .rejects.toThrow('Domain not in allowlist');
        });

        it('should block FTP protocol', async () => {
            await expect(axiosClient.get('ftp://api.github.com/file'))
                .rejects.toThrow('Only HTTPS allowed');
        });

        it('should block file protocol', async () => {
            await expect(axiosClient.get('file:///etc/passwd'))
                .rejects.toThrow('Only HTTPS allowed');
        });

        it('should block javascript protocol', async () => {
            await expect(axiosClient.get('javascript:alert(1)'))
                .rejects.toThrow('Only HTTPS allowed');
        });
    });

    describe('URL length limits', () => {
        it('should reject URLs exceeding maximum length', async () => {
            const longPath = 'a'.repeat(3000);
            await expect(axiosClient.get(`https://api.github.com/${longPath}`))
                .rejects.toThrow('URL too long');
        });
    });
});
